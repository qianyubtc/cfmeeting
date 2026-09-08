# 架构说明 / Architecture

## 会议是怎么建立的

官方 Demo 的流程（我们照搬）：

1. `POST /api/v2/meetings` → 创建会议，得到 `id`
2. `POST /api/v2/participants` → 用一个 **preset**（角色）把参会者加入会议，得到 `token`
3. 前端用 `token` 初始化 RealtimeKit 客户端，交给 `<rtk-meeting>` 组件渲染整个会议界面

官方 Demo 使用的 preset 名称（从其前端包中确认）：

| 会议类型 | 主持人 | 参会者 |
|---|---|---|
| 视频会议（GROUP_CALL） | `group_call_host` | `group_call_participant` |
| 网络研讨会（WEBINAR） | `webinar_presenter` | `webinar_viewer` |

## 模式与平台

```
                ┌──────────────────────────────┐
  桌面 (Electron) │ window.desktop.request()     │──┐
                └──────────────────────────────┘  │  直连（无 CORS 限制）
                ┌──────────────────────────────┐  ├──────▶ demo.realtime.cloudflare.com/api/v2/*
  安卓 (Capacitor)│ CapacitorHttp.request()      │──┘
                └──────────────────────────────┘
                ┌──────────────────────────────┐
  网页 / iOS PWA │ fetch() 被 CORS 拦截         │──▶ 内嵌 <iframe src="…/meeting?id=<会议ID>">
                └──────────────────────────────┘
                ┌──────────────────────────────┐
  任意平台 + 自托管│ /api/meetings, /api/…/join   │──▶ apps/server (Worker) ──▶ demo API 或 RealtimeKit API
                └──────────────────────────────┘
```

`apps/web/src/lib/backend.ts` 里有三个适配器：`DemoBackend`（直连）、`SelfHostedBackend`（自托管）以及
"embed" 兜底（不产生 token，直接内嵌官方页面）。`getMode()` 决定当前用哪一个。

## 目录

- `apps/web/src/pages/Home.tsx` — 首页（加入 / 发起 / 最近会议）
- `apps/web/src/pages/MeetingPage.tsx` — 会议页状态机：prejoin → joining → in-meeting → ended/error，或 embed
- `apps/web/src/components/MeetingRoom.tsx` — `RtkUiProvider` 状态机（setup / waiting / joined / ended）+ 中文语言包（`rtk-lang-zh.ts`）+ 设计令牌
- `apps/web/src/components/room/SetupScreen.tsx` — 自定义会前准备页（预览、麦克风/摄像头、设备选择、权限提示）
- `apps/web/src/components/room/Room.tsx` — 自定义会议室：`RtkGrid` / `RtkSidebar` / `RtkNotifications` / `RtkParticipantsAudio` + 自绘顶部胶囊与控制条；通过 `rtkStateUpdate` 事件驱动 UI Kit 的侧栏 / 对话框
- `apps/web/src/components/ui.tsx` — iOS 风格基础组件（分组列表、Sheet、Segmented、Switch、Toast）
- `apps/desktop/src/main.ts` — 权限、`setDisplayMediaRequestHandler` 屏幕选择器、`desktop:request` IPC
- `apps/server/src/index.ts` — Hono 路由；`demo-proxy.ts` 转发官方接口；`rtk.ts` 调 Cloudflare API；`hostkey.ts` 主持人密钥；`store.ts` KV 会议号

## 链接格式

- 应用内：`/m/<会议ID或会议号>`，可选参数 `t=webinar`（会议类型）、`hk=<主持人密钥>`（自托管）、`host=1`（演示模式下以主持人加入）、`name=<名字>&autojoin=1`（免输入直接加入）。
- 浏览器通用：`https://demo.realtime.cloudflare.com/meeting?id=<会议ID>&demo=Default`（网络研讨会为 `/webinar`）。
- 粘贴任意一种链接到"加入会议"输入框都能识别。

## 同一份前端，两种构建

- `vite build` → `dist/`：绝对路径 + Service Worker，用于网页 / PWA / Worker 静态资源
- `vite build --mode packaged` → `dist-packaged/`：相对路径、无 SW、Hash 路由，用于 Electron（file://）与 Capacitor
