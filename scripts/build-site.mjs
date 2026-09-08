#!/usr/bin/env node
/**
 * Builds the marketing/download site for Cloudflare Pages:
 *   site/        — static landing page (this repo)
 *   site/app/    — the web app, built with base /app/
 *   site/img/    — screenshots copied from docs/screenshots
 * Cloudflare Pages: build command `npm run build:site`, output directory `site`.
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, env = {}) => execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });

console.log('▶ building web app with base /app/');
run('npx vite build --config apps/web/vite.config.ts --outDir dist-site apps/web', { VITE_BASE: '/app/' }); // separate outDir: keeps apps/web/dist (used by apps/server) intact

const appOut = resolve(root, 'site/app');
rmSync(appOut, { recursive: true, force: true });
cpSync(resolve(root, 'apps/web/dist-site'), appOut, { recursive: true });

const img = resolve(root, 'site/img');
mkdirSync(img, { recursive: true });
if (existsSync(resolve(root, 'docs/screenshots'))) cpSync(resolve(root, 'docs/screenshots'), img, { recursive: true });

console.log('✔ site/ ready (landing page + /app/ web app)');
