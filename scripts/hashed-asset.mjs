// Content-hashed output for built assets.
//
// Assets under /models and /hdri are served with a one-year immutable cache (next.config.ts), so a
// rebuilt file must get a new URL. writeHashed() writes `<stem>.<hash>.<ext>`, deletes older builds
// of the same stem, and records the public URL in src/config/assets.generated.json, which the app
// imports. Rebuilding with identical content keeps the same name (and the browser cache).

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const MANIFEST = 'src/config/assets.generated.json';

/**
 * @param {string} dir      output folder under public/, e.g. 'public/models'
 * @param {string} stem     file stem, e.g. 'car.opt'
 * @param {string} ext      extension without dot, e.g. 'glb'
 * @param {Uint8Array} bytes
 * @param {string} key      manifest key, e.g. 'model'
 * @returns {string} written file path
 */
export function writeHashed(dir, stem, ext, bytes, key) {
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 10);
  const name = `${stem}.${hash}.${ext}`;
  const file = path.join(dir, name);
  writeFileSync(file, bytes);

  // Remove previous builds of this stem (stem.<anything>.ext, and the old unhashed stem.ext).
  const stale = new RegExp(`^${stem.replace(/\./g, '\\.')}(\\.[0-9a-f]{10})?\\.${ext}$`);
  for (const f of readdirSync(dir)) if (f !== name && stale.test(f)) unlinkSync(path.join(dir, f));

  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
  manifest[key] = '/' + path.relative('public', file).split(path.sep).join('/');
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  return file;
}
