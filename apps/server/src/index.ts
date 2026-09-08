import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { RtkApi, RtkApiError, type MeetingApi } from './rtk';
import { DEMO_PRESETS, DemoProxyApi } from './demo-proxy';
import { hostKeySecret, makeHostKey, verifyHostKey } from './hostkey';
import { allocateCode, formatCode, isShortCode, isUuid, lookupByCode, lookupCodeById, normalizeRef } from './store';

const VERSION = '0.1.0';

type MeetingType = 'conference' | 'webinar';

type Variables = Record<string, never>;

function isDemoProxy(env: Env): boolean {
  return env.DEMO_PROXY === 'true';
}

function createApi(env: Env): MeetingApi {
  return isDemoProxy(env) ? new DemoProxyApi() : new RtkApi(env);
}

function isConfigured(env: Env): boolean {
  return isDemoProxy(env) || RtkApi.isConfigured(env);
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/* ---------- helpers ---------- */

function jsonError(c: { json: (o: unknown, s?: number) => Response }, status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return c.json({ ok: false, error: { code, message, ...extra } }, status as 400);
}

function cleanName(input: unknown): string {
  const s = typeof input === 'string' ? input.trim().replace(/\s+/g, ' ') : '';
  return s.slice(0, 40);
}

function cleanTitle(input: unknown, fallback: string): string {
  const s = typeof input === 'string' ? input.trim().replace(/\s+/g, ' ') : '';
  return (s || fallback).slice(0, 80);
}

function parseType(input: unknown): MeetingType {
  return input === 'webinar' ? 'webinar' : 'conference';
}

function presetFor(env: Env, type: MeetingType, role: 'host' | 'participant'): string {
  if (isDemoProxy(env)) return DEMO_PRESETS[type][role];
  const base = role === 'host' ? env.RTK_HOST_PRESET || 'cfmeeting_host' : env.RTK_PARTICIPANT_PRESET || 'cfmeeting_participant';
  if (type === 'webinar') {
    // cfmeeting_host -> cfmeeting_webinar_host (convention used by scripts/setup-presets.mjs)
    return base.replace(/^cfmeeting_/, 'cfmeeting_webinar_');
  }
  return base;
}

function participantId(name: string): string {
  return `${crypto.randomUUID()}:${name.slice(0, 20)}`;
}

async function resolveMeeting(env: Env, rtk: MeetingApi, refInput: string) {
  const ref = normalizeRef(refInput);
  if (isShortCode(ref)) {
    if (!env.MEETINGS) return null;
    const stored = await lookupByCode(env.MEETINGS, ref);
    if (!stored) return null;
    const live = await rtk.getMeeting(stored.id);
    if (!live) return null;
    return { id: stored.id, code: stored.code, title: live.title || stored.title, status: live.status, type: (stored as { type?: MeetingType }).type };
  }
  if (isUuid(ref)) {
    const live = await rtk.getMeeting(ref);
    if (!live) return null;
    const code = env.MEETINGS ? await lookupCodeById(env.MEETINGS, ref) : null;
    let type: MeetingType | undefined;
    if (code && env.MEETINGS) {
      const stored = (await lookupByCode(env.MEETINGS, code)) as { type?: MeetingType } | null;
      type = stored?.type;
    }
    return { id: live.id, code: code ?? undefined, title: live.title || '', status: live.status, type };
  }
  return null;
}

function publicMeeting(m: { id: string; code?: string; title: string; type?: MeetingType }) {
  const ref = m.code ?? m.id;
  return {
    id: m.id,
    code: m.code ?? null,
    ref,
    displayCode: m.code ? formatCode(m.code) : m.id,
    title: m.title,
    type: m.type ?? 'conference',
  };
}

/* ---------- middleware ---------- */

app.use('/api/*', async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
  const handler = cors({
    origin: (origin) => {
      if (allowed.includes('*')) return origin || '*';
      return allowed.includes(origin) ? origin : '';
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 600,
  });
  return handler(c, next);
});

app.onError((err, c) => {
  if (err instanceof RtkApiError) {
    console.error('RealtimeKit API error', err.status, err.message, JSON.stringify(err.details ?? null).slice(0, 500));
    if (err.code === 'not_configured') return jsonError(c, 500, 'not_configured', 'Server is missing RealtimeKit credentials');
    if (err.status === 404) return jsonError(c, 404, 'not_found', 'Meeting not found');
    if (err.status === 401 || err.status === 403) return jsonError(c, 502, 'upstream_unauthorized', 'RealtimeKit rejected the server credentials');
    const presetHint = /preset/i.test(err.message) ? ' (did you run `npm run setup:presets`?)' : '';
    return jsonError(c, 502, 'upstream_error', `${err.message}${presetHint}`);
  }
  console.error('Unhandled error', err);
  return jsonError(c, 500, 'internal', 'Internal error');
});

/* ---------- routes ---------- */

app.get('/api/health', (c) => c.json({ ok: true, version: VERSION, configured: isConfigured(c.env) }));

app.get('/api/config', (c) => {
  const env = c.env;
  return c.json({
    ok: true,
    appName: env.APP_NAME || 'CFMeeting',
    version: VERSION,
    configured: isConfigured(env),
    demoProxy: isDemoProxy(env),
    createAccessCodeRequired: Boolean(env.CREATE_ACCESS_CODE),
    shortCodes: Boolean(env.MEETINGS),
    allowRecording: env.ALLOW_RECORDING === 'true',
    meetingTypes: ['conference', 'webinar'] as MeetingType[],
  });
});

/** Create a meeting and join it as host. */
app.post('/api/meetings', async (c) => {
  const env = c.env;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  if (env.CREATE_ACCESS_CODE && body.accessCode !== env.CREATE_ACCESS_CODE) {
    return jsonError(c, 403, 'access_code_required', 'A valid access code is required to create meetings');
  }

  const name = cleanName(body.name);
  if (!name) return jsonError(c, 400, 'name_required', 'Display name is required');

  const type = parseType(body.type);
  const title = cleanTitle(body.title, `${name}'s meeting`);
  const recordOnStart = env.ALLOW_RECORDING === 'true' && body.recordOnStart === true;
  const keepAlive = Number(env.SESSION_KEEP_ALIVE_SECS || 60);

  const rtk = createApi(env);
  const meeting = await rtk.createMeeting({
    title,
    record_on_start: recordOnStart,
    persist_chat: false,
    session_keep_alive_time_in_secs: Number.isFinite(keepAlive) ? keepAlive : 60,
  });

  let code: string | undefined;
  if (env.MEETINGS) {
    const stored = await allocateCode(env.MEETINGS, { id: meeting.id, title });
    code = stored.code;
    // remember the meeting type alongside the code
    await env.MEETINGS.put(`code:${code}`, JSON.stringify({ ...stored, type }), { expirationTtl: 60 * 60 * 24 * 30 });
  }

  const participant = await rtk.addParticipant(meeting.id, {
    name,
    preset_name: presetFor(env, type, 'host'),
    custom_participant_id: participantId(name),
  });

  const hostKey = await makeHostKey(await hostKeySecret(env), meeting.id);

  return c.json({
    ok: true,
    meeting: publicMeeting({ id: meeting.id, code, title, type }),
    token: participant.token,
    hostKey,
    isHost: true,
    recordOnStart,
  });
});

/** Look up a meeting by short code or UUID (used by the join page). */
app.get('/api/meetings/:ref', async (c) => {
  const rtk = createApi(c.env);
  const meeting = await resolveMeeting(c.env, rtk, c.req.param('ref'));
  if (!meeting) return jsonError(c, 404, 'not_found', 'Meeting not found');
  if (meeting.status === 'INACTIVE') return jsonError(c, 410, 'inactive', 'This meeting has been closed');
  return c.json({ ok: true, meeting: publicMeeting(meeting) });
});

/** Join an existing meeting. Presenting a valid hostKey grants the host preset. */
app.post('/api/meetings/:ref/join', async (c) => {
  const env = c.env;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = cleanName(body.name);
  if (!name) return jsonError(c, 400, 'name_required', 'Display name is required');

  const rtk = createApi(env);
  const meeting = await resolveMeeting(env, rtk, c.req.param('ref'));
  if (!meeting) return jsonError(c, 404, 'not_found', 'Meeting not found');
  if (meeting.status === 'INACTIVE') return jsonError(c, 410, 'inactive', 'This meeting has been closed');

  // Meeting type: KV record wins; otherwise trust the (non-sensitive) hint from the invite link.
  const type: MeetingType = meeting.type ?? parseType(body.type);

  const isHost = await verifyHostKey(await hostKeySecret(env), meeting.id, typeof body.hostKey === 'string' ? body.hostKey : undefined);
  const participant = await rtk.addParticipant(meeting.id, {
    name,
    preset_name: presetFor(env, type, isHost ? 'host' : 'participant'),
    custom_participant_id: participantId(name),
  });

  return c.json({
    ok: true,
    meeting: publicMeeting({ ...meeting, type }),
    token: participant.token,
    isHost,
  });
});

app.all('/api/*', (c) => jsonError(c, 404, 'no_route', 'Unknown API route'));

// Anything else is a static asset (only reached when run_worker_first matches or assets are missing).
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
