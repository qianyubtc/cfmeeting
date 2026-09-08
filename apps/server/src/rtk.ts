/**
 * Minimal RealtimeKit REST client for Workers.
 *
 * Two API surfaces are supported:
 *  - Cloudflare API (preferred):  https://api.cloudflare.com/client/v4/accounts/{account}/realtime/kit/{app}/...
 *    Auth: Bearer <API token with Realtime Admin permission>
 *  - Legacy RealtimeKit API:      https://api.realtime.cloudflare.com/v2/...
 *    Auth: Basic base64(orgId:apiKey)
 *
 * Both return `{ success, data }` envelopes.
 */
import type { Env } from './env';

export class RtkApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string = 'rtk_error',
    public details?: unknown,
  ) {
    super(message);
  }
}

export interface RtkMeeting {
  id: string;
  title?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  record_on_start?: boolean;
  created_at?: string;
}

export interface RtkParticipant {
  id: string;
  token: string;
  preset_name: string;
  custom_participant_id: string;
  name?: string | null;
}

export interface RtkPreset {
  id?: string;
  name?: string;
}

interface Envelope<T> {
  success?: boolean;
  data?: T;
  result?: T;
  message?: string;
  error?: { message?: string } | string;
  errors?: Array<{ code?: number | string; message?: string }>;
}

export interface MeetingApi {
  readonly mode: string;
  createMeeting(input: { title: string; record_on_start?: boolean; persist_chat?: boolean; session_keep_alive_time_in_secs?: number }): Promise<RtkMeeting>;
  getMeeting(meetingId: string): Promise<RtkMeeting | null>;
  addParticipant(meetingId: string, input: { name: string; preset_name: string; custom_participant_id: string; picture?: string }): Promise<RtkParticipant>;
}

export class RtkApi implements MeetingApi {
  private readonly base: string;
  private readonly headers: Record<string, string>;
  readonly mode: 'cloudflare' | 'legacy';

  constructor(env: Env) {
    if (env.CF_ACCOUNT_ID && env.CF_API_TOKEN && env.RTK_APP_ID) {
      this.mode = 'cloudflare';
      this.base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CF_ACCOUNT_ID)}/realtime/kit/${encodeURIComponent(env.RTK_APP_ID)}`;
      this.headers = {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      };
    } else if (env.REALTIMEKIT_ORG_ID && env.REALTIMEKIT_API_KEY) {
      this.mode = 'legacy';
      const host = env.REALTIMEKIT_BASE_URL || 'realtime.cloudflare.com';
      this.base = `https://api.${host}/v2`;
      this.headers = {
        Authorization: `Basic ${btoa(`${env.REALTIMEKIT_ORG_ID}:${env.REALTIMEKIT_API_KEY}`)}`,
        'Content-Type': 'application/json',
      };
    } else {
      throw new RtkApiError(
        'RealtimeKit credentials are not configured (set CF_ACCOUNT_ID, CF_API_TOKEN, RTK_APP_ID)',
        500,
        'not_configured',
      );
    }
  }

  static isConfigured(env: Env): boolean {
    return Boolean(
      (env.CF_ACCOUNT_ID && env.CF_API_TOKEN && env.RTK_APP_ID) ||
        (env.REALTIMEKIT_ORG_ID && env.REALTIMEKIT_API_KEY),
    );
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        method,
        headers: this.headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      throw new RtkApiError(`Upstream request failed: ${(err as Error).message}`, 502, 'upstream_unreachable');
    }

    let json: Envelope<T> | undefined;
    const text = await res.text();
    try {
      json = text ? (JSON.parse(text) as Envelope<T>) : undefined;
    } catch {
      json = undefined;
    }

    if (!res.ok || json?.success === false) {
      const message =
        json?.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
        json?.message ||
        (typeof json?.error === 'string' ? json.error : json?.error?.message) ||
        `${res.status} ${res.statusText}`;
      const code = res.status === 404 ? 'not_found' : res.status === 401 || res.status === 403 ? 'unauthorized' : 'rtk_error';
      throw new RtkApiError(message, res.status, code, json ?? text);
    }

    const payload = (json?.data ?? json?.result) as T | undefined;
    if (payload === undefined) {
      throw new RtkApiError('Unexpected response from RealtimeKit API', 502, 'bad_upstream_response', json ?? text);
    }
    return payload;
  }

  createMeeting(input: {
    title: string;
    record_on_start?: boolean;
    persist_chat?: boolean;
    session_keep_alive_time_in_secs?: number;
  }): Promise<RtkMeeting> {
    return this.request<RtkMeeting>('POST', '/meetings', input);
  }

  async getMeeting(meetingId: string): Promise<RtkMeeting | null> {
    try {
      return await this.request<RtkMeeting>('GET', `/meetings/${encodeURIComponent(meetingId)}`);
    } catch (err) {
      if (err instanceof RtkApiError && err.status === 404) return null;
      throw err;
    }
  }

  addParticipant(
    meetingId: string,
    input: { name: string; preset_name: string; custom_participant_id: string; picture?: string },
  ): Promise<RtkParticipant> {
    return this.request<RtkParticipant>('POST', `/meetings/${encodeURIComponent(meetingId)}/participants`, input);
  }

  listPresets(): Promise<RtkPreset[]> {
    return this.request<RtkPreset[]>('GET', '/presets');
  }
}
