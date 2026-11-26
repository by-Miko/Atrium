# Security Policy & Hardened Architecture — Atrium (v1.5.0)

## Supported Versions / Versiones Soportadas

| Version | Status | Security Baseline |
| :--- | :--- | :--- |
| **v1.5.0** | ✅ Supported (Latest) | Full CSP, IPC Lockdown, Electron Fuses, DPAPI, Ephemeral Mobile Link Auth |
| **v1.4.1** | ⚠️ Legacy | Full CSP, IPC Lockdown, Electron Fuses, DPAPI |
| `< 1.4.0` | ❌ Unsupported | Upgrade to v1.5.0+ |

---

## 1. Electron Process & Preload Isolation
- **Strict Sandboxing:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and `webSecurity: true`.
- **Cryptographic IPC Sender Validation:** Every exposed IPC channel (`atrium:close-window`, `atrium:speech-start`, `atrium:speech-stop`, `atrium:secret-encrypt`, `atrium:secret-decrypt`, `atrium:mobile-link-start`, `atrium:mobile-link-stop`, `atrium:mobile-link-status`) verifies `event.sender === mainWindow?.webContents && event.senderFrame === mainWindow?.webContents.mainFrame`.
- **IPC Payload Caps:** Strict payload size limit (`<= 8192` characters) enforced on IPC messages.
- **Zero Dynamic Code Execution:** Complete removal of `executeJavaScript`; input focus is handled declaratively via `atrium:focus-chat-input`.
- **Navigation & Popup Lockdown:** Global interception on `app.on('web-contents-created')` blocking `will-navigate` and denying external windows via `setWindowOpenHandler(() => ({ action: 'deny' }))`.
- **Production DevTools Lock:** Inspection shortcuts (`F12` and `Ctrl+Shift+I`) disabled in packaged builds.

## 2. Binary Sealing (`@electron/fuses`)
Applied at build time via `scripts/apply-electron-fuses.cjs`:
- `RunAsNode: false` — Prevents the binary from being invoked as an arbitrary Node.js runtime.
- `EnableNodeOptionsEnvironmentVariable: false` — Blocks injection via `NODE_OPTIONS`.
- `EnableNodeCliInspectArguments: false` — Disables `--inspect` and `--inspect-brk` debugging flags.
- `OnlyLoadAppFromAsar: true` — Enforces application loading exclusively from `app.asar`.
- `EnableEmbeddedAsarIntegrityValidation: true` — Cryptographic integrity verification of `app.asar` on startup.

## 3. Credential Isolation & Encryption (Windows DPAPI)
- **OS-Level Encryption at Rest:** Optional desktop API keys are encrypted via `safeStorage.encryptString()` (Windows DPAPI) under the `SAFE_V1:` prefix (`atrium.encryptedApiKey.v1`) and are never written in plaintext to `IndexedDB` (`stripSecretFromSettings()`).
- **Backup & Network Exclusion:** Secrets are stripped from exported `.json` backups and are never decrypted or exposed over the **Atrium Mobile Link** HTTP bridge.
- **Anti-Exfiltration Guard on Import:** Importing a `.json` backup that modifies `baseUrl` or `openaiBaseUrl` automatically purges any active `apiKey` from RAM.
- **Ephemeral Browser Sessions:** In standard web and mobile browsers, optional API keys are held strictly in tab memory (`sessionStorage`) and never persisted to disk.

## 4. Dual-Layer Content Security Policy (CSP)
Enforced simultaneously via `<meta>` (`index.html`) and HTTP response headers in `session.defaultSession.webRequest.onHeadersReceived` (`electron/main.cjs`):
- Blocks `unsafe-eval` and `object-src 'none'`.
- Restricts origins strictly to `'self'`, Google Fonts, `data:`, `blob:`, `https:`, `http://localhost:*`, `http://127.0.0.1:*`, and the Tailscale CGNAT subnet `http://100.*`.

## 5. Atrium Mobile Link Hardening (LAN & Tailscale Bridge)
- **Ephemeral Cryptographic Session Token:** Generates a 24-byte random token (`crypto.randomBytes(24).toString('hex')`) per session, verified in constant time via `crypto.timingSafeEqual`.
- **Strict Session Cookies & URL Scrubbing:** Issues `HttpOnly; SameSite=Strict; Path=/` session cookies upon validating `?ml_token=`, immediately strips the token from the browser URL bar (`history.replaceState`), and requires a valid cookie or `X-Atrium-Link-Token` header on `/api/*`, `/v1/*`, and `/mobile-sync/*` (returning `401 Unauthorized` otherwise).
- **Loopback-Only SSRF Protection:** Local proxy routes (`/api/*` and `/v1/*`) strictly restrict upstream targets to `127.0.0.1` loopback ports, preventing Server-Side Request Forgery to arbitrary external hosts.
- **Prototype Pollution & Secret Filtering in Sync:** `/mobile-sync/state` enforces a `25 MB` payload cap and recursively strips dangerous keys (`__proto__`, `constructor`, `prototype`) as well as any `apiKey` or `SAFE_V1:` properties.
- **Path Traversal Protection:** Static PWA hosting blocks any request attempting to resolve outside `dist/`.
- **Instant Socket Teardown:** Toggling Mobile Link off or quitting the app immediately destroys active connections (`server.closeAllConnections()`) in `0 ms`.

## 6. Anti-XSS, Sanitization & Anti-DoS Controls
- **Zero Raw HTML Injection:** No `dangerouslySetInnerHTML` or `innerHTML` anywhere in the codebase.
- **Text Sanitization:** All rendered strings (messages, character names, roles, and model IDs) pass through `sanitizeRenderedText()` to strip control characters and Bidi override sequences.
- **Mandatory `<canvas>` Image Re-Encoding:** All imported images are decoded and re-encoded via HTML5 `<canvas>` (`readImageFileAsDataUrl`), neutralizing embedded `data:image/svg+xml`, `javascript:`, or CSS metadata payloads.
- **Decompression Bomb Caps:** Strict size limits enforced on imports (`15 MB` max on TavernAI `.png` cards, `2 MB` max decompressed metadata, and `25 MB` max on `.json` backups).

---

## Reporting a Vulnerability / Reportar una Vulnerabilidad
If you discover a security issue in Atrium, please report it privately via GitHub Security Advisories (`Security > Advisories > Report a vulnerability`) rather than opening a public issue.

---

# Política de Seguridad y Arquitectura Blindada — Atrium (v1.5.0)

## 1. Aislamiento del Proceso Principal y Preload (Electron)
- **Sandboxing Estricto:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` y `webSecurity: true`.
- **Validación Criptográfica de Remitente IPC:** Todos los canales expuestos (`atrium:close-window`, `atrium:speech-start`, `atrium:speech-stop`, `atrium:secret-encrypt`, `atrium:secret-decrypt`, `atrium:mobile-link-start`, `atrium:mobile-link-stop`, `atrium:mobile-link-status`) verifican `event.sender === mainWindow?.webContents && event.senderFrame === mainWindow?.webContents.mainFrame`.
- **Límites de Carga Útil IPC:** Restricción estricta de tamaño (`<= 8192` caracteres) en mensajes IPC.
- **Cero Ejecución Dinámica:** Eliminación completa de `executeJavaScript`; el enfoque de inputs opera mediante el evento IPC declarativo `atrium:focus-chat-input`.
- **Bloqueo de Navegación y Ventanas Externas:** Interceptación global en `app.on('web-contents-created')` bloqueando `will-navigate` y denegando popups vía `setWindowOpenHandler(() => ({ action: 'deny' }))`.
- **Bloqueo de DevTools en Producción:** Atajos de inspección (`F12` y `Ctrl+Shift+I`) deshabilitados en builds empaquetadas.

## 2. Sellado Binario (`@electron/fuses`)
Configurado en compilación mediante `scripts/apply-electron-fuses.cjs`:
- `RunAsNode: false` — Impide ejecutar el binario como intérprete Node.js arbitrario.
- `EnableNodeOptionsEnvironmentVariable: false` — Bloquea inyección vía `NODE_OPTIONS`.
- `EnableNodeCliInspectArguments: false` — Desactiva flags de depuración `--inspect` y `--inspect-brk`.
- `OnlyLoadAppFromAsar: true` — Fuerza la carga exclusiva desde el archivo `app.asar`.
- `EnableEmbeddedAsarIntegrityValidation: true` — Verificación criptográfica de integridad de `app.asar` al iniciar.

## 3. Protección y Aislamiento de Credenciales (Windows DPAPI)
- **Cifrado en Reposo por Sesión de Usuario:** Las API keys opcionales de escritorio se cifran mediante `safeStorage.encryptString()` (Windows DPAPI) bajo el prefijo `SAFE_V1:` (`atrium.encryptedApiKey.v1`) y nunca se guardan en texto plano en `IndexedDB` (`stripSecretFromSettings()`).
- **Exclusión en Respaldos y Red:** Los secretos se omiten en copias de seguridad `.json` y jamás se desencriptan ni exponen a través del puente HTTP **Atrium Mobile Link**.
- **Defensa Anti-Exfiltración al Importar:** Importar un respaldo `.json` que altere `baseUrl` u `openaiBaseUrl` borra automáticamente cualquier `apiKey` activa en memoria RAM.
- **Sesión Efímera en Navegadores Móviles:** En navegadores estándar y móviles, las API keys opcionales residen únicamente en la memoria de la pestaña (`sessionStorage`) y nunca se guardan en disco.

## 4. Doble Capa CSP (Content Security Policy)
Aplicada simultáneamente mediante `<meta>` (`index.html`) y cabeceras HTTP en `session.defaultSession.webRequest.onHeadersReceived` (`electron/main.cjs`):
- Bloquea `unsafe-eval` y `object-src 'none'`.
- Restringe orígenes exclusivamente a `'self'`, Google Fonts, `data:`, `blob:`, `https:`, `http://localhost:*`, `http://127.0.0.1:*` y la subred CGNAT de Tailscale `http://100.*`.

## 5. Blindaje de Atrium Mobile Link (Puente LAN y Tailscale)
- **Token Efímero Criptográfico:** Genera un token aleatorio de 24 bytes (`crypto.randomBytes(24).toString('hex')`) por sesión, validado en tiempo constante con `crypto.timingSafeEqual`.
- **Cookies de Sesión Estrictas y Limpieza de URL:** Emite cookies `HttpOnly; SameSite=Strict; Path=/` tras validar `?ml_token=`, elimina de inmediato el token de la barra de direcciones (`history.replaceState`) y exige cookie válida o cabecera `X-Atrium-Link-Token` en `/api/*`, `/v1/*` y `/mobile-sync/*` (rechazando peticiones no autorizadas con `401 Unauthorized`).
- **Protección SSRF Loopback-Only:** Las rutas proxy locales (`/api/*` y `/v1/*`) restringen su destino únicamente a puertos loopback `127.0.0.1`, impidiendo redirecciones hacia servidores externos arbitrarios.
- **Filtrado Anti-Prototype Pollution en Sync:** `/mobile-sync/state` aplica un límite de `25 MB` y filtra recursivamente propiedades peligrosas (`__proto__`, `constructor`, `prototype`), así como cualquier clave `apiKey` o `SAFE_V1:`.
- **Protección contra Path Traversal:** El servidor estático de la PWA bloquea cualquier solicitud que intente escapar del directorio `dist/`.
- **Cierre Inmediato de Sockets:** Al apagar Mobile Link o cerrar la app, se destruyen las conexiones activas (`server.closeAllConnections()`) en `0 ms`.

## 6. Controles Anti-XSS, Sanitización y Anti-DoS
- **Cero Inyección HTML Cruda:** Sin `dangerouslySetInnerHTML` ni `innerHTML` en todo el código.
- **Sanitización Textual:** Todo texto renderizado (mensajes, nombres de personaje, roles e IDs de modelo) pasa por `sanitizeRenderedText()` para eliminar caracteres de control y secuencias *Bidi override*.
- **Re-codificación Obligatoria de Imágenes vía `<canvas>`:** Todas las imágenes importadas se decodifican y re-codifican mediante HTML5 `<canvas>` (`readImageFileAsDataUrl`), neutralizando cargas útiles `data:image/svg+xml`, `javascript:` o inyecciones CSS en metadatos.
- **Límites Anti-Bombas de Descompresión:** Límites estrictos de tamaño en importaciones (`15 MB` máx. en tarjetas `.png` TavernAI, `2 MB` máx. en metadatos descomprimidos y `25 MB` máx. en respaldos `.json`).

---

## Reportar una Vulnerabilidad
Si descubres un problema de seguridad en Atrium, repórtalo de forma privada mediante GitHub Security Advisories (`Security > Advisories > Report a vulnerability`) en lugar de abrir un issue público.

## 🛡️ Mobile Link & Network Hardening (v1.5.1)
- **Ephemeral 24-Byte Pairing Token & HttpOnly Cookie:** Every Mobile Link session requires a cryptographically random 24-byte ml_token exchanged for a SameSite=Strict; HttpOnly session cookie.
- **Physical Device Deduplication (deviceId):** Active SSE clients are tracked per unique ephemeral deviceId, preventing connection inflation and enforcing clean session accounting.
- **Multi-Mesh VPN Isolation (Tailscale, ZeroTier, NetBird, WireGuard):** Native detection of encrypted mesh virtual interfaces alongside active user advisories against unencrypted public Wi-Fi (AP Isolation / LAN sniffing risks).
- **Double-Layer CSP & SSRF Guards:** Strict Content Security Policy headers on both Desktop (ile://) and Mobile Link HTTP responses, with strict localhost/LAN allowlisting on proxy endpoints.
