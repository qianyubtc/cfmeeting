<p align="center">
  <img src="apps/web/public/icons/icon-192.png" width="96" height="96" alt="CFMeeting" />
</p>

<h1 align="center">CFMeeting</h1>

<p align="center">
  一款基于 Cloudflare Realtime Demo 的开源多端视频会议应用<br />
  <strong>macOS · Windows · iOS · Android · Web · H5</strong>
</p>

<p align="center">
  <a href="https://github.com/qianyubtc/cfmeeting/releases/latest">下载安装包</a> ·
  <a href="https://qianyubtc.github.io/cfmeeting/">网页版</a> ·
  <a href="README.en.md">English</a> ·
  <a href="docs/ARCHITECTURE.md">架构</a> ·
  <a href="docs/BUILD.md">构建</a> ·
  <a href="NOTICE.md">声明</a>
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue" />
  <img alt="Platforms" src="https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Android%20%7C%20iOS%20%7C%20Web-0a7aff" />
  <img alt="Backend" src="https://img.shields.io/badge/backend-none-34c759" />
  <img alt="Built with Cloudflare RealtimeKit" src="https://img.shields.io/badge/built%20with-Cloudflare%20RealtimeKit-f38020" />
</p>

---

## 简介

CFMeeting 是一款开源的多端视频会议应用，会议能力来自 **Cloudflare RealtimeKit**，产品形态类似常见的会议软件：输入名字即可发起或加入会议，支持共享屏幕、聊天、参会者管理、投票、等候室、分组讨论和网络研讨会。

它的特别之处在于**完全没有自己的后端，也不需要任何账号**：桌面和安卓客户端直接对接 Cloudflare 公开的 Realtime 演示服务，网页版则是一组纯静态文件。所有端使用同一个会议号，互相可以直接进入同一个会议室。

> **重要声明**：本项目是社区对 [Cloudflare RealtimeKit 官方 Demo](https://demo.realtime.cloudflare.com/meeting?demo=Default) 的二次创作，**不是 Cloudflare 官方产品**，与 Cloudflare, Inc. 没有隶属、合作或背书关系。默认模式下会议由 Cloudflare 的公开演示服务提供，没有任何隐私、可用性或数据保留承诺，请仅用于学习、测试与演示。完整声明见 [NOTICE.md](NOTICE.md) 与文末"声明"一节。

## 截图

| 首页（桌面） | 加入会议 | 发起会议（手机） |
|:---:|:---:|:---:|
| ![首页](docs/screenshots/home-desktop.png) | ![加入](docs/screenshots/join-sheet.png) | ![发起](docs/screenshots/create-mobile.png) |

| 会前准备 | 会议中（桌面） | 会议中（手机） |
|:---:|:---:|:---:|
| ![准备](docs/screenshots/setup-desktop.png) | ![会议室](docs/screenshots/room-desktop.png) | ![手机会议室](docs/screenshots/room-mobile.png) |

## 特性

- **零门槛**：不注册、不配置、不用自己的服务器，输入名字就能开会。
- **多端同一会议室**：macOS、Windows、Android 客户端，iOS 主屏幕轻应用，桌面浏览器 Web 与手机浏览器 H5，共用一个会议号。
- **完整会议能力**：宫格与聚焦视图、共享屏幕、文字聊天、参会者管理（静音 / 移出 / 固定）、投票、等候室、分组讨论、录制入口、网络研讨会（观众申请上台）。
- **精心设计的界面**：iOS 风格毛玻璃、浅色与深色主题、FaceTime 式悬浮控制条、底部抽屉式表单，桌面与手机各有适配。
- **中英双语**：应用界面与会议内所有提示均提供简体中文与英文。
- **邀请方便**：会议号、应用链接、浏览器链接、二维码、系统分享；任何人用浏览器点链接就能进。
- **原生集成**：桌面端支持 `cfmeeting://` 深链接、系统屏幕选择器、窗口位置记忆；安卓端处理返回键、状态栏与深链接；网页端支持屏幕常亮与安装到桌面。
- **开源**：MIT 协议；会议 SDK 与 UI Kit 来自 Cloudflare RealtimeKit（Apache-2.0）。

## 平台支持

| 平台 | 形态 | 会议界面 | 说明 |
|---|---|---|---|
| macOS | Electron 应用（dmg / zip，Apple 芯片与 Intel） | 本地完整界面 | 支持屏幕共享，macOS 15+ 使用系统选择器 |
| Windows | Electron 应用（NSIS 安装包，x64） | 本地完整界面 | 支持屏幕共享，可同时共享系统声音 |
| Android | Capacitor 应用（APK） | 本地完整界面 | 可观看共享，不支持发起共享（WebView 限制） |
| iOS | 网页添加到主屏幕（PWA） | 内嵌官方会议页面 | 不支持发起共享 |
| Web / H5 | 纯静态网页，桌面与手机浏览器 | 内嵌官方会议页面 | 创建会议在官方页面完成，两步即可 |

会议界面的差异来自浏览器的跨域安全限制：静态网页无法直接调用演示接口，因此网页与 iOS 采用内嵌官方页面的方式；桌面与安卓客户端不受此限制。详见[工作原理](#工作原理)。

## 快速开始

### 直接使用

- 桌面与安卓：到 [Releases](https://github.com/qianyubtc/cfmeeting/releases/latest) 下载对应安装包。安装包未签名，macOS 首次打开请右键"打开"，Windows 在 SmartScreen 中选择"仍要运行"。
- 网页 / H5：打开 [网页版](https://qianyubtc.github.io/cfmeeting/)。
- iOS：用 Safari 打开网页版 → 分享 → **添加到主屏幕**。

### 本地运行

环境：Node.js 22（仓库带 `.nvmrc`）；Android 需要 Android Studio（自带 JDK 与 SDK）。

```bash
git clone https://github.com/qianyubtc/cfmeeting.git && cd cfmeeting
nvm use
npm install
```

```bash
npm run preview          # 本机 UI 预览面板：http://localhost:5173/preview
npm run desktop:dev      # Electron 开发模式
npm run desktop:build    # 打 macOS / Windows 包 → apps/desktop/release/
npm run android:build    # 打 Android debug APK
npm run build:site       # 生成主页 + 下载页 + /app/ 网页版 → site/
```

更多命令与各平台注意事项见 [docs/BUILD.md](docs/BUILD.md)。

## 工作原理

```
 桌面 (Electron) ─┐  直接调用（不受跨域限制）
 安卓 (Capacitor) ─┼──────────────▶ Cloudflare Realtime 演示接口 ──▶ RealtimeKit 会议室
                   │                    (创建会议 / 颁发参会 token)
 Web / H5 / iOS ───┘  内嵌官方会议页面（静态网页无法跨域调用接口）
```

1. 桌面与安卓端调用 Cloudflare 公开的演示接口创建会议并取得参会 token，随后用 RealtimeKit SDK 加入会议；会前准备页与会议室由 RealtimeKit UI Kit 的组件在本地拼装并汉化。
2. 网页版是纯静态文件：加入会议时内嵌官方会议页面；创建会议则在官方页面完成后，把链接粘贴回应用生成邀请并记入最近会议。
3. 整个项目没有自己的服务器。仓库中的 `apps/server` 是一个**可选**的 Cloudflare Worker，只有当你希望网页版也使用本地完整界面、或改用自己的 RealtimeKit 应用时才需要部署，见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 项目结构

```
apps/
  web/        React + Vite 网页应用 / PWA，所有端共用的界面代码
  desktop/    Electron 壳（权限、屏幕共享选择器、深链接、跨域请求代理）
  android/    Capacitor 壳（生成的 Android 工程在 android/ 下）
  server/     可选的 Cloudflare Worker（转发或自有凭据模式）
site/         项目主页与下载页（Cloudflare Pages），构建后 /app/ 内含网页版
docs/         架构、构建、部署文档与截图
scripts/      图标生成、本机预览、站点构建脚本
.github/      多平台打包、GitHub Pages、Cloudflare Pages 工作流
```

## 发布与部署

- **安装包**：推送 `v*` 标签后，GitHub Actions 自动产出 macOS、Windows、Android 安装包并创建 Release。
- **网页版（GitHub Pages）**：仓库 Settings → Pages 选择 "GitHub Actions"，推送 `main` 自动发布。
- **主页 + 下载页（Cloudflare Pages）**：连接本仓库，构建命令 `npm run build:site`，输出目录 `site`，环境变量 `NODE_VERSION=22`；下载页会自动从 GitHub Releases 读取最新版本，并预留了可配置的广告位（`site/config.js`）。

## 常见问题

**为什么网页版的会议界面是英文的？** 浏览器不允许静态网页跨域调用演示接口，所以网页版内嵌了官方会议页面。安装桌面或安卓客户端即可获得本地中文界面；或按 [docs/DEPLOY.md](docs/DEPLOY.md) 部署可选的转发服务。

**会议数据存在哪里？** 会议运行在 Cloudflare 的演示账号下，本项目不保存任何会议内容；"最近会议"与名字只存在你自己的设备上。

**可以商用吗？** 代码是 MIT 协议，但默认依赖的演示服务没有任何服务承诺，也不适合承载敏感或商业会议。如需生产用途，请使用自己的 Cloudflare RealtimeKit 应用（可选服务端已支持）。

**iOS 为什么没有原生 App？** 为了保持零成本与零门槛，iOS 采用添加到主屏幕的轻应用形式，不需要开发者账号。

## 声明

- CFMeeting 是社区项目，基于 Cloudflare RealtimeKit 官方 Demo 二次创作，**不是 Cloudflare 官方产品**，与 Cloudflare, Inc. 无隶属、合作或背书关系。
- 默认模式下会议由 Cloudflare 公开的演示服务提供，Cloudflare 可能随时限流、调整或关闭该服务；请勿用于敏感、商业或重要的会议。
- Cloudflare、RealtimeKit 是 Cloudflare, Inc. 的商标；文中提到的其他会议软件名称仅用于描述产品形态，本项目与其无关。
- 会议 SDK 与 UI Kit：Cloudflare RealtimeKit（Apache-2.0）。第三方组件与致谢详见 [NOTICE.md](NOTICE.md)。

## 许可证

本仓库代码以 [MIT 许可证](LICENSE) 开源。
