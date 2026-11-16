const { app, BrowserWindow, ipcMain, safeStorage, session } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow = null;
let speechProcess = null;

app.setAppUserModelId('com.atrium.roleplay');

const ALLOWED_MEDIA_PERMISSIONS = new Set([
  'media',
  'microphone',
  'audioCapture',
  'clipboard-read',
  'clipboard-sanitized-write',
]);

function configurePermissions() {
  const defaultSession = session.defaultSession;
  if (!defaultSession) return;

  defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return ALLOWED_MEDIA_PERMISSIONS.has(permission);
  });

  defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(ALLOWED_MEDIA_PERMISSIONS.has(permission));
    }
  );
}

function sendSpeechEvent(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function stopNativeDictationProcess() {
  if (!speechProcess) return;
  const proc = speechProcess;
  speechProcess = null;

  try {
    if (!proc.killed) {
      proc.kill();
    }
  } catch {
    // ignore teardown errors
  }
}

function decodeClixmlHexEscapes(text) {
  return text
    .replace(/_x([0-9a-fA-F]{4})_/g, (_m, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parsePowerShellStderr(rawText) {
  if (!rawText) return '';

  const withoutHeader = rawText.replace(/#<\s*CLIXML/gi, '').trim();
  if (!withoutHeader) return '';

  const errorMessages = [];
  const errorTagRegex = /<S\s+S="Error">([\s\S]*?)<\/S>/gi;
  let match = errorTagRegex.exec(withoutHeader);
  while (match !== null) {
    const decoded = decodeClixmlHexEscapes(match[1]).replace(/\s+/g, ' ').trim();
    if (decoded) {
      errorMessages.push(decoded);
    }
    match = errorTagRegex.exec(withoutHeader);
  }

  if (errorMessages.length > 0) {
    return errorMessages.join(' ');
  }

  if (/<Objs[\s>]|<\/Objs>|<Obj[\s>]|<S\s+S="(?:progress|verbose|debug|warning|information)">/i.test(withoutHeader)) {
    return '';
  }

  return withoutHeader.replace(/\s+/g, ' ').trim();
}

async function focusChatInputBox() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    mainWindow.webContents.focus();

    await mainWindow.webContents.executeJavaScript(
      `new Promise((resolve) => {
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
            active.focus();
            resolve(true);
            return;
          }
          const textarea =
            document.querySelector('form textarea:not([disabled])') ||
            document.querySelector('textarea:not([disabled])');
          if (textarea && typeof textarea.focus === 'function') {
            textarea.focus();
            const len = textarea.value ? textarea.value.length : 0;
            if (typeof textarea.setSelectionRange === 'function') {
              textarea.setSelectionRange(len, len);
            }
            resolve(true);
            return;
          }
          attempts += 1;
          if (attempts < 24) {
            requestAnimationFrame(focusInput);
            return;
          }
          resolve(false);
        };
        requestAnimationFrame(focusInput);
      })`,
      true
    );
  } catch {
    // ignore focus errors if window is closing
  }
}

function buildWinVoiceTypingPowerShell() {
  return [
    "$ProgressPreference = 'SilentlyContinue'",
    "$ErrorActionPreference = 'Stop'",
    'Add-Type -TypeDefinition @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public static class AtriumWinKey {',
    '  [DllImport("user32.dll", SetLastError = true)]',
    '  public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);',
    '}',
    '"@',
    '$VK_LWIN = 0x5B',
    '$VK_H = 0x48',
    '$KEYEVENTF_KEYUP = 0x0002',
    '[AtriumWinKey]::keybd_event($VK_LWIN, 0, 0, [UIntPtr]::Zero)',
    'Start-Sleep -Milliseconds 30',
    '[AtriumWinKey]::keybd_event($VK_H, 0, 0, [UIntPtr]::Zero)',
    'Start-Sleep -Milliseconds 40',
    '[AtriumWinKey]::keybd_event($VK_H, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)',
    'Start-Sleep -Milliseconds 20',
    '[AtriumWinKey]::keybd_event($VK_LWIN, 0, $KEYEVENTF_KEYUP, [UIntPtr]::Zero)',
  ].join('\n');
}

async function startNativeDictationProcess() {
  if (process.platform !== 'win32') {
    return { ok: false, fallbackToWebSpeech: true };
  }

  if (speechProcess && !speechProcess.killed) {
    return { ok: true };
  }

  await focusChatInputBox();

  return new Promise((resolve) => {
    const psScript = buildWinVoiceTypingPowerShell();

    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        psScript,
      ],
      {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    speechProcess = child;
    let settled = false;
    let stderrBuffer = '';

    const settle = (result) => {
      if (!settled) {
        settled = true;
        clearTimeout(safetyTimer);
        resolve(result);
      }
    };

    const safetyTimer = setTimeout(() => {
      if (speechProcess === child) {
        speechProcess = null;
      }
      sendSpeechEvent('atrium:speech-end', undefined);
      settle({ ok: true });
    }, 4000);

    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString('utf8');
    });

    child.on('error', (err) => {
      if (speechProcess === child) {
        speechProcess = null;
      }
      if (settled) return;
      sendSpeechEvent('atrium:speech-end', undefined);
      settle({
        ok: false,
        errorCode: 'start-failed',
        detail: err?.message,
      });
    });

    child.on('close', (exitCode) => {
      if (speechProcess === child) {
        speechProcess = null;
      }
      if (settled) return;

      const decodedStderr = parsePowerShellStderr(stderrBuffer);
      if (exitCode !== 0) {
        const detail = decodedStderr || `PowerShell exited with code ${exitCode}`;
        sendSpeechEvent('atrium:speech-end', undefined);
        settle({ ok: false, errorCode: 'start-failed', detail });
        return;
      }

      // Immediately reset the renderer mic button state so it does not stay stuck listening
      sendSpeechEvent('atrium:speech-end', undefined);
      settle({ ok: true });
    });
  });
}

function createMainWindow() {
  const isProd = app.isPackaged;
  const iconPath = path.join(
    __dirname,
    '..',
    'build',
    process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  );

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 620,
    title: 'Atrium',
    backgroundColor: '#0A0910',
    darkTheme: true,
    autoHideMenuBar: true,
    show: false,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !isProd,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.setMenuBarVisibility(false);

  if (isProd) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      const key = input.key?.toLowerCase();
      const isInspectShortcut =
        input.key === 'F12' ||
        ((input.control || input.meta) &&
          input.shift &&
          (key === 'i' || key === 'j' || key === 'c')) ||
        (input.meta && input.alt && (key === 'i' || key === 'j' || key === 'c'));

      if (isInspectShortcut) {
        event.preventDefault();
      }
    });

    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow?.setTitle('Atrium');
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.setTitle('Atrium');
    mainWindow?.maximize();
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (devServerUrl && targetUrl.startsWith(devServerUrl)) {
      return;
    }
    event.preventDefault();
  });

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    stopNativeDictationProcess();
    mainWindow = null;
  });
}

ipcMain.on('atrium:close-window', () => {
  stopNativeDictationProcess();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  } else {
    app.quit();
  }
});

ipcMain.handle('atrium:speech-start', async (_event, language) => {
  return startNativeDictationProcess(language);
});

ipcMain.handle('atrium:speech-stop', () => {
  stopNativeDictationProcess();
  return { ok: true };
});

const SAFE_STORAGE_PREFIX = 'SAFE_V1:';

ipcMain.handle('atrium:secret-encrypt', (_event, plaintext) => {
  if (typeof plaintext !== 'string' || !plaintext) {
    return { ok: true, encrypted: '' };
  }
  try {
    if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
      return { ok: false, fallbackSessionOnly: true };
    }
    const encryptedBuffer = safeStorage.encryptString(plaintext);
    return {
      ok: true,
      encrypted: SAFE_STORAGE_PREFIX + encryptedBuffer.toString('base64'),
    };
  } catch {
    return { ok: false, fallbackSessionOnly: true };
  }
});

ipcMain.handle('atrium:secret-decrypt', (_event, encryptedPayload) => {
  if (typeof encryptedPayload !== 'string' || !encryptedPayload) {
    return { ok: true, plaintext: '' };
  }
  if (!encryptedPayload.startsWith(SAFE_STORAGE_PREFIX)) {
    return { ok: false, plaintext: '' };
  }
  try {
    if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
      return { ok: false, plaintext: '' };
    }
    const base64Body = encryptedPayload.slice(SAFE_STORAGE_PREFIX.length);
    const buffer = Buffer.from(base64Body, 'base64');
    const plaintext = safeStorage.decryptString(buffer);
    return { ok: true, plaintext };
  } catch {
    return { ok: false, plaintext: '' };
  }
});

app.whenReady().then(() => {
  configurePermissions();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  stopNativeDictationProcess();
});

app.on('window-all-closed', () => {
  stopNativeDictationProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
