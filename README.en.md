# CFMeeting (English summary)

CFMeeting is an **open-source, Tencent-Meeting-style video meeting demo** derived from the official
**Cloudflare RealtimeKit demo** (<https://demo.realtime.cloudflare.com>). It ships as a Windows / macOS
desktop app (Electron), an Android APK (Capacitor), an iOS home-screen PWA and a plain web app.

## Disclaimer

- Not an official Cloudflare product; not affiliated with, sponsored by or endorsed by Cloudflare, Inc.
- The default mode needs **no server and no Cloudflare account**: meetings are created on Cloudflare's
  public demo service, with no privacy, availability or retention guarantees. Cloudflare may rate-limit,
  change or shut the demo down at any time. Use it for learning, testing and demos only.
- The in-call UI and media stack are the Cloudflare RealtimeKit SDK / UI Kit (Apache-2.0). This project's
  own code is MIT. Full attributions: [NOTICE.md](NOTICE.md).

## Modes

| Mode | Platforms | Requires |
|---|---|---|
| Direct demo API (default) | desktop, Android | nothing |
| Static web (embeds the official page) | web (GitHub Pages), iOS PWA | nothing — browsers cannot call the demo API cross-origin, so joining embeds the official page and creating is a two-step "create on the official page, paste the link" flow |
| Self-hosted Worker (optional) | all | a free Cloudflare Workers account — see [docs/DEPLOY.md](docs/DEPLOY.md) |

## Quick start

```bash
nvm use && npm install
npm run dev              # web on :5173
npm run desktop:dev      # Electron against the dev server
npm run desktop:build    # dmg / zip / exe in apps/desktop/release
npm run android:build    # debug APK (needs Android Studio's JDK + SDK, see README.md)
```

See [README.md](README.md) (Chinese) for details, [docs/BUILD.md](docs/BUILD.md) for platform notes and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit together.
