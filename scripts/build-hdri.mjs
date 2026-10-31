// Pre-filters the studio HDRI for reflections.
//
//   public/hdri/studio.hdr       (original Poly Haven file, never modified)
//     -> separable Gaussian blur in linear float space (wraps horizontally)
//   public/hdri/studio.soft.<hash>.hdr  (used by the site; URL in src/config/assets.generated.json)
//
// Why: the studio's acoustic-foam ceiling and the octaboxes' honeycomb grids contain detail at
// roughly one texel. Mirror-like clearcoat reflects it un-mipmapped, which aliases into moiré
// ripples on curved panels. A blur of a few pixels removes that band of detail while keeping the
// light shapes, walls and overall lighting.
//
// Usage: npm run build:hdri [-- --sigma 2.5]

import { readFileSync, statSync } from 'node:fs';
import { writeHashed } from './hashed-asset.mjs';

const SRC = 'public/hdri/studio.hdr';
const sigmaArg = process.argv.indexOf('--sigma');
const SIGMA = sigmaArg > 0 ? Number(process.argv[sigmaArg + 1]) : 2.5;

// --- Radiance RGBE reader (new-style RLE and flat scanlines) -------------------------------------

function readHDR(buf) {
  let pos = 0;
  const line = () => {
    const start = pos;
    while (buf[pos] !== 0x0a) pos++;
    return buf.toString('latin1', start, pos++);
  };
  if (!line().startsWith('#?')) throw new Error('Not a Radiance HDR file');
  for (let l = line(); l !== ''; l = line()) {
    if (l.startsWith('FORMAT=') && l !== 'FORMAT=32-bit_rle_rgbe') throw new Error(`Unsupported ${l}`);
  }
  const m = /^-Y (\d+) \+X (\d+)$/.exec(line());
  if (!m) throw new Error('Unsupported HDR orientation');
  const height = +m[1], width = +m[2];
  const rgbe = new Uint8Array(width * height * 4);
  const scan = new Uint8Array(width * 4);

  for (let y = 0; y < height; y++) {
    const isRLE = buf[pos] === 2 && buf[pos + 1] === 2 && ((buf[pos + 2] << 8) | buf[pos + 3]) === width && width >= 8 && width < 32768;
    if (!isRLE) {
      rgbe.set(buf.subarray(pos, pos + width * 4), y * width * 4);
      pos += width * 4;
      continue;
    }
    pos += 4;
    for (let c = 0; c < 4; c++) {
      let x = 0;
      while (x < width) {
        let count = buf[pos++];
        if (count > 128) {
          count -= 128;
          const v = buf[pos++];
          for (let i = 0; i < count; i++) scan[(x++) * 4 + c] = v;
        } else {
          for (let i = 0; i < count; i++) scan[(x++) * 4 + c] = buf[pos++];
        }
      }
    }
    rgbe.set(scan, y * width * 4);
  }
  return { width, height, rgbe };
}

function toFloat({ width, height, rgbe }) {
  const f = new Float32Array(width * height * 3);
  for (let i = 0, j = 0; i < rgbe.length; i += 4, j += 3) {
    const e = rgbe[i + 3];
    if (e === 0) continue;
    const s = Math.pow(2, e - 136); // 2^(e-128) / 256
    f[j] = rgbe[i] * s;
    f[j + 1] = rgbe[i + 1] * s;
    f[j + 2] = rgbe[i + 2] * s;
  }
  return f;
}

// --- Radiance RGBE writer (new-style RLE) ---------------------------------------------------------

function toRGBE(f, out, i, j) {
  const v = Math.max(f[j], f[j + 1], f[j + 2]);
  if (v < 1e-32) {
    out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
    return;
  }
  const e = Math.ceil(Math.log2(v) + 1e-9);
  const s = 256 / Math.pow(2, e);
  out[i] = Math.min(255, Math.floor(f[j] * s));
  out[i + 1] = Math.min(255, Math.floor(f[j + 1] * s));
  out[i + 2] = Math.min(255, Math.floor(f[j + 2] * s));
  out[i + 3] = e + 128;
}

function writeHDR(width, height, f) {
  const chunks = [Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`, 'latin1')];
  const scan = new Uint8Array(width * 4);
  const chan = new Uint8Array(width);
  const rle = new Uint8Array(width * 2 + 8);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) toRGBE(f, scan, x * 4, (y * width + x) * 3);
    chunks.push(Buffer.from([2, 2, width >> 8, width & 255]));
    for (let c = 0; c < 4; c++) {
      for (let x = 0; x < width; x++) chan[x] = scan[x * 4 + c];
      let n = 0, x = 0;
      while (x < width) {
        let run = 1;
        while (x + run < width && run < 127 && chan[x + run] === chan[x]) run++;
        if (run >= 3) {
          rle[n++] = 128 + run;
          rle[n++] = chan[x];
          x += run;
          continue;
        }
        // Literal span up to the next run of >= 3.
        let lit = 0;
        while (x + lit < width && lit < 128) {
          if (x + lit + 2 < width && chan[x + lit] === chan[x + lit + 1] && chan[x + lit] === chan[x + lit + 2]) break;
          lit++;
        }
        rle[n++] = lit;
        for (let i = 0; i < lit; i++) rle[n++] = chan[x + i];
        x += lit;
      }
      chunks.push(Buffer.from(rle.subarray(0, n)));
    }
  }
  return Buffer.concat(chunks);
}

// --- Separable Gaussian (horizontal wraps around the panorama seam, vertical clamps) -------------

function gaussian(sigma) {
  const r = Math.ceil(sigma * 3);
  const k = new Float32Array(r * 2 + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  return { r, k: k.map((v) => v / sum) };
}

function blur(src, width, height, sigma) {
  const { r, k } = gaussian(sigma);
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let c = 0; c < 3; c++) {
        let a = 0;
        for (let i = -r; i <= r; i++) a += src[(y * width + ((x + i + width) % width)) * 3 + c] * k[i + r];
        tmp[(y * width + x) * 3 + c] = a;
      }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let c = 0; c < 3; c++) {
        let a = 0;
        for (let i = -r; i <= r; i++) a += tmp[(Math.min(height - 1, Math.max(0, y + i)) * width + x) * 3 + c] * k[i + r];
        dst[(y * width + x) * 3 + c] = a;
      }
  return dst;
}

const img = readHDR(readFileSync(SRC));
const soft = blur(toFloat(img), img.width, img.height, SIGMA);
const OUT = writeHashed('public/hdri', 'studio.soft', 'hdr', writeHDR(img.width, img.height, soft), 'environment');

const mb = (f) => (statSync(f).size / 1024 / 1024).toFixed(2) + ' MB';
console.log(`${SRC} ${mb(SRC)} -> ${OUT} ${mb(OUT)}  (${img.width}x${img.height}, sigma ${SIGMA}px)`);
