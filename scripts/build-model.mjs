// Builds the web-ready car model from the untouched original.
//
//   public/models/car.glb  (original, never modified)
//     -> remove Khronos / 3D Commerce trademarks (see CREDITS.md)
//     -> fix dashboard label typo
//     -> drop unused material variants, name unnamed material
//     -> Meshopt geometry + KTX2 (ETC1S / UASTC) textures
//   public/models/car.opt.<hash>.glb   (URL recorded in src/config/assets.generated.json)
//
// Requires KTX-Software (toktx) on PATH or in its default Windows install location.
// Usage: npm run build:model

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { Logger, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune } from '@gltf-transform/functions';
import { Mode, toktx } from '@gltf-transform/cli';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { writeHashed } from './hashed-asset.mjs';

const SRC = 'public/models/car.glb';

const KTX_WIN = 'C:\\Program Files\\KTX-Software\\bin';
if (process.platform === 'win32' && existsSync(KTX_WIN) && !process.env.PATH.includes(KTX_WIN)) {
  process.env.PATH = `${KTX_WIN};${process.env.PATH}`;
}

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read(SRC);
doc.setLogger(new Logger(Logger.Verbosity.WARN));
const root = doc.getRoot();
const material = (name) => {
  const m = root.listMaterials().find((m) => m.getName() === name);
  if (!m) throw new Error(`Material "${name}" not found in ${SRC}`);
  return m;
};

// ---------------------------------------------------------------------------
// Image helpers (raw RGB(A) pixel access via sharp)

async function decode(texture) {
  const { data, info } = await sharp(Buffer.from(texture.getImage())).raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}
async function encodePNG({ data, info }) {
  const { width, height, channels } = info;
  return new Uint8Array(await sharp(data, { raw: { width, height, channels } }).png().toBuffer());
}

/** Fill annular sectors (centred on the texture) with a flat colour. Angles in degrees, CCW from +X, image Y up. */
function fillSectors({ data, info }, sectors, rgb) {
  const { width: W, height: H, channels: C } = info;
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      let a = (Math.atan2(cy - (y + 0.5), x + 0.5 - cx) * 180) / Math.PI;
      if (a < 0) a += 360;
      const hit = sectors.some(([a0, a1, r0, r1]) => r >= r0 && r <= r1 && (a0 <= a1 ? a >= a0 && a <= a1 : a >= a0 || a <= a1));
      if (!hit) continue;
      const i = (y * W + x) * C;
      data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2];
    }
  }
}

// ---------------------------------------------------------------------------
// 1. Trademarks: licence plate / emissive logo texture

const license = material('License');
const logoTexture = license.getBaseColorTexture();

// The logo texture is also wired as an emissive map (factor 1) into rims, brakes, mirrors, hardware
// and the unnamed trim material. Remove it everywhere and zero the emissive factor so nothing glows.
for (const m of root.listMaterials()) {
  if (m.getEmissiveTexture() === logoTexture) {
    m.setEmissiveTexture(null);
    m.setEmissiveFactor([0, 0, 0]);
  }
}

const plateSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="128" viewBox="0 0 512 128">
  <rect width="512" height="128" fill="#0b0b0c"/>
  <rect x="6" y="6" width="500" height="116" rx="10" fill="none" stroke="#3a3a3e" stroke-width="3"/>
  <text x="256" y="84" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-weight="300"
        font-size="58" letter-spacing="26" fill="#e9e9ec">AURA</text>
</svg>`;
const plate = doc.createTexture('license-plate').setMimeType('image/png')
  .setImage(new Uint8Array(await sharp(Buffer.from(plateSVG)).png().toBuffer()));
license.setBaseColorTexture(plate);
logoTexture.dispose();

// ---------------------------------------------------------------------------
// 2. Trademarks: tyre sidewall (colour + embossed normal)
// Logos sit in the band between the sidewall rings (r≈448 and r≈508 px on a 1024 map):
// Khronos at ~163°–197°, 3D Commerce at ~350°–10°. Generic tyre markings are outside these sectors.

const tireside = material('Tireside');
const scale = (t) => t.getSize()[0] / 1024;
{
  const tex = tireside.getBaseColorTexture();
  const img = await decode(tex);
  const s = scale(tex);
  fillSectors(img, [[158, 202, 438 * s, 509 * s], [345, 15, 438 * s, 509 * s]], [29, 29, 29]);
  tex.setImage(await encodePNG(img)).setMimeType('image/png');
}
{
  const tex = tireside.getNormalTexture();
  const img = await decode(tex);
  const s = scale(tex);
  // Stay inside the rings so the sidewall edges keep their bevel.
  fillSectors(img, [[158, 202, 451 * s, 505.5 * s], [345, 15, 451 * s, 505.5 * s]], [128, 128, 255]);
  tex.setImage(await encodePNG(img)).setMimeType('image/png');
}

// ---------------------------------------------------------------------------
// 3. Dashboard label typo: "accrleration" -> "acceleration"

{
  const tex = material('Dashboard').getEmissiveTexture();
  const [W, H] = tex.getSize();
  const s = W / 1024;
  const fix = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect x="${350 * s}" y="${208 * s}" width="${84 * s}" height="${24 * s}" fill="#000"/>
    <text x="${392 * s}" y="${226.5 * s}" text-anchor="middle" font-family="Century Gothic, Segoe UI, Arial, sans-serif"
          font-size="${14 * s}" textLength="${74 * s}" lengthAdjust="spacingAndGlyphs" fill="#fff">acceleration</text>
  </svg>`;
  const out = await sharp(Buffer.from(tex.getImage())).composite([{ input: Buffer.from(fix) }]).png().toBuffer();
  tex.setImage(new Uint8Array(out)).setMimeType('image/png');
}

// ---------------------------------------------------------------------------
// 4. Clean-up: variants (three.js ignores them; we drive materials ourselves), naming

root.listExtensionsUsed().find((e) => e.extensionName === 'KHR_materials_variants')?.dispose();
const used = new Set(root.listMeshes().flatMap((mesh) => mesh.listPrimitives().map((p) => p.getMaterial())));
for (const m of root.listMaterials()) {
  if (used.has(m)) continue;
  // Variant-only materials: dispose their extension props too, or their textures (iridescence) stay referenced.
  for (const ext of m.listExtensions()) ext.dispose();
  m.dispose();
}
for (const ext of root.listExtensionsUsed()) {
  if (ext.extensionName === 'KHR_materials_iridescence' && !root.listMaterials().some((m) => m.getExtension(ext.extensionName))) ext.dispose();
}
for (const m of root.listMaterials()) if (!m.getName()) m.setName('Trim');

// Name textures by role so they can be targeted below and are readable in tools.
for (const m of root.listMaterials()) {
  const slug = m.getName().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const name = (t, role) => t && !t.getName() && t.setName(`${slug}-${role}`);
  name(m.getBaseColorTexture(), 'color');
  name(m.getNormalTexture(), 'normal');
  name(m.getMetallicRoughnessTexture(), 'orm');
  name(m.getEmissiveTexture(), 'emissive');
  name(m.getOcclusionTexture(), 'ao');
}
// The paint-flake normal map is a per-pixel noise tile sampled with nearest filtering.
// Block compression would smear the flakes, so it stays lossless PNG.
material('Paint 1 Carmine').getNormalTexture().setName('paint-flake-normal');

// Optional: DUMP_TEXTURES=<dir> writes the edited textures as PNG for visual checks.
if (process.env.DUMP_TEXTURES) {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  mkdirSync(process.env.DUMP_TEXTURES, { recursive: true });
  const dump = { plate, 'tireside-normal': tireside.getNormalTexture(), 'tireside-color': tireside.getBaseColorTexture(), dashboard: material('Dashboard').getEmissiveTexture() };
  for (const [name, tex] of Object.entries(dump)) writeFileSync(path.join(process.env.DUMP_TEXTURES, `${name}.png`), tex.getImage());
}

// prune() also folds single-colour textures into factors; the logo-free tyre sidewall colour map becomes one.
await doc.transform(prune(), dedup());

// ---------------------------------------------------------------------------
// 5. Compression

// toktx matches `pattern` against name OR uri; GLB textures have an empty uri, so require a name.
// Interior-only textures (cabin materials, gauge cluster) are viewed at arm's length in the interior
// presets: UASTC at a higher level with no RDO (no rate/quality trade-off), in every slot. The baked AO
// is shared with the exterior and keeps its ETC1S encoding (measured 36 dB, no structural loss).
const interiorTex = /^(interior-|dashboard-)/;
const exteriorTex = /^(?!paint-flake|interior-|dashboard-)[a-z]/;
await doc.transform(
  toktx({ encoder: sharp, mode: Mode.UASTC, pattern: interiorTex, level: 3, rdo: false, zstd: 18 }),
  toktx({ encoder: sharp, mode: Mode.UASTC, slots: /^(normalTexture|metallicRoughnessTexture)$/, pattern: exteriorTex, level: 2, rdo: true, rdoLambda: 2, zstd: 18 }),
  toktx({ encoder: sharp, mode: Mode.ETC1S, slots: /^(baseColorTexture|emissiveTexture|occlusionTexture)$/, pattern: exteriorTex, quality: 255, compression: 2 }),
  // 16-bit UVs: several materials tile their UVs 30–400× via KHR_texture_transform, so precision matters.
  meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizeTexcoord: 16, quantizeNormal: 10, quantizePosition: 14 }),
);

const OUT = writeHashed('public/models', 'car.opt', 'glb', await io.writeBinary(doc), 'model');

const mb = (f) => (statSync(f).size / 1024 / 1024).toFixed(2) + ' MB';
console.log(`${path.basename(SRC)} ${mb(SRC)} -> ${path.basename(OUT)} ${mb(OUT)}`);
for (const t of root.listTextures()) console.log(`  ${t.getName().padEnd(28)} ${t.getMimeType().padEnd(10)} ${t.getSize()?.join('x') ?? ''}`);
