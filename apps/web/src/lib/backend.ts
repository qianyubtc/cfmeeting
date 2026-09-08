/**
 * Backend adapters.
 *
 *  demo        — talks directly to the public Cloudflare RealtimeKit demo API
 *                (https://demo.realtime.cloudflare.com/api/v2/*). No server, no account.
 *                Works from the desktop (Electron) and Android (Capacitor) shells, which are
 *                not subject to browser CORS. The demo API does not send CORS headers, so a
 *                plain browser / PWA cannot use it → "embed" mode instead.
 *  selfhosted  — the optional Worker in apps/server (own RealtimeKit credentials or a proxy).
 *  embed       — browser fallback: the official demo page is embedded in an iframe.
 */
import { canCallDemoApiDirectly, isCapacitor, isElectron, isPackaged } from './platform';
import { getItem, getSession, setItem, setSession } from './storage';

export type MeetingType = 'conference' | 'webinar';
export type BackendKind = 'demo' | 'selfhosted';
export type Mode = BackendKind | 'embed';

export const DEMO_ORIGIN = 'https://demo.realtime.cloudflare.com';

/** Preset names used by the official demo (see its bundle: group_call_host, webinar_presenter, …). */
const DEMO_PRESETS: Record<MeetingType, { host: string; participant: string }> = {
  conference: { host: 'group_call_host', participant: 'group_call_participant' },
  webinar: { host: 'webinar_presenter', participant: 'webinar_viewer' },
};

export function demoJoinUrl(meetingId: string, type: MeetingType = 'conference'): string {
  const path = type === 'webinar' ? '/webinar' : '/meeting';
  return `${DEMO_ORIGIN}${path}?id=${encodeURIComponent(meetingId)}&demo=Default`;
}

export function demoLobbyUrl(type: MeetingType = 'conference'): string {
  const path = type === 'webinar' ? '/webinar' : '/meeting';
  return `${DEMO_ORIGIN}${path}?demo=Default`;
}

export class BackendError extends Error {
  constructor(
    public code:
      | 'not_found'
      | 'inactive'
      | 'network'
      | 'access_code_required'
      | 'name_required'
      | 'not_configured'
      | 'upstream'
      | 'generic',
    message?: string,
  ) {
    super(message ?? code);
  }
}

export interface MeetingInfo {
  id: string;
  /** Short code (self-hosted with KV) or the UUID. */
  ref: string;
  displayCode: string;
  title: string;
  type: MeetingType;
}

export interface JoinResult {
  meeting: MeetingInfo;
  token: string;
  isHost: boolean;
  hostKey?: string;
  source: BackendKind;
}

export interface CreateInput {
  name: string;
  title: string;
  type: MeetingType;
  recordOnStart?: boolean;
  accessCode?: string;
}

export interface JoinInput {
  ref: string;
  name: string;
  type?: MeetingType;
  /** self-hosted: HMAC host key; demo: "join as host" request */
  hostKey?: string;
  asHost?: boolean;
}

export interface Backend {
  kind: BackendKind;
  create(input: CreateInput): Promise<JoinResult>;
  join(input: JoinInput): Promise<JoinResult>;
  /** Optional pre-join lookup (title / type). Returns null when unsupported or not found. */
  lookup(ref: string): Promise<MeetingInfo | null>;
}

/* ---------- configuration ---------- */

export function getServerUrl(): string {
  const stored = getItem<string>('serverUrl', '').trim();
  const env = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').trim();
  return (stored || env).replace(/\/+$/, '');
}

export function setServerUrl(url: string): void {
  setItem('serverUrl', url.trim().replace(/\/+$/, ''));
}

/**
 * A same-origin self-hosted deployment (apps/server) serves the app and the API from one Worker.
 * Detected once at startup by probing /api/health, so a plain `wrangler deploy` just works.
 */
let sameOriginApi: boolean | null = null;
let probe: Promise<boolean> | null = null;

export function detectSameOriginApi(): Promise<boolean> {
  if (sameOriginApi !== null) return Promise.resolve(sameOriginApi);
  if (probe) return probe;
  if (isPackaged || isElectron || isCapacitor || typeof fetch === 'undefined') {
    sameOriginApi = false;
    return Promise.resolve(false);
  }
  probe = (async () => {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(`${import.meta.env.BASE_URL}api/health`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      window.clearTimeout(timer);
      const data = (await res.json().catch(() => null)) as { ok?: boolean; configured?: boolean } | null;
      sameOriginApi = Boolean(res.ok && data?.ok && data?.configured);
    } catch {
      sameOriginApi = false;
    }
    return sameOriginApi;
  })();
  return probe;
}

/** UI preview helper: ?mode=embed forces the static-web behaviour, ?mode=auto clears it (kept for the session). */
function forcedMode(): Mode | null {
  try {
    const q = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '').get('mode');
    if (q === 'embed') sessionStorage.setItem('cfmeeting.forceMode', 'embed');
    if (q === 'auto') sessionStorage.removeItem('cfmeeting.forceMode');
    return sessionStorage.getItem('cfmeeting.forceMode') === 'embed' ? 'embed' : null;
  } catch {
    return null;
  }
}

export function getMode(): Mode {
  const forced = forcedMode();
  if (forced) return forced;
  if (getServerUrl() || sameOriginApi) return 'selfhosted';
  if (canCallDemoApiDirectly) return 'demo';
  return 'embed';
}

export function getBackend(): Backend | null {
  const mode = getMode();
  if (mode === 'selfhosted') return new SelfHostedBackend(getServerUrl());
  if (mode === 'demo') return new DemoBackend();
  return null;
}

/* ---------- transport (bypasses CORS inside native shells) ---------- */

interface HttpResult {
  status: number;
  data: unknown;
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function httpJson(url: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<HttpResult> {
  const bodyText = init.body === undefined ? undefined : JSON.stringify(init.body);
  try {
    if (isElectron) {
      const res = await window.desktop!.request(url, {
        method: init.method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: bodyText,
      });
      return { status: res.status, data: parseJson(res.body) };
    }
    if (isCapacitor) {
      const { CapacitorHttp } = await import('@capacitor/core');
      const res = await CapacitorHttp.request({
        url,
        method: init.method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        data: init.body,
        responseType: 'json',
      });
      return { status: res.status, data: typeof res.data === 'string' ? parseJson(res.data) : res.data };
    }
    const res = await fetch(url, {
      method: init.method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: bodyText,
    });
    return { status: res.status, data: parseJson(await res.text()) };
  } catch (err) {
    throw new BackendError('network', (err as Error).message);
  }
}

function randomId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

/* ---------- demo backend ---------- */

class DemoBackend implements Backend {
  kind = 'demo' as const;

  async create(input: CreateInput): Promise<JoinResult> {
    const name = input.name.trim();
    if (!name) throw new BackendError('name_required');
    const title = input.title.trim() || `${name}'s meeting`;

    const created = await httpJson(`${DEMO_ORIGIN}/api/v2/meetings`, {
      method: 'POST',
      // the official demo only records on its internal domain; never record on the public demo
      body: { title, record: false },
    });
    const meeting = created.data as { id?: string; title?: string } | null;
    if (created.status >= 400 || !meeting?.id) throw new BackendError('upstream', `demo API ${created.status}`);

    const token = await this.addParticipant(meeting.id, name, DEMO_PRESETS[input.type].host);
    return {
      meeting: { id: meeting.id, ref: meeting.id, displayCode: meeting.id, title: meeting.title || title, type: input.type },
      token,
      isHost: true,
      source: 'demo',
    };
  }

  async join(input: JoinInput): Promise<JoinResult> {
    const name = input.name.trim();
    if (!name) throw new BackendError('name_required');
    const id = extractMeetingRef(input.ref);
    if (!id) throw new BackendError('not_found');
    const type = input.type ?? 'conference';
    const preset = input.asHost ? DEMO_PRESETS[type].host : DEMO_PRESETS[type].participant;
    const token = await this.addParticipant(id, name, preset);
    return {
      meeting: { id, ref: id, displayCode: id, title: '', type },
      token,
      isHost: Boolean(input.asHost),
      source: 'demo',
    };
  }

  async lookup(): Promise<MeetingInfo | null> {
    return null; // the demo API has no "get meeting" endpoint
  }

  private async addParticipant(meetingId: string, displayName: string, presetName: string): Promise<string> {
    const res = await httpJson(`${DEMO_ORIGIN}/api/v2/participants`, {
      method: 'POST',
      body: { clientSpecificId: randomId(), displayName, presetName, meetingId },
    });
    const data = res.data as { token?: string } | null;
    if (res.status >= 400 || !data?.token) {
      // The demo Worker answers 500 for unknown meeting IDs.
      throw new BackendError(res.status >= 500 ? 'not_found' : 'upstream', `demo API ${res.status}`);
    }
    return data.token;
  }
}

/* ---------- self-hosted backend (apps/server) ---------- */

interface ApiErrorBody {
  ok: false;
  error: { code: string; message: string };
}

class SelfHostedBackend implements Backend {
  kind = 'selfhosted' as const;
  constructor(private base: string) {}

  private async call<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<T> {
    const res = await httpJson(`${this.base}${path}`, init);
    if (res.status >= 400) {
      const body = res.data as ApiErrorBody | null;
      const code = body?.error?.code;
      if (code === 'not_found') throw new BackendError('not_found', body?.error?.message);
      if (code === 'inactive') throw new BackendError('inactive', body?.error?.message);
      if (code === 'access_code_required') throw new BackendError('access_code_required');
      if (code === 'not_configured') throw new BackendError('not_configured');
      throw new BackendError('upstream', body?.error?.message ?? `HTTP ${res.status}`);
    }
    return res.data as T;
  }

  async create(input: CreateInput): Promise<JoinResult> {
    const data = await this.call<{ meeting: MeetingInfo; token: string; hostKey: string }>('/api/meetings', {
      method: 'POST',
      body: { name: input.name, title: input.title, type: input.type, recordOnStart: input.recordOnStart, accessCode: input.accessCode },
    });
    return { meeting: data.meeting, token: data.token, hostKey: data.hostKey, isHost: true, source: 'selfhosted' };
  }

  async join(input: JoinInput): Promise<JoinResult> {
    const ref = extractMeetingRef(input.ref);
    if (!ref) throw new BackendError('not_found');
    const data = await this.call<{ meeting: MeetingInfo; token: string; isHost: boolean }>(`/api/meetings/${encodeURIComponent(ref)}/join`, {
      method: 'POST',
      body: { name: input.name, type: input.type, hostKey: input.hostKey },
    });
    return { meeting: data.meeting, token: data.token, isHost: data.isHost, hostKey: input.hostKey, source: 'selfhosted' };
  }

  async lookup(refInput: string): Promise<MeetingInfo | null> {
    const ref = extractMeetingRef(refInput);
    if (!ref) return null;
    try {
      const data = await this.call<{ meeting: MeetingInfo }>(`/api/meetings/${encodeURIComponent(ref)}`, { method: 'GET' });
      return data.meeting;
    } catch (err) {
      if (err instanceof BackendError && (err.code === 'not_found' || err.code === 'inactive')) return null;
      throw err;
    }
  }
}

/* ---------- helpers ---------- */

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Accepts a UUID, a 9-digit short code (with optional spaces/dashes), an app link (/m/<ref>),
 * or an official demo link (?id=<uuid>) and returns the meeting reference.
 */
export function extractMeetingRef(input: string): string | null {
  const s = (input || '').trim();
  if (!s) return null;
  const uuid = s.match(UUID_RE);
  if (uuid) return uuid[0].toLowerCase();
  const digits = s.replace(/[\s-]/g, '');
  if (/^\d{9}$/.test(digits)) return digits;
  const m = s.match(/\/m\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  try {
    const url = new URL(s);
    const id = url.searchParams.get('id') || url.searchParams.get('meetingId');
    if (id) return id;
  } catch {
    /* not a URL */
  }
  return null;
}

/** Meeting type hint carried in links: /m/<ref>?t=webinar */
export function extractTypeHint(input: string): MeetingType | undefined {
  try {
    const url = new URL(input);
    if (url.searchParams.get('t') === 'webinar' || url.pathname.startsWith('/webinar')) return 'webinar';
  } catch {
    /* ignore */
  }
  return undefined;
}

/* ---------- per-meeting session cache (survive reloads without creating new participants) ---------- */

export interface CachedSession extends JoinResult {
  name: string;
  savedAt: number;
}

export function saveSession(s: CachedSession): void {
  setSession(`session.${s.meeting.id}`, s);
}

export function loadSession(meetingId: string): CachedSession | null {
  const s = getSession<CachedSession | null>(`session.${meetingId}`, null);
  if (!s) return null;
  // RealtimeKit participant tokens are long-lived, but keep the cache short so a stale
  // participant record is not reused days later.
  if (Date.now() - s.savedAt > 6 * 60 * 60 * 1000) return null;
  return s;
}
