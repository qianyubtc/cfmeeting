#!/usr/bin/env node
/**
 * Creates the CFMeeting presets in your RealtimeKit app (idempotent).
 *
 * Reads credentials from apps/server/.dev.vars or the environment:
 *   CF_ACCOUNT_ID, CF_API_TOKEN, RTK_APP_ID          (Cloudflare API)
 *   or REALTIMEKIT_ORG_ID, REALTIMEKIT_API_KEY        (legacy API)
 *
 * Usage:  npm run setup:presets            # create missing presets
 *         npm run setup:presets -- --list  # only list existing presets
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRESETS } from './preset-definitions.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const devVars = join(here, '..', '.dev.vars');
if (existsSync(devVars)) {
  for (const line of readFileSync(devVars, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const env = process.env;
let base;
let headers;
if (env.CF_ACCOUNT_ID && env.CF_API_TOKEN && env.RTK_APP_ID) {
  base = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/realtime/kit/${env.RTK_APP_ID}`;
  headers = { Authorization: `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' };
} else if (env.REALTIMEKIT_ORG_ID && env.REALTIMEKIT_API_KEY) {
  base = `https://api.${env.REALTIMEKIT_BASE_URL || 'realtime.cloudflare.com'}/v2`;
  headers = {
    Authorization: `Basic ${Buffer.from(`${env.REALTIMEKIT_ORG_ID}:${env.REALTIMEKIT_API_KEY}`).toString('base64')}`,
    'Content-Type': 'application/json',
  };
} else {
  console.error('Missing credentials. Fill apps/server/.dev.vars (see .dev.vars.example) or export CF_ACCOUNT_ID / CF_API_TOKEN / RTK_APP_ID.');
  process.exit(1);
}

async function call(method, path, body) {
  const res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok || json.success === false) {
    const msg = json?.errors?.map((e) => e.message).join('; ') || json?.message || text;
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`);
  }
  return json.data ?? json.result;
}

const listOnly = process.argv.includes('--list');
const existing = await call('GET', '/presets');
const names = new Set((existing || []).map((p) => p.name));
console.log(`Existing presets (${names.size}):`, [...names].join(', ') || '(none)');
if (listOnly) process.exit(0);

for (const preset of PRESETS) {
  if (names.has(preset.name)) {
    console.log(`= ${preset.name} already exists, skipping`);
    continue;
  }
  try {
    const created = await call('POST', '/presets', preset);
    console.log(`+ created ${preset.name} (${created?.id ?? 'ok'})`);
  } catch (err) {
    console.error(`! failed to create ${preset.name}: ${err.message}`);
    process.exitCode = 1;
  }
}
console.log('\nDone. wrangler.jsonc vars RTK_HOST_PRESET / RTK_PARTICIPANT_PRESET default to cfmeeting_host / cfmeeting_participant.');
