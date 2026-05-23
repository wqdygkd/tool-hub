# SessionBox

多沙箱浏览器管理应用，基于 Electron + Vue 3 + Chrome 多实例方案。

## 功能

- 独立 Chrome Profile 沙箱
- 继承本地 Chrome 插件、书签与设置
- 默认 Chrome 实例（直接使用系统 Profile，保留登录状态）
- 指纹伪造扩展（Canvas / WebGL / Navigator / Audio / Screen / Timezone）
- 沙箱创建、启动、关闭、删除
- 指纹编辑与插件管理

## 环境要求

- Node.js 20+
- [pnpm](https://pnpm.io/)（本项目使用 pnpm，请勿使用 npm）

## 开发

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
pnpm start
```

## 打包

```bash
pnpm dist
```

GitHub Release 由 Actions 手动触发：仓库 **Actions → Release → Run workflow**，填写 tag（如 `v1.0.0`）即可构建 Win / macOS / Linux 安装包并上传到 Release。

设计文档：`docs/superpowers/specs/2026-05-23-sessionbox-design.md`

项目上下文（会话记忆）：`docs/context/LATEST.md`
