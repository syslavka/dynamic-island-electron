const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');

function setupRecording({ ipcMain, desktopCapturer, dialog, session, trusted, getWindow }) {
  const jobs = new Map();
  let preparing = false;
  let stopped = false;
  const channels = [];
  const MAX = 16 * 1024 * 1024;
  function authorize(event) {
    const win = getWindow();
    if (stopped || !win || win.isDestroyed() || event.sender !== win.webContents ||
        !trusted(event) || event.senderFrame !== event.sender.mainFrame) throw new Error('Recording access denied');
    return win;
  }
  function owned(event, token) {
    authorize(event);
    const job = jobs.get(token);
    if (!job || job.owner !== event.sender || job.frame !== event.senderFrame || job.closing) throw new Error('Invalid recording token');
    return job;
  }
  async function close(job) {
    if (job.closePromise) return job.closePromise;
    job.closing = true;
    clearTimeout(job.expiry);
    job.owner.removeListener('destroyed', job.onGone);
    job.owner.removeListener('did-start-navigation', job.onNavigate);
    job.closePromise = (async () => {
      try { await job.queue; } finally {
        try { if (job.handle) await job.handle.close(); }
        finally { jobs.delete(job.token); }
      }
    })();
    return job.closePromise;
  }
  const handle = (name, fn) => { const channel = `desktop:recording-${name}`; channels.push(channel); ipcMain.handle(channel, fn); };
  const sources = () => desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 }, fetchWindowIcons: false });
  handle('sources', async (event) => {
    authorize(event);
    const list = await sources();
    authorize(event);
    return list.slice(0, 256).map(({ id, name }) => ({ id, name }));
  });
  handle('prepare', async (event, sourceId) => {
    authorize(event);
    if (preparing || jobs.size || typeof sourceId !== 'string' || sourceId.length > 512) throw new Error('Recording is busy or source is invalid');
    preparing = true;
    try {
      if (!(await sources()).some(source => source.id === sourceId)) throw new Error('Capture source is no longer available');
      authorize(event);
      const token = randomUUID();
      const job = { token, owner: event.sender, frame: event.senderFrame, sourceId,
        path: null, choosingDestination: false,
        queue: Promise.resolve(), handle: null, pending: 0, approved: false, closing: false };
      job.onGone = () => { void close(job).catch(() => {}); };
      job.onNavigate = (_event, _url, _inPlace, isMainFrame) => { if (isMainFrame) job.onGone(); };
      job.owner.once('destroyed', job.onGone);
      job.owner.on('did-start-navigation', job.onNavigate);
      job.expiry = setTimeout(job.onGone, 60000);
      jobs.set(token, job);
      return { token };
    } finally { preparing = false; }
  });
  handle('destination', async (event, token) => {
    const job = owned(event, token);
    if (!job.approved || job.path || job.choosingDestination) throw new Error('Recording destination is unavailable');
    job.choosingDestination = true;
    try {
      const result = await dialog.showSaveDialog(getWindow(), { title: 'Save screen recording', defaultPath: `Recording-${Date.now()}.webm`, filters: [{ name: 'WebM video', extensions: ['webm'] }] });
      owned(event, token);
      if (result.canceled || !result.filePath) return false;
      const destination = /\.webm$/i.test(result.filePath) ? result.filePath : `${result.filePath}.webm`;
      try {
        await fs.lstat(destination);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        owned(event, token);
        job.path = destination;
        return true;
      }
      throw new Error('This file already exists. Choose a new name for the recording.');
    } finally { job.choosingDestination = false; }
  });
  session.setDisplayMediaRequestHandler((request, callback) => {
    void (async () => {
      const win = getWindow();
      const frame = request.frame;
      const job = [...jobs.values()].find(item => !item.closing && !item.approved && item.owner === win?.webContents && item.frame === frame);
      if (stopped || !win || win.isDestroyed() || !frame || frame !== win.webContents.mainFrame ||
          frame.top !== frame || !frame.url || frame.url !== win.webContents.getURL() ||
          !trusted({ sender: win.webContents, senderFrame: frame }) || !request.videoRequested || request.audioRequested || !job) return callback({});
      const source = (await sources()).find(item => item.id === job.sourceId);
      if (!source || job.closing || job.approved || stopped || frame !== win.webContents.mainFrame) return callback({});
      job.approved = true;
      clearTimeout(job.expiry);
      callback({ video: source });
    })().catch(() => callback({}));
  }, { useSystemPicker: false });
  handle('chunk', async (event, token, data) => {
    const job = owned(event, token);
    if (!job.approved || !job.path || !(data instanceof ArrayBuffer) || !data.byteLength || data.byteLength > MAX || job.pending + data.byteLength > 64 * 1024 * 1024) throw new Error('Invalid recording chunk');
    job.pending += data.byteLength;
    const bytes = Buffer.from(data);
    const write = job.queue.then(async () => {
      // Exclusive creation never truncates an existing file; cancellation never deletes files.
      if (!job.handle) job.handle = await fs.open(job.path, 'wx');
      let offset = 0;
      while (offset < bytes.length) {
        const { bytesWritten } = await job.handle.write(bytes, offset, bytes.length - offset);
        if (!bytesWritten) throw new Error('Unable to write recording');
        offset += bytesWritten;
      }
    }).finally(() => { job.pending -= data.byteLength; });
    job.queue = write;
    try { await write; } catch (error) { void close(job).catch(() => {}); throw error; }
  });
  handle('finish', (event, token) => close(owned(event, token)));
  handle('cancel', (event, token) => close(owned(event, token)));
  async function stop() {
    stopped = true;
    session.setDisplayMediaRequestHandler(null);
    for (const channel of channels) ipcMain.removeHandler(channel);
    await Promise.allSettled([...jobs.values()].map(close));
  }
  return { stop, closeAll: stop };
}
module.exports = { setupRecording };
