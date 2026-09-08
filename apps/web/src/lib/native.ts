/**
 * Glue for the native shells: deep links, Android back button and status bar.
 * Everything is dynamically imported so the web build never touches Capacitor plugins.
 */
import { extractMeetingRef, extractTypeHint } from './backend';
import { routeFromLink } from './links';
import { isCapacitor, isElectron } from './platform';
import type { Theme } from './theme';

export function initNativeBridges(navigate: (path: string) => void, confirmLeave: () => boolean): () => void {
  const disposers: Array<() => void> = [];
  let disposed = false;

  if (isElectron && window.desktop?.onNavigate) {
    disposers.push(window.desktop.onNavigate((path) => navigate(path)));
  }

  if (isCapacitor) {
    void (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const urlSub = await App.addListener('appUrlOpen', ({ url }) => {
          const route = routeFromLink(url, extractMeetingRef, extractTypeHint);
          if (route) navigate(route);
        });
        const backSub = await App.addListener('backButton', ({ canGoBack }) => {
          const inMeeting = /#\/m\//.test(window.location.href) || /\/m\//.test(window.location.pathname);
          if (inMeeting && !confirmLeave()) return;
          if (canGoBack) window.history.back();
          else void App.exitApp();
        });
        if (disposed) {
          void urlSub.remove();
          void backSub.remove();
          return;
        }
        disposers.push(() => void urlSub.remove(), () => void backSub.remove());
        const launch = await App.getLaunchUrl();
        if (launch?.url) {
          const route = routeFromLink(launch.url, extractMeetingRef, extractTypeHint);
          if (route) navigate(route);
        }
      } catch (err) {
        console.warn('native bridge init failed', err);
      }
    })();
  }

  return () => {
    disposed = true;
    disposers.forEach((d) => d());
  };
}

/** Keep the Android status bar in sync with the app theme (no-op elsewhere). */
export async function syncStatusBar(theme: Theme): Promise<void> {
  if (!isCapacitor) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#0b0b0f' : '#eef1f6' });
  } catch {
    /* plugin unavailable */
  }
}
