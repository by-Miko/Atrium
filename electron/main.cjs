const { app, BrowserWindow, ipcMain, safeStorage, session } = require('electron');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const MAX_SECRET_PLAINTEXT_LENGTH = 8192;
const MAX_SECRET_ENCRYPTED_LENGTH = 16384;
const MOBILE_LINK_DEFAULT_PORT = 41730;
const MOBILE_LINK_MAX_PORT_ATTEMPTS = 25;
const MOBILE_LINK_OLLAMA_HOST = '127.0.0.1';
const MOBILE_LINK_OLLAMA_PORT = 11434;
const MOBILE_LINK_LMSTUDIO_PORT = 1234;
const MOBILE_LINK_COOKIE_NAME = 'atrium_ml_session';
const MAX_MOBILE_SYNC_BYTES = 25 * 1024 * 1024;
const MAX_MOBILE_SYNC_DEPTH = 32;

const PACKAGED_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://googleapis.com; font-src 'self' https://fonts.gstatic.com https://gstatic.com; img-src 'self' data: blob: https: http://localhost:* http://127.0.0.1:*; connect-src 'self' http://localhost:* http://127.0.0.1:* http://192.168.* http://10.* http://100.* https://*; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';";

let mainWindow = null;
let speechProcess = null;
let pendingFocusResolver = null;
let pendingFocusTimer = null;

const mobileLinkState = {
  active: false,
  server: null,
  port: null,
  token: null,
  sockets: new Set(),
  sessions: new Map(),
  sseClients: new Map(),
  lastSyncAt: null,
  startPromise: null,
};

let mobileSyncSnapshot = {
  updatedAt: 0,
  characters: [],
  chats: {},
  storyMemory: {},
  preferences: {},
};

app.setAppUserModelId('com.atrium.roleplay');

const ALLOWED_MEDIA_PERMISSIONS = new Set([
  'media',
  'microphone',
  'audioCapture',
  'clipboard-read',
  'clipboard-sanitized-write',
]);

function isAuthorizedIpcEvent(event) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }
  const contents = mainWindow.webContents;
  if (!contents || contents.isDestroyed()) {
    return false;
  }
  if (event.sender !== contents) {
    return false;
  }
  if (!event.senderFrame || event.senderFrame !== contents.mainFrame) {
    return false;
  }
  return true;
}

function isAllowedDevNavigation(targetUrl) {
  if (app.isPackaged) return false;
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (!devServerUrl) return false;
  try {
    return new URL(targetUrl).origin === new URL(devServerUrl).origin;
  } catch {
    return false;
  }
}

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

function configurePackagedCsp() {
  if (!app.isPackaged) return;
  const defaultSession = session.defaultSession;
  if (!defaultSession) return;

  defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!details.url.startsWith('file://')) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }

    const responseHeaders = { ...(details.responseHeaders || {}) };
    for (const headerName of Object.keys(responseHeaders)) {
      if (headerName.toLowerCase() === 'content-security-policy') {
        delete responseHeaders[headerName];
      }
    }
    responseHeaders['Content-Security-Policy'] = [PACKAGED_CSP];
    callback({ responseHeaders });
  });
}

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));

  contents.on('will-navigate', (navEvent, targetUrl) => {
    if (isAllowedDevNavigation(targetUrl)) {
      return;
    }
    navEvent.preventDefault();
  });

  contents.on('will-attach-webview', (attachEvent) => {
    attachEvent.preventDefault();
  });
});

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

function resolvePendingFocus() {
  if (pendingFocusTimer) {
    clearTimeout(pendingFocusTimer);
    pendingFocusTimer = null;
  }
  if (pendingFocusResolver) {
    const resolve = pendingFocusResolver;
    pendingFocusResolver = null;
    resolve();
  }
}

async function focusChatInputBox() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    mainWindow.webContents.focus();

    resolvePendingFocus();
    await new Promise((resolve) => {
      pendingFocusResolver = resolve;
      pendingFocusTimer = setTimeout(resolvePendingFocus, 350);
      mainWindow.webContents.send('atrium:focus-chat-input');
    });
  } catch {
    resolvePendingFocus();
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

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (!isProd && devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    resolvePendingFocus();
    stopNativeDictationProcess();
    mainWindow = null;
  });
}

ipcMain.on('atrium:close-window', (event) => {
  if (!isAuthorizedIpcEvent(event)) {
    return;
  }
  stopNativeDictationProcess();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  } else {
    app.quit();
  }
});

ipcMain.on('atrium:focus-chat-input-done', (event) => {
  if (!isAuthorizedIpcEvent(event)) {
    return;
  }
  resolvePendingFocus();
});

ipcMain.handle('atrium:speech-start', async (event, language) => {
  if (!isAuthorizedIpcEvent(event)) {
    throw new Error('Unauthorized IPC sender');
  }
  return startNativeDictationProcess(language);
});

ipcMain.handle('atrium:speech-stop', (event) => {
  if (!isAuthorizedIpcEvent(event)) {
    throw new Error('Unauthorized IPC sender');
  }
  stopNativeDictationProcess();
  return { ok: true };
});

const SAFE_STORAGE_PREFIX = 'SAFE_V1:';

ipcMain.handle('atrium:secret-encrypt', (event, plaintext) => {
  if (!isAuthorizedIpcEvent(event)) {
    throw new Error('Unauthorized IPC sender');
  }
  if (typeof plaintext !== 'string') {
    return { ok: false, fallbackSessionOnly: true };
  }
  if (!plaintext) {
    return { ok: true, encrypted: '' };
  }
  if (plaintext.length > MAX_SECRET_PLAINTEXT_LENGTH) {
    return { ok: false, fallbackSessionOnly: true };
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

ipcMain.handle('atrium:secret-decrypt', (event, encryptedPayload) => {
  if (!isAuthorizedIpcEvent(event)) {
    throw new Error('Unauthorized IPC sender');
  }
  if (typeof encryptedPayload !== 'string') {
    return { ok: false, plaintext: '' };
  }
  if (!encryptedPayload) {
    return { ok: true, plaintext: '' };
  }
  if (
    encryptedPayload.length > MAX_SECRET_ENCRYPTED_LENGTH ||
    !encryptedPayload.startsWith(SAFE_STORAGE_PREFIX)
  ) {
    return { ok: false, plaintext: '' };
  }
  try {
    if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
      return { ok: false, plaintext: '' };
    }
    const base64Body = encryptedPayload.slice(SAFE_STORAGE_PREFIX.length);
    if (!base64Body) {
      return { ok: false, plaintext: '' };
    }
    const buffer = Buffer.from(base64Body, 'base64');
    if (buffer.length === 0) {
      return { ok: false, plaintext: '' };
    }
    const plaintext = safeStorage.decryptString(buffer);
    return { ok: true, plaintext };
  } catch {
    return { ok: false, plaintext: '' };
  }
});

const MOBILE_LINK_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function getMimeTypeForFile(filePath) {
  const baseName = path.basename(filePath).toLowerCase();
  if (baseName === 'manifest.json' || baseName === 'manifest.webmanifest') {
    return 'application/manifest+json; charset=utf-8';
  }
  const ext = path.extname(baseName);
  return MOBILE_LINK_MIME_TYPES[ext] || 'application/octet-stream';
}

function timingSafeVerifyToken(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string') {
    return false;
  }
  if (!candidate || !expected) {
    return false;
  }
  const candidateBuf = Buffer.from(candidate, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (candidateBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidateBuf, expectedBuf);
}

function parseCookies(cookieHeader) {
  const result = Object.create(null);
  if (typeof cookieHeader !== 'string' || !cookieHeader) {
    return result;
  }
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const rawKey = part.slice(0, eqIdx).trim();
    const rawVal = part.slice(eqIdx + 1).trim();
    if (!rawKey) continue;
    try {
      result[rawKey] = decodeURIComponent(rawVal);
    } catch {
      result[rawKey] = rawVal;
    }
  }
  return result;
}

function findMatchingSessionId(candidateSessionId) {
  if (typeof candidateSessionId !== 'string' || !candidateSessionId) {
    return null;
  }
  for (const storedId of mobileLinkState.sessions.keys()) {
    if (timingSafeVerifyToken(candidateSessionId, storedId)) {
      return storedId;
    }
  }
  return null;
}

function isMobileLinkRequestAuthenticated(req) {
  if (!mobileLinkState.active || !mobileLinkState.token) {
    return false;
  }

  const headerToken = req.headers['x-atrium-link-token'];
  if (
    typeof headerToken === 'string' &&
    timingSafeVerifyToken(headerToken.trim(), mobileLinkState.token)
  ) {
    return true;
  }

  const cookies = parseCookies(req.headers.cookie);
  const matchedSessionId = findMatchingSessionId(
    cookies[MOBILE_LINK_COOKIE_NAME]
  );
  if (matchedSessionId) {
    const sessionMeta = mobileLinkState.sessions.get(matchedSessionId);
    if (sessionMeta) {
      sessionMeta.lastSeenAt = Date.now();
    }
    return true;
  }

  return false;
}

function resolveMobileDeviceKey(req, parsedUrl) {
  const rawDeviceId = parsedUrl?.searchParams?.get('deviceId');
  if (typeof rawDeviceId === 'string') {
    const trimmed = rawDeviceId.trim();
    if (/^[a-zA-Z0-9_-]{4,128}$/.test(trimmed)) {
      return `device:${trimmed}`;
    }
  }
  return `ip:${req.socket?.remoteAddress || 'unknown'}`;
}

function broadcastMobileLinkEvent(eventName, data) {
  if (!mobileLinkState.active || mobileLinkState.sseClients.size === 0) {
    return;
  }
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const clientSet of mobileLinkState.sseClients.values()) {
    for (const clientRes of clientSet) {
      if (!clientRes.writableEnded && !clientRes.destroyed) {
        try {
          clientRes.write(payload);
        } catch {
          // broken SSE responses are cleaned up by close/error handlers
        }
      }
    }
  }
}

function handleMobileLinkEvents(req, res, parsedUrl) {
  if (req.method !== 'GET') {
    sendJsonResponse(res, 405, { error: 'Method not allowed' });
    return;
  }
  if (!isMobileLinkRequestAuthenticated(req)) {
    sendJsonResponse(res, 401, { error: 'Unauthorized' });
    return;
  }

  const deviceKey = resolveMobileDeviceKey(req, parsedUrl);
  let clientSet = mobileLinkState.sseClients.get(deviceKey);
  if (!clientSet) {
    clientSet = new Set();
    mobileLinkState.sseClients.set(deviceKey, clientSet);
  }
  clientSet.add(res);

  req.socket?.setTimeout?.(0);
  req.socket?.setNoDelay?.(true);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff',
  });
  res.flushHeaders?.();
  res.write(
    `event: connected\ndata: ${JSON.stringify({
      updatedAt: mobileSyncSnapshot.updatedAt,
    })}\n\n`
  );

  const heartbeatTimer = setInterval(() => {
    if (res.writableEnded || res.destroyed) return;
    try {
      res.write(': keepalive\n\n');
    } catch {
      cleanup();
    }
  }, 25000);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearInterval(heartbeatTimer);
    const activeSet = mobileLinkState.sseClients.get(deviceKey);
    if (activeSet) {
      activeSet.delete(res);
      if (activeSet.size === 0) {
        mobileLinkState.sseClients.delete(deviceKey);
      }
    }
  };

  req.on('aborted', cleanup);
  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
}

function handleMobileLinkInfo(req, res) {
  if (req.method !== 'GET') {
    sendJsonResponse(res, 405, { error: 'Method not allowed' });
    return;
  }
  if (!isMobileLinkRequestAuthenticated(req)) {
    sendJsonResponse(res, 401, { error: 'Unauthorized' });
    return;
  }
  const status = getMobileLinkStatusPayload();
  sendJsonResponse(res, 200, {
    active: status.active,
    port: status.port,
    lanUrl: status.lanUrl,
    vpnUrl: status.vpnUrl,
    vpnProvider: status.vpnProvider,
    vpnProviders: status.vpnProviders,
    urls: status.urls,
    connectedClients: status.connectedClients,
    lastSyncAt: status.lastSyncAt,
  });
}

function sendJsonResponse(res, statusCode, payload, extraHeaders = {}) {
  if (res.writableEnded) return;
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  res.end(body);
}

function sendTextResponse(res, statusCode, text, extraHeaders = {}) {
  if (res.writableEnded) return;
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  res.end(text);
}

function isPlainSyncObject(val) {
  return Boolean(val) && typeof val === 'object' && !Array.isArray(val);
}

function isForbiddenSyncKey(key) {
  const lower = key.toLowerCase();
  return (
    key === '__proto__' ||
    key === 'constructor' ||
    key === 'prototype' ||
    lower === 'apikey' ||
    lower === 'api_key' ||
    lower === 'api-key'
  );
}

function stripSecretsFromSyncPayload(value, depth = 0, seen = new WeakSet()) {
  if (depth > MAX_MOBILE_SYNC_DEPTH) {
    return undefined;
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    if (value.includes(SAFE_STORAGE_PREFIX)) {
      return undefined;
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'object') {
    return undefined;
  }
  if (seen.has(value)) {
    return undefined;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    const nextArr = [];
    for (const item of value) {
      const cleaned = stripSecretsFromSyncPayload(item, depth + 1, seen);
      if (cleaned !== undefined) {
        nextArr.push(cleaned);
      }
    }
    return nextArr;
  }

  const nextObj = Object.create(null);
  for (const [key, propVal] of Object.entries(value)) {
    if (isForbiddenSyncKey(key)) {
      continue;
    }
    const cleaned = stripSecretsFromSyncPayload(propVal, depth + 1, seen);
    if (cleaned !== undefined) {
      nextObj[key] = cleaned;
    }
  }
  return JSON.parse(JSON.stringify(nextObj));
}

function buildSanitizedSyncSnapshot(raw) {
  const cleaned = stripSecretsFromSyncPayload(raw);
  if (!isPlainSyncObject(cleaned)) {
    return null;
  }
  const incomingUpdatedAt =
    typeof cleaned.updatedAt === 'number' && Number.isFinite(cleaned.updatedAt)
      ? cleaned.updatedAt
      : Date.now();

  return {
    updatedAt: incomingUpdatedAt,
    characters: Array.isArray(cleaned.characters)
      ? cleaned.characters
      : mobileSyncSnapshot.characters,
    chats: isPlainSyncObject(cleaned.chats)
      ? cleaned.chats
      : mobileSyncSnapshot.chats,
    storyMemory: isPlainSyncObject(cleaned.storyMemory)
      ? cleaned.storyMemory
      : mobileSyncSnapshot.storyMemory,
    preferences: isPlainSyncObject(cleaned.preferences)
      ? cleaned.preferences
      : mobileSyncSnapshot.preferences,
  };
}

function detectMeshVpnProvider(adapterName, octets) {
  const name = typeof adapterName === 'string' ? adapterName.toLowerCase() : '';
  if (
    name.includes('netbird') ||
    /(?:^|[^a-z0-9])wt\d*(?:$|[^a-z0-9])/i.test(name)
  ) {
    return 'NetBird';
  }
  if (
    name.includes('zerotier') ||
    /(?:^|[^a-z0-9])zt[a-z0-9_-]*(?:$|[^a-z0-9])/i.test(name)
  ) {
    return 'ZeroTier';
  }
  if (
    name.includes('wireguard') ||
    name.includes('amneziawg') ||
    name.includes('wg-quick') ||
    /(?:^|[^a-z0-9])wg\d*(?:$|[^a-z0-9])/i.test(name)
  ) {
    return 'WireGuard';
  }
  if (name.includes('tailscale')) {
    return 'Tailscale';
  }
  // Tailscale / CGNAT 100.64.0.0/10 (100.64.x.x - 100.127.x.x)
  if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) {
    return 'Tailscale';
  }
  return null;
}

function getLocalNetworkAddresses(port, token) {
  const lan = [];
  const vpn = [];
  const vpnProviders = [];
  if (!port || !token) {
    return {
      lan,
      tailscale: vpn,
      vpn,
      lanUrl: null,
      vpnUrl: null,
      vpnProvider: null,
      vpnProviders,
    };
  }

  const seenIps = new Set();
  const interfaces = os.networkInterfaces();

  for (const [adapterName, entries] of Object.entries(interfaces)) {
    if (!Array.isArray(entries)) continue;
    for (const iface of entries) {
      if (!iface || iface.internal) continue;
      if (iface.family !== 'IPv4' && iface.family !== 4) continue;
      const ip = iface.address;
      if (!ip || seenIps.has(ip)) continue;

      const octets = ip.split('.').map((part) => Number.parseInt(part, 10));
      if (
        octets.length !== 4 ||
        octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)
      ) {
        continue;
      }

      // Skip link-local 169.254.x.x
      if (octets[0] === 169 && octets[1] === 254) {
        continue;
      }

      seenIps.add(ip);
      const url = `http://${ip}:${port}/?ml_token=${encodeURIComponent(token)}`;
      const detectedProvider = detectMeshVpnProvider(adapterName, octets);

      if (detectedProvider) {
        vpn.push(url);
        if (!vpnProviders.includes(detectedProvider)) {
          vpnProviders.push(detectedProvider);
        }
      } else if (
        octets[0] === 10 ||
        (octets[0] === 192 && octets[1] === 168) ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
      ) {
        lan.push(url);
      }
    }
  }

  return {
    lan,
    tailscale: vpn,
    vpn,
    lanUrl: lan[0] ?? null,
    vpnUrl: vpn[0] ?? null,
    vpnProvider: vpnProviders[0] ?? null,
    vpnProviders,
  };
}

function getMobileLinkStatusPayload() {
  const active = Boolean(mobileLinkState.active && mobileLinkState.server);
  const port = active ? mobileLinkState.port : null;
  const token = active ? mobileLinkState.token : null;
  const detected = active
    ? getLocalNetworkAddresses(port, token)
    : {
        lan: [],
        tailscale: [],
        vpn: [],
        lanUrl: null,
        vpnUrl: null,
        vpnProvider: null,
        vpnProviders: [],
      };
  return {
    active,
    port,
    token,
    urls: { lan: detected.lan, tailscale: detected.tailscale },
    lanUrl: detected.lanUrl,
    vpnUrl: detected.vpnUrl,
    vpnProvider: detected.vpnProvider,
    vpnProviders: detected.vpnProviders,
    connectedClients: active ? mobileLinkState.sseClients.size : 0,
    lastSyncAt: mobileLinkState.lastSyncAt,
  };
}

function parseLocalLoopbackTarget(rawUrl) {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    const isLoopback =
      host === '127.0.0.1' || host === 'localhost' || host === '::1';
    if (!isLoopback) {
      return null;
    }
    const port = Number.parseInt(parsed.port, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return null;
    }
    return {
      port,
      serviceLabel: port === MOBILE_LINK_LMSTUDIO_PORT ? 'LM Studio' : 'Local Server',
    };
  } catch {
    return null;
  }
}

function resolveMobileLinkProxyTarget(pathname) {
  if (pathname.startsWith('/v1/') || pathname === '/v1') {
    const syncedOpenaiUrl =
      mobileSyncSnapshot &&
      mobileSyncSnapshot.preferences &&
      mobileSyncSnapshot.preferences.settings
        ? mobileSyncSnapshot.preferences.settings.openaiBaseUrl
        : undefined;
    const loopbackTarget = parseLocalLoopbackTarget(syncedOpenaiUrl);
    if (loopbackTarget) {
      return {
        hostname: MOBILE_LINK_OLLAMA_HOST,
        port: loopbackTarget.port,
        serviceLabel: loopbackTarget.serviceLabel,
      };
    }
  }
  return {
    hostname: MOBILE_LINK_OLLAMA_HOST,
    port: MOBILE_LINK_OLLAMA_PORT,
    serviceLabel: 'Ollama',
  };
}

function proxyToLocalService(req, res, targetPath, target) {
  if (
    typeof targetPath !== 'string' ||
    !/^\/(api|v1)(\/|\?|$)/.test(targetPath) ||
    /[\r\n]/.test(targetPath)
  ) {
    sendJsonResponse(res, 400, { error: 'Invalid proxy target path' });
    return;
  }

  const forwardHeaders = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    const lower = key.toLowerCase();
    if (
      lower === 'host' ||
      lower === 'cookie' ||
      lower === 'x-atrium-link-token' ||
      lower === 'connection' ||
      lower === 'keep-alive' ||
      lower === 'proxy-authenticate' ||
      lower === 'proxy-authorization' ||
      lower === 'te' ||
      lower === 'trailers' ||
      lower === 'upgrade'
    ) {
      continue;
    }
    forwardHeaders[key] = value;
  }
  forwardHeaders.host = `${target.hostname}:${target.port}`;

  const proxyReq = http.request(
    {
      hostname: target.hostname,
      port: target.port,
      method: req.method || 'GET',
      path: targetPath,
      headers: forwardHeaders,
    },
    (proxyRes) => {
      const responseHeaders = { ...proxyRes.headers };
      delete responseHeaders.connection;
      delete responseHeaders['keep-alive'];
      delete responseHeaders['transfer-encoding'];
      if (!responseHeaders['cache-control']) {
        responseHeaders['cache-control'] = 'no-cache, no-transform';
      }
      responseHeaders['x-accel-buffering'] = 'no';

      res.writeHead(proxyRes.statusCode || 502, responseHeaders);
      res.flushHeaders?.();

      proxyRes.on('error', () => {
        if (!res.writableEnded) {
          res.destroy();
        }
      });
      proxyRes.pipe(res);
    }
  );

  proxyReq.setNoDelay(true);

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      sendJsonResponse(res, 502, {
        error: `Local ${target.serviceLabel} instance unreachable on ${target.hostname}:${target.port}`,
      });
    } else if (!res.writableEnded) {
      res.destroy();
    }
  });

  req.on('aborted', () => {
    proxyReq.destroy();
  });
  res.on('close', () => {
    if (!res.writableEnded) {
      proxyReq.destroy();
    }
  });

  req.pipe(proxyReq);
}

function readJsonRequestBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const contentLengthHeader = req.headers['content-length'];
    if (contentLengthHeader !== undefined) {
      const declaredLength = Number.parseInt(String(contentLengthHeader), 10);
      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.resume();
        return;
      }
    }

    const chunks = [];
    let totalBytes = 0;
    let settled = false;

    req.on('data', (chunk) => {
      if (settled) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        settled = true;
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (settled) return;
      settled = true;
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch {
        reject(Object.assign(new Error('Invalid JSON payload'), { statusCode: 400 }));
      }
    });

    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(Object.assign(err, { statusCode: 400 }));
    });
  });
}

async function handleMobileSyncRequest(req, res, parsedUrl) {
  const extraHeaders = {};
  if (parsedUrl?.searchParams?.has('deviceId')) {
    const cookies = parseCookies(req.headers.cookie);
    if (!findMatchingSessionId(cookies[MOBILE_LINK_COOKIE_NAME])) {
      const sessionId = crypto.randomBytes(24).toString('hex');
      mobileLinkState.sessions.set(sessionId, {
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      });
      extraHeaders['Set-Cookie'] =
        `${MOBILE_LINK_COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=Strict; Path=/`;
    }
  }

  if (req.method === 'GET') {
    const safeSnapshot = stripSecretsFromSyncPayload(mobileSyncSnapshot);
    sendJsonResponse(res, 200, safeSnapshot, extraHeaders);
    return;
  }

  if (req.method === 'POST') {
    try {
      const parsedBody = await readJsonRequestBody(req, MAX_MOBILE_SYNC_BYTES);
      const nextSnapshot = buildSanitizedSyncSnapshot(parsedBody);
      if (!nextSnapshot) {
        sendJsonResponse(res, 400, { error: 'Invalid sync payload object' });
        return;
      }

      if (nextSnapshot.updatedAt > mobileSyncSnapshot.updatedAt) {
        mobileSyncSnapshot = nextSnapshot;
        mobileLinkState.lastSyncAt = Date.now();
        broadcastMobileLinkEvent('sync', {
          updatedAt: mobileSyncSnapshot.updatedAt,
        });
      }

      sendJsonResponse(
        res,
        200,
        {
          ok: true,
          updatedAt: mobileSyncSnapshot.updatedAt,
        },
        extraHeaders
      );
    } catch (err) {
      const status =
        err && typeof err.statusCode === 'number' ? err.statusCode : 400;
      sendJsonResponse(res, status, {
        error:
          status === 413
            ? 'Sync payload exceeds 25 MB limit'
            : 'Invalid sync JSON payload',
      });
    }
    return;
  }

  sendJsonResponse(res, 405, { error: 'Method not allowed' });
}

async function serveStaticFromDist(req, res, parsedUrl, extraHeaders = {}) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendTextResponse(res, 405, 'Method Not Allowed');
    return;
  }

  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(parsedUrl.pathname || '/');
  } catch {
    sendTextResponse(res, 400, 'Bad Request');
    return;
  }

  if (decodedPathname.includes('\0')) {
    sendTextResponse(res, 400, 'Bad Request');
    return;
  }

  const distRoot = path.resolve(__dirname, '..', 'dist');
  const trimmedPath = decodedPathname.replace(/^\/+/, '');
  const relativeTarget = trimmedPath === '' ? 'index.html' : trimmedPath;
  const candidatePath = path.resolve(distRoot, relativeTarget);
  const relFromDist = path.relative(distRoot, candidatePath);

  if (relFromDist.startsWith('..') || path.isAbsolute(relFromDist)) {
    sendTextResponse(res, 403, 'Forbidden');
    return;
  }

  let fileToServe = null;
  try {
    const stat = await fs.promises.stat(candidatePath);
    if (stat.isFile()) {
      fileToServe = candidatePath;
    }
  } catch {
    // fallback check below
  }

  if (!fileToServe) {
    const looksLikeAsset = path.extname(relativeTarget) !== '';
    if (!looksLikeAsset) {
      const indexFile = path.join(distRoot, 'index.html');
      try {
        const indexStat = await fs.promises.stat(indexFile);
        if (indexStat.isFile()) {
          fileToServe = indexFile;
        }
      } catch {
        // index.html missing
      }
    }
  }

  if (!fileToServe) {
    sendTextResponse(res, 404, 'Not Found');
    return;
  }

  try {
    const data = await fs.promises.readFile(fileToServe);
    const mimeType = getMimeTypeForFile(fileToServe);
    const relServed = path.relative(distRoot, fileToServe).replace(/\\/g, '/');
    const isVolatile = relServed === 'index.html' || relServed === 'sw.js';

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': data.length,
      'Cache-Control': isVolatile
        ? 'no-store'
        : 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(data);
  } catch {
    sendTextResponse(res, 500, 'Failed to read static asset');
  }
}

async function handleMobileLinkHttpRequest(req, res) {
  let parsedUrl;
  try {
    parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
  } catch {
    sendTextResponse(res, 400, 'Bad Request');
    return;
  }

  const pathname = parsedUrl.pathname || '/';

  // 0. Mobile Link SSE Event Stream & Info (/api/mobile-link/*) - Must run before /api/* Ollama proxy
  if (pathname === '/api/mobile-link/events') {
    handleMobileLinkEvents(req, res, parsedUrl);
    return;
  }
  if (pathname === '/api/mobile-link/info') {
    handleMobileLinkInfo(req, res);
    return;
  }

  // 1. Streaming Local LLM Proxy (/api/* -> Ollama 11434, /v1/* -> configured 127.0.0.1 local port such as LM Studio 1234 or Ollama 11434) - Auth required
  if (pathname.startsWith('/api/') || pathname === '/api' || pathname.startsWith('/v1/') || pathname === '/v1') {
    if (!isMobileLinkRequestAuthenticated(req)) {
      sendJsonResponse(res, 401, { error: 'Unauthorized' });
      return;
    }
    const target = resolveMobileLinkProxyTarget(pathname);
    proxyToLocalService(req, res, `${pathname}${parsedUrl.search || ''}`, target);
    return;
  }

  // 2. Live Sync Relay (/mobile-sync/state) - Auth required
  if (pathname.startsWith('/mobile-sync/')) {
    if (!isMobileLinkRequestAuthenticated(req)) {
      sendJsonResponse(res, 401, { error: 'Unauthorized' });
      return;
    }
    if (pathname === '/mobile-sync/state') {
      await handleMobileSyncRequest(req, res, parsedUrl);
      return;
    }
    sendJsonResponse(res, 404, { error: 'Not Found' });
    return;
  }

  // 3. Initial Token Validation & Frontend Entry (GET /?ml_token=<token>)
  if (pathname === '/' || pathname === '/index.html') {
    const queryToken = parsedUrl.searchParams.get('ml_token');
    if (queryToken !== null) {
      if (!timingSafeVerifyToken(queryToken, mobileLinkState.token)) {
        sendTextResponse(res, 401, 'Unauthorized');
        return;
      }

      const cookies = parseCookies(req.headers.cookie);
      let sessionId = findMatchingSessionId(cookies[MOBILE_LINK_COOKIE_NAME]);
      if (!sessionId) {
        sessionId = crypto.randomBytes(24).toString('hex');
        mobileLinkState.sessions.set(sessionId, {
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        });
      } else {
        const meta = mobileLinkState.sessions.get(sessionId);
        if (meta) meta.lastSeenAt = Date.now();
      }

      const cookieHeader = `${MOBILE_LINK_COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=Strict; Path=/`;
      await serveStaticFromDist(req, res, parsedUrl, {
        'Set-Cookie': cookieHeader,
      });
      return;
    }

    if (!isMobileLinkRequestAuthenticated(req)) {
      sendTextResponse(res, 401, 'Unauthorized');
      return;
    }

    await serveStaticFromDist(req, res, parsedUrl);
    return;
  }

  // 4. Static PWA Assets from dist/ (manifest, icons, sw.js, hashed assets)
  await serveStaticFromDist(req, res, parsedUrl);
}

function listenServerOnPort(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.removeListener('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.removeListener('error', onError);
      resolve(server.address());
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

async function startMobileLinkServer(options = {}) {
  const forceRotate = Boolean(
    options && typeof options === 'object' && options.forceRotate === true
  );

  if (mobileLinkState.startPromise) {
    await mobileLinkState.startPromise.catch(() => {});
  }

  if (!forceRotate && mobileLinkState.active && mobileLinkState.server) {
    return getMobileLinkStatusPayload();
  }

  if (forceRotate && (mobileLinkState.active || mobileLinkState.server)) {
    await stopMobileLinkServer();
  }

  mobileLinkState.startPromise = (async () => {
    const token = crypto.randomBytes(24).toString('hex');
    let boundServer = null;
    let boundPort = null;

    for (let offset = 0; offset < MOBILE_LINK_MAX_PORT_ATTEMPTS; offset += 1) {
      const candidatePort = MOBILE_LINK_DEFAULT_PORT + offset;
      const server = http.createServer((req, res) => {
        void handleMobileLinkHttpRequest(req, res);
      });

      server.on('connection', (socket) => {
        mobileLinkState.sockets.add(socket);
        socket.on('close', () => {
          mobileLinkState.sockets.delete(socket);
        });
      });

      try {
        await listenServerOnPort(server, candidatePort, '0.0.0.0');
        boundServer = server;
        boundPort = candidatePort;
        break;
      } catch (err) {
        try {
          server.close();
        } catch {
          // ignore
        }
        if (err && err.code === 'EADDRINUSE') {
          continue;
        }
        throw err;
      }
    }

    if (!boundServer || boundPort === null) {
      throw new Error(
        `No available port found starting at ${MOBILE_LINK_DEFAULT_PORT}`
      );
    }

    mobileLinkState.active = true;
    mobileLinkState.server = boundServer;
    mobileLinkState.port = boundPort;
    mobileLinkState.token = token;
    mobileLinkState.sessions.clear();
    mobileLinkState.sseClients.clear();

    return getMobileLinkStatusPayload();
  })();

  try {
    return await mobileLinkState.startPromise;
  } finally {
    mobileLinkState.startPromise = null;
  }
}

async function stopMobileLinkServer() {
  const server = mobileLinkState.server;
  mobileLinkState.active = false;
  mobileLinkState.server = null;
  mobileLinkState.port = null;
  mobileLinkState.token = null;
  mobileLinkState.sessions.clear();

  for (const clientSet of mobileLinkState.sseClients.values()) {
    for (const clientRes of clientSet) {
      try {
        clientRes.end();
        clientRes.destroy();
      } catch {
        // ignore
      }
    }
  }
  mobileLinkState.sseClients.clear();

  for (const socket of Array.from(mobileLinkState.sockets)) {
    try {
      socket.unref?.();
      socket.destroy();
    } catch {
      // ignore
    }
  }
  mobileLinkState.sockets.clear();

  if (!server) {
    return getMobileLinkStatusPayload();
  }

  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(fallbackTimer);
      resolve();
    };
    const fallbackTimer = setTimeout(finish, 20);

    try {
      if (typeof server.closeIdleConnections === 'function') {
        server.closeIdleConnections();
      }
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      server.close(() => finish());
    } catch {
      finish();
    }
  });

  return getMobileLinkStatusPayload();
}

ipcMain.handle('atrium:mobile-link-start', async (event, options) => {
  if (!isAuthorizedIpcEvent(event)) {
    throw new Error('Unauthorized IPC sender');
  }
  const safeOptions =
    options && typeof options === 'object'
      ? { forceRotate: Boolean(options.forceRotate) }
      : {};
  return startMobileLinkServer(safeOptions);
});

ipcMain.handle('atrium:mobile-link-stop', async (event) => {
  if (!isAuthorizedIpcEvent(event)) {
    throw new Error('Unauthorized IPC sender');
  }
  return stopMobileLinkServer();
});

ipcMain.handle('atrium:mobile-link-status', (event) => {
  if (!isAuthorizedIpcEvent(event)) {
    throw new Error('Unauthorized IPC sender');
  }
  return getMobileLinkStatusPayload();
});

app.whenReady().then(() => {
  configurePermissions();
  configurePackagedCsp();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  resolvePendingFocus();
  stopNativeDictationProcess();
});

app.on('will-quit', () => {
  resolvePendingFocus();
  stopNativeDictationProcess();
  void stopMobileLinkServer();
});

app.on('window-all-closed', () => {
  resolvePendingFocus();
  stopNativeDictationProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
