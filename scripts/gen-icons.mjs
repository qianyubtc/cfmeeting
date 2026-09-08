#!/usr/bin/env node
/**
 * Regenerates all raster icons from apps/web/public/icons/icon.svg.
 *   node scripts/gen-icons.mjs
 * Outputs: web PWA icons, apple-touch-icon, Electron build/icon.png, Android source assets.
 * (Then run `npm run assets -w apps/android` to regenerate the Android mipmaps.)
 */
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(`${root}/apps/web/public/icons/icon.svg`);
const dark = { r: 7, g: 10, b: 18, alpha: 1 };
const light = { r: 238, g: 241, b: 246, alpha: 1 };

async function png(size, out, { pad = 0, bg = null } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: logo, left: Math.round((size - inner) / 2), top: Math.round((size - inner) / 2) }])
    .png()
    .toFile(out);
  console.log('wrote', out.replace(root + '/', ''));
}

for (const d of ['apps/web/public/icons', 'apps/desktop/build', 'apps/android/assets']) mkdirSync(`${root}/${d}`, { recursive: true });

await png(192, `${root}/apps/web/public/icons/icon-192.png`);
await png(512, `${root}/apps/web/public/icons/icon-512.png`);
await png(512, `${root}/apps/web/public/icons/icon-maskable-512.png`, { pad: 0.12, bg: dark });
await png(180, `${root}/apps/web/public/icons/apple-touch-icon.png`, { pad: 0.04, bg: dark });
await png(1024, `${root}/apps/desktop/build/icon.png`);
await png(1024, `${root}/apps/android/assets/icon.png`);
await png(1024, `${root}/apps/android/assets/icon-foreground.png`, { pad: 0.2 });
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: dark } }).png().toFile(`${root}/apps/android/assets/icon-background.png`);

const size = 2732;
const logo = await sharp(svg, { density: 512 }).resize(520, 520).png().toBuffer();
for (const name of ['splash.png', 'splash-dark.png']) {
  await sharp({ create: { width: size, height: size, channels: 4, background: name.includes('dark') ? dark : light } })
    .composite([{ input: logo, left: (size - 520) / 2, top: (size - 520) / 2 }])
    .png()
    .toFile(`${root}/apps/android/assets/${name}`);
  console.log('wrote apps/android/assets/' + name);
}
