import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rootPkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * Two build flavours from one code base:
 *  - `vite build`                 → dist/           absolute base, PWA service worker (web / iOS home-screen app)
 *  - `vite build --mode packaged` → dist-packaged/  relative base, no service worker (Electron file:// & Capacitor)
 */
export default defineConfig(({ mode }) => {
  const packaged = mode === 'packaged';
  // static hosting under a sub-path (e.g. GitHub Pages project site): VITE_BASE=/cfmeeting/
  const webBase = (process.env.VITE_BASE || '/').replace(/\/?$/, '/');
  const alias: Record<string, string> = {};
  // packaged builds have no PWA plugin → point the virtual module at a no-op
  if (packaged) alias['virtual:pwa-register'] = fileURLToPath(new URL('./src/lib/noop-sw.ts', import.meta.url));
  return {
    base: packaged ? './' : webBase,
    resolve: { alias },
    define: {
      __APP_VERSION__: JSON.stringify(rootPkg.version),
      __PACKAGED__: JSON.stringify(packaged),
    },
    build: {
      outDir: packaged ? 'dist-packaged' : 'dist',
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 6000,
    },
    server: {
      port: 5173,
      // optional self-hosted API (apps/server) during development
      proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
    },
    plugins: [
      react(),
      // Electron/Capacitor load from file:// where HTTP headers cannot carry a CSP → use a <meta> tag.
      ...(packaged
        ? [
            {
              name: 'cfmeeting-csp',
              transformIndexHtml(html: string) {
                const csp = [
                  "default-src 'self'",
                  "script-src 'self' 'wasm-unsafe-eval'",
                  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                  "font-src 'self' data: https://fonts.gstatic.com",
                  "img-src 'self' data: blob: https:",
                  "media-src 'self' blob: data: https:",
                  "connect-src 'self' https: wss: blob: data:",
                  "worker-src 'self' blob:",
                  "frame-src https:",
                  "object-src 'none'",
                  "base-uri 'self'",
                ].join('; ');
                return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);
              },
            },
          ]
        : []),
      ...(packaged
        ? []
        : [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['icons/*.png', 'icons/*.svg'],
              manifest: {
                name: 'CFMeeting',
                short_name: 'CFMeeting',
                description: 'Open-source video meetings on Cloudflare RealtimeKit (community demo)',
                lang: 'zh-CN',
                start_url: webBase,
                scope: webBase,
                display: 'standalone',
                orientation: 'any',
                background_color: '#eef1f6',
                theme_color: '#eef1f6',
                icons: [
                  { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                  { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                  { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
                maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
                navigateFallbackDenylist: [/\/api\//],
                cleanupOutdatedCaches: true,
              },
            }),
          ]),
    ],
  };
});
