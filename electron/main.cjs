const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, screen, globalShortcut, powerMonitor, Notification, shell, desktopCapturer, dialog } = require('electron');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { containsPoint, roundedShape } = require('./geometry.cjs');

const mediaBridge = require("./media.cjs").createMediaBridge();
const activityBridge = require('./activity.cjs').createActivityBridge();
let recordingService;
let transferService;
const smokeMode = !app.isPackaged && process.argv.includes('--smoke-test');
const shortcutKeys = smokeMode ? { island: 'CommandOrControl+Alt+Shift+I', settings: 'CommandOrControl+Alt+Shift+S' } : { island: 'CommandOrControl+Alt+I', settings: 'CommandOrControl+Alt+S' };
const visualMode = process.argv.includes('--visual-check');
let smokeMedia = smokeMode ? { available: false } : undefined;
const smokeRecordingPath = path.join(__dirname, '..', '.qa', `smoke-recording-${Date.now()}.webm`);
let overlay;
let settingsWindow;
let tray;
let hitRegions = [];
let displayId;
let latestSettings;
let batteryCache = { at: 0, value: null };
let batteryRequest;
let quitting = false;
const developmentUrl = !app.isPackaged && process.env.ISLAND_DEV_URL;

app.setName('Dynamic Island');
// Keep Chromium's storage/cache beside this project while developing.
if (!app.isPackaged) app.setPath('userData', path.join(__dirname, '..', '.electron-cache', process.argv.includes('--smoke-test') ? `smoke-${process.pid}` : 'development'));
if (visualMode) app.setPath('userData', path.join(app.getPath('temp'), `dynamic-island-visual-${process.pid}`));
app.setAppUserModelId('com.island.desktop');

const trusted = (event) => [overlay, settingsWindow].some((win) => win && !win.isDestroyed() && win.webContents === event.sender);
const webPreferences = () => ({ preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false });

// Never attach a DWM material to this layered transparent window. Acrylic paints
// a separate full-window backdrop (600x600), outside Chromium's alpha surface,
// and may ignore the native shape. Glass belongs to the rounded DOM surfaces.

function load(win, settings = false) {
  win.setMenu(null);
  win.setSkipTaskbar(true);
  win.on('show', () => win.setSkipTaskbar(true));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.on('did-fail-load', (_event, code, description) => console.error('Renderer failed to load:', code, description));
  if (developmentUrl) {
    const url = new URL(developmentUrl);
    if (settings) url.searchParams.set('window', 'settings');
    return win.loadURL(url.href);
  }
  return win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { query: settings ? { window: 'settings' } : {} });
}

function positionOverlay() {
  const displays = screen.getAllDisplays();
  const display = displays.find((item) => item.id === displayId) || screen.getPrimaryDisplay();
  displayId = display.id;
  const width = Math.min(600, display.workArea.width);
  const height = Math.min(600, display.workArea.height);
  overlay.setBounds({ x: Math.round(display.workArea.x + (display.workArea.width - width) / 2), y: display.workArea.y, width, height });
}

function showOverlay() {
  if (!overlay || overlay.isDestroyed()) return;
  positionOverlay();
  overlay.showInactive();
  updateTray();
}

function toggleOverlay() {
  showOverlay();
}

function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore();
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({ width: 580, height: 760, minWidth: 480, minHeight: 520, title: 'Dynamic Island — Настройки', backgroundColor: '#17191c', autoHideMenuBar: true, skipTaskbar: true, show: false, webPreferences: webPreferences() });
  settingsWindow.once('ready-to-show', () => settingsWindow?.show());
  settingsWindow.on('closed', () => { settingsWindow = null; });
  load(settingsWindow, true).catch(console.error);
}

function trayIcon() {
  const size = 32;
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!containsPoint({ x: 1, y: 7, width: 30, height: 18, radius: 9 }, { x, y })) continue;
    const dot = (x - 23) ** 2 + (y - 16) ** 2 < 9;
    const i = (y * size + x) * 4;
    pixels[i] = dot ? 100 : 245;
    pixels[i + 1] = dot ? 187 : 245;
    pixels[i + 2] = dot ? 237 : 245;
    pixels[i + 3] = 255;
  }
  return nativeImage.createFromBitmap(pixels, { width: size, height: size });
}

function updateTray() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Показать остров', click: showOverlay },
    { label: 'Настройки', click: openSettings },
    { label: 'Экран', submenu: screen.getAllDisplays().map((display, index) => ({ label: display.label || `Экран ${index + 1}`, type: 'radio', checked: displayId === display.id, click: () => { displayId = display.id; showOverlay(); } })) },
    { type: 'separator' },
    { label: 'Выход', click: () => app.quit() },
  ]));
}

async function readBattery() {
  if (Date.now() - batteryCache.at < 30000) return batteryCache.value;
  if (process.platform !== 'win32') return null;
  if (batteryRequest) return batteryRequest;
  batteryRequest = new Promise((resolve) => {
    // Fixed read-only system query; no renderer-controlled command or arguments.
    const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    execFile(powershell, ['-NoProfile', '-NonInteractive', '-Command', 'Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining | ConvertTo-Json -Compress'], { windowsHide: true, timeout: 8000, encoding: 'utf8' }, (error, stdout) => {
      let level = null;
      try {
        const parsed = error ? null : JSON.parse(stdout.trim() || 'null');
        const batteries = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
        const levels = batteries.map((item) => item.EstimatedChargeRemaining).filter((value) => Number.isFinite(value) && value >= 0 && value <= 100);
        if (levels.length) level = Math.round(levels.reduce((sum, item) => sum + item, 0) / levels.length);
      } catch { /* Desktops without a battery return no data. */ }
      batteryCache = { at: Date.now(), value: level };
      resolve(level);
    });
  }).finally(() => { batteryRequest = null; });
  return batteryRequest;
}

function setupIpc() {
  ipcMain.handle('desktop:activities', (event) => trusted(event) ? activityBridge.request() : null);
  ipcMain.handle('desktop:mute', (event, muted, endpoint = 'render') => trusted(event) ? activityBridge.setMute(muted, endpoint) : { ok: false });
  ipcMain.handle('desktop:system-page', async (event, page) => {
    const pages = { microphone: 'ms-settings:privacy-microphone', camera: 'ms-settings:privacy-webcam', bluetooth: 'ms-settings:bluetooth', sound: 'ms-settings:sound' };
    if (!trusted(event) || !Object.hasOwn(pages, page)) return false;
    try { await shell.openExternal(pages[page]); return true; } catch { return false; }
  });
  const recordingDialogs = smokeMode ? { showSaveDialog: async () => { await require('node:fs/promises').mkdir(path.dirname(smokeRecordingPath), { recursive: true }); return { filePath: smokeRecordingPath, canceled: false }; } } : dialog;
  recordingService = require('./recording.cjs').setupRecording({ ipcMain, desktopCapturer, dialog: recordingDialogs, session: overlay.webContents.session, trusted, getWindow: () => overlay });
  transferService = require('./transfers.cjs').setupTransfers({ ipcMain, dialog, trusted, getWindow: (event) => BrowserWindow.fromWebContents(event.sender) });
  ipcMain.handle('desktop:media', (event, command = 'status', position) => {
    if (!trusted(event) || !['status','play','pause','next','previous','seek'].includes(command)) return { available: false };
    if (command === 'seek' && (!Number.isFinite(position) || position < 0 || position > 604800)) return { available: false };
    return smokeMode && smokeMedia !== undefined ? smokeMedia : mediaBridge.request(command, position);
  });
  ipcMain.on('desktop:settings', (event) => { if (trusted(event)) openSettings(); });
  ipcMain.on('desktop:quit', (event) => { if (trusted(event)) app.quit(); });
  ipcMain.on('desktop:regions', (event, regions) => {
    if (event.sender !== overlay?.webContents || !Array.isArray(regions)) return;
    hitRegions = regions.slice(0, 8).filter((region) => region && ['x', 'y', 'width', 'height', 'radius'].every((key) => Number.isFinite(region[key])) && region.width > 0 && region.height > 0);
    if (hitRegions.length) overlay.setShape(roundedShape(hitRegions));
  });
  ipcMain.on('desktop:sync-settings', (event, value) => {
    if (!trusted(event) || typeof value !== 'string' || value.length > 30000 || value === latestSettings) return;
    try { JSON.parse(value); } catch { return; }
    latestSettings = value;
    for (const win of [overlay, settingsWindow]) if (win && !win.isDestroyed() && win.webContents !== event.sender) win.webContents.send('desktop:settings-changed', value);
  });
  ipcMain.handle('desktop:system', async (event) => {
    if (!trusted(event)) return null;
    const executable = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    return { battery: await readBattery(), onBattery: powerMonitor.isOnBatteryPower(), autostart: app.isPackaged && app.getLoginItemSettings({ path: executable, args: [] }).openAtLogin, packaged: app.isPackaged, nativeGlass: false };
  });
  ipcMain.handle('desktop:autostart', (event, enabled) => {
    if (!trusted(event) || !app.isPackaged || typeof enabled !== 'boolean') return false;
    // Portable builds extract to a temporary folder; register the original executable.
    const executable = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    app.setLoginItemSettings({ openAtLogin: enabled, path: executable, args: [] });
    return app.getLoginItemSettings({ path: executable, args: [] }).openAtLogin;
  });
  ipcMain.on('desktop:timer-finished', (event) => {
    if (event.sender !== overlay?.webContents) return;
    showOverlay();
    if (Notification.isSupported()) new Notification({ title: 'Dynamic Island', body: 'Таймер завершён. Время сделать перерыв.' }).show();
  });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', showOverlay);
  app.whenReady().then(async () => {
    overlay = new BrowserWindow({ width: 600, height: 600, title: 'Dynamic Island', frame: false, transparent: true, backgroundMaterial: 'none', backgroundColor: '#00000000', hasShadow: false, resizable: false, maximizable: false, minimizable: false, skipTaskbar: true, alwaysOnTop: true, show: false, webPreferences: webPreferences() });
    overlay.setAlwaysOnTop(true, 'screen-saver');
    // A native window region handles click-through without cursor polling or input lag.
    overlay.setShape([{ x: 0, y: 0, width: 1, height: 1 }]);
    overlay.on('closed', () => { if (!quitting) app.quit(); });
    overlay.webContents.on('context-menu', () => Menu.buildFromTemplate([{ label: 'Настройки', click: openSettings }, { type: 'separator' }, { label: 'Выход', click: () => app.quit() }]).popup({ window: overlay }));
    setupIpc();
    positionOverlay();
    tray = new Tray(trayIcon());
    tray.setToolTip('Dynamic Island · Ctrl+Alt+I');
    tray.on('click', openSettings);
    tray.on('double-click', openSettings);
    updateTray();
    overlay.once('ready-to-show', showOverlay);
    await load(overlay);
    if (visualMode) await require('./visual-check.cjs')(overlay);
    globalShortcut.register(shortcutKeys.island, toggleOverlay);
    globalShortcut.register(shortcutKeys.settings, openSettings);
    const refreshDisplay = () => { positionOverlay(); updateTray(); };
    screen.on('display-added', refreshDisplay);
    screen.on('display-removed', refreshDisplay);
    screen.on('display-metrics-changed', refreshDisplay);
    let previousPower;
    const refreshPower = async () => {
      const value = { battery: await readBattery(), onBattery: powerMonitor.isOnBatteryPower() };
      if (previousPower && value.battery !== null && ((!value.onBattery && previousPower.onBattery) || (value.onBattery && value.battery <= 20 && (previousPower.battery > 20 || !previousPower.onBattery)))) {
        showOverlay(); overlay.webContents.send('desktop:power-activity', value);
      }
      previousPower = value;
    };
    const powerTimer = setInterval(refreshPower, 30000);
    void refreshPower();
    powerMonitor.on('on-ac', () => { batteryCache.at = 0; void refreshPower(); });
    powerMonitor.on('on-battery', () => { batteryCache.at = 0; void refreshPower(); });
    app.on('before-quit', () => clearInterval(powerTimer));
    powerMonitor.on('resume', () => { batteryCache.at = 0; });
    if (!app.isPackaged && process.argv.includes('--smoke-test')) {
      try { await require('./smoke.cjs')({ app, overlay, openSettings, shortcuts: shortcutKeys, getSettings: () => settingsWindow, getRegions: () => hitRegions, setMedia: (value) => { smokeMedia = value; }, readNativeMedia: () => mediaBridge.request(), recordingPath: smokeRecordingPath }); }
      catch (error) { console.error(error); quitting = true; mediaBridge.stop(); activityBridge.stop(); globalShortcut.unregisterAll(); app.exit(1); }
    }
  }).catch((error) => { console.error(error); app.quit(); });
  app.on('window-all-closed', () => { /* The tray owns the app lifecycle. */ });
  let closingServices = false;
  app.on('before-quit', (event) => {
    quitting = true;
    mediaBridge.stop(); activityBridge.stop();
    if (!closingServices && (recordingService || transferService)) {
      event.preventDefault(); closingServices = true;
      const finishRenderer = new Promise(resolve => {
        const done = (event) => { if (event && event.sender !== overlay?.webContents) return; clearTimeout(timeout); ipcMain.removeListener('desktop:ready-quit', done); resolve(); };
        const timeout = setTimeout(() => done(), 6000);
        ipcMain.on('desktop:ready-quit', done);
        if (overlay && !overlay.isDestroyed()) overlay.webContents.send('desktop:prepare-quit'); else done();
      });
      finishRenderer.then(() => Promise.allSettled([recordingService?.stop(), transferService?.closeAll()])).finally(() => app.quit());
    }
  });
  app.on('will-quit', () => { globalShortcut.unregisterAll(); tray?.destroy(); });
}
