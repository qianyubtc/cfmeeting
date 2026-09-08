/** Small, defensive localStorage helpers (localStorage can throw in private mode / previews). */

const PREFIX = 'cfmeeting.';

export function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function setItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function getSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function setSession(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function removeSession(key: string): void {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export interface RecentMeeting {
  id: string;
  ref: string;
  displayCode: string;
  title: string;
  type: 'conference' | 'webinar';
  role: 'host' | 'participant';
  hostKey?: string;
  source: 'demo' | 'selfhosted';
  lastJoinedAt: number;
}

export function getRecentMeetings(): RecentMeeting[] {
  return getItem<RecentMeeting[]>('recent', []);
}

export function rememberMeeting(m: RecentMeeting): void {
  const list = getRecentMeetings().filter((x) => x.id !== m.id);
  list.unshift(m);
  setItem('recent', list.slice(0, 12));
}

export function forgetMeeting(id: string): void {
  setItem(
    'recent',
    getRecentMeetings().filter((x) => x.id !== id),
  );
}
