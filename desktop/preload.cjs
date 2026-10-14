const {contextBridge, ipcRenderer} = require('electron');
const listen = (channel, callback) => {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('bagarreDesktop', Object.freeze({
  platform: process.platform,
  steamDeck: process.argv.includes('--bagarre-deck'),
  smokeTest: process.argv.includes('--bagarre-smoke'),
  getStatus: () => ipcRenderer.invoke('desktop:status'),
  toggleFullscreen: () => ipcRenderer.invoke('desktop:fullscreen'),
  quit: () => ipcRenderer.invoke('desktop:quit'),
  ready: () => ipcRenderer.send('desktop:ready'),
  loading: message => ipcRenderer.send('desktop:loading', String(message).slice(0,160)),
  onSuspend: callback => listen('desktop:suspend', callback),
  onFullscreen: callback => listen('desktop:fullscreen-changed', callback),
}));
