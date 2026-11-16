const { contextBridge, ipcRenderer } = require('electron');

const closeWindow = () => {
  ipcRenderer.send('atrium:close-window');
};

contextBridge.exposeInMainWorld('atriumDesktop', {
  isDesktop: true,
  closeWindow,
});

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  closeWindow,
  startNativeDictation: (language) =>
    ipcRenderer.invoke('atrium:speech-start', language),
  stopNativeDictation: () => ipcRenderer.invoke('atrium:speech-stop'),
  onDictationResult: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('atrium:speech-result', handler);
    return () => ipcRenderer.removeListener('atrium:speech-result', handler);
  },
  onDictationError: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('atrium:speech-error', handler);
    return () => ipcRenderer.removeListener('atrium:speech-error', handler);
  },
  onDictationEnd: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('atrium:speech-end', handler);
    return () => ipcRenderer.removeListener('atrium:speech-end', handler);
  },
  encryptSecret: (plaintext) =>
    ipcRenderer.invoke('atrium:secret-encrypt', plaintext),
  decryptSecret: (encryptedPayload) =>
    ipcRenderer.invoke('atrium:secret-decrypt', encryptedPayload),
});
