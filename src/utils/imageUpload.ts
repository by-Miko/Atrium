const MAX_IMAGE_FILE_BYTES = 15 * 1024 * 1024;
const RASTER_DATA_URL_REGEX =
  /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const FORBIDDEN_URL_CHARS_REGEX = /[\u0000-\u001F\u007F"'`<>\\]/;

export function sanitizeImageUrl(rawUrl: unknown): string | undefined {
  if (typeof rawUrl !== 'string') return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed || FORBIDDEN_URL_CHARS_REGEX.test(trimmed)) {
    return undefined;
  }

  // Allow safe relative Vite asset paths (e.g. /assets/... or ./assets/...), rejecting protocol-relative //
  if (
    (trimmed.startsWith('/') && !trimmed.startsWith('//')) ||
    trimmed.startsWith('./')
  ) {
    return /\s/.test(trimmed) ? undefined : trimmed;
  }

  // Allow strictly raster base64 data URLs (explicitly blocking data:image/svg+xml and HTML payloads)
  if (trimmed.toLowerCase().startsWith('data:')) {
    const compact = trimmed.replace(/\s+/g, '');
    return RASTER_DATA_URL_REGEX.test(compact) ? compact : undefined;
  }

  if (/\s/.test(trimmed)) {
    return undefined;
  }

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === 'https:' ||
      parsed.protocol === 'http:' ||
      parsed.protocol === 'blob:' ||
      parsed.protocol === 'file:'
    ) {
      return trimmed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function escapeCssUrl(rawUrl: unknown): string | undefined {
  const safe = sanitizeImageUrl(rawUrl);
  if (!safe) return undefined;
  if (/[()'"\\\r\n]/.test(safe)) {
    return undefined;
  }
  return safe;
}

function readFileAsDataUrlForCanvas(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read selected image file.'));
      }
    };
    reader.onerror = () =>
      reject(new Error('Failed to read the selected image file.'));
    reader.readAsDataURL(file);
  });
}

export async function readImageFileAsDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.85
): Promise<string> {
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new Error('Selected image file exceeds the 15 MB size limit.');
  }

  const lowerType = (file.type || '').toLowerCase();
  const lowerName = (file.name || '').toLowerCase();
  if (lowerType.includes('svg') || lowerName.endsWith('.svg')) {
    throw new Error('SVG images are not permitted. Please upload a PNG, JPEG, or WebP image.');
  }

  const objectUrl =
    typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(file)
      : null;
  const sourceUrl = objectUrl ?? (await readFileAsDataUrlForCanvas(file));

  try {
    return await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const naturalWidth = img.naturalWidth || img.width || 1;
        const naturalHeight = img.naturalHeight || img.height || 1;
        const scale = Math.min(
          1,
          maxDimension / Math.max(naturalWidth, naturalHeight)
        );
        const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
        const targetHeight = Math.max(1, Math.round(naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context is unavailable to re-encode the image.'));
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const compressed = canvas.toDataURL('image/webp', quality);
        if (compressed.startsWith('data:image/webp')) {
          resolve(compressed);
          return;
        }
        const pngFallback = canvas.toDataURL('image/png');
        if (pngFallback.startsWith('data:image/png')) {
          resolve(pngFallback);
          return;
        }
        reject(new Error('Failed to re-encode image into a safe raster format.'));
      };
      img.onerror = () => {
        reject(new Error('Selected file could not be decoded as a valid raster image.'));
      };
      img.src = sourceUrl;
    });
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
