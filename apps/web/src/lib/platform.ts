const w = typeof window !== 'undefined' ? window : undefined;

/** UI preview helper: ?emulate=desktop|android|ios|web (kept for the session). Cosmetic flags only. */
export type Emulation = 'desktop' | 'android' | 'ios' | 'web' | null;
function readEmulation(): Emulation {
  if (!w) return null;
  try {
    const q = new URLSearchParams(w.location.search || w.location.hash.split('?')[1] || '').get('emulate');
    if (q === 'desktop' || q === 'android' || q === 'ios' || q === 'web') sessionStorage.setItem('cfmeeting.emulate', q);
    if (q === 'off') sessionStorage.removeItem('cfmeeting.emulate');
    const v = sessionStorage.getItem('cfmeeting.emulate');
    return v === 'desktop' || v === 'android' || v === 'ios' || v === 'web' ? v : null;
  } catch {
    return null;
  }
}
export const emulation: Emulation = readEmulation();

export const isElectron = Boolean(w?.desktop);
export const isCapacitor = Boolean(w?.Capacitor?.isNativePlatform?.());
export const isPackaged = __PACKAGED__ || w?.location.protocol === 'file:';
/** Packaged shells load from file:// or a local scheme → hash routing avoids server-side rewrites. */
export const useHashRouter = isPackaged || isElectron || isCapacitor;

const ua = w?.navigator.userAgent ?? '';
export const isIOS = emulation ? emulation === 'ios' : /iP(hone|ad|od)/.test(ua) || (w?.navigator.platform === 'MacIntel' && (w?.navigator.maxTouchPoints ?? 0) > 1);
export const isAndroid = emulation ? emulation === 'android' : /Android/i.test(ua);
export const isMobile = isIOS || isAndroid;
export const isStandalone =
  emulation === 'ios' || (Boolean(w?.matchMedia?.('(display-mode: standalone)').matches) || Boolean((w?.navigator as { standalone?: boolean } | undefined)?.standalone));
export const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Chromium|Edg/.test(ua);

export const supportsScreenShare = emulation === 'android' || emulation === 'ios' ? false : Boolean(w?.navigator.mediaDevices?.getDisplayMedia) && !isIOS && !isCapacitor;

export type PlatformName = 'desktop-mac' | 'desktop-windows' | 'desktop-linux' | 'android' | 'pwa' | 'web';
export const platformName: PlatformName = isElectron
  ? w!.desktop!.platform === 'darwin'
    ? 'desktop-mac'
    : w!.desktop!.platform === 'win32'
      ? 'desktop-windows'
      : 'desktop-linux'
  : isCapacitor || emulation === 'android'
    ? 'android'
    : isStandalone
      ? 'pwa'
      : emulation === 'desktop'
        ? 'desktop-mac'
        : 'web';

/** Native shells can talk to the Cloudflare demo API directly (no browser CORS). */
export const canCallDemoApiDirectly = isElectron || isCapacitor;

export const appVersion = __APP_VERSION__;

export function openExternal(url: string): void {
  if (isElectron) {
    void w!.desktop!.openExternal(url);
    return;
  }
  w?.open(url, '_blank', 'noopener,noreferrer');
}
