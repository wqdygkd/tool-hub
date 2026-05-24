# CLAUDE.md

SessionBox 多功能工具平台的 Claude Code 项目指南。

## 架构

```
renderer/              → 主应用首页导航（不含工具代码）
tools/<tool>/renderer/ → 工具前端
tools/<tool>/backend/  → 工具后端（Electron 主进程）
tools/<tool>/index.js  → 工具定义入口
electron/              → Electron 入口（加载工具 backend）
shared/                → 跨工具共享代码
```

## 目录结构

| 目录 | 内容 |
|------|------|
| `renderer/` | App.vue, router, layouts, pages/HomePage, shared/, config/tools.js |
| `tools/sessionbox/renderer/` | components/, stores/, pages/, shared/ |
| `tools/sessionbox/backend/` | ipc/, services/, store/, chrome/, fingerprint/, constants/, utils/ |
| `electron/` | main.js（引用 tools/sessionbox/backend）, preload.cjs |

## 路径别名

| 别名 | 路径 |
|------|------|
| `@renderer` | `renderer/` |
| `@tools` | `tools/` |
| `@shared` | `shared/` |

注意：工具内部使用相对路径，不使用别名。

## 编码规范

### CSS 变量

使用 `renderer/shared/styles/main.css` 定义的全局变量：
- 颜色：`--color-*`
- 字体：`--font-*`
- 间距：`--spacing-*`
- 圆角：`--radius-*`

### Flex 布局

```css
.parent { display: flex; flex-direction: column; min-height: 0; }
.child { flex: 1; min-height: 0; overflow: auto; }
```

### IPC 调用

前端：
```javascript
import { invokeIpc, ipcChannels } from '@renderer/shared/composables/useIpc.js';
await invokeIpc(ipcChannels().SANDBOX_CREATE, data);
```

后端：`tools/sessionbox/backend/ipc/`

### Store 命名

```javascript
defineStore('sessionbox/sandbox', () => { ... });
```

## 添加新工具

1. 创建 `tools/<tool>/index.js`：
   ```javascript
   export default {
     id: 'tool-name',
     name: '名称',
     description: '描述',
     route: { path: 'tool-name', component: Page },
   };
   ```
2. 注册：`renderer/config/tools.js`
3. 路由：`renderer/router/routes.js`

## 文件定位

| 内容 | 位置 |
|------|------|
| 工具注册 | `renderer/config/tools.js` |
| 路由 | `renderer/router/routes.js` |
| IPC | `tools/sessionbox/backend/ipc/` |
| 服务 | `tools/sessionbox/backend/services/` |
| 数据库 | `tools/sessionbox/backend/store/` |
| 全局样式 | `renderer/shared/styles/main.css` |