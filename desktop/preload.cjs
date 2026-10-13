const {contextBridge, ipcRenderer} = require('electron');
const listen = (channel, callback) => {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('bagarreDesktop', Object.freeze({
  steamDeck: process.argv.includes('--bagarre-deck'),
  smokeTest: process.argv.includes('--bagarre-smoke'),
  getStatus: () => ipcRenderer.invoke('desktop:status'),
  toggleFullscreen: () => ipcRenderer.invoke('desktop:fullscreen'),
  quit: () => ipcRenderer.invoke('desktop:quit'),
  ready: () => ipcRenderer.send('desktop:ready'),
  onSuspend: callback => listen('desktop:suspend', callback),
  onFullscreen: callback => listen('desktop:fullscreen-changed', callback),
}));
