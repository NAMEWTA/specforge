# AGENTS.md 同步契约

`AGENTS.md` 是 AI 代理在本仓库工作时的**结构化真实来源**。它不是用户文档，不需要营销语言；它的受众是其他 AI 代理（Claude / Cursor / Kiro / Codex / GPT / Gemini）。

## 节级契约

固定 9 个一级章节，顺序不可打乱：

| § | 标题 | 同步触发条件 |
|---|------|-------------|
| 1 | 项目身份 | `package.json` 的 `name` / `version` / `engines.node` / `license` / `author` / `type` 变化 |
| 2 | 核心架构（必读） | `src/core/` 下的领域模型变化（lifecycle、profiles、disclosure 阈值、metadata 规则、DAG） |
| 3 | 仓库布局 | `src/` / `templates/` / `scripts/` / `tests/` / `.github/` 的顶层目录树变化 |
| 4 | 开发命令 | `package.json.scripts` 变化 |
| 5 | CLI 命令速查 | `src/cli/index.ts` 的 `program.command(...)` 变化 |
| 6 | 扩展机制 | `src/core/preamble.ts` / `src/core/hooks.ts` / `src/core/artifact-graph.ts` 逻辑变化 |
| 7 | AI 代理行为规约 | 代码风格、测试要求、发布约定的策略性调整（罕见） |
| 8 | 常见陷阱 | 新发现的故障模式；从 CHANGELOG 回溯学到的教训 |
| 9 | 相关文档 | 新增或删除对外文档时 |

## § 1 项目身份

一个 bullet 列表，字段固定：

- **包名**、**定位**、**语言/运行时**、**分发形式**、**包管理器**、**许可证**

从 `package.json` 取值。`engines.node` 变化时 "Node.js ≥ X.Y.Z" 整个仓库多处要同步（README / AGENTS / `doctor.ts` 的 `minVersion` 常量）。

## § 2 核心架构

五个子节（2.1 双目录模型 / 2.2 8 阶段生命周期 / 2.3 Profile 体系 / 2.4 元数据统一 5 字段 / 2.5 三级渐进披露契约）必须齐全。

**具体同步点**：

- §2.1：当 `SPECFORGE_DIR` / `SPECFORGE_USER_DIR` 常量或顶层子目录变化时
- §2.2：`LIFECYCLE_TYPES` 数组变化、DAG（`DEFAULT_ARTIFACT_GRAPH`）节点变化
- §2.3：`BUILTIN_PROFILES` 变化；`DEFAULT_PROFILE_NAME` 变化
- §2.4：`COMMAND_TYPES` / `SKILL_TYPES` 注册表变化；`unifiedMetadataSchema` 字段变化
- §2.5：`doctor.ts` 里的 `DISCLOSURE_LIMITS` 阈值变化

## § 3 仓库布局

这是代码树的 ASCII 快照。每次同步都要 `ls -1 src/ templates/.specforge/ .github/`，对照是否有新增/删除。

树形格式规则：

- 用 `├──` `└──` `│` 三种字符
- 右侧对齐注释（建议保持相对整齐但不强制 tab 对齐）
- 只列到**第二层目录**；更深层用 `*` 或省略

## § 4 开发命令

表格两列（"场景" / "命令"）。`package.json#scripts` 新增脚本 → 加一行。被 `prepublishOnly` 覆盖的脚本不单独列。

## § 5 CLI 命令速查

表格三列（"CLI 命令" / "作用" / "常用标志"）。**与 README 的 CLI Reference 表同一来源**（`src/cli/index.ts`），但 AGENTS 版更简略，只列"常用标志"。

## § 6 扩展机制

三个子节（Preamble / Extensions Hooks / 产物 DAG），每个指向对应源文件。当对应源文件的 public API 变化时同步。

代码块里的 preamble 示例使用**实际存在的 CLI 命令组合**，不要虚构命令。

## § 7 AI 代理行为规约

五个子节（7.1 改代码前必查 / 7.2 改代码时必做 / 7.3 写代码风格 / 7.4 测试要求 / 7.5 发布与 Git 约定）。

这是最稳定的一节。调整的触发条件非常有限：

- 工具链升级（如从 ESLint flat config 改回 legacy，或反之）
- 测试框架切换
- 发布流水线改造
- 代码风格约定调整（如全面用 named export）

## § 8 常见陷阱

每一条是一个真实踩过的坑或设计隐患。添加条目的时机：

- CI 失败排查后发现某类坑反复出现
- 重大重构后遗留的临时约定
- 新团队成员（或 AI 代理）反复犯的错

删除条目的时机：工具链升级消除了该陷阱。

## § 9 相关文档

指向：`README.md` / `CHANGELOGS.md` / `references/reference-projects-analysis.md` / `.kiro/specs/*` / `templates/.specforge/config.yaml`。

新增顶层文档（如增加 `CONTRIBUTING.md`）时必须同步。

## 语言与风格

- 全文中文，代码实体（命令、路径、字段名、配置键）保持英文
- 列表式陈述，尽量避免长段落
- **禁止**营销语、惊叹号；可以用硬约束语言："禁止 / 必须 / 不得 / 强制"
- 表格优先于段落；代码块优先于散文说明
- 长度预算：全文保持 ≤ 500 行（与三级渐进披露 L2 阈值一致）；超过则把具体细节下沉到 `references/reference-projects-analysis.md` 或新建文档并在此引用

## 不做的事

- 不复述 README 里已经讲过的"它解决什么问题"
- 不堆砌借鉴项目清单（README 的 Heritage 表已经有了）
- 不写命令的详细 usage（`--help` 已经提供，CLI Reference 表已经够）
- 不加 Quick Start 类步骤教程（那是 README 的工作）
