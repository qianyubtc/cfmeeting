export interface Env {
  // Static assets binding (the built web app).
  ASSETS: Fetcher;

  // Cloudflare API credentials (preferred).
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  RTK_APP_ID?: string;

  // Legacy RealtimeKit organisation credentials (fallback).
  REALTIMEKIT_ORG_ID?: string;
  REALTIMEKIT_API_KEY?: string;
  REALTIMEKIT_BASE_URL?: string;

  // "true" → relay to the public Cloudflare demo API instead of using own credentials.
  DEMO_PROXY?: string;

  // Public vars (wrangler.jsonc → vars).
  APP_NAME?: string;
  RTK_HOST_PRESET?: string;
  RTK_PARTICIPANT_PRESET?: string;
  ALLOWED_ORIGINS?: string;
  ALLOW_RECORDING?: string;
  SESSION_KEEP_ALIVE_SECS?: string;

  // Optional secrets.
  HOST_KEY_SECRET?: string;
  CREATE_ACCESS_CODE?: string;

  // Optional KV namespace for short meeting codes.
  MEETINGS?: KVNamespace;
}
