import type { Character } from '../types/chat';
import { readImageFileAsDataUrl, sanitizeImageUrl } from './imageUpload';
import { sanitizeRenderedText } from './sanitize';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const MAX_PNG_FILE_BYTES = 15 * 1024 * 1024;
const MAX_METADATA_CHUNK_BYTES = 4 * 1024 * 1024;
const MAX_COMPRESSED_CHUNK_BYTES = 2 * 1024 * 1024;
const MAX_DECOMPRESSED_BYTES = 2 * 1024 * 1024;
const MAX_EXPORT_IMAGE_DIMENSION = 1024;
const MAX_EMBEDDED_BACKGROUND_DATA_URL_LENGTH = 2_400_000;
const PORTABLE_IMAGE_URL_REGEX =
  /^(?:data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+|https?:\/\/\S+)$/i;

function isPortableImageUrl(rawUrl: unknown): string | undefined {
  const safeUrl = sanitizeImageUrl(rawUrl);
  if (!safeUrl) return undefined;
  return PORTABLE_IMAGE_URL_REGEX.test(safeUrl) ? safeUrl : undefined;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function encodeUtf8Base64(text: string): string {
  const utf8Bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < utf8Bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...utf8Bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

interface RawTavernCardData {
  name?: unknown;
  char_name?: unknown;
  nickname?: unknown;
  description?: unknown;
  char_persona?: unknown;
  personality?: unknown;
  scenario?: unknown;
  world_scenario?: unknown;
  first_mes?: unknown;
  char_greeting?: unknown;
  alternate_greetings?: unknown;
  mes_example?: unknown;
  example_dialogue?: unknown;
  system_prompt?: unknown;
  post_history_instructions?: unknown;
  creator_notes?: unknown;
  tags?: unknown;
  avatar?: unknown;
  extensions?: unknown;
}

function isPngSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  for (let i = 0; i < 8; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

class DecompressionLimitError extends Error {}

async function decompressWithFormat(
  bytes: Uint8Array,
  format: 'deflate' | 'deflate-raw'
): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream unavailable');
  }
  if (bytes.byteLength > MAX_COMPRESSED_CHUNK_BYTES) {
    throw new DecompressionLimitError(
      'Compressed PNG metadata chunk exceeds safety size limit.'
    );
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy.buffer])
    .stream()
    .pipeThrough(new DecompressionStream(format));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_DECOMPRESSED_BYTES) {
        await reader.cancel();
        throw new DecompressionLimitError(
          'Decompressed PNG character metadata exceeds the 2 MB safety limit.'
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

async function inflateZlibBytes(
  compressed: Uint8Array
): Promise<Uint8Array | null> {
  if (compressed.length === 0 || typeof DecompressionStream === 'undefined') {
    return null;
  }

  try {
    return await decompressWithFormat(compressed, 'deflate');
  } catch (err) {
    if (err instanceof DecompressionLimitError) throw err;
    // Fallback for raw deflate streams or truncated zlib trailers
  }

  try {
    return await decompressWithFormat(compressed, 'deflate-raw');
  } catch (err) {
    if (err instanceof DecompressionLimitError) throw err;
    // Try stripping standard 2-byte zlib header + optional 4-byte Adler32 trailer
  }

  if (compressed.length > 6 && (compressed[0] & 0x0f) === 8) {
    try {
      return await decompressWithFormat(
        compressed.subarray(2, compressed.length - 4),
        'deflate-raw'
      );
    } catch (err) {
      if (err instanceof DecompressionLimitError) throw err;
      // ignore invalid deflate payload
    }
  }

  return null;
}

function decodeBase64Utf8(base64Raw: string): string {
  const cleaned = base64Raw
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padRemainder = cleaned.length % 4;
  const padded =
    padRemainder === 0
      ? cleaned
      : cleaned + '='.repeat(4 - padRemainder);

  const binaryStr = atob(padded);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i += 1) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new TextDecoder('utf-8', { fatal: false })
    .decode(bytes)
    .replace(/^\uFEFF/, '');
}

function decodeTextChunkPayload(
  payloadBytes: Uint8Array,
  latin1: TextDecoder,
  utf8: TextDecoder
): string {
  const latinText = latin1.decode(payloadBytes);
  const trimmedLatin = latinText.replace(/^\uFEFF/, '').trimStart();
  if (trimmedLatin.startsWith('{')) {
    const utf8Text = utf8.decode(payloadBytes).replace(/^\uFEFF/, '');
    if (utf8Text.trimStart().startsWith('{')) {
      return utf8Text;
    }
  }
  return latinText;
}

function tryParseCardJson(rawText: string): Record<string, unknown> | null {
  const trimmed = rawText.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through
    }
  }

  try {
    const decoded = decodeBase64Utf8(trimmed).trim();
    const parsed: unknown = JSON.parse(decoded);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore invalid candidate
  }

  return null;
}

function cleanString(value: unknown, maxLength = 20000): string {
  if (typeof value !== 'string') return '';
  return sanitizeRenderedText(value).trim().slice(0, maxLength);
}

function replacePlaceholders(text: string, charName: string): string {
  return text
    .replace(/\{\{\s*char\s*\}\}/gi, charName)
    .replace(/\{\{\s*user\s*\}\}/gi, 'the user');
}

function buildBioFromCard(
  data: RawTavernCardData,
  charName: string
): string {
  const candidate =
    cleanString(data.creator_notes) ||
    cleanString(data.personality) ||
    cleanString(data.description);
  if (!candidate) {
    return 'Imported TavernAI character card.';
  }
  const singleLine = replacePlaceholders(candidate, charName)
    .replace(/\s+/g, ' ')
    .trim();
  return singleLine.length > 140
    ? `${singleLine.slice(0, 137).trimEnd()}...`
    : singleLine;
}

function buildSystemPromptFromCard(
  data: RawTavernCardData,
  charName: string
): string {
  const sections: string[] = [];

  const systemPrompt = cleanString(data.system_prompt);
  const description = cleanString(data.description);
  const personality =
    cleanString(data.personality) || cleanString(data.char_persona);
  const scenario =
    cleanString(data.scenario) || cleanString(data.world_scenario);
  const mesExample =
    cleanString(data.mes_example) || cleanString(data.example_dialogue);
  const postHistory = cleanString(data.post_history_instructions);

  if (systemPrompt) {
    sections.push(replacePlaceholders(systemPrompt, charName));
  }
  if (description) {
    sections.push(
      `Character Description (${charName}):\n${replacePlaceholders(description, charName)}`
    );
  }
  if (personality) {
    sections.push(
      `Personality:\n${replacePlaceholders(personality, charName)}`
    );
  }
  if (scenario) {
    sections.push(`Scenario:\n${replacePlaceholders(scenario, charName)}`);
  }
  if (mesExample) {
    sections.push(
      `Example Dialogue:\n${replacePlaceholders(mesExample, charName)}`
    );
  }
  if (postHistory) {
    sections.push(
      `Roleplay Guidelines:\n${replacePlaceholders(postHistory, charName)}`
    );
  }

  if (sections.length === 0) {
    return `You are ${charName}. Stay strictly in character, describe physical actions in *italics*, and respond naturally.`;
  }

  return sections.join('\n\n');
}

function hasTavernCardFields(obj: Record<string, unknown>): boolean {
  const target =
    obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)
      ? (obj.data as Record<string, unknown>)
      : obj;
  const candidateKeys = [
    'name',
    'char_name',
    'nickname',
    'description',
    'personality',
    'char_persona',
    'first_mes',
    'char_greeting',
    'system_prompt',
    'scenario',
    'world_scenario',
  ];
  return candidateKeys.some(
    (key) => typeof target[key] === 'string' && String(target[key]).trim().length > 0
  );
}

function buildCharacterFromCardObject(
  parsedJson: Record<string, unknown>,
  fallbackFileName: string,
  portraitDataUrl?: string
): Character {
  const cardData = (
    parsedJson.data &&
    typeof parsedJson.data === 'object' &&
    !Array.isArray(parsedJson.data)
      ? parsedJson.data
      : parsedJson
  ) as RawTavernCardData;

  const charName =
    cleanString(cardData.name, 100) ||
    cleanString(cardData.char_name, 100) ||
    cleanString(cardData.nickname, 100) ||
    fallbackFileName;

  const rawTags = Array.isArray(cardData.tags)
    ? cardData.tags
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => sanitizeRenderedText(t).trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const tags = rawTags.length > 0 ? rawTags : ['Tavern Card'];
  const role = (rawTags[0] || 'Imported Persona').slice(0, 80);

  const alternateGreeting = Array.isArray(cardData.alternate_greetings)
    ? cardData.alternate_greetings.find(
        (g): g is string => typeof g === 'string' && g.trim().length > 0
      )
    : undefined;
  const rawGreeting =
    cleanString(cardData.first_mes, 6000) ||
    cleanString(cardData.char_greeting, 6000) ||
    cleanString(alternateGreeting, 6000);
  const greeting = rawGreeting
    ? replacePlaceholders(rawGreeting, charName).slice(0, 6000)
    : `*${charName} looks up as you step closer.* What brings you here?`;

  const bio = buildBioFromCard(cardData, charName);
  const systemPrompt = buildSystemPromptFromCard(cardData, charName).slice(
    0,
    20000
  );
  const jsonAvatar =
    !portraitDataUrl && typeof cardData.avatar === 'string'
      ? isPortableImageUrl(cardData.avatar)
      : undefined;
  const resolvedAvatar = portraitDataUrl ?? jsonAvatar;

  const rawExtensions =
    cardData.extensions &&
    typeof cardData.extensions === 'object' &&
    !Array.isArray(cardData.extensions)
      ? (cardData.extensions as Record<string, unknown>)
      : parsedJson.extensions &&
          typeof parsedJson.extensions === 'object' &&
          !Array.isArray(parsedJson.extensions)
        ? (parsedJson.extensions as Record<string, unknown>)
        : null;
  const rawAtriumExtension =
    rawExtensions?.atrium &&
    typeof rawExtensions.atrium === 'object' &&
    !Array.isArray(rawExtensions.atrium)
      ? (rawExtensions.atrium as Record<string, unknown>)
      : null;
  const rawBackgroundCandidate =
    typeof rawAtriumExtension?.backgroundImage === 'string'
      ? rawAtriumExtension.backgroundImage
      : typeof rawAtriumExtension?.sceneUrl === 'string'
        ? rawAtriumExtension.sceneUrl
        : undefined;
  const portableStageBackground = isPortableImageUrl(rawBackgroundCandidate);
  const restoredStageBackground = portableStageBackground
    ? portableStageBackground
    : rawBackgroundCandidate
      ? resolvedAvatar
      : undefined;

  return {
    id: `char-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: charName,
    role,
    bio,
    greeting,
    systemPrompt,
    imageUrl: resolvedAvatar,
    ...(restoredStageBackground
      ? { stageBackground: restoredStageBackground }
      : {}),
    tags,
    icon: 'orbit',
    tone: 'cobalt',
  };
}

export async function parsePngCharacterCard(file: File): Promise<Character> {
  if (file.size > MAX_PNG_FILE_BYTES) {
    throw new Error(
      'Selected character card exceeds the 15 MB maximum file size.'
    );
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const utf8 = new TextDecoder('utf-8', { fatal: false });
  const fallbackFileName =
    sanitizeRenderedText(file.name.replace(/\.(png|json)$/i, ''))
      .trim()
      .slice(0, 100) || 'Imported Character';

  // Validate PNG by binary 8-byte signature rather than file.type (iOS Safari / Files app can omit MIME type)
  if (!isPngSignature(bytes)) {
    const lowerName = (file.name || '').toLowerCase();
    if (bytes.byteLength <= MAX_METADATA_CHUNK_BYTES) {
      const jsonText = utf8.decode(bytes);
      const parsedJson = tryParseCardJson(jsonText);
      if (parsedJson && hasTavernCardFields(parsedJson)) {
        return buildCharacterFromCardObject(parsedJson, fallbackFileName);
      }
    }
    if (lowerName.endsWith('.json')) {
      throw new Error(
        'Selected JSON file does not contain valid TavernAI V2/V3 character metadata.'
      );
    }
    throw new Error(
      'Selected file is not a valid PNG character card or character JSON file.'
    );
  }

  const view = new DataView(buffer);
  const latin1 = new TextDecoder('latin1');

  const candidatesByKeyword: Record<'ccv3' | 'chara', string[]> = {
    ccv3: [],
    chara: [],
  };
  let sawCompressedUnsupported = false;
  let offset = 8;

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const type = latin1.decode(bytes.subarray(offset + 4, offset + 8));
    const dataStart = offset + 8;

    if (length > bytes.length - dataStart) {
      break;
    }

    const dataEnd = dataStart + length;
    const chunkData = bytes.subarray(dataStart, dataEnd);

    if (
      (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') &&
      length > MAX_METADATA_CHUNK_BYTES
    ) {
      throw new Error(
        'PNG character metadata chunk exceeds the 4 MB safety limit.'
      );
    }

    if (type === 'tEXt') {
      const nullIdx = chunkData.indexOf(0);
      if (nullIdx !== -1) {
        const keyword = latin1
          .decode(chunkData.subarray(0, nullIdx))
          .trim()
          .toLowerCase();
        if (keyword === 'chara' || keyword === 'ccv3') {
          const textVal = decodeTextChunkPayload(
            chunkData.subarray(nullIdx + 1),
            latin1,
            utf8
          );
          if (textVal.trim()) {
            candidatesByKeyword[keyword].push(textVal);
          }
        }
      }
    } else if (type === 'zTXt') {
      const nullIdx = chunkData.indexOf(0);
      if (nullIdx !== -1 && nullIdx + 2 <= chunkData.length) {
        const keyword = latin1
          .decode(chunkData.subarray(0, nullIdx))
          .trim()
          .toLowerCase();
        if (keyword === 'chara' || keyword === 'ccv3') {
          const compressionMethod = chunkData[nullIdx + 1];
          if (compressionMethod === 0) {
            if (typeof DecompressionStream === 'undefined') {
              sawCompressedUnsupported = true;
            } else {
              const decompressed = await inflateZlibBytes(
                chunkData.subarray(nullIdx + 2)
              );
              if (decompressed) {
                const textVal = decodeTextChunkPayload(
                  decompressed,
                  latin1,
                  utf8
                );
                if (textVal.trim()) {
                  candidatesByKeyword[keyword].push(textVal);
                }
              }
            }
          }
        }
      }
    } else if (type === 'iTXt') {
      const firstNull = chunkData.indexOf(0);
      if (firstNull !== -1 && firstNull + 3 <= chunkData.length) {
        const keyword = latin1
          .decode(chunkData.subarray(0, firstNull))
          .trim()
          .toLowerCase();
        if (keyword === 'chara' || keyword === 'ccv3') {
          const compressionFlag = chunkData[firstNull + 1];
          const compressionMethod = chunkData[firstNull + 2];
          const secondNull = chunkData.indexOf(0, firstNull + 3);
          const thirdNull =
            secondNull !== -1 ? chunkData.indexOf(0, secondNull + 1) : -1;
          const payloadStart =
            thirdNull !== -1
              ? thirdNull + 1
              : secondNull !== -1
                ? secondNull + 1
                : firstNull + 3;
          const payloadBytes = chunkData.subarray(payloadStart);

          if (compressionFlag === 1) {
            if (compressionMethod === 0) {
              if (typeof DecompressionStream === 'undefined') {
                sawCompressedUnsupported = true;
              } else {
                const decompressed = await inflateZlibBytes(payloadBytes);
                if (decompressed) {
                  const textVal = utf8.decode(decompressed);
                  if (textVal.trim()) {
                    candidatesByKeyword[keyword].push(textVal);
                  }
                }
              }
            }
          } else {
            const textVal = utf8.decode(payloadBytes);
            if (textVal.trim()) {
              candidatesByKeyword[keyword].push(textVal);
            }
          }
        }
      }
    } else if (type === 'IEND') {
      break;
    }

    offset = Math.min(dataEnd + 4, bytes.length); // skip 4-byte CRC safely
  }

  const orderedCandidates = [
    ...candidatesByKeyword.ccv3,
    ...candidatesByKeyword.chara,
  ];

  if (orderedCandidates.length === 0) {
    if (sawCompressedUnsupported) {
      throw new Error(
        'Compressed PNG metadata (zTXt/iTXt) requires a browser with DecompressionStream support.'
      );
    }
    throw new Error(
      'No TavernAI/V2/V3 "chara" or "ccv3" metadata found inside this PNG image.'
    );
  }

  let parsedJson: Record<string, unknown> | null = null;
  for (const candidate of orderedCandidates) {
    parsedJson = tryParseCardJson(candidate);
    if (parsedJson) break;
  }

  if (!parsedJson) {
    throw new Error(
      'Found character metadata in PNG, but it could not be parsed as valid character JSON.'
    );
  }

  const portraitDataUrl = await readImageFileAsDataUrl(file, 1280, 0.85);
  return buildCharacterFromCardObject(
    parsedJson,
    fallbackFileName,
    portraitDataUrl
  );
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to encode character card PNG buffer.'));
            return;
          }
          blob
            .arrayBuffer()
            .then((buffer) => resolve(new Uint8Array(buffer)))
            .catch(() =>
              reject(new Error('Failed to read generated PNG binary buffer.'))
            );
        },
        'image/png'
      );
    } catch (err) {
      reject(err);
    }
  });
}

async function renderFallbackPortraitPngBytes(
  charName: string
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable for PNG card export.');
  }

  const bgGradient = ctx.createLinearGradient(0, 0, 512, 768);
  bgGradient.addColorStop(0, '#120d24');
  bgGradient.addColorStop(0.55, '#090810');
  bgGradient.addColorStop(1, '#1a1130');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, 512, 768);

  const glow = ctx.createRadialGradient(256, 300, 20, 256, 300, 260);
  glow.addColorStop(0, 'rgba(167, 139, 250, 0.28)');
  glow.addColorStop(1, 'rgba(167, 139, 250, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 512, 768);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 464, 720);

  const initial = (charName.trim().charAt(0) || 'A').toUpperCase();
  ctx.fillStyle = '#F5F3FF';
  ctx.font = '700 132px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, 256, 330);

  ctx.fillStyle = 'rgba(226, 218, 255, 0.85)';
  ctx.font = '600 24px Inter, sans-serif';
  ctx.fillText(charName.slice(0, 26), 256, 460);

  ctx.fillStyle = 'rgba(167, 139, 250, 0.65)';
  ctx.font = '500 13px Inter, sans-serif';
  ctx.fillText('ATRIUM CHARACTER CARD', 256, 696);

  return canvasToPngBytes(canvas);
}

async function renderAvatarToCleanPngBytes(
  rawImageUrl: string | undefined,
  charName: string
): Promise<Uint8Array> {
  const safeUrl = sanitizeImageUrl(rawImageUrl);
  if (!safeUrl) {
    return renderFallbackPortraitPngBytes(charName);
  }

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      if (
        /^https?:\/\//i.test(safeUrl) &&
        typeof window !== 'undefined' &&
        !safeUrl.startsWith(window.location.origin)
      ) {
        image.crossOrigin = 'anonymous';
      }
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error('Failed to load avatar image for PNG card export.'));
      image.src = safeUrl;
    });

    const naturalWidth = img.naturalWidth || img.width || 512;
    const naturalHeight = img.naturalHeight || img.height || 512;
    const scale = Math.min(
      1,
      MAX_EXPORT_IMAGE_DIMENSION / Math.max(naturalWidth, naturalHeight)
    );
    const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is unavailable for PNG card export.');
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    return await canvasToPngBytes(canvas);
  } catch {
    return renderFallbackPortraitPngBytes(charName);
  }
}

async function renderBackgroundToDataUrl(
  rawImageUrl: string | undefined
): Promise<string | undefined> {
  const safeUrl = sanitizeImageUrl(rawImageUrl);
  if (!safeUrl) return undefined;

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      if (
        /^https?:\/\//i.test(safeUrl) &&
        typeof window !== 'undefined' &&
        !safeUrl.startsWith(window.location.origin)
      ) {
        image.crossOrigin = 'anonymous';
      }
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error('Failed to load background image for PNG card export.'));
      image.src = safeUrl;
    });

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    if (naturalWidth <= 0 || naturalHeight <= 0) {
      return isPortableImageUrl(safeUrl);
    }

    const canvas = document.createElement('canvas');
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return isPortableImageUrl(safeUrl);
    }

    ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);

    const qualities = [0.9, 0.8, 0.68];
    for (const quality of qualities) {
      const webpDataUrl = canvas.toDataURL('image/webp', quality);
      if (
        webpDataUrl.startsWith('data:image/webp') &&
        webpDataUrl.length <= MAX_EMBEDDED_BACKGROUND_DATA_URL_LENGTH
      ) {
        return webpDataUrl;
      }

      const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
      if (
        jpegDataUrl.startsWith('data:image/jpeg') &&
        jpegDataUrl.length <= MAX_EMBEDDED_BACKGROUND_DATA_URL_LENGTH
      ) {
        return jpegDataUrl;
      }
    }

    const fallbackWebp = canvas.toDataURL('image/webp', 0.6);
    if (
      fallbackWebp.startsWith('data:image/webp') &&
      fallbackWebp.length <= MAX_EMBEDDED_BACKGROUND_DATA_URL_LENGTH
    ) {
      return fallbackWebp;
    }

    const fallbackJpeg = canvas.toDataURL('image/jpeg', 0.6);
    return fallbackJpeg.startsWith('data:image/jpeg') &&
      fallbackJpeg.length <= MAX_EMBEDDED_BACKGROUND_DATA_URL_LENGTH
      ? fallbackJpeg
      : isPortableImageUrl(safeUrl);
  } catch {
    return isPortableImageUrl(safeUrl);
  }
}

function createPngTextChunk(keyword: string, text: string): Uint8Array {
  const encoder = new TextEncoder();
  const keywordBytes = encoder.encode(keyword);
  const textBytes = encoder.encode(text);
  const chunkDataLength = keywordBytes.length + 1 + textBytes.length;

  const chunk = new Uint8Array(12 + chunkDataLength);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, chunkDataLength, false);

  // "tEXt"
  chunk[4] = 0x74;
  chunk[5] = 0x45;
  chunk[6] = 0x58;
  chunk[7] = 0x74;

  chunk.set(keywordBytes, 8);
  chunk[8 + keywordBytes.length] = 0x00;
  chunk.set(textBytes, 8 + keywordBytes.length + 1);

  const crcValue = crc32(chunk.subarray(4, 8 + chunkDataLength));
  view.setUint32(8 + chunkDataLength, crcValue, false);
  return chunk;
}

function injectChunkBeforeIend(
  pngBytes: Uint8Array,
  textChunk: Uint8Array
): Uint8Array {
  if (!isPngSignature(pngBytes)) {
    throw new Error('Invalid PNG buffer generated during character export.');
  }

  const view = new DataView(
    pngBytes.buffer,
    pngBytes.byteOffset,
    pngBytes.byteLength
  );
  const latin1 = new TextDecoder('latin1');
  let offset = 8;
  let iendOffset = -1;

  while (offset + 12 <= pngBytes.length) {
    const length = view.getUint32(offset, false);
    const type = latin1.decode(pngBytes.subarray(offset + 4, offset + 8));
    if (type === 'IEND') {
      iendOffset = offset;
      break;
    }
    const nextOffset = offset + 12 + length;
    if (nextOffset > pngBytes.length) {
      break;
    }
    offset = nextOffset;
  }

  if (iendOffset === -1) {
    throw new Error('Generated PNG buffer is missing an IEND chunk.');
  }

  const output = new Uint8Array(pngBytes.length + textChunk.length);
  output.set(pngBytes.subarray(0, iendOffset), 0);
  output.set(textChunk, iendOffset);
  output.set(pngBytes.subarray(iendOffset), iendOffset + textChunk.length);
  return output;
}

export async function exportCharacterAsPngCard(
  character: Character
): Promise<string> {
  const cleanName = sanitizeRenderedText(character.name).trim() || 'Character';
  const cleanRole = sanitizeRenderedText(character.role || '').trim();
  const cleanBio = sanitizeRenderedText(character.bio || '').trim();
  const cleanGreeting = sanitizeRenderedText(character.greeting || '').trim();
  const cleanSystemPrompt = sanitizeRenderedText(
    character.systemPrompt || ''
  ).trim();
  const cleanTags = Array.isArray(character.tags)
    ? character.tags
        .map((tag) => sanitizeRenderedText(tag).trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const safeAvatarUrl = sanitizeImageUrl(character.imageUrl);
  const rawStageBg = sanitizeImageUrl(
    character.stageBackground || character.wallpaperUrl
  );
  const embeddedBackgroundImage =
    rawStageBg && rawStageBg !== safeAvatarUrl
      ? await renderBackgroundToDataUrl(rawStageBg)
      : undefined;
  const separateBackgroundImage =
    embeddedBackgroundImage && embeddedBackgroundImage !== safeAvatarUrl
      ? embeddedBackgroundImage
      : undefined;

  const cleanPngBytes = await renderAvatarToCleanPngBytes(
    safeAvatarUrl,
    cleanName
  );

  const v2Metadata = {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: cleanName,
      description: cleanBio || cleanRole,
      personality: '',
      scenario: cleanRole,
      first_mes: cleanGreeting,
      mes_example: '',
      creator_notes: cleanBio,
      system_prompt: cleanSystemPrompt,
      tags: cleanTags,
      alternate_greetings: [] as string[],
      character_book: { entries: [] as unknown[] },
      ...(separateBackgroundImage
        ? {
            extensions: {
              atrium: {
                backgroundImage: separateBackgroundImage,
              },
            },
          }
        : {}),
    },
  };

  const base64Payload = encodeUtf8Base64(JSON.stringify(v2Metadata));
  const textChunk = createPngTextChunk('chara', base64Payload);
  const finalPngBytes = injectChunkBeforeIend(cleanPngBytes, textChunk);

  const sanitizedFileBase =
    cleanName
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'character-card';
  const fileName = `${sanitizedFileBase}.png`;

  const blob = new Blob([finalPngBytes.buffer as ArrayBuffer], {
    type: 'image/png',
  });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

  return fileName;
}
