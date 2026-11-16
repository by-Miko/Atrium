function readFileAsDataUrlFallback(file: File): Promise<string> {
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
  const objectUrl =
    typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(file)
      : null;
  const sourceUrl = objectUrl ?? (await readFileAsDataUrlFallback(file));

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
          void readFileAsDataUrlFallback(file).then(resolve, reject);
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const compressed = canvas.toDataURL('image/webp', quality);
        if (compressed.startsWith('data:image/webp')) {
          resolve(compressed);
          return;
        }
        const pngFallback = canvas.toDataURL('image/png');
        resolve(pngFallback);
      };
      img.onerror = () => {
        void readFileAsDataUrlFallback(file).then(resolve, reject);
      };
      img.src = sourceUrl;
    });
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
