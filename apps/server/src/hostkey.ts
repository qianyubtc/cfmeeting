/**
 * Stateless per-meeting host keys.
 *
 * hostKey = base64url(HMAC-SHA256(secret, meetingId))[0..24)
 *
 * The creator of a meeting receives the key once; presenting it on join grants the host preset.
 * No storage needed, and the key cannot be derived without the server secret.
 */

const enc = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

function base64url(bytes: ArrayBuffer): string {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function makeHostKey(secret: string, meetingId: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`cfmeeting-host:${meetingId}`));
  return base64url(sig).slice(0, 24);
}

export async function verifyHostKey(secret: string, meetingId: string, candidate: string | undefined | null): Promise<boolean> {
  if (!candidate || typeof candidate !== 'string' || candidate.length > 64) return false;
  const expected = await makeHostKey(secret, meetingId);
  if (expected.length !== candidate.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
  return diff === 0;
}

/** Derive the HMAC secret: an explicit HOST_KEY_SECRET, otherwise a hash of the API credential. */
export async function hostKeySecret(env: { HOST_KEY_SECRET?: string; CF_API_TOKEN?: string; REALTIMEKIT_API_KEY?: string }): Promise<string> {
  if (env.HOST_KEY_SECRET) return env.HOST_KEY_SECRET;
  const fallback = env.CF_API_TOKEN || env.REALTIMEKIT_API_KEY || 'cfmeeting-dev-secret';
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`cfmeeting-hostkey:${fallback}`));
  return base64url(digest);
}
