const { contextBridge, ipcRenderer } = require('electron');

function focusActiveChatInput() {
  if (typeof document === 'undefined' || typeof requestAnimationFrame !== 'function') {
    ipcRenderer.send('atrium:focus-chat-input-done');
    return;
  }

  let attempts = 0;
  const focusInput = () => {
    const active = document.activeElement;
    if (
      active &&
      (active.tagName === 'TEXTAREA' ||
        (active.tagName === 'INPUT' &&
          /^(text|search|url|email|tel)$/i.test(active.type || 'text')) ||
        active.isContentEditable)
    ) {
      if (typeof active.focus === 'function') {
        active.focus();
      }
      ipcRenderer.send('atrium:focus-chat-input-done');
      return;
    }

    const textarea =
      document.querySelector('form textarea:not([disabled])') ||
      document.querySelector('textarea:not([disabled])');
    if (textarea && typeof textarea.focus === 'function') {
      textarea.focus();
      const len = typeof textarea.value === 'string' ? textarea.value.length : 0;
      if (typeof textarea.setSelectionRange === 'function') {
        textarea.setSelectionRange(len, len);
      }
      ipcRenderer.send('atrium:focus-chat-input-done');
      return;
    }

    attempts += 1;
    if (attempts < 24) {
      requestAnimationFrame(focusInput);
      return;
    }

    ipcRenderer.send('atrium:focus-chat-input-done');
  };

  requestAnimationFrame(focusInput);
}

ipcRenderer.on('atrium:focus-chat-input', () => {
  focusActiveChatInput();
});

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
