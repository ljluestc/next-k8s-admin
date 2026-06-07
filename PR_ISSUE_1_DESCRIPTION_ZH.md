# PR 标题
fix: 修复 Nginx 子路径反向代理后 API/静态资源访问失败

## 问题背景
在通过 Nginx 以子路径方式转发 `k8s-admin`（例如 `/k8s-admin`）时，页面出现以下问题：
- API 请求失败（路径命中错误）
- 静态资源请求失败（路径未按子路径前缀解析）
- 登录/鉴权跳转路径回到根路径，导致路由错位
- WebSocket 连接路径在子路径场景下不可用

根因是项目默认按根路径（`/`）部署，前端请求、重定向、Proxy 路径判断和 WS 路径均存在硬编码根路径假设。

## 解决方案概述
本次修复引入统一的 `basePath` 兼容能力，并将请求与跳转逻辑统一改造成“子路径感知”。

### 1) Next.js 构建期 basePath 支持
- 在 `next.config.ts` 增加 `normalizeBasePath`，读取 `NEXT_PUBLIC_BASE_PATH`
- 当该变量有值时，启用 `next.config.basePath`
- 将标准化后的 `NEXT_PUBLIC_BASE_PATH` 注入 `env`

### 2) 新增统一路径工具
新增 `src/lib/base-path.ts`：
- `normalizeBasePath`：标准化前缀（补前导 `/`、去尾部 `/`）
- `withBasePath`：给内部绝对路径自动补子路径前缀
- `stripBasePath`：在服务端/代理判断前移除子路径前缀

### 3) 请求与鉴权跳转兼容子路径
更新 `src/lib/request.ts`：
- `fetch` 前统一 `withBasePath`
- 401 时跳转登录改为 `withBasePath('/login')`
- 登录页识别改为 `stripBasePath(window.location.pathname)`，避免误判

### 4) Proxy 鉴权路径兼容子路径
更新 `src/proxy.ts`：
- 对 `req.nextUrl.pathname` 先执行 `stripBasePath` 再做公开路径与静态资源判断
- 未登录重定向改为 `withBasePath('/login')`

### 5) 登录与改密页面去除根路径硬编码
更新：
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/change-password/page.tsx`

改动点：
- API 调用统一改为 `request(...)`
- 页面跳转改为 `withBasePath(...)`

### 6) WebSocket 路径兼容子路径
更新 `src/lib/ws/url.ts`：
- WS 地址由 `.../ws` 改为 `...${withBasePath('/ws')}`

### 7) 文档与示例环境变量
更新：
- `.env.example`：新增 `NEXT_PUBLIC_BASE_PATH=`
- `README.md`：新增变量说明，并补充“子路径反向代理需设置该变量并重新构建”的说明

## 影响范围
- 子路径部署（Nginx/Ingress 反代）场景恢复可用
- 根路径部署（默认）行为保持不变（`NEXT_PUBLIC_BASE_PATH` 为空）

## 验证结果
已执行：
- `npm run build` ✅ 通过

额外检查：
- `npm run lint` ❌ 失败（仓库存在大量历史 lint 问题，非本次改动引入）

## 部署说明
若通过子路径访问（例如 `/k8s-admin`），请在构建前设置：
- `NEXT_PUBLIC_BASE_PATH=/k8s-admin`

并重新构建/发布产物（`basePath` 为构建期配置，变更后必须重新构建）。
