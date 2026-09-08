# NOTICE / 第三方声明

**CFMeeting** is a community project. It is **not** an official Cloudflare product and is not
affiliated with, sponsored by, or endorsed by Cloudflare, Inc.

**CFMeeting** 是社区项目，**不是** Cloudflare 官方产品，与 Cloudflare, Inc. 没有隶属、赞助或背书关系。

## Derivative work / 二次创作说明

CFMeeting is a derivative of the official **Cloudflare RealtimeKit demo**:

- Live demo: <https://demo.realtime.cloudflare.com/meeting?demo=Default>
- Example sources: <https://github.com/cloudflare/realtimekit-web-examples>

What is reused from the demo / 复用了 demo 的哪些部分:

| Part | How it is used |
|---|---|
| In-call UI (`<rtk-meeting>` from `@cloudflare/realtimekit-ui` / `@cloudflare/realtimekit-react-ui`) | Rendered as-is, with a Simplified Chinese language pack layered on top. |
| Create / join flow (create meeting → add participant with a preset → join with the auth token) | Re-implemented in TypeScript following the same steps and the same preset names the demo uses (`group_call_host`, `group_call_participant`, `webinar_presenter`, `webinar_viewer`). |
| The demo's public API (`/api/v2/meetings`, `/api/v2/participants`) | Called directly in the default "demo" mode so that no server or Cloudflare account is required. Meetings then live in Cloudflare's demo account, subject to Cloudflare's terms and availability. |

No source code was copied from the (unlicensed) `demo-app` portal in the examples repository; the
example apps under `react-examples/` are Apache-2.0.

## Third-party components / 第三方组件

| Component | License | Notes |
|---|---|---|
| `@cloudflare/realtimekit`, `@cloudflare/realtimekit-react` | Apache-2.0 | Cloudflare RealtimeKit core SDK |
| `@cloudflare/realtimekit-ui`, `@cloudflare/realtimekit-react-ui` | Apache-2.0 | RealtimeKit UI Kit (`rtk-*` web components) |
| React, React Router | MIT | |
| Vite, vite-plugin-pwa, Workbox | MIT | |
| Hono | MIT | optional self-hosted API |
| Electron, electron-builder | MIT | desktop shell |
| Capacitor | MIT | Android shell |

## Trademarks / 商标

Cloudflare and RealtimeKit are trademarks of Cloudflare, Inc. "腾讯会议 / Tencent Meeting" is a
trademark of Tencent; it is mentioned in this project only to describe the kind of product this demo
resembles. This project is unrelated to Tencent.

## Terms / 使用条款

The default mode uses Cloudflare's public demo service. Your use of that service is governed by
Cloudflare's website terms (<https://www.cloudflare.com/website-terms/>). Cloudflare may rate-limit,
change or shut the demo down at any time; do not rely on it for anything important, and never use it
for sensitive meetings.
