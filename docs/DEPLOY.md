# 网页版 & 自托管服务 / Web deployment & self-hosted server

桌面 / 安卓端默认不需要本文。**网页版（含 iOS 轻应用）需要部署 `apps/server`**，因为浏览器无法跨域调用官方演示接口。此外它还提供：

- 网页 / iOS 轻应用也用本地中文会议界面（而不是内嵌官方 Demo）
- 9 位会议号（需要 KV）、主持人密钥（HMAC，不需要存储）
- 改用**自己的** Cloudflare RealtimeKit App（不再依赖官方演示服务；RealtimeKit 按参会分钟计费，无免费额度）

`apps/server` 是一个 Cloudflare Worker（Hono），同时把 `apps/web/dist` 作为静态资源提供，所以一次部署 = 网页 + 接口。

## 1. 零凭据模式（DEMO_PROXY）

`wrangler.jsonc` 默认 `"DEMO_PROXY": "true"`：Worker 只是把创建 / 加入请求转发给官方演示接口并补上 CORS。

```bash
npx wrangler login                      # 一次性
npm run deploy                          # 构建 web + wrangler deploy
```

部署后访问 `https://cfmeeting.<你的子域>.workers.dev`，网页会通过 `/api/health` 自动识别为自托管模式；桌面 / 安卓端可在"设置 → 服务器地址"中填写该地址。

## 2. 自有凭据模式

1. Cloudflare 仪表盘 → **Realtime → RealtimeKit** → 创建 App，记下 **App ID**；在 **API Tokens** 创建带 `Realtime Admin` 权限的令牌；记下 **Account ID**。
2. 本地开发：复制 `apps/server/.dev.vars.example` 为 `.dev.vars` 填入 `CF_ACCOUNT_ID`、`CF_API_TOKEN`、`RTK_APP_ID`。
3. 把 `wrangler.jsonc` 里的 `DEMO_PROXY` 改为 `"false"`。
4. 创建预设（角色）——脚本会在你的 App 里建 `cfmeeting_host / cfmeeting_participant / cfmeeting_webinar_host / cfmeeting_webinar_participant`，已存在则跳过：

   ```bash
   npm run setup:presets
   ```

   也可以在仪表盘里自建预设，然后修改 `RTK_HOST_PRESET` / `RTK_PARTICIPANT_PRESET`。
5. 生产环境写入密钥并部署：

   ```bash
   cd apps/server
   npx wrangler secret put CF_ACCOUNT_ID
   npx wrangler secret put CF_API_TOKEN
   npx wrangler secret put RTK_APP_ID
   npx wrangler secret put HOST_KEY_SECRET        # 任意长随机串（可选但推荐）
   npx wrangler secret put CREATE_ACCESS_CODE     # 可选：创建会议需要口令，防止别人烧你的额度
   cd ../.. && npm run deploy
   ```

## 3. 可选：9 位会议号（KV）

```bash
cd apps/server
npx wrangler kv namespace create MEETINGS
```

把返回的 `id` 填入 `wrangler.jsonc` 的 `kv_namespaces`（模板已注释在文件末尾），重新部署。之后创建会议会得到 `123-456-789` 形式的会议号，30 天有效。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查（网页用它判断自托管模式） |
| GET | `/api/config` | 是否需要创建口令、是否有会议号等 |
| POST | `/api/meetings` | `{name, title, type, accessCode?}` → 创建并以主持人加入，返回 `token` 与 `hostKey` |
| GET | `/api/meetings/:ref` | 会议信息（UUID 或会议号） |
| POST | `/api/meetings/:ref/join` | `{name, type?, hostKey?}` → 参会者 token；`hostKey` 正确则为主持人 |

环境变量说明见 `apps/server/wrangler.jsonc` 与 `.dev.vars.example`。
