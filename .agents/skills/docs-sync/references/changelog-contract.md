# CHANGELOGS.md 同步契约

`CHANGELOGS.md` 遵循 [Keep a Changelog 1.1.0](https://keepachangelog.com/zh-CN/1.1.0/) 格式与 SemVer，但使用**中文 + 中文章节名**。日期采用 ISO 8601 UTC。

## 文档骨架（不可变）

```
# Changelog

<介绍段：遵循 KaC + SemVer + UTC 的声明>

---

## [Unreleased]

### 计划中
### 新增
### 变更
### 修复
### 弃用
### 移除
### 安全
### 文档

---

## [x.y.z] — YYYY-MM-DD

<同样的分节>

---

## 版本链接

- [Unreleased](https://github.com/NAMEWTA/specforge/compare/vLATEST...HEAD)
- [x.y.z](https://github.com/NAMEWTA/specforge/releases/tag/vx.y.z)
- ...
```

`[Unreleased]` 顶部段落**永远存在**，即使内容为空。

## 分节语义

按 Keep a Changelog 约定：

| 分节 | 用途 |
|------|------|
| 计划中 | **非 KaC 标准**，SpecForge 扩展：明确声明"即将做但未动工"的事项，用于路线图沟通 |
| 新增（Added） | 新功能、新命令、新模板、新技能 |
| 变更（Changed） | 既有能力的行为/默认值调整 |
| 修复（Fixed） | bug 修复 |
| 弃用（Deprecated） | 将来会移除但本版本仍能用 |
| 移除（Removed） | 已从代码中删除的能力 |
| 安全（Security） | 安全修复、CVE 响应、鉴权相关调整 |
| 文档 | 对外文档的更新（README / AGENTS / CHANGELOG 自身 / references/*） |

**没有内容的分节不要列出空标题**；保留有内容的即可。

## 把 git 变更写成 Changelog 条目

每个 git commit 的 Conventional Commits 前缀对应一个分节：

| 前缀 | 分节 |
|------|------|
| `feat:` / `feat(...):` | 新增 |
| `fix:` / `fix(...):` | 修复 |
| `refactor:` / `perf:` | 变更（若有行为影响） |
| `docs:` | 文档 |
| `chore:` / `ci:` / `build:` / `style:` / `test:` | 默认不写；仅在用户能感知时写入相应分节 |
| `revert:` | 视被 revert 的内容归类 |
| 涉及依赖升级（如 Dependabot） | 安全（有 CVE） / 变更（常规） |

**不要把每一个 commit 都写成一行**。聚合为"主题条目"：

- 同一主题下的多个 commit → 一条 bullet，列出关键细节
- `chore: ...` 类型整批的 Dependabot 升级 → 一条"依赖周更"条目
- 只影响开发体验（`vitest.config.ts` 调整、测试用例新增）通常不进 Changelog

示例（原始 commits → Changelog 条目）：

```
git log
  feat(cli): add --json flag to status command
  fix(status): handle missing .specforge.json gracefully
  test(status): cover --json output

→ CHANGELOGS.md 的 [Unreleased] 下：
### 新增
- **CLI**：`specforge status --json` 支持机器可读输出，缺失 `.specforge.json` 时给出空结构而非报错
```

## Tag 发版时的迁移

当检测到区间内发生了版本 tag（即 `package.json.version` 变化 + 新 `v*` tag）：

1. 确定 tag 创建日期：`git log -1 --format=%aI vX.Y.Z`
2. 把 `[Unreleased]` 下除"计划中"外的所有条目整体移动到新版本段落 `## [X.Y.Z] — YYYY-MM-DD`
3. 清空 `[Unreleased]`（保留空的"计划中"区块）
4. 更新底部"版本链接"：
   - 新增 `[X.Y.Z]` 链接行
   - 把 `[Unreleased]` 的 compare 基线改为 `vX.Y.Z...HEAD`
5. 如果 tag 之后还有新 commit，按照正常流程把这些 commit 写入新的 `[Unreleased]`

## 版本链接契约

底部 `## 版本链接` 段落固定结构：

```
- [Unreleased](https://github.com/NAMEWTA/specforge/compare/vLATEST...HEAD)
- [X.Y.Z](https://github.com/NAMEWTA/specforge/releases/tag/vX.Y.Z)
- [X.Y.Z-1](...)
- ...
```

每发一个新版本 → 加一行；`[Unreleased]` compare 基线始终指向最新 tag。

## 条目写作规范

- 每个 bullet 以**能力名或模块名**加粗开头，如 `**CLI**：...`、`**模板**：...`、`**构建**：...`、`**CI**：...`、`**npm**：...`
- 用户视角描述"发生了什么"，不描述"怎么改的"
- 路径、命令、标志、版本号保留英文代码格式
- 不使用表情符号
- 一条 bullet 不超过 2 行；更长拆成子列表

## 不做的事

- **不要**重写已发布版本段落（`[0.0.1]`、`[0.0.2]`、`[0.0.3]` 等）的条目措辞 —— 这些是历史档案
- **不要**在 `[Unreleased]` 里保留已被移入正式版本的条目
- **不要**反向覆盖（用自动生成的 release notes 盖掉人工整理的 Changelog）
- **不要**把文档自身同步写成 `新增/变更` —— 应归入 "文档"

## 示例：典型同步产物

```markdown
## [Unreleased]

### 新增

- **CLI**：`specforge status --json` 输出机器可读状态，兼容 --graph
- **模板**：新增 `security/auth-patterns` 技能，覆盖认证授权常见模式

### 变更

- **doctor**：`--check-disclosure` 收紧 description 阈值为 180 字符（原 200）

### 文档

- 新增 `.agents/skills/docs-sync/` 技能，用于基于 git diff 同步对外文档
```
