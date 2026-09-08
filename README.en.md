<p align="center">
  <img src="apps/web/public/icons/icon-192.png" width="96" height="96" alt="CFMeeting" />
</p>

<h1 align="center">CFMeeting</h1>

<p align="center">
  An open-source, multi-platform video meeting app built on the Cloudflare Realtime demo<br />
  <strong>macOS · Windows · iOS · Android · Web · Mobile web</strong>
</p>

<p align="center">
  <a href="https://github.com/qianyubtc/cfmeeting/releases/latest">Download</a> ·
  <a href="https://qianyubtc.github.io/cfmeeting/">Web app</a> ·
  <a href="README.md">中文</a> ·
  <a href="docs/ARCHITECTURE.md">Architecture</a> ·
  <a href="docs/BUILD.md">Build</a> ·
  <a href="NOTICE.md">Notice</a>
</p>

## Overview

CFMeeting is an open-source video meeting application powered by **Cloudflare RealtimeKit**. Type a name, start or join a meeting, and use screen sharing, chat, participant management, polls, waiting rooms, breakout rooms and webinars.

What makes it different: **there is no backend and no account**. The desktop and Android apps talk directly to Cloudflare's public Realtime demo service; the web build is a set of static files. Every platform shares the same meeting codes and joins the same rooms.

> **Disclaimer**: CFMeeting is a community derivative of the [official Cloudflare RealtimeKit demo](https://demo.realtime.cloudflare.com/meeting?demo=Default). It is **not** an official Cloudflare product and is not affiliated with, sponsored by or endorsed by Cloudflare, Inc. In the default mode meetings run on Cloudflare's public demo service with no privacy, availability or retention guarantees. Use it for learning, testing and demos only. See [NOTICE.md](NOTICE.md).

## Platforms

| Platform | Form | In-call UI | Notes |
|---|---|---|---|
| macOS | Electron app (dmg / zip, Apple silicon and Intel) | Native local UI | Screen sharing, system picker on macOS 15+ |
| Windows | Electron app (NSIS installer, x64) | Native local UI | Screen sharing with optional system audio |
| Android | Capacitor app (APK) | Native local UI | Can view shares; cannot start one (WebView limitation) |
| iOS | Home-screen web app (PWA) | Embedded official page | Cannot start screen sharing |
| Web / mobile web | Static site, desktop and phone browsers | Embedded official page | Meetings are created on the official page in two steps |

The difference in the in-call UI comes from browser cross-origin rules: a static page cannot call the demo API, so the web and iOS builds embed the official meeting page, while the desktop and Android shells are not restricted.

## Highlights

- Zero setup: no sign-up, no configuration, no server of your own.
- Same meeting code on every platform.
- Full meeting feature set from RealtimeKit: grid and spotlight layouts, screen share, chat, participant controls, polls, waiting room, breakout rooms, recording entry point, webinars with stage requests.
- iOS-style frosted-glass UI with light and dark themes, FaceTime-style floating controls, bottom sheets on phones.
- Simplified Chinese and English, including every in-call string.
- Invites by code, app link, browser link, QR code and system share.
- Native touches: `cfmeeting://` deep links, screen picker and window state on desktop; back button, status bar and deep links on Android; wake lock and install prompt on the web.
- MIT licensed; RealtimeKit SDK / UI Kit are Apache-2.0.

## Quick start

```bash
git clone https://github.com/qianyubtc/cfmeeting.git && cd cfmeeting
nvm use && npm install
npm run preview          # local UI preview panel at http://localhost:5173/preview
npm run desktop:dev      # Electron in development mode
npm run desktop:build    # macOS / Windows packages → apps/desktop/release/
npm run android:build    # Android debug APK
npm run build:site       # landing page + download page + /app/ web build → site/
```

Pushing a `v*` tag builds macOS, Windows and Android packages and publishes a GitHub Release. See [docs/BUILD.md](docs/BUILD.md) and [docs/DEPLOY.md](docs/DEPLOY.md).

## License

MIT — see [LICENSE](LICENSE). Third-party attributions in [NOTICE.md](NOTICE.md).
