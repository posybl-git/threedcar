// Self-host the Basis Universal transcoder used by KTX2Loader (no CDN at runtime).
import { cpSync, mkdirSync, existsSync } from 'node:fs';

const src = 'node_modules/three/examples/jsm/libs/basis';
if (existsSync(src)) {
  mkdirSync('public/basis', { recursive: true });
  for (const f of ['basis_transcoder.js', 'basis_transcoder.wasm']) cpSync(`${src}/${f}`, `public/basis/${f}`);
}
