# 构建说明 / Build notes

## 本机 UI 预览

```bash
npm run preview          # 同时启动 Vite（5173）和本地转发 Worker（8787）
```

打开 <http://localhost:5173/preview>：可以切换"完整模式（桌面 / 安卓界面）/ 静态网页模式（网页 / iOS 界面）"、平台模拟、浅色 / 深色、中英文，并一键打开每个页面、弹层与状态；"手机窗口"会用 400×860 的弹窗打开。本地转发 Worker 只是预览用，产品本身不带后端。

## 通用

```bash
nvm use                         # Node 22
npm install
npm run typecheck               # 全部工作区
npm run build                   # apps/web/dist（网页 / PWA）
npm run build:packaged          # apps/web/dist-packaged（桌面 / 安卓）
```

## Windows / macOS（Electron）

```bash
npm run desktop:dev             # 连接 http://localhost:5173（需先 npm run dev）
npm run desktop:build           # 当前系统平台的安装包 → apps/desktop/release/
npm run dist:mac -w apps/desktop
npm run dist:win -w apps/desktop
```

- `apps/desktop/scripts/copy-renderer.mjs` 会把 `apps/web/dist-packaged` 复制到 `apps/desktop/renderer/` 再交给 electron-builder。
- 签名：设置 `CSC_LINK` / `CSC_KEY_PASSWORD`（macOS 还需 `APPLE_ID` 等做公证）。CI 默认 `CSC_IDENTITY_AUTO_DISCOVERY=false` 生成未签名包。
- 冒烟测试（在 `apps/desktop` 下）：`npx electron . --screenshot=/tmp/home.png` 加载首页、截图后退出；加上 `--route=/m/<会议ID>?name=测试&autojoin=1 --screenshot-delay=25000` 可自动加入并截取会前准备页；再加 `&quick=1` 会直接进入会议室。`--size=400x860` 模拟手机尺寸；路由上带 `theme=light|dark` 可强制主题，`/?sheet=join|create` 可直接打开表单弹层。
- 摄像头 / 麦克风：Info.plist 里的 `NSCameraUsageDescription` / `NSMicrophoneUsageDescription` 由 `electron-builder.yml` 的 `extendInfo` 写入。
- 屏幕共享：macOS 15+ 使用系统选择器（`useSystemPicker`），其他情况弹出 `src/picker.html`；Windows 可勾选共享系统声音（loopback）。

## Android（Capacitor 7）

要求：Android Studio（含 JDK 21）与 Android SDK 35。

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
npm run android:sync            # 构建 web + cap sync
npm run android:build           # ./gradlew assembleDebug
# 输出：apps/android/android/app/build/outputs/apk/debug/app-debug.apk
```

- 原生工程 `apps/android/android/` 已提交；重新生成图标：`npm run assets -w apps/android`（源文件在 `apps/android/assets/`）。
- 权限（CAMERA / RECORD_AUDIO / MODIFY_AUDIO_SETTINGS / BLUETOOTH_CONNECT）已加入 `AndroidManifest.xml`；Capacitor 的 WebChromeClient 会在网页申请摄像头 / 麦克风时弹系统授权。
- 发布版：`npm run build:release -w apps/android` 生成未签名 APK，需自行配置 `signingConfigs`。
- 已知限制：Android WebView 不支持 `getDisplayMedia`，无法发起屏幕共享。

## 项目主页 / 下载页（Cloudflare Pages）

`npm run build:site` 会把网页版以 `/app/` 为根路径构建并复制到 `site/app/`，同时把截图复制到 `site/img/`；Pages 的构建命令用它，输出目录填 `site`，环境变量 `NODE_VERSION=22`。`site/config.js` 填写 GitHub 仓库后，下载卡片会调用 GitHub Releases API 自动展示最新版本各平台安装包（按文件名匹配：`*mac*arm64*.dmg`、`*mac*x64*.dmg`、`*.exe`、`*.apk`）。

## 网页版（GitHub Pages）

`.github/workflows/pages.yml` 会在推送 main 时把 `apps/web/dist` 发布到 GitHub Pages（Settings → Pages → Source 选 GitHub Actions）。项目站点位于 `/<repo>/` 子路径，工作流通过 `VITE_BASE` 注入，并复制 `index.html` 为 `404.html` 让 `/m/<会议ID>` 深链接可用。本地模拟：`VITE_BASE=/cfmeeting/ npm run build -w apps/web`。

## iOS（PWA）

不需要 Xcode。把网页版部署到 HTTPS 静态托管后，用 Safari 打开 → 分享 → 添加到主屏幕。

- `index.html` 已包含 `apple-mobile-web-app-capable`、`apple-touch-icon` 等。
- iOS 上走"内嵌官方 Demo"模式（浏览器跨域限制），部署自托管服务后可获得本地中文界面。
- iOS 不支持共享屏幕；若 iframe 内未弹出摄像头授权，使用"在浏览器中打开"。

## GitHub Actions

`.github/workflows/build.yml`：打 `v*` 标签或手动触发 → macOS（arm64 + x64 dmg/zip）、Windows（nsis exe）、Android（debug apk）并发布 Release。
`.github/workflows/deploy.yml`：手动触发，部署可选的自托管 Worker（需要 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` 两个 secret）。
