# README 同步契约（README.md + README-ZH.md）

两份 README 必须保持**严格的结构对等**。`README.md` 是英文主文档，`README-ZH.md` 是其中文镜像。任何单边改动都必须在同一次同步内把另一边补齐。

## 顶部约定

两份文件都必须保留：

1. 第一行：`# SpecForge`
2. 第二段：blockquote 引用 + 5 个借鉴项目链接（OpenSpec / gstack / superpowers / claude-task-master / Anthropic skills）
3. 三个 badge（npm / node / license）
4. 语言切换行：`**Languages:** **English** · [简体中文](./README-ZH.md)` 或对应中文版本

改 badge 或语言切换行时两边必须同时改。

## 必备小节（顺序固定）

| 英文标题 | 中文标题 |
|---------|---------|
| `## Heritage: Built on the Shoulders of Five Projects` | `## 设计血脉：站在五个开源项目的肩膀上` |
| `## What It Solves` | `## 它解决什么问题` |
| `## Core Design` | `## 核心设计` |
| `## Quick Start` | `## 快速开始` |
| `## CLI Reference` | `## CLI 参考` |
| `## Concepts` | `## 概念速览` |
| `## Development` | `## 开发` |
| `## Release Pipeline` | `## 发布流程` |
| `## Documentation` | `## 文档` |
| `## Acknowledgements` | `## 致谢` |
| `## License` | `## License` |

**二级标题数量必须相等**，校验命令见 SKILL.md Step 4。

## Heritage 表同步规则

当 `references/reference-projects-analysis.md` 新增/调整借鉴项目，或代码里新吸收了某设计，Heritage 表必须同步：

- 英文行：`[**ProjectName** (maintainer)](url) | What SpecForge adopts ...`
- 中文行：`[**项目名**（维护者）](url) | SpecForge 吸收的设计 ...`

两行要描述同一套设计，避免一语言比另一语言多 / 少设计点。

## CLI Reference 表同步规则

表格必须反映 `src/cli/index.ts` 的实际命令。同步流程：

1. 读 `src/cli/index.ts` 的 `program.command(...)` 声明
2. 对比现有 README 的 CLI Reference 表
3. 新增命令 → 英文表 + 中文表同时加一行
4. 删除/改名命令 → 两边同时改
5. 标志变化（`.option(...)` / `.requiredOption(...)`）→ 两边"常用标志"列同步

**表头固定**：

- EN：`| Command | Purpose |`
- ZH：`| 命令 | 用途 |`

## Core Design 小节同步规则

四个子节（Dual-Directory / 8-Phase Lifecycle / Progressive Disclosure / Profile System）与 `src/core/` 对应：

- 目录树变化 → Dual-Directory Model
- `LIFECYCLE_TYPES` 变化 → 8-Phase Lifecycle
- `DISCLOSURE_LIMITS` 变化 → Progressive Disclosure（更新阈值）
- `BUILTIN_PROFILES` 变化 → Profile System（表格行数）

每个子节的"来源标注"（如 `(from OpenSpec)`、`（来自 OpenSpec）`）在两种语言里必须对齐同一个源头。

## Quick Start 命令同步规则

命令块是代码实体，**两种语言版本内的命令逐字相同**，只翻译前后的说明文字。如：

英文：
````markdown
```bash
specforge init --profile standard --project-name my-app
```
With a specific profile / project name.
````

中文：
````markdown
```bash
specforge init --profile standard --project-name my-app
```
指定 profile / 项目名。
````

## Development 小节同步规则

`pnpm <script>` 命令列表来自 `package.json#scripts`。`scripts` 字段变化时两边同步。

项目结构树来自实际 `src/` + `templates/` 目录；两边必须是同一棵树，只是右侧注释翻译。

## Release Pipeline 小节同步规则

当 `.github/workflows/release.yml` 改动（步骤增删、action 换版本、flag 变化）时：

- 英文版更新 "Flow: setup → lint → test → build → …" 这一行
- 中文版同步"步骤：setup → lint → test → build → …"
- 规则（"version must match the git tag"）保持双语对等

## Documentation 小节交叉引用

两份 README 的"Documentation / 文档"小节必须：

- 英文版包含：`AGENTS.md` / `CHANGELOGS.md` / `references/...` / `README-ZH.md`
- 中文版包含：`AGENTS.md` / `CHANGELOGS.md` / `references/...` / `README.md`

互相指向对方。

## Acknowledgements 对等

5 个借鉴项目 + 作者 handle 必须完全一致（包括排序）。改英文版 Acknowledgements 时中文版"致谢"同步。

## 常见错位示例

| 英文 | 中文 | 处理 |
|------|------|------|
| 新增了一个二级标题 | 无 | 同一次 PR 补上中文 |
| Heritage 表改了某行"What SpecForge adopts" | 未改 | 同步对应中文行 |
| CLI Reference 加了新命令 | 未加 | 两边同步 |
| Badge 版本换了 | 未换 | 同步 |
| 借鉴项目 URL 改了（如项目迁移） | 未改 | 两边都要改（同时更新 SKILL.md 顶部 blockquote 的链接） |
