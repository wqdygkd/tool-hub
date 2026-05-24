# SessionBox

多功能工具平台，基于 Electron + Vue 3 + Chrome 多实例方案。

## 架构

采用单体仓库子目录架构，主仓库仅负责首页导航，各工具独立存放于 `tools/` 目录。

```
project/
├── renderer/                 # 主应用（首页导航）
│   ├── App.vue               # 应用 Shell
│   ├── main.js               # Vue 入口
│   ├── router/               # 路由配置
│   ├── layouts/              # 页面布局
│   ├── pages/HomePage.vue    # 主页
│   ├── shared/               # 前端共享资源
│   │   ├── components/       # 通用组件
│   │   ├── composables/      # 通用组合函数
│   │   └── styles/           # 全局样式
│   └── config/tools.js       # 工具注册表
│
├── tools/                    # 工具目录
│   └── sessionbox/           # SessionBox 工具（完全独立）
│       ├── index.js          # 工具入口定义
│       ├── renderer/         # 工具前端
│       │   ├── components/
│       │   ├── stores/
│       │   ├── pages/
│       │   └── shared/       # 工具前端共享
│       ├── backend/          # 工具后端（Electron 主进程）
│       │   ├── ipc/          # IPC 通道与处理
│       │   ├── services/     # 服务层
│       │   ├── store/        # 数据库
│       │   ├── chrome/       # Chrome 检测
│       │   ├── fingerprint/  # 指纹生成
│       │   ├── constants/    # 常量
│       │   └── utils/        # 工具函数
│       ├── extension/        # 指纹伪造扩展
│       └── assets/           # 工具资源
│
├── electron/                 # Electron 入口
│   ├── main.js               # 主进程入口（加载工具 backend）
│   └── preload.cjs           # 预加载脚本
│
├── shared/                   # 跨工具共享代码
└── docs/                     # 文档
```

## 目录职责

| 目录 | 职责 |
|------|------|
| `renderer/` | 仅首页导航，不含任何工具代码 |
| `tools/<tool>/renderer/` | 工具前端代码 |
| `tools/<tool>/backend/` | 工具后端代码（Electron 主进程） |
| `tools/<tool>/index.js` | 工具定义入口（导出 id, name, route 等） |
| `electron/` | 仅入口，加载 `tools/*/backend/` |
| `shared/` | 跨工具共享代码（预留） |

## 功能（SessionBox）

- 独立 Chrome Profile 沙箱
- 指纹伪造扩展（Canvas / WebGL / Navigator）
- 沙箱创建、启动、关闭、删除

## 环境要求

- Node.js 20+
- pnpm（勿用 npm）

## 开发

```bash
pnpm install
pnpm dev
```

## 添加新工具

1. 创建 `tools/<tool>/` 目录：
   ```
   tools/<tool>/
   ├── index.js        # 工具定义
   ├── renderer/       # 前端
   └── backend/        # 后端（可选）
   ```
2. 注册到 `renderer/config/tools.js`
3. 路由添加到 `renderer/router/routes.js`