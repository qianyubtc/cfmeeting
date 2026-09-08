/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __PACKAGED__: boolean;

interface DesktopBridge {
  platform: 'darwin' | 'win32' | 'linux';
  version: string;
  /** Cross-origin HTTP request performed by the Electron main process (no CORS). */
  request(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{ status: number; body: string }>;
  openExternal(url: string): Promise<void>;
  /** Deep links (cfmeeting://join/<id>) forwarded by the main process. Returns an unsubscribe function. */
  onNavigate(cb: (path: string) => void): () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Window {
  desktop?: DesktopBridge;
  Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
}
