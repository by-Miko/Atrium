#!/usr/bin/env node
/**
 * Zero-dependency PNG-to-ICO generator for Atrium.
 * Reads build/icon.png (512x512 RGBA PNG) and outputs build/icon.ico
 * containing 256x256 and 64x64 32-bit PNG-in-ICO frames.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_PNG = path.join(ROOT_DIR, 'build', 'icon.png');
const FALLBACK_PNG = path.join(ROOT_DIR, 'public', 'pwa-512x512.png');
const OUTPUT_ICO = path.join(ROOT_DIR, 'build', 'icon.ico');

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// Precompute CRC32 table for PNG chunk writing
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngRgba(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Input icon is not a valid PNG file.');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) break;

    const data = buffer.subarray(dataStart, dataEnd);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4;
  }

  if (!width || !height) {
    throw new Error('Missing IHDR metadata in source PNG.');
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2) || interlace !== 0) {
    throw new Error(
      `Unsupported PNG format (bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace}). Expected 8-bit non-interlaced RGB/RGBA.`
    );
  }

  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const raw = Buffer.alloc(width * height * bpp);

  for (let y = 0; y < height; y += 1) {
    const srcRowStart = y * (stride + 1);
    const filterType = inflated[srcRowStart];
    const dstRowStart = y * stride;

    for (let x = 0; x < stride; x += 1) {
      const byteVal = inflated[srcRowStart + 1 + x];
      const a = x >= bpp ? raw[dstRowStart + x - bpp] : 0;
      const b = y > 0 ? raw[dstRowStart - stride + x] : 0;
      const c = y > 0 && x >= bpp ? raw[dstRowStart - stride + x - bpp] : 0;

      let recon;
      switch (filterType) {
        case 0:
          recon = byteVal;
          break;
        case 1:
          recon = (byteVal + a) & 0xff;
          break;
        case 2:
          recon = (byteVal + b) & 0xff;
          break;
        case 3:
          recon = (byteVal + ((a + b) >> 1)) & 0xff;
          break;
        case 4:
          recon = (byteVal + paethPredictor(a, b, c)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG scanline filter type: ${filterType}`);
      }
      raw[dstRowStart + x] = recon;
    }
  }

  if (bpp === 4) {
    return { width, height, rgba: raw };
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < raw.length; i += 3, j += 4) {
    rgba[j] = raw[i];
    rgba[j + 1] = raw[i + 1];
    rgba[j + 2] = raw[i + 2];
    rgba[j + 3] = 255;
  }
  return { width, height, rgba };
}

function resizeRgbaBoxAndBilinear(srcRgba, srcW, srcH, dstW, dstH) {
  if (srcW === dstW && srcH === dstH) {
    return Buffer.from(srcRgba);
  }

  const dst = Buffer.alloc(dstW * dstH * 4);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;

  for (let dy = 0; dy < dstH; dy += 1) {
    const sy0 = dy * scaleY;
    const sy1 = (dy + 1) * scaleY;
    const iy0 = Math.floor(sy0);
    const iy1 = Math.min(srcH - 1, Math.ceil(sy1) - 1);

    for (let dx = 0; dx < dstW; dx += 1) {
      const sx0 = dx * scaleX;
      const sx1 = (dx + 1) * scaleX;
      const ix0 = Math.floor(sx0);
      const ix1 = Math.min(srcW - 1, Math.ceil(sx1) - 1);

      let rAcc = 0;
      let gAcc = 0;
      let bAcc = 0;
      let aAcc = 0;
      let weightSum = 0;

      for (let sy = iy0; sy <= iy1; sy += 1) {
        const yOverlap = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        if (yOverlap <= 0) continue;

        for (let sx = ix0; sx <= ix1; sx += 1) {
          const xOverlap = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          if (xOverlap <= 0) continue;

          const w = xOverlap * yOverlap;
          const idx = (sy * srcW + sx) * 4;
          const alpha = srcRgba[idx + 3];

          // Premultiply RGB by alpha during downsampling to prevent dark halos
          rAcc += srcRgba[idx] * alpha * w;
          gAcc += srcRgba[idx + 1] * alpha * w;
          bAcc += srcRgba[idx + 2] * alpha * w;
          aAcc += alpha * w;
          weightSum += w;
        }
      }

      const dstIdx = (dy * dstW + dx) * 4;
      const avgAlpha = weightSum > 0 ? aAcc / weightSum : 0;
      if (avgAlpha > 0.001) {
        dst[dstIdx] = Math.min(255, Math.round(rAcc / aAcc));
        dst[dstIdx + 1] = Math.min(255, Math.round(gAcc / aAcc));
        dst[dstIdx + 2] = Math.min(255, Math.round(bAcc / aAcc));
        dst[dstIdx + 3] = Math.min(255, Math.round(avgAlpha));
      } else {
        dst[dstIdx] = 0;
        dst[dstIdx + 1] = 0;
        dst[dstIdx + 2] = 0;
        dst[dstIdx + 3] = 0;
      }
    }
  }

  return dst;
}

function encodePngRgba(rgba, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filter
  ihdr[12] = 0; // no interlace

  const stride = width * 4;
  const filtered = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const srcStart = y * stride;
    const dstStart = y * (stride + 1);
    filtered[dstStart] = 0; // None filter
    rgba.copy(filtered, dstStart + 1, srcStart, srcStart + stride);
  }

  const compressed = zlib.deflateSync(filtered, { level: 9 });

  return Buffer.concat([
    PNG_SIGNATURE,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function buildIcoFromPngFrames(frames) {
  const count = frames.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let dataOffset = 6 + count * 16;

  for (const frame of frames) {
    const entry = Buffer.alloc(16);
    entry[0] = frame.size >= 256 ? 0 : frame.size;
    entry[1] = frame.size >= 256 ? 0 : frame.size;
    entry[2] = 0; // palette colors
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(frame.png.length, 8);
    entry.writeUInt32LE(dataOffset, 12);

    dirEntries.push(entry);
    dataOffset += frame.png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...frames.map((f) => f.png)]);
}

function main() {
  const inputPath = fs.existsSync(SOURCE_PNG) ? SOURCE_PNG : FALLBACK_PNG;
  if (!fs.existsSync(inputPath)) {
    throw new Error('Could not find build/icon.png or public/pwa-512x512.png');
  }

  fs.mkdirSync(path.dirname(OUTPUT_ICO), { recursive: true });
  if (!fs.existsSync(SOURCE_PNG)) {
    fs.copyFileSync(inputPath, SOURCE_PNG);
  }

  const srcBytes = fs.readFileSync(inputPath);
  const { width, height, rgba } = decodePngRgba(srcBytes);

  const targetSizes = [256, 64];
  const frames = targetSizes.map((size) => {
    const resized = resizeRgbaBoxAndBilinear(rgba, width, height, size, size);
    const png = encodePngRgba(resized, size, size);
    return { size, png };
  });

  const icoBuffer = buildIcoFromPngFrames(frames);
  fs.writeFileSync(OUTPUT_ICO, icoBuffer);
  console.log(
    `[generate-ico] Wrote ${path.relative(ROOT_DIR, OUTPUT_ICO)} (${icoBuffer.length} bytes, frames: ${targetSizes.join('x, ')}x)`
  );
}

main();
