#!/usr/bin/env node
/**
 * Local UI preview: starts the Vite dev server (5173) and, for the "full" desktop/Android-like
 * experience in a browser, the local relay Worker (8787, DEMO_PROXY mode — no credentials needed).
 * Open http://localhost:5173/preview
 */
import { spawn } from 'node:child_process';

const procs = [];
function run(name, cmd, args, cwd) {
  const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: process.env, shell: process.platform === 'win32' });
  const tag = (line) => `[${name}] ${line}`;
  p.stdout.on('data', (d) => process.stdout.write(d.toString().split('\n').filter(Boolean).map(tag).join('\n') + '\n'));
  p.stderr.on('data', (d) => process.stderr.write(d.toString().split('\n').filter(Boolean).map(tag).join('\n') + '\n'));
  p.on('exit', (code) => console.log(`[${name}] exited (${code})`));
  procs.push(p);
}

run('relay', 'npx', ['wrangler', 'dev', '--port', '8787'], 'apps/server');
run('web', 'npx', ['vite', '--port', '5173'], 'apps/web');
console.log('\n  UI 预览面板 → http://localhost:5173/preview\n');

const stop = () => {
  procs.forEach((p) => p.kill('SIGTERM'));
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
