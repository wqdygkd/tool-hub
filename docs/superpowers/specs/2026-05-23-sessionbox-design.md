# SessionBox - 多沙箱浏览器管理应用

## 项目概述

**项目名称：** SessionBox  
**技术方案：** 方案C - Chrome 多实例 + 指纹脚本  
**开发语言：** JavaScript (Node.js + Vue 3)  
**目标平台：** Windows / macOS / Linux  

### 核心功能

- 创建多个独立的浏览器沙箱
- 每个沙箱使用独立的 Chrome 实例和 Profile
- 继承本地 Chrome 的插件和设置
- 完整的浏览器指纹伪造（防检测）
- 左侧沙箱列表 + 右侧状态面板的管理界面
- 支持社交媒体、电商、开发测试等多场景

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SessionBox 系统架构                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌───────────────────────────────────────────────────────────────────┐│
│   │                Electron 管理界面 (轻量模式)                         ││
│   │                                                                   ││
│   │   ┌─────────────────────────────────────────────────────────────┐││
│   │   │  主窗口 (只显示管理界面，不内嵌浏览器)                        │││
│   │   │                                                             │││
│   │   │  ┌─────────────┬─────────────────────────────────────────┐ │││
│   │   │  │  沙箱列表    │         状态面板 / 操作区域              │ │││
│   │   │  │ (Vue 3)     │                                       │ │││
│   │   │  │             │                                       │ │││
│   │   │  │ [沙箱1]     │   沙箱详情、指纹状态、插件状态          │ │││
│   │   │  │ [沙箱2]     │   激活/关闭/设置/删除操作               │ │││
│   │   │  │ [沙箱3]     │                                       │ │││
│   │   │  │ [+新建]     │                                       │ │││
│   │   │  └─────────────┴─────────────────────────────────────────┘ │││
│   │   │                                                             │││
│   │   └─────────────────────────────────────────────────────────────┘││
│   │                                                                   ││
│   └───────────────────────────────────────────────────────────────────┘│
│                                   │                                    │
│                                   │ IPC                                │
│                                   ▼                                    │
│   ┌───────────────────────────────────────────────────────────────────┐│
│   │                    Node.js 主进程服务                              ││
│   ├───────────────────────────────────────────────────────────────────┤│
│   │                                                                   ││
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  ││
│   │   │ Chrome 控制 │    │ Profile 管理 │    │  配置存储            │  ││
│   │   ├─────────────┤    ├─────────────┤    ├─────────────────────┤  ││
│   │   │ 进程启动     │    │ Profile克隆 │    │ SQLite 数据库       │  ││
│   │   │ 进程监控     │    │ 插件复制     │    │                     │  ││
│   │   │ 窗口控制     │    │ 书签复制     │    │ 沙箱配置            │  ││
│   │   └─────────────┘    └─────────────┘    │ 指纹配置            │  ││
│   │                                         └─────────────────────┘  ││
│   │                                                                   ││
│   └───────────────────────────────────────────────────────────────────┘│
│                                   │                                    │
│                                   │ 启动 Chrome                        │
│                                   ▼                                    │
│   ┌───────────────────────────────────────────────────────────────────┐│
│   │                    Chrome 实例池 (独立窗口)                         ││
│   ├───────────────────────────────────────────────────────────────────┤│
│   │                                                                   ││
│   │   Chrome #1           Chrome #2           Chrome #3               ││
│   │   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        ││
│   │   │             │     │             │     │             │        ││
│   │   │ 社交媒体     │     │ 电商店铺     │     │ 开发测试     │        ││
│   │   │             │     │             │     │             │        ││
│   │   │ user-data:  │     │ user-data:  │     │ user-data:  │        ││
│   │   │ sb_001      │     │ sb_002      │     │ sb_003      │        ││
│   │   │             │     │             │     │             │        ││
│   │   │ +指纹扩展   │     │ +指纹扩展   │     │ +指纹扩展   │        ││
│   │   │ +继承插件   │     │ +继承插件   │     │ +继承插件   │        ││
│   │   │             │     │             │     │             │        ││
│   │   └─────────────┘     └─────────────┘     └─────────────┘        ││
│   │                                                                   ││
│   └───────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 项目目录结构

```
SessionBox/
├── electron/                    # Electron 主进程
│   ├── main.js                  # 应用入口
│   ├── preload.js               # 预加载脚本
│   └────────────────────────────────────────────────────────────────────┤
│
├── src/                         # Node.js 核心服务
│   ├── chrome/
│   │   ├── detector.js          # Chrome 路径检测
│   │   ├── launcher.js          # Chrome 实例启动
│   │   ├── process-manager.js   # 进程管理
│   │   ├── window-controller.js # 窗口控制
│   │   └────────────────────────────────────────────────────────────────────┤
│   ├── profile/
│   │   ├── cloner.js            # Profile 克隆
│   │   ├── extension-reader.js  # 插件读取
│   │   └────────────────────────────────────────────────────────────────────┤
│   ├── fingerprint/
│   │   ├── generator.js         # 指纹生成
│   │   ├── injector.js          # 指纹注入控制
│   │   ├── config-writer.js     # 指纹配置写入
│   │   └────────────────────────────────────────────────────────────────────┤
│   ├── store/
│   │   ├── database.js          # SQLite 数据库
│   │   ├── sandbox-store.js     # 沙箱配置存储
│   │   ├── fingerprint-store.js # 指纹配置存储
│   │   ├── extension-store.js   # 插件配置存储
│   │   ├── config-store.js      # 全局配置存储
│   │   └────────────────────────────────────────────────────────────────────┤
│   ├── ipc/
│   │   ├── handlers.js          # IPC 处理器
│   │   ├── channels.js          # IPC 通道定义
│   │   └────────────────────────────────────────────────────────────────────┤
│   ├── utils/
│   │   ├── file-ops.js          # 文件操作
│   │   ├── path-helper.js       # 路径工具
│   │   ├── logger.js            # 日志
│   │   └────────────────────────────────────────────────────────────────────┤
│
├── renderer/                    # Vue 3 渲染进程
│   ├── index.html               # HTML 入口
│   ├── main.js                  # Vue 入口
│   ├── App.vue                  # 主组件
│   ├── components/
│   │   ├── Sidebar.vue          # 左侧沙箱列表
│   │   ├── SandboxCard.vue      # 沙箱卡片
│   │   ├── StatusPanel.vue      # 状态面板
│   │   ├── ActionBar.vue        # 操作按钮栏
│   │   ├── CreateDialog.vue     # 创建沙箱对话框
│   │   ├── SettingsDialog.vue   # 设置对话框
│   │   ├── FingerprintEditor.vue # 指纹编辑器
│   │   ├── ExtensionManager.vue # 插件管理
│   │   └────────────────────────────────────────────────────────────────────┤
│   ├── composables/
│   │   ├── useSandbox.js        # 沙箱操作 hooks
│   │   ├── useFingerprint.js    # 指纹操作 hooks
│   │   ├── useIpc.js            # IPC 通信 hooks
│   │   └────────────────────────────────────────────────────────────────────┤
│   ├── stores/
│   │   ├── sandboxStore.js      # Pinia 状态管理
│   │   ├── uiStore.js           # UI 状态
│   │   ├── fingerprintStore.js  # 指纹状态
│   │   └────────────────────────────────────────────────────────────────────┤
│   ├── styles/
│   │   ├── main.css             # 主样式
│   │   ├── components.css       # 组件样式
│   │   └────────────────────────────────────────────────────────────────────┤
│
├── extension/                   # 指纹伪造 Chrome 扩展
│   ├── manifest.json            # 扩展配置 (Manifest V3)
│   ├── background.js            # Service Worker
│   ├── content.js               # 内容脚本入口
│   ├── injected/
│   │   ├── fingerprint.js       # 指纹注入主脚本
│   │   ├── canvas.js            # Canvas 伪造
│   │   ├── webgl.js             # WebGL 伪造
│   │   ├── navigator.js         # Navigator 伪造
│   │   ├── audio.js             # AudioContext 伪造
│   │   ├── screen.js            # Screen 伪造
│   │   └────────────────────────────────────────────────────────────────────┤
│   ├── lib/
│   │   ├── noise-generator.js   # 噪点生成工具
│   │   ├── random-helpers.js    # 随机数工具
│   │   └────────────────────────────────────────────────────────────────────┤
│
├── data/                        # 运行时数据目录
│   ├── sandboxes/               # 沙箱数据
│   │   ├── sandbox_001/
│   │   │   ├── Default/         # Chrome Profile
│   │   │   │   ├── Extensions/  # 继承的插件
│   │   │   │   ├── Cookies/
│   │   │   │   ├── Bookmarks
│   │   │   │   ├── Preferences
│   │   │   │   └────────────────────────────────────────────────────────────────────┤
│   │   │   ├── fingerprint_ext/ # 指纹伪造扩展
│   │   │   └────────────────────────────────────────────────────────────────────────────┤
│   │   ├── sandbox_002/
│   │   ├── sandbox_003/
│   │   └────────────────────────────────────────────────────────────────────────────────────┤
│   ├── config.db                # SQLite 数据库
│   └────────────────────────────────────────────────────────────────────────────────────┤
│
├── resources/                   # 资源文件
│   ├── icons/                   # 应用图标
│   │   ├── icon.ico             # Windows
│   │   ├── icon.icns            # macOS
│   │   ├── icon.png             # Linux
│   │   └────────────────────────────────────────────────────────────────────────────┤
│
├── package.json                 # 项目配置
├── vite.config.js               # Vite 构建配置
├── electron-builder.json        # 打包配置
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 技术栈

| 模块 | 技术选择 | 版本 |
|------|----------|------|
| 框架 | Electron | 28+ |
| 渲染进程 | Vue 3 | 3.4+ |
| 构建 | Vite | 5.1+ |
| 状态管理 | Pinia | 2.1+ |
| UI 组件 | Element Plus | 2.5+ |
| 样式 | SCSS/CSS | - |
| 数据库 | SQLite (better-sqlite3) | 9.4+ |
| 文件操作 | fs-extra | 11.2+ |
| 扩展 | Chrome Extension Manifest V3 | - |

---

## 数据模型

### SQLite Schema

```sql
-- 沙箱配置表
CREATE TABLE IF NOT EXISTS sandboxes (
    id TEXT PRIMARY KEY,                -- 沙箱唯一ID (UUID)
    name TEXT NOT NULL,                 -- 沙箱名称
    category TEXT,                      -- 分类: social, ecommerce, dev, other
    color TEXT,                         -- 颜色标识
    user_data_path TEXT NOT NULL,       -- Chrome user-data-dir 路径
    chrome_pid INTEGER,                 -- Chrome 进程ID
    status TEXT DEFAULT 'stopped',      -- 状态: running, stopped
    fingerprint_id TEXT,                -- 关联的指纹配置ID
    memory_usage INTEGER DEFAULT 0,     -- 内存使用 (MB)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    last_active_at DATETIME,
    metadata TEXT                       -- JSON 格式额外元数据
);

-- 指纹配置表
CREATE TABLE IF NOT EXISTS fingerprints (
    id TEXT PRIMARY KEY,
    user_agent TEXT,
    platform TEXT,
    language TEXT,
    hardware_concurrency INTEGER,
    device_memory INTEGER,
    canvas_noise_level TEXT,            -- low, medium, high
    canvas_noise_seed INTEGER,
    webgl_vendor TEXT,
    webgl_renderer TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    screen_color_depth INTEGER,
    device_pixel_ratio REAL,
    audio_noise_enabled INTEGER DEFAULT 1,
    audio_noise_level REAL,
    timezone_offset INTEGER,
    timezone_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- 插件配置表
CREATE TABLE IF NOT EXISTS extensions (
    id TEXT PRIMARY KEY,
    sandbox_id TEXT NOT NULL,
    extension_id TEXT NOT NULL,         -- Chrome 插件ID
    extension_name TEXT,
    extension_path TEXT,
    enabled INTEGER DEFAULT 1,
    FOREIGN KEY (sandbox_id) REFERENCES sandboxes(id) ON DELETE CASCADE
);

-- 全局配置表
CREATE TABLE IF NOT EXISTS global_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_sandboxes_status ON sandboxes(status);
CREATE INDEX IF NOT EXISTS idx_extensions_sandbox ON extensions(sandbox_id);
```

### TypeScript 类型定义

```typescript
// 沙箱类型
interface Sandbox {
  id: string;
  name: string;
  category: 'social' | 'ecommerce' | 'dev' | 'other';
  color: string;
  userDataPath: string;
  chromePid: number | null;
  status: 'running' | 'stopped';
  fingerprintId: string;
  memoryUsage: number;
  createdAt: Date;
  lastUsedAt: Date | null;
  lastActiveAt: Date | null;
}

// 指纹类型
interface Fingerprint {
  id: string;
  navigator: {
    userAgent: string;
    platform: string;
    language: string;
    hardwareConcurrency: number;
    deviceMemory: number;
  };
  canvas: {
    noiseLevel: 'low' | 'medium' | 'high';
    noiseSeed: number;
  };
  webgl: {
    vendor: string;
    renderer: string;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    devicePixelRatio: number;
  };
  audio: {
    noiseEnabled: boolean;
    noiseLevel: number;
  };
  timezone: {
    offset: number;
    name: string;
  };
}

// 插件类型
interface Extension {
  id: string;
  sandboxId: string;
  extensionId: string;
  extensionName: string;
  extensionPath: string;
  enabled: boolean;
}

// 全局配置类型
interface GlobalConfig {
  chromePath: string;
  defaultProfile: string;
  dataDirectory: string;
  autoRestoreOnStartup: boolean;
  preserveDataOnClose: boolean;
  showMemoryUsage: boolean;
}
```

---

## Chrome 实例启动流程

### 启动命令参数

```bash
chrome.exe \
  --user-data-dir="{sandbox_path}" \
  --profile-directory="Default" \
  --load-extension="{fingerprint_ext_path}" \
  --no-first-run \
  --no-default-browser-check \
  --disable-default-apps \
  --disable-background-networking \
  --disable-component-update \
  --disable-privacy-sandbox \
  --window-position="{x},{y}" \
  --window-size="{width},{height}"
```

### 流程步骤

1. **创建沙箱**
   - 生成沙箱ID (UUID)
   - 创建沙箱数据目录
   - 克隆 Chrome Default Profile（插件、书签、设置）
   - 生成指纹配置
   - 准备指纹伪造扩展
   - 保存配置到数据库

2. **启动沙箱**
   - 检查沙箱状态
   - 构建启动命令
   - 启动 Chrome 进程
   - 监听进程状态
   - 更新沙箱状态为 running

3. **激活沙箱**
   - 如果已停止：启动 Chrome
   - 如果已运行：聚焦窗口

4. **关闭沙箱**
   - 终止 Chrome 进程
   - 更新状态为 stopped
   - 可选：保留或删除数据

5. **删除沙箱**
   - 关闭沙箱（如果运行中）
   - 删除数据目录
   - 删除数据库记录

---

## 指纹伪造实现

### 指纹伪造扩展架构

```
extension/
├── manifest.json              # Manifest V3
├── background.js              # Service Worker
├── content.js                 # 内容脚本 (document_start)
├── injected/
│   ├── fingerprint.js         # 主注入脚本
│   ├── canvas.js              # Canvas 噪点
│   ├── webgl.js               # WebGL 参数伪造
│   ├── navigator.js           # Navigator 属性伪造
│   ├── audio.js               # AudioContext 噪点
│   ├── screen.js              # Screen 属性伪造
│   └────────────────────────────────────────────────────────────────────┤
└────────────────────────────────────────────────────────────────────────────┘
```

### 伪造能力

| 指纹类型 | 伪造方式 | 效果 |
|----------|----------|------|
| Cookies/Session | user-data-dir 隔离 | ✅ 完全隔离 |
| User-Agent | Navigator 属性覆盖 | ✅ 可伪造 |
| Platform | Navigator 属性覆盖 | ✅ 可伪造 |
| HardwareConcurrency | Navigator 属性覆盖 | ✅ 可伪造 |
| DeviceMemory | Navigator 属性覆盖 | ✅ 可伪造 |
| Canvas | toDataURL/getImageData 噪点注入 | ✅ 可伪造 |
| WebGL | getParameter 参数覆盖 | ✅ 可伪造 |
| AudioContext | 振荡器/分析器噪点 | ✅ 可伪造 |
| Screen | Screen 属性覆盖 | ✅ 可伪造 |
| Timezone | Date.getTimezoneOffset 覆盖 | ✅ 可伪造 |
| Fonts | 有限支持 | ⚠️ 部分可伪造 |

---

## IPC 通信通道

### 渲染进程 -> 主进程 (invoke)

| 通道 | 说明 | 参数 |
|------|------|------|
| `sandbox:create` | 创建沙箱 | CreateSandboxData |
| `sandbox:delete` | 删除沙箱 | sandboxId |
| `sandbox:activate` | 激活沙箱 | sandboxId |
| `sandbox:close` | 关闭沙箱 | sandboxId |
| `sandbox:get-all` | 获取所有沙箱 | - |
| `sandbox:get-by-id` | 获取单个沙箱 | sandboxId |
| `sandbox:update` | 更新沙箱 | sandboxId, data |
| `sandbox:refresh-status` | 刷新状态 | sandboxId |
| `fingerprint:create` | 创建指纹 | fingerprintData |
| `fingerprint:update` | 更新指纹 | fingerprintId, data |
| `fingerprint:generate-random` | 生成随机指纹 | - |
| `extension:get-all` | 获取插件列表 | sandboxId |
| `extension:toggle` | 启用/禁用插件 | sandboxId, extensionId, enabled |
| `chrome:detect-path` | 检测 Chrome 路径 | - |
| `config:get` | 获取全局配置 | - |
| `config:update` | 更新全局配置 | data |

### 主进程 -> 渲染进程 (事件)

| 通道 | 说明 | 数据 |
|------|------|------|
| `sandbox:status-changed` | 沙箱状态变更 | { sandboxId, status } |
| `sandbox:process-exited` | Chrome 进程退出 | { sandboxId } |
| `sandbox:memory-update` | 内存使用更新 | { sandboxId, memoryUsage } |

---

## UI 界面

### 主窗口布局 (900x600)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SessionBox                                                    [- □ ×] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────┬─────────────────────────────────────────────────┐│
│  │                   │                                                 ││
│  │    沙箱列表        │              状态面板                           ││
│  │    (220px)        │                                                 ││
│  │                   │   沙箱详情                                       ││
│  │  ┌──────────────┐ │   ├ 状态 / PID / 内存                           ││
│  │  │ 🟢 社交媒体   │ │   ├ 指纹状态                                   ││
│  │  │ ● 运行中      │ │   ├ 插件状态                                   ││
│  │  │ PID: 12345   │ │   └───────────────────────────────────────────── ││
│  │  └──────────────┘ │                                                 ││
│  │                   │   操作按钮                                       ││
│  │  ┌──────────────┐ │   [激活窗口] [关闭] [设置] [删除]               ││
│  │  │ 🔵 电商店铺   │ │   [编辑指纹] [管理插件]                        ││
│  │  │ ○ 已停止      │ │                                                 ││
│  │  └──────────────┘ │                                                 ││
│  │                   │                                                 ││
│  │  ┌──────────────┐ │                                                 ││
│  │  │ 🟣 开发测试   │ │                                                 ││
│  │  │ ○ 已停止      │ │                                                 ││
│  │  └──────────────┘ │                                                 ││
│  │                   │                                                 ││
│  │  ─────────────── │                                                 ││
│  │  [+ 新建沙箱]     │                                                 ││
│  │  ─────────────── │                                                 ││
│  │  [⚙ 全局设置]     │                                                 ││
│  │                   │                                                 ││
│  ├───────────────────┴─────────────────────────────────────────────────┤│
│  │  状态栏: 共 3 个沙箱 | 1 个运行中 | 内存: 256MB | v1.0.0            ││
│  └───────────────────────────────────────────────────────────────────── ││
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 核心组件

- **Sidebar.vue** - 沙箱列表侧边栏
- **SandboxCard.vue** - 单个沙箱卡片（颜色标识、名称、状态）
- **StatusPanel.vue** - 状态详情面板
- **ActionBar.vue** - 操作按钮组
- **CreateDialog.vue** - 创建沙箱对话框
- **FingerprintEditor.vue** - 指纹配置编辑器
- **SettingsDialog.vue** - 全局设置对话框

---

## 开发里程碑

### Phase 1: 项目初始化 (1周)
- Electron + Vue 3 项目搭建
- Vite 构建配置
- 目录结构创建
- 基础依赖安装

### Phase 2: 核心后端服务 (2周)
- SQLite 数据库模块
- Chrome 路径检测
- Profile 克隆模块
- Chrome 启动/进程管理
- IPC 处理器

### Phase 3: 指纹伪造扩展 (1周)
- Chrome 扩展开发
- Canvas/WebGL 伪造
- Navigator/Audio 伪造
- 指纹配置生成器

### Phase 4: Vue 前端界面 (2周)
- 主窗口布局
- 沙箱列表组件
- 状态面板组件
- 创建/设置对话框
- Pinia 状态管理
- IPC 通信 hooks

### Phase 5: 集成与测试 (1周)
- 功能集成测试
- 跨平台测试 (Windows/macOS/Linux)
- UI 优化
- Bug 修复

### Phase 6: 打包发布 (1周)
- Electron-builder 配置
- Windows/macOS/Linux 打包
- 安装程序制作
- 发布准备

---

## 文件清单

设计文档已保存：
- `docs/superpowers/specs/2026-05-23-solution-a-electron-app.md` - 方案A
- `docs/superpowers/specs/2026-05-23-solution-b-chrome-extension.md` - 方案B
- `docs/superpowers/specs/2026-05-23-solution-c-chrome-multi-instance.md` - 方案C (选定方案)

---

## 附录

### Chrome 默认 Profile 路径

| 平台 | 路径 |
|------|------|
| Windows | `%LOCALAPPDATA%\Google\Chrome\User Data\Default` |
| macOS | `~/Library/Application Support/Google/Chrome/Default` |
| Linux | `~/.config/google-chrome/Default` |

### Profile 克隆内容

**克隆：**
- Extensions/ (插件)
- Bookmarks (书签)
- Preferences (设置)

**不克隆（每个沙箱独立）：**
- Cookies/
- Local Storage/
- Session Storage/
- History/
- Cache/

### 系统要求

- Node.js 18+
- Chrome 浏览器已安装
- Windows 10+ / macOS 10.15+ / Linux (主流发行版)