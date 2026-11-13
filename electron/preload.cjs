const { contextBridge, ipcRenderer } = require('electron');
const subscribe = (channel, listener) => {
  const handler = (_event, value) => listener(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};
contextBridge.exposeInMainWorld('desktop', {
  getActivities: () => ipcRenderer.invoke('desktop:activities'),
  setSystemMute: (muted, endpoint) => ipcRenderer.invoke('desktop:mute', muted, endpoint),
  openSystemPage: (page) => ipcRenderer.invoke('desktop:system-page', page),
  recordingSources: () => ipcRenderer.invoke('desktop:recording-sources'),
  recordingPrepare: (sourceId) => ipcRenderer.invoke('desktop:recording-prepare', sourceId),
  recordingDestination: (token) => ipcRenderer.invoke('desktop:recording-destination', token),
  recordingChunk: (token, data) => ipcRenderer.invoke('desktop:recording-chunk', token, data),
  recordingFinish: (token) => ipcRenderer.invoke('desktop:recording-finish', token),
  recordingCancel: (token) => ipcRenderer.invoke('desktop:recording-cancel', token),
  startTransfer: () => ipcRenderer.invoke('transfers:start'),
  cancelTransfer: (id) => ipcRenderer.invoke('transfers:cancel', { id }),
  getTransferStatus: () => ipcRenderer.invoke('transfers:get-status'),
  onTransfer: (listener) => subscribe('transfers:snapshot', listener),
  onPrepareQuit: (listener) => {
    const handler = () => { Promise.resolve().then(listener).finally(() => ipcRenderer.send('desktop:ready-quit')).catch(() => {}); };
    ipcRenderer.on('desktop:prepare-quit', handler);
    return () => ipcRenderer.removeListener('desktop:prepare-quit', handler);
  },
  openSettings: () => ipcRenderer.send('desktop:settings'),
  quit: () => ipcRenderer.send('desktop:quit'),
  setRegions: (regions) => ipcRenderer.send('desktop:regions', regions),
  publishSettings: (value) => ipcRenderer.send('desktop:sync-settings', value),
  onSettings: (listener) => subscribe('desktop:settings-changed', listener),
  media: (command, position) => ipcRenderer.invoke('desktop:media', command, position),
  onPowerActivity: (listener) => subscribe('desktop:power-activity', listener),
  getSystem: () => ipcRenderer.invoke('desktop:system'),
  setAutostart: (enabled) => ipcRenderer.invoke('desktop:autostart', enabled),
  timerFinished: () => ipcRenderer.send('desktop:timer-finished'),
});
