---
name: docs-sync
description: 基于 git 差异增量同步仓库四份对外文档（README.md、README-ZH.md、AGENTS.md、CHANGELOGS.md）。每次触发会读取 state.json 中的上次同步 SHA，汇总该 SHA 到当前 HEAD 之间的所有变动（提交记录 + 文件改动），按规范把变动写回相应文档，完成后把最新 HEAD SHA 持久化回 state.json。触发词：`update docs`、`sync docs`、`docs-sync`、`文档同步`、`更新文档`、`更新 README`、`更新 CHANGELOG`、`更新 AGENTS`、"看一下最近改了什么然后更新文档"、"基于 git 变更刷新对外文档"。适用场景：仓库累积了一批 commit 后需要把源码、模板、CI、依赖、命令等变动反映到四份对外文档里；不适用于从零创建文档或一次性大改版。
---

# Docs Sync — 基于 Git 差异的四文档同步工作流

本技能是 SpecForge 仓库（`@namewta/specforge`）专属的对外文档同步器。它的唯一目标：让四份对外文档（`README.md`、`README-ZH.md`、`AGENTS.md`、`CHANGELOGS.md`）始终与仓库实际代码、模板、CI、依赖状态**最小一致**，且每一次同步都是**基于 git 差异的增量更新**，不做整体重写。

## Iron Law（硬性约束）

> **禁止在不读取 `state.json` 的 `last_sync_sha` 和当前 `HEAD` 之间 diff 的情况下修改这四份文档。**
> 
> 如果 diff 为空（`last_sync_sha == HEAD`）或只有文档自身的变动，直接报告"无需同步"并退出，**不要**触碰任何文档。

## 同步的四份文档与各自定位

| 文件 | 语言 | 读者 | 核心内容 |
|------|------|------|---------|
| `README.md` | English | 初次接触项目的英文开发者 | Heritage 表（5 个借鉴项目）、核心设计、Quick Start、CLI Reference、Concepts、Development、Release、Acknowledgements |
| `README-ZH.md` | 中文 | 初次接触项目的中文开发者 | 与英文版**一一对应**的中文镜像 |
| `AGENTS.md` | 中文 | 在本仓库工作的 AI 代理（Claude/Cursor/Kiro/Codex/GPT/Gemini） | 项目身份、核心架构必读、仓库布局、开发命令、CLI 速查、扩展机制、代理行为规约、常见陷阱 |
| `CHANGELOGS.md` | 中文 | 使用者 + 未来贡献者 | Keep a Changelog 格式；`[Unreleased]` 段落 + 已发布版本段落；底部版本 compare 链接 |

## 核心工作流（每次触发必须完整执行）

### Step 0 — 读取状态

```bash
# 读取上次同步的 SHA
cat .agents/skills/docs-sync/state.json
# 取当前 HEAD
git rev-parse HEAD
# 取当前 HEAD 的简要信息
git log -1 --format="%H%n%ai%n%s"
```

关键字段：

- `state.json.last_sync_sha` — 上次成功同步后写入的 commit SHA
- 当前 `HEAD` SHA

如果 `last_sync_sha === HEAD`，直接向用户报告"Docs 已与 HEAD（<短 SHA>）同步，无需操作"并退出。

如果 `.agents/skills/docs-sync/state.json` 不存在，视为首次运行：创建它，将 `last_sync_sha` 置为当前 `HEAD`，向用户说明"首次运行已建立基线，此次不做文档修改"。

### Step 1 — 收集 git 差异

固定跑以下 4 组命令，把输出作为分析素材：

```bash
RANGE="$LAST_SYNC_SHA..HEAD"

# 1) 提交流水（按主题分类用）
git log --oneline --no-merges "$RANGE"

# 2) 变更文件一览（按路径分类）
git diff --name-status "$RANGE"

# 3) 变更统计（看量级）
git diff --shortstat "$RANGE"

# 4) 按路径分组的文件变更数（用来决定每份文档写什么）
git diff --name-only "$RANGE" | awk -F/ '{print $1"/"$2}' | sort | uniq -c | sort -rn
```

有疑问的具体改动再跑：

```bash
git log -p "$RANGE" -- <specific-path>
git show <sha> -- <specific-file>
```

### Step 2 — 把变更分类到四份文档

使用下表决定每条变更写到哪份文档（同一条变更可能同时触发多份文档的更新）：

| 变更路径 / 类型 | README.md | README-ZH.md | AGENTS.md | CHANGELOGS.md |
|------|:---:|:---:|:---:|:---:|
| `src/cli/**`、`src/commands/**`（CLI 命令新增/删除/签名改变） | ✓ | ✓ | ✓ | ✓ |
| `src/core/**`、`src/services/**`（领域模型/业务服务变动） | 部分 | 部分 | ✓ | ✓ |
| `src/utils/**`、`src/adapters/**`（内部工具） | — | — | 需要时 | ✓ |
| `templates/.specforge/commands/**`（新 command/skill 模板） | ✓ | ✓ | ✓ | ✓ |
| `templates/.specforge/skills/**` | — | — | 需要时 | ✓ |
| `templates/.specforge/config.yaml`、`extensions.yaml`（规则/钩子） | 部分 | 部分 | ✓ | ✓ |
| `templates/specforge/**`（用户资产模板） | — | — | 需要时 | ✓ |
| `.github/workflows/**`、`.github/actions/**`（CI/CD） | ✓（Release Pipeline 节） | ✓ | ✓（发布与 Git 约定） | ✓ |
| `.github/dependabot.yml`、`labeler.yml` | — | — | ✓ | ✓ |
| `package.json` deps（新增/移除） | — | — | 需要时 | ✓ |
| `package.json` version / bin / scripts | ✓ | ✓ | ✓ | ✓ |
| `scripts/**`（构建 / 校验脚本） | 部分 | 部分 | ✓ | ✓ |
| `tsconfig.json`、`eslint.config.mjs`、`vitest.config.ts` | — | — | ✓ | 需要时 |
| `tests/**` | — | — | 需要时 | — |
| 文档自身（`*.md` 除 `CHANGELOGS.md`）| — | — | — | 需要时（"文档"条目） |

**"需要时"**：仅当变更构成对外可见能力变化或会影响代理行为时才写。

### Step 3 — 按各自契约更新文档

各份文档有独立的更新规则，必须遵守：

- `README.md` / `README-ZH.md` 的改写契约：[references/readme-contract.md](references/readme-contract.md)
- `AGENTS.md` 的改写契约：[references/agents-contract.md](references/agents-contract.md)
- `CHANGELOGS.md` 的改写契约：[references/changelog-contract.md](references/changelog-contract.md)

**共同硬约束**：

1. `README.md` 与 `README-ZH.md` 必须**结构对等**（同样的一级/二级标题、同样的表格列数、同样的小节顺序）
2. 任何 CLI 命令、命令行标志、路径、文件名、版本号都是**代码实体**，两种语言版本原样保留，不翻译
3. `CHANGELOGS.md` 顶部必须保持 `[Unreleased]` 段落；只有打了 tag（即 `package.json.version` 变化 + 新 `v*` tag）才移入新版本段落
4. `AGENTS.md` 的"仓库布局"小节是结构性真实来源 —— 新增/删除目录或顶层文件时必须同步
5. 所有改动只做**差量**修改，不要整页重写；已有小节的语气、行文、字段保持连贯

### Step 4 — 验证

```bash
# 1) 结构对等（README 两语言版本标题数相等）
grep -c '^##\s' README.md
grep -c '^##\s' README-ZH.md
# 两个数字必须相等；不等就回去对齐

# 2) CHANGELOGS 顶部仍有 [Unreleased]
head -30 CHANGELOGS.md | grep -q '\[Unreleased\]' && echo OK || echo MISSING

# 3) AGENTS.md 仓库布局小节反映实际目录
ls -1 src/ templates/.specforge/ .github/
# 对照 AGENTS.md §3 中的目录树；如有偏差，回去更新

# 4) 跑一次 lint / build（可选但推荐，验证没写错路径）
pnpm lint
pnpm build
```

### Step 5 — 写回 state.json

全部验证通过后，把当前 HEAD 写回 state.json：

```bash
NEW_SHA=$(git rev-parse HEAD)
NEW_SUBJECT=$(git log -1 --format=%s)
NEW_DATE=$(git log -1 --format=%aI)
PREV_SHA=$(jq -r .last_sync_sha .agents/skills/docs-sync/state.json)
TOTAL_SYNCS=$(jq -r '.total_syncs // 0' .agents/skills/docs-sync/state.json)
```

然后**原子化**写入（先写到 `.tmp` 再 rename）：

```json
{
  "schema_version": 1,
  "skill": "docs-sync",
  "last_sync_sha": "<NEW_SHA>",
  "last_sync_short": "<前 7 位>",
  "last_sync_commit_subject": "<NEW_SUBJECT>",
  "last_sync_commit_date": "<NEW_DATE>",
  "last_sync_run_at": "<本次同步完成时刻的 ISO8601 UTC>",
  "previous_sync_sha": "<PREV_SHA>",
  "total_syncs": <TOTAL_SYNCS + 1>,
  "synced_docs": ["README.md", "README-ZH.md", "AGENTS.md", "CHANGELOGS.md"]
}
```

**只有在真正改动了文档之后才更新 `last_sync_sha`。** 如果本次检查 diff 后判定"四份文档都无需改动"，仍要把 `last_sync_sha` 推进到当前 HEAD（避免下次重复扫描同一区间），但把 `synced_docs` 置为 `[]` 表示这次是"空同步"。

### Step 6 — 向用户报告

按以下模板汇报：

```
Docs 同步完成
  范围：<PREV_SHORT>..<NEW_SHORT>（N commits, M files, +X/-Y）
  改动的文档：
    - README.md    ：<一句话说明改了哪里，如"新增 Heritage 表中 claude-task-master 链接">
    - README-ZH.md ：<同上，中文>
    - AGENTS.md    ：<一句话>
    - CHANGELOGS.md：<Unreleased 新增 K 条>
  state.json：last_sync_sha 已更新 → <NEW_SHORT>
```

## 边界情况处理

| 情形 | 处理 |
|------|------|
| 仓库处于 detached HEAD 或 rebase 中 | 报错并退出：`git status` 有未完成操作时禁止同步 |
| 工作区有未提交改动 | 警告用户"工作区有未提交改动，同步只基于已提交的 HEAD"，允许继续但不 stash |
| `last_sync_sha` 不在当前分支历史中（被 rebase 丢了） | 回退到 `git merge-base HEAD <last_sync_sha>`，基于这个 merge-base 做 diff；如找不到则退回"首次运行"流程并提示用户 |
| 区间内有 merge commit | `git log --oneline --no-merges` 已跳过；如需看合并带入的文件，用 `git diff $LAST..HEAD`（不加 `--no-merges`） |
| 区间内跨越了版本 tag（发布发生过） | `CHANGELOGS.md` 要把相应变更从 `[Unreleased]` 移入对应版本段落，并更新底部 compare 链接 |
| 变更全部是文档自身 | 判为"空同步"；`last_sync_sha` 推进，`synced_docs: []` |
| 变更极多（100+ files, 跨多个主题） | 不要一次性硬塞进 Unreleased；按主题聚合为 3~5 个条目；冗长细节放到 references/ 对应的子章节 |

## state.json 契约

完整字段解释见 [references/state-json-schema.md](references/state-json-schema.md)。

快速参考：

- `schema_version`：整数，当前为 `1`
- `last_sync_sha`：上次同步基线（40 字符 SHA）
- `previous_sync_sha`：上上次基线（用于故障回滚）
- `total_syncs`：累计触发次数（含空同步）
- `synced_docs`：本次实际被修改的文档文件名数组

## 相关资料

- [references/readme-contract.md](references/readme-contract.md) — README.md + README-ZH.md 的结构契约与双语言对等规则
- [references/agents-contract.md](references/agents-contract.md) — AGENTS.md 的节级契约与代理行为规约写法
- [references/changelog-contract.md](references/changelog-contract.md) — Keep a Changelog 本地化约定与 tag 迁移流程
- [references/state-json-schema.md](references/state-json-schema.md) — state.json 完整字段定义与版本演进规则
