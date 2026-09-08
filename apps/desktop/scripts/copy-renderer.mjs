// Copies the packaged web build (apps/web/dist-packaged) into ./renderer for electron-builder.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('../web/dist-packaged');
if (!existsSync(resolve(src, 'index.html'))) {
  console.error('Missing apps/web/dist-packaged — run `npm run build:packaged -w apps/web` first.');
  process.exit(1);
}
rmSync('renderer', { recursive: true, force: true });
cpSync(src, 'renderer', { recursive: true });
console.log('renderer/ updated from', src);
