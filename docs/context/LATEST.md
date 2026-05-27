---
status: in-progress
branch: main
timestamp: 2026-05-23T12:00:00+08:00
title: SessionBox 项目上下文
packageManager: pnpm
---

> 本文件为项目内保存的 AI/开发会话记忆。新会话请先读此文件 + 设计文档 `docs/superpowers/specs/2026-05-23-sessionbox-design.md`。

## 正在做什么

**SessionBox / Chrome 沙箱** — 多沙箱 Chrome 管理桌面应用（Electron + Vue 3）。每个隔离沙箱有独立 `user-data-dir` + 指纹伪造扩展；创建时可从**系统 Chrome Profile** 克隆书签、密码、扩展等。

当前进度：已移除「默认 Chrome」虚拟实例；所有沙箱均为隔离目录。**包管理器使用 pnpm**（勿用 npm）。

## 技术栈

| 层 | 选型 |
|----|------|
| 包管理 | **pnpm**（`packageManager` 字段锁定版本） |
| 桌面壳 | Electron 33 |
| 前端 | Vue 3 + Vite + Element Plus + Pinia |
| 数据库 | better-sqlite3（`data/config.db`） |
| Chrome | 多实例 + `--user-data-dir` + 可选 `--load-extension` |

## 目录结构（关键路径）

```
electron/main.js          # Electron 入口
electron/preload.cjs      # preload（内联 IPC_CHANNELS，不可 require 本地文件）
src/ipc/channels.js       # 主进程 IPC 通道（与 preload 保持同步）
src/constants/sandbox.js  # 默认实例常量（前后端共享，Vite @shared 别名）
renderer/                 # Vue 前端
src/services/sandbox-service.js
data/sandboxes/           # 隔离沙箱 user-data-dir
data/config.db
```

## 架构要点

- **pnpm**：安装/开发/构建一律用 `pnpm`，不用 `npm`/`yarn`。
- **IPC**：`window.sessionbox` 由 preload 暴露；`invokeIpc` / `onIpc` / `ipcChannels()` 封装调用。
- **Preload 限制**：Electron 33 将 preload 打进 sandbox bundle，**不能** `require` 任何本地文件；`IPC_CHANNELS` 必须内联在 `electron/preload.cjs`，与 `src/ipc/channels.js` 手动同步。
- **共享常量**：渲染进程通过 Vite 别名 `@shared` → `src/` 引用 `constants/sandbox.js`（已删除 `renderer/composables/useSandbox.js`）。
- **Profile 克隆源**：`getDefaultChromeProfilePath()` / `getChromeUserDataRoot()` 仅用于新建沙箱时从系统 Chrome 复制数据，不作为沙箱 `user-data-dir`。

## 已做功能

- [x] 沙箱 CRUD、Profile 克隆、指纹伪造、插件管理
- [x] 优雅关闭 Chrome + session 恢复
- [x] 代码精简（扩展同步/聚焦逻辑提取、useDialogVisible、path-helper 合并等）

## 已修复问题（勿重复踩坑）

| 问题 | 原因 | 修复 |
|------|------|------|
| `module not found: channels.cjs` | preload 沙箱不能 require 本地文件 | IPC_CHANNELS 内联于 `preload.cjs` |
| `invoke` undefined | preload ESM + 顶层缓存 API | `preload.cjs` + `getSessionboxApi()` 懒加载 |
| better-sqlite3 报错 | Electron ABI 不匹配 | `postinstall`: `electron-builder install-app-deps` |
| 关闭后登录丢失 | taskkill 强杀 | 优雅关闭 + `--restore-last-session` |

## 启动方式（pnpm）

```bash
cd d:\project\chrome1
pnpm install
pnpm dev          # 开发（必须 Electron，不能单独开 localhost:5173）
pnpm build && pnpm start   # 生产
pnpm dist         # 本地打包
# CI：GitHub Actions workflow「Release」手动触发，上传多平台包到 Release
```

## Git 状态（保存时）

- 分支：`main`
- 锁文件：`pnpm-lock.yaml`（迁移自 npm，不再使用 `package-lock.json`）
- 设计文档：`docs/superpowers/specs/2026-05-23-sessionbox-design.md`

## 待办

1. 系统 Chrome 与沙箱同时运行时的 Profile 锁提示
2. 支持多 Chrome Profile 选择作为克隆源
3. 首次 commit + `pnpm dist` 打包验证
4. 新增 IPC 通道时同步更新 `preload.cjs` 与 `src/ipc/channels.js`

## 关键代码入口

```js
// 前端 IPC
import { invokeIpc, ipcChannels, onIpc } from '@renderer/shared/composables/useIpc.js';
```

## 对话恢复提示

> 请先阅读 `docs/context/LATEST.md`。本项目使用 **pnpm**，命令勿写 npm。

---

*最后更新：2026-05-23 · pnpm 迁移 + 记忆同步*
