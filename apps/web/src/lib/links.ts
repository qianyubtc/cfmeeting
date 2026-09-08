import type { MeetingInfo, MeetingType } from './backend';
import { isCapacitor, isElectron, isPackaged } from './platform';

/** Project links shown in the About dialog. */
export const REPO_URL = 'https://github.com/qianyubtc/cfmeeting';
export const OFFICIAL_DEMO_URL = 'https://demo.realtime.cloudflare.com/meeting?demo=Default';
export const RTK_DOCS_URL = 'https://developers.cloudflare.com/realtime/realtimekit/';
export const UPSTREAM_EXAMPLES_URL = 'https://github.com/cloudflare/realtimekit-web-examples';
/** Public URL of a deployed web build (used for app invite links). Optional. */
export const PUBLIC_URL = ((import.meta.env.VITE_PUBLIC_URL as string | undefined) ?? '').replace(/\/+$/, '');
/** Custom URL scheme registered by the desktop and Android shells. */
export const APP_SCHEME = 'cfmeeting';

export function appPathFor(meeting: Pick<MeetingInfo, 'ref' | 'type'>): string {
  return `/m/${encodeURIComponent(meeting.ref)}${meeting.type === 'webinar' ? '?t=webinar' : ''}`;
}

/** https link to this app (only when a public web deployment is known). */
export function webAppLink(meeting: Pick<MeetingInfo, 'ref' | 'type'>, serverUrl: string): string | null {
  const base = PUBLIC_URL || serverUrl || (!isPackaged && !isElectron && !isCapacitor ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}` : '');
  return base ? `${base}${appPathFor(meeting)}` : null;
}

/** cfmeeting://join/<ref>?t=webinar — opens the installed desktop / Android app. */
export function schemeLink(meeting: Pick<MeetingInfo, 'ref' | 'type'>): string {
  return `${APP_SCHEME}://join/${encodeURIComponent(meeting.ref)}${meeting.type === 'webinar' ? '?t=webinar' : ''}`;
}

/**
 * Turns any supported link into an in-app route, or null.
 *  cfmeeting://join/<ref>?t=webinar      → /m/<ref>?t=webinar
 *  https://host/m/<ref>?t=webinar        → /m/<ref>?t=webinar
 *  https://demo.realtime.cloudflare.com/meeting?id=<uuid>   → /m/<uuid>
 */
export function routeFromLink(input: string, extractRef: (s: string) => string | null, extractType: (s: string) => MeetingType | undefined): string | null {
  const ref = extractRef(input);
  if (!ref) return null;
  const type = extractType(input);
  return `/m/${encodeURIComponent(ref)}${type === 'webinar' ? '?t=webinar' : ''}`;
}
