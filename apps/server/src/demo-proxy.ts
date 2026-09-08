/**
 * DEMO_PROXY mode: instead of your own RealtimeKit credentials, relay to the public
 * Cloudflare demo API (https://demo.realtime.cloudflare.com/api/v2/*). This gives the
 * web / PWA build the same zero-account experience the native shells have, at the cost
 * of depending on Cloudflare's demo service (see README disclaimer).
 */
import { RtkApiError, type RtkMeeting, type RtkParticipant, type MeetingApi } from './rtk';

export const DEMO_ORIGIN = 'https://demo.realtime.cloudflare.com';

export const DEMO_PRESETS = {
  conference: { host: 'group_call_host', participant: 'group_call_participant' },
  webinar: { host: 'webinar_presenter', participant: 'webinar_viewer' },
} as const;

async function call<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${DEMO_ORIGIN}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new RtkApiError(`Demo API unreachable: ${(err as Error).message}`, 502, 'upstream_unreachable');
  }
  const text = await res.text();
  if (!res.ok) {
    // the demo Worker answers 500 for unknown meeting IDs / presets
    throw new RtkApiError(`Demo API ${res.status}: ${text.slice(0, 200)}`, res.status >= 500 ? 404 : res.status, res.status >= 500 ? 'not_found' : 'rtk_error');
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RtkApiError('Unexpected response from demo API', 502, 'bad_upstream_response');
  }
}

export class DemoProxyApi implements MeetingApi {
  readonly mode = 'demo-proxy' as const;

  async createMeeting(input: { title: string }): Promise<RtkMeeting> {
    return call<RtkMeeting>('/api/v2/meetings', { title: input.title, record: false });
  }

  async getMeeting(meetingId: string): Promise<RtkMeeting | null> {
    // No lookup endpoint on the demo; assume it exists — join reveals the truth.
    return { id: meetingId, status: 'ACTIVE' };
  }

  async addParticipant(meetingId: string, input: { name: string; preset_name: string; custom_participant_id: string }): Promise<RtkParticipant> {
    return call<RtkParticipant>('/api/v2/participants', {
      clientSpecificId: input.custom_participant_id,
      displayName: input.name,
      presetName: input.preset_name,
      meetingId,
    });
  }
}
