/** Replacement for `virtual:pwa-register` in packaged (Electron / Capacitor) builds. */
export function registerSW(): () => void {
  return () => {};
}
