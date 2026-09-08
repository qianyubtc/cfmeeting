/**
 * Optional short meeting codes (会议号) backed by Workers KV.
 * Without the MEETINGS binding the RealtimeKit meeting UUID is used directly.
 */

export interface StoredMeeting {
  id: string;
  code: string;
  title: string;
  createdAt: string;
}

const CODE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeRef(input: string): string {
  const s = (input || '').trim();
  // 9-digit code, possibly typed with spaces or dashes: "123 456 789" / "123-456-789"
  const digits = s.replace(/[\s-]/g, '');
  if (/^\d{9}$/.test(digits)) return digits;
  return s;
}

export function isUuid(ref: string): boolean {
  return UUID_RE.test(ref);
}

export function isShortCode(ref: string): boolean {
  return /^\d{9}$/.test(ref);
}

export function formatCode(code: string): string {
  return isShortCode(code) ? `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6)}` : code;
}

function randomCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  // 100000000..999999999 — never starts with 0 so it survives any numeric parsing
  return String(100_000_000 + (buf[0] % 900_000_000));
}

export async function allocateCode(kv: KVNamespace, meeting: { id: string; title: string }): Promise<StoredMeeting> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const exists = await kv.get(`code:${code}`);
    if (exists) continue;
    const record: StoredMeeting = { id: meeting.id, code, title: meeting.title, createdAt: new Date().toISOString() };
    await Promise.all([
      kv.put(`code:${code}`, JSON.stringify(record), { expirationTtl: CODE_TTL_SECONDS }),
      kv.put(`id:${meeting.id}`, code, { expirationTtl: CODE_TTL_SECONDS }),
    ]);
    return record;
  }
  throw new Error('Could not allocate a unique meeting code');
}

export async function lookupByCode(kv: KVNamespace, code: string): Promise<StoredMeeting | null> {
  const raw = await kv.get(`code:${code}`);
  return raw ? (JSON.parse(raw) as StoredMeeting) : null;
}

export async function lookupCodeById(kv: KVNamespace, id: string): Promise<string | null> {
  return kv.get(`id:${id}`);
}
