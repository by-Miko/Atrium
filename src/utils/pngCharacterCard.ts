import type { Character } from '../types/chat';
import { readImageFileAsDataUrl } from './imageUpload';
import { sanitizeRenderedText } from './sanitize';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const MAX_PNG_FILE_BYTES = 15 * 1024 * 1024;
const MAX_METADATA_CHUNK_BYTES = 4 * 1024 * 1024;
const MAX_COMPRESSED_CHUNK_BYTES = 2 * 1024 * 1024;
const MAX_DECOMPRESSED_BYTES = 2 * 1024 * 1024;

interface RawTavernCardData {
  name?: unknown;
  nickname?: unknown;
  description?: unknown;
  personality?: unknown;
  scenario?: unknown;
  first_mes?: unknown;
  alternate_greetings?: unknown;
  mes_example?: unknown;
  system_prompt?: unknown;
  post_history_instructions?: unknown;
  creator_notes?: unknown;
  tags?: unknown;
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
  const personality = cleanString(data.personality);
  const scenario = cleanString(data.scenario);
  const mesExample = cleanString(data.mes_example);
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

export async function parsePngCharacterCard(file: File): Promise<Character> {
  if (file.size > MAX_PNG_FILE_BYTES) {
    throw new Error(
      'Selected PNG character card exceeds the 15 MB maximum file size.'
    );
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (!isPngSignature(bytes)) {
    throw new Error('Selected file is not a valid PNG image.');
  }

  const view = new DataView(buffer);
  const latin1 = new TextDecoder('latin1');
  const utf8 = new TextDecoder('utf-8', { fatal: false });

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

  const cardData = (
    parsedJson.data &&
    typeof parsedJson.data === 'object' &&
    !Array.isArray(parsedJson.data)
      ? parsedJson.data
      : parsedJson
  ) as RawTavernCardData;

  const fallbackFileName =
    sanitizeRenderedText(file.name.replace(/\.png$/i, '')).trim().slice(0, 100) ||
    'Imported Character';
  const charName =
    cleanString(cardData.name, 100) ||
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
    cleanString(cardData.first_mes, 6000) || cleanString(alternateGreeting, 6000);
  const greeting = rawGreeting
    ? replacePlaceholders(rawGreeting, charName).slice(0, 6000)
    : `*${charName} looks up as you step closer.* What brings you here?`;

  const bio = buildBioFromCard(cardData, charName);
  const systemPrompt = buildSystemPromptFromCard(cardData, charName).slice(
    0,
    20000
  );
  const portraitDataUrl = await readImageFileAsDataUrl(file, 1280, 0.85);

  return {
    id: `char-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: charName,
    role,
    bio,
    greeting,
    systemPrompt,
    imageUrl: portraitDataUrl,
    tags,
    icon: 'orbit',
    tone: 'cobalt',
  };
}
