# Atrium — v1.3.2 (Hardened)

**Privacy-First *Liquid Glass* Roleplay Chat Studio**  
*Atrium Engine v1.3.2 • Original Architecture by Miko*

[English](#english) · [Español](#español)

---

<a id="english"></a>
## English

**Atrium** is a privacy-first, desktop-grade roleplay chat studio built by **Miko**. Designed around an immersive *Liquid Glass* spatial aesthetic, Atrium runs locally on your machine with zero telemetry, zero tracking, and zero external accounts—persisting your characters, artwork, and conversations locally in IndexedDB (`atrium-db`).

### Key Pillars

- **Liquid Glass Spatial Lobby & Immersive Stage:** Two-world spatial interface featuring a character gallery Lobby and a full-viewport Immersive Stage with mouse/scroll parallax, collapsible top header and bottom composer dock, live Visual Studio customization (typography, color schemes, glass opacity), and 60 FPS GPU-accelerated transitions.
- **Central Portal Intro & Outro Choreography:** Precision SVG/gradient emblem draw-in and light-beam portal reveal at launch, paired with a clean session-saved outro sequence.
- **Universal Multi-Provider Support:** Switch seamlessly between **Ollama** (local models at `http://localhost:11434`) and **OpenAI-Compatible APIs** with one-click presets for **LM Studio**, **Google AI Studio**, **Anthropic Claude**, **OpenRouter**, Groq, or any custom endpoint.
- **OS-Level Encrypted API Keys (Windows DPAPI `safeStorage`):** Optional API keys are encrypted at rest via Electron's native `safeStorage` (backed by Windows DPAPI / OS Keychain), protected by strict `contextIsolation: true`, `nodeIntegration: false`, and URL protocol validation, and are **never included** in `.json` backup exports.
- **Hardened V2/V3 PNG Character Card Parser:** Import community `.png` character cards directly from embedded `chara` / `ccv3` metadata across standard `tEXt`, UTF-8 `iTXt`, and zlib-compressed `zTXt` chunks, automatically optimizing stored visuals to WebP for lean GPU/RAM usage.
- **Swipe Variations (`< 1 / N >`) & Continue Turn:** Regenerate alternative AI replies on any turn and flip effortlessly between variations (`< 1 / N >`), or click **Continue** to seamlessly extend the active response.
- **Silent Story Memory:** Automatically summarizes older turns every 20 messages into persistent per-character memory stored in `atrium-db` so smaller local models retain long-term plot details, with an inspectable **View / Edit Story Memory** modal.

---

### Quick Start for Windows Users

1. **Download & Launch Atrium**
   - Run **`Atrium-Portable-1.3.2.exe`** (standalone portable executable, no installation required) or install **`Atrium-Setup-1.3.2.exe`** (standard installer that preserves your `atrium-db` library across updates).
   - *Windows SmartScreen Note:* Because Atrium is an independent, self-published open-source build without a paid commercial EV code-signing certificate, Windows SmartScreen may display *"Windows protected your PC"*. Click **"More info"** → **"Run anyway"** to launch safely.
2. **Connect Your AI Engine**
   - **Local Ollama (Default):** Install [Ollama](https://ollama.com), pull a model (e.g., `ollama pull llama3.2`), and set `OLLAMA_ORIGINS=*` so local desktop/web requests connect cleanly.
   - **OpenAI-Compatible / Cloud APIs:** Open **Settings → Connection & Model**, select **OpenAI-Compatible API**, pick a preset (**LM Studio**, **Google AI Studio**, **Anthropic Claude**, **OpenRouter**, or **Custom**), and optionally enter your API key (encrypted locally via Windows DPAPI).
   - *Recommendation:* While cloud APIs like Google AI Studio and Anthropic are supported, **local models via Ollama or LM Studio (or unfiltered models on OpenRouter) are strongly recommended** for the best roleplay experience without strict cloud content filters or hidden thinking-token cutoffs.
3. **Enter the Stage & Dictate Hands-Free (`Win + H`)**
   - Click any character card in the Lobby (or drop in a V2/V3 `.png` character card) to enter the Immersive Stage.
   - Click the **microphone button** in the chat bar to focus the text box and trigger native Windows Voice Typing (**`Win + H`**) in one click.

---

### Developer Build & Packaging

#### Prerequisites
- [Node.js 20 LTS or newer](https://nodejs.org/)
- Windows 10/11 x64 (for `.exe` builds)

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start development server (port 3000)
npm run dev

# 3. Typecheck & verify web production build
npm run lint
npm run build

# 4. Build Windows executables (Portable + NSIS Installer in release/)
npm run build:exe

# Optional: Linux AppImage / macOS DMG
npm run build:linux
npm run build:mac
```

---

<a id="español"></a>
## Español

**Atrium** es un estudio de chat de roleplay de escritorio enfocado en la privacidad, creado por **Miko**. Diseñado con una estética espacial *Liquid Glass*, Atrium se ejecuta localmente en tu equipo sin telemetría, rastreo ni cuentas externas—guardando tus personajes, ilustraciones e historiales localmente en IndexedDB (`atrium-db`).

### Pilares Principales

- **Lobby Espacial *Liquid Glass* y Escenario Inmersivo:** Interfaz de dos mundos con galería de personajes en el Lobby y escenario a pantalla completa con paralaje, barra superior e inferior colapsables, **Visual Studio** en vivo (tipografía, esquemas de color y opacidad de cristal) y transiciones aceleradas por GPU a 60 FPS.
- **Coreografía Central Portal (Intro y Outro):** Emblema SVG dibujado con precisión y haz de luz dorado al iniciar, junto con una secuencia de despedida que confirma el guardado local.
- **Soporte Universal Multi-Proveedor:** Cambia fácilmente entre **Ollama** (modelos locales en `http://localhost:11434`) y **APIs compatibles con OpenAI** mediante accesos rápidos para **LM Studio**, **Google AI Studio**, **Anthropic Claude**, **OpenRouter**, Groq o endpoints personalizados.
- **Cifrado de Claves API a Nivel de Sistema (Windows DPAPI `safeStorage`):** Las claves API ingresadas se cifran en reposo con `safeStorage` nativo de Electron (respaldado por DPAPI en Windows / Keychain del sistema), protegidas por `contextIsolation: true`, `nodeIntegration: false` y validación estricta de protocolos URL, y **nunca se incluyen** al exportar respaldos `.json`.
- **Parser Endurecido de Tarjetas PNG V2/V3:** Importa tarjetas de personaje `.png` leyendo metadatos `chara` / `ccv3` en chunks `tEXt`, `iTXt` UTF-8 y `zTXt` comprimidos con zlib, optimizando automáticamente las imágenes a WebP para reducir el consumo de RAM y VRAM.
- **Variaciones Swipe (`< 1 / N >`) y Botón Continuar:** Regenera respuestas alternativas en el último turno y alterna entre ellas con `< 1 / N >`, o usa **Continuar** para extender la escena sin interrupciones.
- **Memoria Silenciosa de Historia (*Silent Story Memory*):** Resume automáticamente turnos antiguos cada 20 mensajes en `atrium-db` para que modelos locales compactos no pierdan detalles clave de la trama, con modal para ver o editar la memoria en cualquier momento.

---

### Inicio Rápido para Usuarios de Windows

1. **Descarga y Abre Atrium**
   - Ejecuta **`Atrium-Portable-1.3.2.exe`** (versión portátil sin instalación) o instala **`Atrium-Setup-1.3.2.exe`** (instalador estándar que conserva tu base `atrium-db` entre actualizaciones).
   - *Nota sobre Windows SmartScreen:* Al ser un proyecto independiente y de código abierto sin certificado comercial de firma de código, Windows SmartScreen puede mostrar *"Windows protegió su PC"*. Haz clic en **"Más información"** → **"Ejecutar de todas formas"** para iniciar con seguridad.
2. **Conecta tu Motor de IA**
   - **Ollama Local (Predeterminado):** Instala [Ollama](https://ollama.com), descarga un modelo (ej. `ollama pull llama3.2`) y configura la variable `OLLAMA_ORIGINS=*` para permitir la conexión local.
   - **API Compatible con OpenAI / Nube:** Entra a **Ajustes → Conexión y Modelo**, elige **API Compatible con OpenAI**, selecciona un preset (**LM Studio**, **Google AI Studio**, **Anthropic Claude**, **OpenRouter** o **Personalizado**) y añade opcionalmente tu clave API (cifrada localmente con Windows DPAPI).
   - *Recomendación:* Aunque las APIs en la nube como Google AI Studio y Anthropic son compatibles, **se recomiendan ampliamente los modelos locales mediante Ollama o LM Studio (o modelos sin censura en OpenRouter)** para disfrutar la mejor experiencia de roleplay sin filtros estrictos de contenido en la nube ni recortes por tokens ocultos de razonamiento.
3. **Entra al Escenario y Dicta por Voz (`Win + H`)**
   - Haz clic en cualquier tarjeta del Lobby (o importa un archivo `.png` V2/V3) para entrar al Escenario Inmersivo.
   - Pulsa el **botón del micrófono** en la barra de chat para enfocar el cuadro de texto y activar el Dictado por Voz neuronal nativo de Windows (**`Win + H`**) con un solo clic.

---

## License & Copyright

Released under the **MIT License**.

```text
MIT License

Copyright © 2026 Miko. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
