# 项目上下文（Session Context）

本目录存放 **SessionBox 的开发会话记忆**，供后续 AI 或开发者快速恢复上下文。

| 文件 | 说明 |
|------|------|
| `LATEST.md` | 当前最新上下文（优先阅读） |
| `snapshots/` | 按时间戳保存的历史快照（可选） |

## 如何使用

1. 新会话开始时，让 AI 先读 `LATEST.md`
2. 包管理器使用 **pnpm**（`pnpm install` / `pnpm dev`），勿用 npm
3. 重大里程碑后，可更新 `LATEST.md` 或追加 `snapshots/YYYYMMDD-*.md`
4. 设计规格见 `../superpowers/specs/2026-05-23-sessionbox-design.md`
