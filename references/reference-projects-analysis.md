# References 参考项目技能体系与设计模式分析

> 本文档系统梳理 references/ 目录下 7 个参考项目的所有技能/命令、架构特点和可借鉴设计模式，用于指导 SpecForge CLI 的开发。
>
> 分析日期：2026-05-04

---

## 目录

- [1. 概述](#1-概述)
- [2. 各项目详细分析](#2-各项目详细分析)
  - [2.1 OpenSpec](#21-openspec)
  - [2.2 gstack](#22-gstack)
  - [2.3 superpowers-zh](#23-superpowers-zh)
  - [2.4 skills-main](#24-skills-main)
  - [2.5 spec-kit](#25-spec-kit)
  - [2.6 claude-task-master](#26-claude-task-master)
  - [2.7 grill-me](#27-grill-me)
- [3. 技能体系对比](#3-技能体系对比)
- [4. 生命周期/工作流对比](#4-生命周期工作流对比)
- [5. 关键设计模式汇总](#5-关键设计模式汇总)
- [6. 对 SpecForge 开发的建议](#6-对-specforge-开发的建议)

---

## 1. 概述

### 1.1 项目总览

| 项目 | 来源/定位 | 技能数量 | 格式 | 核心价值 |
|------|----------|---------|------|---------|
| **OpenSpec** | AI 原生规格驱动开发 CLI | 11个技能 + 11个命令 | SKILL.md + opsx/*.md | 双目录模型、依赖图引擎、产物状态机、Profile 体系 |
| **gstack** | Google 内部生产力套件 | 10个技能 | SKILL.md + .tmpl | 引导系统(Preamble)、多视角Plan审查、遥测与会话管理 |
| **superpowers-zh** | 中文社区开发工作流 | 20个技能 | SKILL.md | Iron Laws硬性门禁、技能链式调用、子代理驱动开发、反规避机制 |
| **skills-main** | Anthropic 官方技能集 | 17个技能 | SKILL.md | 渐进式信息披露、技能创建方法论、输出格式定义模式 |
| **spec-kit** | 规格驱动开发模板 | 9个命令 | Command .md | 宪法治理、扩展钩子系统、Checklist质量验证、需求澄清分类法 |
| **claude-task-master** | PRD→任务解析管线 | 2个操作 | JSON配置 + Zod Schema | Handlebars模板引擎、复杂度分析、响应验证 |
| **grill-me** | 高强度决策面试 | 1个技能 | SKILL.md | 多视角提问框架、驳斥草案法、会话日志记录 |

### 1.2 对 SpecForge 的借鉴价值排序

| 优先级 | 项目 | 核心借鉴点 |
|--------|------|-----------|
| ★★★★★ | **OpenSpec** | 双目录模型、产物依赖图、Progressive Disclosure、Profile/Core 配置文件过滤、双轨表示（Skills+Commands） |
| ★★★★★ | **superpowers-zh** | 技能链式调用、Iron Laws、反规避语言、子代理驱动开发、技能间衔接、压力测试体系 |
| ★★★★☆ | **gstack** | Preamble 引导系统、遥测与会话跟踪、多视角审查体系、计划审查→QA→发布全链条 |
| ★★★★☆ | **spec-kit** | 扩展钩子系统、Constitution 宪法治理、Checklist 质量门禁、手递手衔接(handoffs)、需求澄清分类法 |
| ★★★☆☆ | **skills-main** | 技能创建方法论(skill-creator)、渐进式加载、输出模板格式、Benchmark/Eval 评估流程 |
| ★★★☆☆ | **claude-task-master** | Handlebars 条件模板引擎、Zod 响应验证、复杂度分析算法、多模态 Prompt 变体 |
| ★★☆☆☆ | **grill-me** | 多视角提问框架、会话日志模板、去殖民化跟随思考方式 |

---

## 2. 各项目详细分析

### 2.1 OpenSpec

#### 项目定位

OpenSpec（npm 包 `@fission-ai/openspec`，v1.3.1，MIT 协议）是一个 **AI 原生的规格驱动开发工作流 CLI 工具**。它为 AI 编码助手定义了一套结构化的"先定义再构建"流程，核心理念：

- **流动而非僵化** — 无阶段门禁，按需推进
- **迭代而非瀑布** — 边构建边学习
- **简单而非复杂** — 轻量级启动，最小仪式感
- **棕地优先** — 通过增量规格适配已有代码库

**关键创新 —— OPSX 工作流**：从旧的硬编码单体命令迁移到基于外部 YAML Schema + 依赖图引擎的架构，实现流式迭代、用户自定义能力。

#### 目录结构

```
OpenSpec-main/
├── package.json
├── schemas/
│   └── spec-driven/
│       ├── schema.yaml              # 工作流定义：proposal→specs→design→tasks
│       └── templates/
│           ├── proposal.md / spec.md / design.md / tasks.md
├── skills/                          # 4个预置 SKILL.md（Core Profile）
│   ├── openspec-apply-change/SKILL.md
│   ├── openspec-explore/SKILL.md
│   ├── openspec-archive-change/SKILL.md
│   └── openspec-propose/SKILL.md
├── opsx/                            # 4个预置命令 .md
│   ├── explore.md / archive.md / apply.md / propose.md
├── src/
│   ├── cli/index.ts                 # Commander CLI 入口
│   ├── core/
│   │   ├── profiles.ts              # Core vs Custom 配置文件
│   │   ├── artifact-graph/          # DAG 引擎：graph, resolver, state, schema
│   │   ├── templates/workflows/     # 11+1 个工作流的 TypeScript 模板
│   │   ├── shared/skill-generation.ts  # 技能生成工具
│   │   └── command-generation/      # 命令生成 + 跨编辑器适配器
│   ├── commands/workflow/           # CLI 命令实现
│   └── utils/                       # 文件系统、搜索、UI 等
└── docs/                            # 完整文档体系
```

#### 完整技能/命令清单（12个）

**技能（Skills）——AI Agent 使用：**

| # | 技能目录 | 技能名称 | 功能 |
|---|---------|---------|------|
| 1 | `openspec-explore` | openspec-explore | 探索模式：头脑风暴、调查问题、澄清需求。无固定步骤，是一种**姿态**而非流程 |
| 2 | `openspec-propose` | openspec-propose | 一步创建变更并生成全部规划产物（proposal + specs + design + tasks） |
| 3 | `openspec-new-change` | openspec-new-change | 仅创建变更脚手架（目录 + .openspec.yaml），然后停下等待用户指导 |
| 4 | `openspec-continue-change` | openspec-continue-change | 按依赖顺序创建**下一个**就绪的产物（一次一个） |
| 5 | `openspec-ff-change` | openspec-ff-change | 快进模式：按依赖顺序一次性创建所有规划产物 |
| 6 | `openspec-apply-change` | openspec-apply-change | 实现阶段：循环遍历 tasks.md 的复选框，写代码、标记完成 |
| 7 | `openspec-verify-change` | openspec-verify-change | 三维度验证：完整性(Completeness)、正确性(Correctness)、一致性(Coherence) |
| 8 | `openspec-sync-specs` | openspec-sync-specs | 将增量规格（ADDED/MODIFIED/REMOVED/RENAMED）合并到主规格 |
| 9 | `openspec-archive-change` | openspec-archive-change | 归档已完成变更：合并增量规格，移动到 archive/ |
| 10 | `openspec-bulk-archive-change` | openspec-bulk-archive-change | 批量归档：检测规格冲突，Agent 驱动解决 |
| 11 | `openspec-onboard` | openspec-onboard | 11 阶段导览教程，使用用户实际代码库 |
| 12 | *(无技能目录)* | feedback | 收集、丰富、匿名化用户反馈（仅 CLI 命令） |

**命令（Commands）——用户通过斜杠指令使用：**

| 命令 | 分类 | 标签 |
|------|------|------|
| `/opsx:explore` | Workflow | workflow, explore, experimental, thinking |
| `/opsx:propose` | Workflow | workflow, propose, experimental |
| `/opsx:new` | Workflow | workflow, new, experimental |
| `/opsx:continue` | Workflow | workflow, continue, experimental |
| `/opsx:ff` | Workflow | workflow, fast-forward, experimental |
| `/opsx:apply` | Workflow | workflow, apply, experimental |
| `/opsx:verify` | Workflow | workflow, verify, experimental |
| `/opsx:sync` | Workflow | workflow, sync, experimental |
| `/opsx:archive` | Workflow | workflow, archive, experimental |
| `/opsx:bulk-archive` | Workflow | workflow, archive, experimental |
| `/opsx:onboard` | Workflow | workflow, onboard, experimental |

#### YAML Frontmatter 模式

**技能 SKILL.md：**
```yaml
---
name: openspec-apply-change
description: Implement tasks from an OpenSpec change...
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.0"
---
```

**命令 .md：**
```yaml
---
name: "OPSX: Explore"
description: "Enter explore mode - think through ideas, investigate problems, clarify requirements"
category: Workflow
tags: [workflow, explore, experimental, thinking]
---
```

#### 独特设计模式

1. **双轨表示（Dual Representation）**
   每个工作流概念都有两种表示：Skill（AI Agent 通过技能系统加载）和 Command（用户通过 `/opsx:<id>` 调用）。两者从同一 `SkillTemplate`/`CommandTemplate` 源生成。

2. **Profile 系统**
   - **Core Profile**（默认）：仅启用 `propose, explore, apply, sync, archive` 5个核心工作流
   - **Custom Profile**：用户从全部 11 个工作流中自由选择

3. **产物依赖图（Artifact DAG）**
   ```
   proposal (root)
     ├── specs (requires: proposal)
     └── design (requires: proposal)
           └── tasks (requires: specs, design)
                 └── APPLY (requires: tasks)
   ```
   产物状态：BLOCKED → READY → DONE

4. **Schema 驱动架构**
   `schema.yaml` 定义整个工作流：产物列表、依赖关系、模板路径、指令内容。可通过 `openspec/schemas/` 目录自定义。

5. **跨编辑器适配器**
   同一套技能内容通过适配器输出为 Claude Code（SKILL.md）、Cursor（.cursor/rules/）、Windsurf（.windsurf/rules/）等格式。

#### 对 SpecForge 的启示

- **双目录模型**（`.specforge/` vs `specforge/`）直接来源于 OpenSpec
- **产物依赖图**可应用于 SpecForge 的阶段间衔接：某个阶段产出的 spec 是下游阶段 design/planning 的输入
- **Profile 系统**可借鉴为 SpecForge 的"预设工作流"，如 `minimal`、`full`、`custom`
- **双轨表示**：SpecForge 的 command 和 skill 也应有统一生成源，类似 OpenSpec 的 Template 模式

---

### 2.2 gstack

#### 项目定位

gstack 是 **Google 内部**的 AI 辅助软件开发生产力套件，以 Claude Code Skills 形式组织。提供完整的 Plan 审查→QA 测试→代码审查→发布的交互式工作流。核心特色是**多视角 Plan 审查**（CEO 视角、工程视角、设计视角、开发者体验视角）和**带自动修复的 QA 测试**。

#### 目录结构

```
gstack/
├── plan-ceo-review/           # SKILL.md + SKILL.md.tmpl
├── plan-design-review/        # SKILL.md + SKILL.md.tmpl
├── plan-devex-review/         # SKILL.md + SKILL.md.tmpl + dx-hall-of-fame.md
├── plan-eng-review/           # SKILL.md + SKILL.md.tmpl
├── plan-tune/                 # SKILL.md + SKILL.md.tmpl
├── qa/                        # SKILL.md + SKILL.md.tmpl + references/ + templates/
│   ├── references/issue-taxonomy.md
│   └── templates/qa-report-template.md
├── qa-only/                   # SKILL.md + SKILL.md.tmpl
├── review/                    # SKILL.md + SKILL.md.tmpl + checklists + specialists/
│   ├── checklist.md / design-checklist.md / TODOS-format.md / greptile-triage.md
│   └── specialists/
│       ├── api-contract.md / data-migration.md / maintainability.md
│       ├── performance.md / red-team.md / security.md / testing.md
├── ship/                      # SKILL.md + SKILL.md.tmpl
└── skillify/                  # SKILL.md + SKILL.md.tmpl
```

#### 完整技能清单（10个）

| # | 技能名称 | preamble-tier | 交互 | 功能 |
|---|---------|--------------|------|------|
| 1 | **plan-ceo-review** | 3 | ✓ | CEO/创始人模式：SCOPE EXPANSION / SELECTIVE EXPANSION / HOLD SCOPE / SCOPE REDUCTION 四种模式，反思问题、挑战前提、寻找10星级产品 |
| 2 | **plan-design-review** | 3 | ✓ | 设计师视角：对每个设计维度打分(0-10)，解释如何达到10分，修复计划 |
| 3 | **plan-devex-review** | 3 | ✓ | 开发者体验视角：DX EXPANSION / DX POLISH / DX TRIAGE 三种模式，引用 Stripe/Vercel/Clerk 等最佳实践 |
| 4 | **plan-eng-review** | 3 | ✓ | 工程经理视角：架构、数据流、图表、边界情况、测试覆盖、性能 |
| 5 | **plan-tune** | 2 | ✓ | 自调优：配置问题敏感度、开发者心理画像，双轨偏好声明+行为推导 |
| 6 | **qa** | 4 | ✓ | QA 测试+修复：Quick(关键+高优先级) / Standard(+中) / Exhaustive(+外观) 三层，含修复循环 |
| 7 | **qa-only** | 4 | ✗ | 纯报告式 QA 测试，不修复，仅输出结构化报告 |
| 8 | **review** | 4 | ✓ | 上线前 PR 审查：两轮审查(CRITICAL + INFORMATIONAL)，并行派发安全/测试/性能/API/迁移等专业子代理 |
| 9 | **ship** | 4 | ✓ | 发布工作流：检测并合并基分支、跑测试、审查diff、版本号、CHANGELOG、提交、推送、创建PR |
| 10 | **skillify** | — | ✗ | 将成功的 /scrape 流程固化为持久化浏览器技能，生成 script.ts + test.ts + fixture |

#### YAML Frontmatter 模式

```yaml
---
name: plan-ceo-review
preamble-tier: 3
interactive: true
version: 1.0.0
description: |
  CEO-mode plan review. Rethinks the problem, challenges premises,
  finds the 10-star product.
  Triggers: "think bigger", "expand scope", "strategy review",
  "rethink this plan".
  Proactively suggest after plan creation.
benefits-from: [office-hours]
allowed-tools: [Read, Write, Edit, Grep, Glob, Bash, AskUserQuestion, WebSearch, Agent]
---
```

字段说明：
- `preamble-tier`：引导加载优先级（2/3/4），控制初始化顺序
- `interactive`：是否交互式
- `benefits-from`：声明可从其他技能中受益
- `allowed-tools`：显式工具白名单
- `triggers`（在 description 中嵌入）：自然语言触发短语
- `gbrain`（可选）：自动上下文查询块（plan-ceo-review 独有）

#### 独特设计模式

1. **Preamble 引导系统**
   每个技能以 Bash 代码块执行引导初始化：
   - 更新检查（`gstack-update-check`）
   - 会话跟踪（PID 文件 → `~/.gstack/sessions`）
   - 配置读取（主动模式、解释深度、问题调优）
   - 遥测（JSONL 写入 `~/.gstack/analytics/skill-usage.jsonl`）
   - 学习文件加载（`~/.gstack/projects/{slug}/learnings.jsonl`，最多5条）

2. **SKILL.md.tmpl 模板系统**
   每个技能同时存在 SKILL.md 和 SKILL.md.tmpl。SKILL.md 通过 `bun run gen:skill-docs` 从模板生成，包含 `{{PREAMBLE}}` 和 `{{BASE_BRANCH_DETECT}}` 占位符。

3. **多视角审查体系**
   对同一计划从 CEO、工程师、设计师、DevEx 四个独立视角审查，每个视角有不同的评价维度和打分标准。

4. **三层 QA 测试覆盖**
   Quick（critical + high）、Standard（+ medium）、Exhaustive（+ cosmetic），含问题分类学(`issue-taxonomy.md`)和递归修复循环。

5. **专业子代理并发审查**
   review 技能并行派发 7 个专业子代理：security、testing、performance、API contract、data migration、maintainability、red-team，每个有独立 checklist。

6. **会话追踪与遥测**
   每个技能启动时记录 PID、时间戳，支持 120 分钟 TTL 自动清理，写入匿名 JSONL 使用数据。

7. **双轨用户画像**
   plan-tune 维护：显式声明偏好 + 行为推导画像，两者的交互影响问题频率。

#### 对 SpecForge 的启示

- **Preamble 系统**可应用于 SpecForge 技能的初始化流程（环境检测、配置加载、更新检查）
- **多视角审查**模式可集成到 `quality` 和 `review` 生命周期阶段
- **SKILL.md.tmpl + 代码生成**的模式可借鉴：SpecForge 的 CLI 从模板生成技能文件
- **专业子代理并发**模式与 SpecForge 的子代理驱动开发思路一致
- **遥测与会话跟踪**可用于 SpecForge 的使用分析和经验积累

---

### 2.3 superpowers-zh

#### 项目定位

superpowers-zh 是 **Superpowers 技能套件的中文汉化版**，提供完整的 AI 辅助开发工作流系统：头脑风暴 → 编写计划 → 执行计划（或子代理驱动开发）→ 代码审查 → 完成分支。包含 TDD、系统调试、验证、并行代理、MCP 构建、以及**中文环境特有适配**（代码审查文化、提交规范、文档标准、Git 平台适配）和元技能（技能编写与测试）。

核心理念：**技能 = TDD for 流程文档**——观察 Agent 在无技能时的失败模式，编写技能修复，压力测试，堵住理性化漏洞。

#### 目录结构

```
superpowers-zh/
├── agents/
│   └── code-reviewer.md                    # 共享代码审查 Agent 定义
├── commands/                                # 已弃用的命令包装器 → 重定向到 Skill tool
│   ├── brainstorm.md / write-plan.md / execute-plan.md
├── skills/                                  # 20个技能子目录
│   ├── brainstorming/
│   │   ├── SKILL.md
│   │   ├── visual-companion.md
│   │   ├── spec-document-reviewer-prompt.md
│   │   └── scripts/                        # 浏览器原型服务器
│   ├── subagent-driven-development/
│   │   ├── SKILL.md
│   │   ├── implementer-prompt.md
│   │   ├── spec-reviewer-prompt.md
│   │   └── code-quality-reviewer-prompt.md
│   ├── writing-plans/SKILL.md + plan-document-reviewer-prompt.md
│   ├── executing-plans/SKILL.md
│   ├── test-driven-development/SKILL.md + testing-anti-patterns.md
│   ├── systematic-debugging/
│   │   ├── SKILL.md + CREATION-LOG.md
│   │   ├── root-cause-tracing.md + defense-in-depth.md
│   │   ├── condition-based-waiting.md + test-pressure-1/2/3.md
│   │   └── find-polluter.sh
│   ├── requesting-code-review/SKILL.md + code-reviewer.md
│   ├── receiving-code-review/SKILL.md
│   ├── dispatching-parallel-agents/SKILL.md
│   ├── verification-before-completion/SKILL.md
│   ├── finishing-a-development-branch/SKILL.md
│   ├── chinese-code-review/SKILL.md
│   ├── chinese-commit-conventions/SKILL.md
│   ├── chinese-documentation/SKILL.md
│   ├── chinese-git-workflow/SKILL.md
│   ├── using-git-worktrees/SKILL.md
│   ├── using-superpowers/SKILL.md + references/
│   ├── mcp-builder/SKILL.md
│   ├── workflow-runner/SKILL.md
│   └── writing-skills/
│       ├── SKILL.md
│       ├── anthropic-best-practices.md
│       ├── persuasion-principles.md
│       ├── testing-skills-with-subagents.md
│       ├── graphviz-conventions.dot + render-graphs.js
│       └── examples/CLAUDE_MD_TESTING.md
└── tests/                                   # 完整的自动化测试体系
```

#### 完整技能清单（20个）

**核心工作流技能（4个）：**

| # | 技能名称 | 功能 |
|---|---------|------|
| 1 | **brainstorming** | 创意工作前必须使用。9步清单：探索上下文 → 视觉伴侣 → 澄清问题 → 提出2-3方案 → 段落设计 → 写入 `docs/superpowers/specs/` → 自审 → 用户审 → 转交 writing-plans。**HARD-GATE：禁止在批准前实施** |
| 2 | **writing-plans** | 从规格创建实施计划，存入 `docs/superpowers/plans/`。步骤粒度2-5分钟。含架构、技术栈、AI Agent 指令 |
| 3 | **executing-plans** | 加载计划、批判性审查、执行所有任务、报告。含审查检查点。推荐使用 subagent-driven-development 替代 |
| 4 | **subagent-driven-development** | 为每项任务派发新子代理，两阶段审查（规格合规 → 代码质量）。实现→测试→提交→自审。终止时调用 finishing-a-development-branch |

**质量/纪律技能（5个）：**

| # | 技能名称 | 功能 |
|---|---------|------|
| 5 | **test-driven-development** | 红-绿-重构。**铁律：禁止在生产代码前编写，已写的必须先删除**。含反模式参考 |
| 6 | **systematic-debugging** | 四阶段：根因调查 → 模式分析 → 假设 → 实施。**铁律：找到根因前禁止提出修复** |
| 7 | **verification-before-completion** | **铁律：无新验证证据禁止声称完成**。含门禁函数和常见失败模式列表 |
| 8 | **requesting-code-review** | 派发代码审查子代理。模板化：git SHA范围、实现内容、需求。Critical→立即修复，Important→继续前修复，Minor→记录 |
| 9 | **receiving-code-review** | 技术评估代码审查反馈。**禁止回复**：赞同性语言、情感表演。要求先验证再实施 |

**并行/分支管理技能（3个）：**

| # | 技能名称 | 功能 |
|---|---------|------|
| 10 | **dispatching-parallel-agents** | 当有2+个独立任务（无共享状态、无顺序依赖）时使用。每个代理获得聚焦范围 |
| 11 | **finishing-a-development-branch** | 验证测试通过→确定基分支→4选项（本地合并/推送+PR/保持/丢弃）→清理 worktree |
| 12 | **using-git-worktrees** | 创建隔离 Git worktree。智能目录选择、安全验证 |

**中文本地化技能（4个）：**

| # | 技能名称 | 功能 |
|---|---------|------|
| 13 | **chinese-code-review** | 中文团队审查文化：建议替代命令、提问替代否定。三级标注：[必须修复]/[建议修复]/[供参考] |
| 14 | **chinese-commit-conventions** | 中文 Conventional Commits：type英文+scope中文+描述中文 |
| 15 | **chinese-documentation** | 中文技术写作规范：中英文空格、全半角标点、术语一致性、英文大小写 |
| 16 | **chinese-git-workflow** | 中文平台Git工作流：Gitee/Coding.net/JiHu GitLab/CNB 配置对照表 |

**平台/集成技能（3个）：**

| # | 技能名称 | 功能 |
|---|---------|------|
| 17 | **using-superpowers** | 入口元技能。指令优先级：用户指令 > Superpowers技能 > 系统提示。SUBAGENT-STOP 指令防止子代理加载 |
| 18 | **mcp-builder** | MCP 服务器构建方法：协议概念、项目结构、工具设计原则、命名规范 |
| 19 | **workflow-runner** | 执行 YAML 工作流：解析→收集输入→定位代理目录→顺序执行→收集输出 |

**元技能（1个）：**

| # | 技能名称 | 功能 |
|---|---------|------|
| 20 | **writing-skills** | TDD 方法论创建技能：基线测试→编写技能→压力测试→堵漏洞→重新验证。三种技能类型：technique/pattern/reference。含7条说服原则（基于28,000次对话研究） |

#### YAML Frontmatter 模式

```yaml
---
name: brainstorming
description: 在进行任何创造性工作之前必须使用此技能。将模糊想法转化为完整的设计文档，通过头脑风暴提问探索用户意图、需求和未知方面。
---
```

仅 `name` 和 `description`，简约设计。

#### 独特设计模式

1. **Iron Laws（铁律）**
   绝对不可违反的规则，如：
   - TDD："没有失败的测试就没有生产代码"
   - 调试："没有根因就没有修复方案"
   - 验证："没有新证据就没有完成声明"

2. **HARD-GATE（硬性门禁）**
   brainstorming 阻止在规格批准前进行任何实现。verification 的门禁函数阻止无证据的完成声明。

3. **反规避语言**
   技能明确列出常见借口并逐一反驳："就这一次"、"我累了"、"linter 通过了"、"agent 说成功了"

4. **技能链式调用**
   ```
   brainstorming → writing-plans → subagent-driven-development
                                      └→ finishing-a-development-branch
   ```
   上游技能在结束时明确告知调用下游技能

5. **子代理 Prompt 模板**
   subagent-driven-development 包含三个独立模板：
   - `implementer-prompt.md`：实现者指令
   - `spec-reviewer-prompt.md`：规格合规审查
   - `code-quality-reviewer-prompt.md`：代码质量审查

6. **说服原则（Persuasion Principles）**
   基于 Meincke et al (2025, N=28,000) 研究：权威性、承诺一致、社会证明、稀缺性框架，用于防止 Agent 在压力下跳过技能

7. **CREATION-LOG.md**
   systematic-debugging 记录了从个人 CLAUDE.md 提取技能的过程，作为技能创建的参考范例

8. **命令→技能渐进迁移**
   旧命令文件（brainstorm.md 等）不直接删除，而是重定向到 Skill tool，标记为 DEPRECATED

9. **平台抽象层**
   using-superpowers 通过 `references/` 下的平台映射文件适配 Claude Code、Copilot CLI、Hermes、Gemini、Codex

#### 对 SpecForge 的启示

- **技能链式调用**模式可直接应用于 SpecForge 的生命周期阶段衔接
- **Iron Laws + HARD-GATE**可作为技能的质量门禁机制
- **子代理 Prompt 模板**是 SpecForge 子代理驱动开发的核心参考
- **writing-skills 的 TDD 方法**可用于 SpecForge 自身的技能开发和质量保障
- **中文本地化技能**（chinese-code-review、chinese-commit-conventions、chinese-documentation）可直接集成进 SpecForge 的技能体系
- **压力测试体系**可用于保证 SpecForge 生成技能的质量

---

### 2.4 skills-main

#### 项目定位

skills-main 是 **Anthropic 官方的 AgentSkills 参考仓库**，展示 AgentSkills 规范的示例技能集合。提供 17 个不同领域的技能，以及技能创建模板和 skill-creator 元技能。这是许多 Claude Code 内置技能的来源。

#### 目录结构

```
skills-main/
├── skills/                              # 17个技能目录
│   ├── algorithmic-art/                 # 算法艺术生成（p5.js）
│   ├── brand-guidelines/                # Anthropic 品牌色与字体
│   ├── canvas-design/                   # 视觉设计（.png/.pdf）
│   ├── claude-api/                      # Claude API 开发（多语言）
│   ├── doc-coauthoring/                 # 文档共创：Context→Refine→Reader Test
│   ├── docx/                            # Word 文档处理
│   ├── frontend-design/                 # 生产级前端界面设计
│   ├── internal-comms/                  # 企业内部沟通写作
│   ├── mcp-builder/                     # MCP 服务器构建
│   ├── pdf/                             # PDF 处理（读取/提取/合并/水印/OCR）
│   ├── pptx/                            # PowerPoint 创建/编辑
│   ├── skill-creator/                   # 元技能：创建/编辑/评估技能
│   ├── slack-gif-creator/               # Slack GIF 动图制作
│   ├── theme-factory/                   # 10个预设主题 + 自定义主题
│   ├── web-artifacts-builder/           # React+TS+Vite+Tailwind→HTML
│   ├── webapp-testing/                  # Playwright 测试 Web 应用
│   └── xlsx/                            # Excel 电子表格处理
└── template/SKILL.md                    # 新技能脚手架模板
```

#### 完整技能清单（17个）

| # | 技能名称 | 类别 | 功能 |
|---|---------|------|------|
| 1 | algorithmic-art | 创意/艺术 | 使用 p5.js 创建算法艺术，含种子随机性和交互式参数控制 |
| 2 | brand-guidelines | 样式/品牌 | 应用 Anthropic 品牌色和字体（Poppins标题/Lora正文） |
| 3 | canvas-design | 创意/设计 | 通过设计哲学创作视觉艺术，强调博物馆级工艺 |
| 4 | claude-api | 开发/API | Claude API/Anthropic SDK 开发：流式、工具调用、批处理、缓存、模型迁移（多语言） |
| 5 | doc-coauthoring | 写作/协作 | 文档共创：Context Gathering→Refinement→Reader Testing |
| 6 | docx | 文档处理 | Word 文档创建/编辑/注释/格式/TOC |
| 7 | frontend-design | 设计/开发 | 生产级前端界面，强调大胆美学方向 |
| 8 | internal-comms | 写作/企业 | 企业内部沟通：3P更新、通讯、FAQ、状态报告、事件报告 |
| 9 | mcp-builder | 开发/工具 | MCP 服务器构建：研究→实施→审查→分发 |
| 10 | pdf | 文档处理 | PDF 处理：读取/提取/合并/拆分/旋转/水印/加密/OCR |
| 11 | pptx | 文档处理 | PowerPoint 创建/编辑：模板解包XML或从零创建 |
| 12 | skill-creator | 元/技能开发 | 技能全生命周期：意图捕获→访谈调研→编写→测试→Eval→迭代 |
| 13 | slack-gif-creator | 创意/媒体 | Slack 动图(128x128或480x480)，GIFBuilder类 |
| 14 | theme-factory | 样式/设计 | 10个预设主题(Ocean Depths等)+自定义主题 |
| 15 | web-artifacts-builder | 开发/前端 | React+TS+Vite+Tailwind+shadcn/ui→单HTML打包 |
| 16 | webapp-testing | 开发/测试 | Playwright + 服务器生命周期管理(with_server.py)，侦察-行动模式 |
| 17 | xlsx | 文档处理 | Excel 处理：财务模型颜色规范、公式规则、格式标准 |

#### YAML Frontmatter 模式

```yaml
---
name: skill-creator
description: Create, edit, improve, and benchmark AgentSkills. ...
license: Apache 2.0
---
```

标准字段为 `name` + `description` + 可选 `license`。

#### 独特设计模式

1. **三级渐进式信息披露（Progressive Disclosure）**
   - Level 1: 元数据（name + description）——始终在上下文中（~100词）
   - Level 2: SKILL.md 正文——技能触发时加载（建议 <500 行）
   - Level 3: 捆绑资源（scripts/references/assets）——按需加载

2. **skill-creator 的技能创建方法**
   - 步骤：意图捕获 → 访谈调研 → 编写 SKILL.md → 创建测试 → 运行 Eval → 迭代
   - 三个子代理：analyzer（分析）、comparator（比较）、grader（评分）

3. **输出格式定义模式**
   使用 `## Report structure` + 模板块定义输出格式，如：
   ```markdown
   ## Report structure
   ### Completeness
   - [ ] Item 1
   ### Correctness
   - [ ] Item 2
   ```

4. **技能目录标准结构**
   ```
   skill-name/
   ├── SKILL.md          (必需)
   ├── LICENSE.txt        (常见)
   ├── scripts/           (可选 - 可执行脚本)
   ├── references/        (可选 - 按需加载的文档)
   ├── templates/         (可选 - 输出模板)
   └── assets/            (可选 - 字体、图片等)
   ```

5. **Description 作为主要触发机制**
   技能描述同时包含"做什么"和"何时使用"，鼓励略微"pushy"的描述风格以对抗"undertriggering"

#### 对 SpecForge 的启示

- **渐进式信息披露**应应用于 SpecForge 技能和命令的加载策略
- **skill-creator**是 SpecForge 自身技能创建能力的参考标准
- **技能目录标准结构**可作为 SpecForge 技能文件组织的蓝图
- **输出格式定义模式**可用于 SpecForge 各个阶段产出物（spec/plan/tasks）的格式定义
- **Benchmark/Eval 流程**可用于 SpecForge 技能质量的持续验证

---

### 2.5 spec-kit

#### 项目定位

spec-kit 是一个**规格驱动开发模板系统**。它定义了一条结构化的功能开发生命周期：Constitution（宪法）制定 → Specification（规格）→ Clarification（澄清）→ Planning（规划）→ Tasks（任务生成）→ Checklist（检查清单）→ Implementation（实施）→ Analysis（分析）。每个阶段是一个**命令**，通过模板文件 + 扩展钩子实现。

#### 目录结构

```
spec-kit-main/
└── templates/
    ├── commands/                         # 9个命令定义（.md 文件）
    │   ├── analyze.md
    │   ├── checklist.md
    │   ├── clarify.md
    │   ├── constitution.md
    │   ├── implement.md
    │   ├── plan.md
    │   ├── specify.md
    │   ├── tasks.md
    │   └── taskstoissues.md
    ├── spec-template.md                  # 功能规格模板
    ├── plan-template.md                  # 实施计划模板
    ├── tasks-template.md                 # 任务拆分模板
    ├── checklist-template.md             # 检查清单模板
    ├── constitution-template.md          # 宪法模板
    └── vscode-settings.json              # VS Code 集成配置
```

#### 完整命令清单（9个）

| # | 命令 | 工作流阶段 | 功能 |
|---|------|----------|------|
| 1 | **specify** | 规格 | 从自然语言描述创建功能规格。生成短名→创建spec目录→填充用户故事(P1/P2/P3)→功能需求→成功标准→关键实体。最多3个 `[NEEDS CLARIFICATION]` 标记 |
| 2 | **clarify** | 规格 | 按分类法扫描规格的欠明确区域（功能范围/领域模型/交互UX/非功能质量/集成依赖/边界情况），最多5个澄清问题 |
| 3 | **plan** | 规划 | Phase 0：研究（解决 NEEDS CLARIFICATION，生成 research.md）。Phase 1：设计与契约（data-model.md + contracts/ + quickstart.md）。宪法门禁评估 |
| 4 | **tasks** | 任务 | 从设计产物生成可操作、按依赖排序的任务。格式：`- [ ] [TaskID] [P?] [Story?] 描述 with 文件路径`。阶段：Setup → Foundational → 用户故事(P1/P2/P3) → Polish |
| 5 | **implement** | 实施 | 按阶段执行 tasks.md。检查 Checklist 完成状态（未完成则终止）。加载设计文档。按依赖排序+并行标记执行。TDD 方法 |
| 6 | **checklist** | 质量 | 生成自定义检查清单。"检查清单 = 英语的单元测试"——验证需求质量而非实现。动态询问范围/深度/受众 |
| 7 | **analyze** | 质量 | 只读的跨产物一致性分析（spec+plan+tasks ⇔ constitution）。识别不一致、重复、模糊、欠规范 |
| 8 | **constitution** | 治理 | 创建或更新项目宪法。语义化版本（MAJOR/MINOR/PATCH）。传播到依赖模板。生成 Sync Impact Report |
| 9 | **taskstoissues** | 集成 | 将任务转换为 GitHub Issues，使用 GitHub MCP Server |

#### 工作流管线

```
constitution (随时可更新)
     │
     v
specify ──→ clarify ──→ plan ──→ tasks ──→ implement
              │          │         │            │
              │          v         v            v
              │       checklist  taskstoissues  analyze
              └──────────────────────────────────┘
```

#### 命令 Frontmatter 模式

```yaml
---
description: Create or update the feature specification...
handoffs:
  - label: Build Technical Plan
    agent: __SPECKIT_COMMAND_PLAN__
    prompt: Build the technical plan for this spec.
  - label: Clarify Spec Requirements
    agent: __SPECKIT_COMMAND_CLARIFY__
    prompt: Clarify underspecified requirements.
    send: true
scripts:
  __SPECKIT_COMMAND_PLAN__: scripts/bash/setup-plan.sh --json
tools:
  - github/github-mcp-server/issue_write
---
```

特有的扩展字段：
- `handoffs`：显式有向图定义下一步可选命令
- `scripts`：执行前运行的 Shell 脚本
- `tools`：必需的外部 MCP 工具依赖

#### 独特设计模式

1. **宪法治理（Constitution Governance）**
   `.specify/memory/constitution.md` 是不可协商的治理文档。所有计划需通过"宪法检查"门禁。Analyze 命令将宪法冲突视为 CRITICAL，要求调整产物而非稀释原则。

2. **扩展钩子系统（Extension Hooks）**
   每个命令检查 `.specify/extensions.yml`，寻找 `hooks.before_<command>` 和 `hooks.after_<command>` 条目：
   - `enabled` 标志控制（默认为 true）
   - `condition` 字段支持条件执行
   - `optional: true` → 展示建议，用户选择
   - `optional: false` → 自动执行

3. **Checklist = "英语的单元测试"**
   检查清单验证**需求质量**（完整性、清晰度、一致性、覆盖度），而非实现正确性。动态询问后定制生成。

4. **手递手衔接（Handoffs）**
   每个命令的 Frontmatter 中声明 `handoffs` 列表，定义下游命令和传递的 Prompt，形成显式有向图。

5. **任务格式严格执行**
   `- [ ] [TaskID] [P?] [Story?] Description with file path`
   明确列出**错误格式示例**以预防。

6. **按用户故事组织任务**
   任务必须按用户故事分组（非技术层次），每个用户故事独立阶段，支持独立实现和测试。

7. **需求澄清分类法**
   clarify 使用结构化分类法：功能范围、领域与数据模型、交互与UX、非功能质量、集成与依赖、边界情况。

#### 对 SpecForge 的启示

- **宪法治理**可集成到 SpecForge 的 `foundation` 阶段，作为规格的约束框架
- **扩展钩子系统**是 SpecForge 插件/扩展架构的直接参考
- **Handoffs**可应用于 SpecForge 生命周期阶段间的衔接定义
- **需求澄清分类法**可纳入 SpecForge 的 `requirements` 阶段
- **Checklist 质量门禁**可用于 SpecForge 的 `quality` 阶段
- **任务按用户故事组织**可纳入 SpecForge 的 `planning` 阶段

---

### 2.6 claude-task-master

#### 项目定位

Task Master 是一个**PRD→任务管线**，将产品需求文档（PRD）处理为结构化、按依赖排序的开发任务，分析任务复杂度，通过 AI 扩展生成子任务。核心是 **parse-prd** 和 **expand-task** 两个 AI 驱动的操作。

#### 目录结构

```
claude-task-master-main/
├── .taskmaster/
│   ├── tasks/                           # 任务文件（.txt 格式）
│   │   └── task_001~007_tm-start.txt
│   ├── templates/                       # PRD 示例模板
│   │   ├── example_prd.md / example_prd.txt
│   │   └── example_prd_rpg.md / example_prd_rpg.txt
│   └── reports/
│       └── task-complexity-report*.json # 复杂度分析报告
└── task-master/
    ├── parse-prd.js                     # Zod Schema 用于响应验证
    ├── parse-prd.json                   # 操作定义（Prompt模板+参数）
    ├── expand-task.js                   # Zod Schema 用于响应验证
    └── expand-task.json                 # 操作定义（3种Prompt变体）
```

#### 操作定义（2个）

| # | 操作 | 功能 | Prompt 变体 |
|---|------|------|------------|
| 1 | **parse-prd** | 解析 PRD 为结构化开发任务。参数：`numTasks`、`nextId`、`research`、`prdContent`、`prdPath`、`defaultTaskPriority`、`hasCodebaseAnalysis`、`projectRoot` | 1种（含 research 模式） |
| 2 | **expand-task** | 将单个任务拆解为详细子任务。参数：`subtaskCount`、`task`、`nextSubtaskId`、`useResearch`、`expansionPrompt`、`additionalContext`、`complexityReasoningContext`、`gatheredContext`、`hasCodebaseAnalysis`、`projectRoot` | 3种：`complexity-report`、`research`、`default` |

#### JSON 配置结构

```json
{
  "description": "解析产品需求文档为结构化开发任务",
  "tags": ["prd", "parsing", "initialization"],
  "hasCodebaseAnalysis": false,
  "prompt": "---\n使用 Handlebars 语法的模板...\n{{#if research}}...[research指令]...{{/if}}"
}
```

不包含 YAML Frontmatter，使用独立 JSON 文件 + Zod JS Schema 文件。

#### 独特设计模式

1. **Handlebars 条件模板引擎**
   使用 `{{variable}}` 语法和 `{{#if condition}}...{{/if}}` 条件块，实现动态 Prompt 构建。根据参数不同生成不同的 System Prompt。

2. **多模态 Prompt 变体**
   expand-task 有 3 种 Prompt 变体：
   - `complexity-report`：当 expansionPrompt 存在时触发，使用复杂度推理上下文
   - `research`：research 模式，引导代码库探索
   - `default`：标准扩展

3. **Zod 响应验证**
   每个操作有对应的 JS Schema 文件（`parse-prd.js`、`expand-task.js`），使用 Zod 定义期望的响应结构，确保 AI 输出可被结构化解析。

4. **任务文件 .txt 格式**
   ```
   # Task ID: 001
   # Title: 初始化项目结构
   # Status: pending
   # Dependencies: []
   # Priority: high
   # Description: ...
   # Details: ...
   # Test Strategy: ...
   ```
   使用 `<info added on ...>` 块进行增量上下文丰富。

5. **复杂度分析报告**
   生成 JSON 格式的复杂度评分、推荐子任务数量、上下文扩展提示，可指导 expand-task 的操作。

#### 对 SpecForge 的启示

- **条件模板引擎**可应用于 SpecForge 的动态 Prompt 生成（不同阶段、不同配置生成不同指令）
- **Zod 响应验证**可用于确保 AI 生成的产物符合预期 Schema
- **复杂度分析**可纳入 SpecForge 的 `planning` 阶段的任务拆解中
- **多模态 Prompt**模式允许同一技能根据上下文使用不同的指令变体

---

### 2.7 grill-me

#### 项目定位

grill-me 是一个**高强度决策面试技能**，帮助用户理清自己真正想要什么。通过暴露意图、约束、隐藏假设和未言明的替代方案来展开用户上下文。**不是 Bug 扫描器**——它是决策清晰化工具，适用于编码、营销、品牌、SOP、系统思维、商业决策等场景。

#### 目录结构

```
grill-me/
├── README.md              # 中文安装使用说明
└── SKILL.md               # 完整技能定义
```

#### 技能定义（1个）

| 技能名称 | 触发条件 | 核心循环 |
|---------|---------|---------|
| grill-me | `/grill-me`, "grill me", "interview me", "pressure-test this", "help me think through" | ①一次一个问题 ②每个问题附带推荐答案 ③深挖答案再横向扩展 ④先调查再提问 ⑤可行动的下一步才结束 |

#### YAML Frontmatter

```yaml
---
name: grill-me
description: 高强度提问...
---
```

#### 独特设计模式

1. **五步核心循环**
   - 一次只问一个问题
   - 每个问题附带推荐答案（让用户有东西可以回应）
   - 深入挖掘用户答案后再横向扩展
   - 先调查代码/文件再提问
   - 只有明确可行的下一步行动时才结束

2. **12 重视角提问框架**（静默使用，不透露名称）
   - 第一性原理、意图与期望结果、约束暴露、隐藏假设挖掘、第二选择（未被选择的方案）
   - 事前验尸(Pre-mortem)、钢铁人反论(Steel-manning)、受众/利益相关者视角
   - 可逆性（单向门 vs 双向门）、五个为什么/根因、边界测试、可持续性

3. **反过早收敛**
   明确要求当 AI 觉得"可以行动了"时多问 3 个问题，不要把总结误认为进展。

4. **驳斥草案法（Refutable Draft）**
   当用户给出模糊回答时，默认策略是先产生一个"可被驳斥的草稿"——让用户批评比从零创建更容易。

5. **结构化会话日志**
   行动前写入 `<cwd>/.grill/<slug>.md`，固定六段：
   - 意图(Intent)、约束(Constraints)、关键决策(含理由与替代方案)、浮现假设(Emerged Assumptions)、开放问题(Open Questions)、非目标(Non-goals)
   - 空段落直接删除，不留 "TBD" 占位符

#### 对 SpecForge 的启示

- **多视角提问框架**可集成到 SpecForge 的 `requirements` 阶段（需求澄清）
- **驳斥草案法**可应用于规格的迭代澄清流程
- **结构化会话日志**可作为 SpecForge 中 `changes/` 目录下变更记录的参考格式
- **反过早收敛**原则可纳入 SpecForge Agent 的行为准则

---

## 3. 技能体系对比

### 3.1 技能数量与命名规则

| 项目 | 技能/命令数 | 命名风格 | 示例 |
|------|-----------|---------|------|
| OpenSpec | 11技能 + 11命令 | 技能：`openspec-<动词>-<名词>`，命令：`/opsx:<动词>` | `openspec-apply-change`、`/opsx:archive` |
| gstack | 10技能 | `<领域>-<具体功能>` | `plan-ceo-review`、`qa`、`ship` |
| superpowers-zh | 20技能 | `<动词>-<名词>` 或 `<领域>-<名词>` | `brainstorming`、`chinese-code-review` |
| skills-main | 17技能 | `<名词短语>` 或 `<领域>-<名词>` | `algorithmic-art`、`skill-creator` |
| spec-kit | 9命令 | 动词原型 | `specify`、`clarify`、`implement` |
| claude-task-master | 2操作 | `<动词>-<名词>` | `parse-prd`、`expand-task` |
| grill-me | 1技能 | 动词短语 | `grill-me` |

**对 SpecForge 的建议**：采用 `<领域>-<动词>-<阶段>` 命名规则，如 `specforge-foundation-init`、`specforge-planning-tasks`，兼顾可发现性和命名空间隔离。

### 3.2 Frontmatter 字段对比

| 字段 | OpenSpec | gstack | superpowers-zh | skills-main | spec-kit | grill-me |
|------|----------|--------|---------------|-------------|----------|----------|
| `name` | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| `description` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `version` | metadata内 | ✓ | — | — | — | — |
| `license` | ✓ | — | — | ✓ | — | — |
| `category` | — | — | — | — | ✓(隐含) | — |
| `tags` | 命令独有 | — | — | — | — | — |
| `interactive` | — | ✓ | — | — | — | — |
| `preamble-tier` | — | ✓ | — | — | — | — |
| `benefits-from` | — | ✓ | — | — | — | — |
| `allowed-tools` | — | ✓ | — | — | ✓(tools) | — |
| `handoffs` | — | — | — | — | ✓ | — |
| `scripts` | — | — | — | — | ✓ | — |
| `metadata` | ✓(嵌套) | — | — | — | — | — |
| `compatibility` | ✓ | — | — | — | — | — |

**字段设计层次分析：**

- **最小集**（所有项目都使用）：`name` + `description`
- **Agent 行为控制**（进阶项目使用）：`allowed-tools`、`scripts`、`interactive`
- **编排/序次**（高级项目使用）：`preamble-tier`、`handoffs`、`benefits-from`
- **元信息**（生成系统使用）：`version`、`license`、`metadata`、`tags`

**对 SpecForge 的建议**：采用分层 Frontmatter Schema：
- **必需层**：`name`、`description`、`phase`（所属生命周期阶段）、`category`（技能类别）
- **行为层**：`interactive`、`allowed-tools`、`triggers`
- **编排层**：`depends-on`（前置技能）、`hands-off-to`（后继技能）、`preamble`（引导脚本）
- **元信息层**：`version`、`generatedBy`、`license`

### 3.3 技能触发机制对比

| 触发方式 | OpenSpec | gstack | superpowers-zh | skills-main | spec-kit | grill-me |
|---------|----------|--------|---------------|-------------|----------|----------|
| **自然语言关键词** | — | ✓(triggers在description中) | ✓(description嵌入) | ✓(description为主) | — | ✓ |
| **斜杠命令** | ✓(/opsx:*) | — | — | — | ✓(__SPECKIT_*) | ✓(/grill-me) |
| **技能链自动衔接** | ✓(产物状态机) | — | ✓(显式调用下游) | — | ✓(handoffs) | — |
| **Profile 过滤** | ✓(Core/Custom) | — | — | — | — | — |
| **主动建议** | — | ✓(proactively suggest) | ✓(description中) | ✓(pushy description) | — | — |

**对 SpecForge 的建议**：采用三重触发机制：
1. **斜杠命令**：用户通过 `/specforge:<阶段>` 或 `specforge <命令>` 显式调用
2. **自然语言触发**：在技能 description 中嵌入触发短语
3. **生命周期自动衔接**：上游阶段完成后自动建议下游技能

### 3.4 技能组织结构对比

| 维度 | OpenSpec | gstack | superpowers-zh | skills-main | spec-kit |
|------|----------|--------|---------------|-------------|----------|
| **技能目录结构** | `.claude/skills/openspec-<id>/SKILL.md` | `~/.claude/skills/gstack/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` | `skills/<name>/SKILL.md` | `templates/commands/<name>.md` |
| **支持文件位置** | 模板在 `schemas/` 中 | `references/`、`templates/`、`specialists/` | 与 SKILL.md 同目录 | `scripts/`、`references/`、`templates/`、`assets/` | `templates/` 上级目录 |
| **是否需要代码生成** | ✓(`init`生成) | ✓(`gen:skill-docs`生成) | ✗(直接使用) | ✗(直接使用) | ✓(模板渲染) |
| **技能间隔离** | 独立目录 + 命名空间前缀 | 独立目录 | 独立目录（轻量） | 独立目录 | 扁平 .md 文件 |

---

## 4. 生命周期/工作流对比

### 4.1 各项目阶段划分

| SpecForge 9阶段 | OpenSpec | gstack | superpowers-zh | spec-kit |
|-----------------|----------|--------|---------------|----------|
| **foundation**  | — | — | — | constitution |
| **requirements** | explore + proposal | — | brainstorming | specify + clarify |
| **design** | specs + design | plan-*-review(审查) | — | — |
| **planning** | tasks | — | writing-plans | plan + tasks |
| **implementation** | apply | — | executing-plans / subagent-driven-dev / tdd | implement |
| **quality** | verify + sync | qa + qa-only + review | test-driven-dev / systematic-debugging / verification | checklist + analyze |
| **release** | archive + bulk-archive | ship | finishing-a-dev-branch | taskstoissues |
| **operations** | — | — | mcp-builder / using-git-worktrees | — |
| **evolution** | onboard(学习) | plan-tune(调优) + skillify(固化) | writing-skills(元技能) | — |

### 4.2 阶段衔接方式

| 方式 | 代表项目 | 机制描述 |
|------|---------|---------|
| **产物状态机** | OpenSpec | 产物在 BLOCKED→READY→DONE 间转换，`openspec status --json` 查询当前状态 |
| **显式链式调用** | superpowers-zh | 上游技能结束时明确告知调用下游技能名称 |
| **Handoffs 有向图** | spec-kit | 每个命令声明 `handoffs` 列表，用户可选择下一步 |
| **配置文件过滤** | OpenSpec | Profile 决定启用哪些工作流阶段 |

**对 SpecForge 的建议**：结合两种机制——
- 使用**产物状态机**（类似 OpenSpec 的 DAG）追踪阶段间产物的完成状态
- 使用**显式 Handoffs**（类似 spec-kit）定义阶段间的推荐流转路径
- 支持通过**配置文件**（类似 OpenSpec Profile）定制阶段启用/禁用

### 4.3 SpecForge 9 阶段与参考技能映射

```
foundation     ← constitution (spec-kit), init/setup patterns (各项目)
requirements   ← exploring/brainstorming/grill-me (superpowers-zh)
design         ← plan-eng-review/design-review (gstack)
planning       ← writing-plans + tasks.md (superpowers-zh + spec-kit)
implementation ← subagent-driven-dev + tdd (superpowers-zh)
quality        ← qa + review + verify (superpowers-zh + gstack + OpenSpec)
release        ← ship + archive (gstack + OpenSpec)
operations     ← mcp-builder + worktree-management (superpowers-zh)
evolution      ← plan-tune + skillify + writing-skills (gstack + superpowers-zh)
```

---

## 5. 关键设计模式汇总

### 5.1 双目录模型（OpenSpec） ✓ 已采用

**模式**：框架资产（`.specforge/`）与用户资产（`specforge/`）分离。框架可通过 update 安全更新而不触碰用户内容。

**SpecForge 中的应用**：当前架构已采用此模式。

### 5.2 引导/前导码系统（gstack）

**模式**：每个技能以可执行 Bash 代码块作为 Preamble，执行环境检测、配置加载、会话跟踪、遥测上报。

```bash
# 典型的 Preamble 结构
gstack-update-check
session_id=$(date +%s).$$
mkdir -p ~/.gstack/sessions
echo $session_id > ~/.gstack/sessions/$session_id
# 读取配置、加载学习记录...
```

**SpecForge 中的应用建议**：
- 技能加载时执行轻量 Preamble（检查 specforge CLI 版本、读取项目配置、加载上下文文件）
- 记录会话数据到 `.specforge/sessions/` 用于经验积累

### 5.3 硬性门禁 / Iron Laws（superpowers-zh）

**模式**：在技能中设立不可违反的规则，配合常见借口的预反驳语言。

```
铁律：在编写任何生产代码前，必须先有失败的测试。
禁止的行为：
  - "这次很简单，不需要测试" → 简单代码也会出错
  - "我先写代码再加测试" → 99%的情况下测试不会被补上
```

**SpecForge 中的应用建议**：
- 在关键阶段技能中设置 Iron Laws（如 `implementation` 阶段禁止跳过 `design` 直接写代码）
- 在 `quality` 阶段设置"无新验证证据禁止声称完成"

### 5.4 技能链式调用（superpowers-zh）

**模式**：上游技能在完成时明确告知调用下游技能名称和方法。

```
## 完成后的下一步
在你批准此设计后，调用 writing-plans 技能创建实施计划。
使用: /writing-plans 或将此设计文档传递给 Claude
```

**SpecForge 中的应用建议**：
- 每个生命周期阶段的技能在完成时给出明确的下一阶段建议
- 在 Frontmatter 中声明 `hands-off-to` 字段

### 5.5 子代理驱动开发（superpowers-zh、gstack）

**模式**：为主 Agent 提供分派子代理的指令模板，每个子代理有明确的独立范围和返回格式。

superpowers-zh 的子代理三层模型：
1. **implementer**：实现任务（代码 + 测试）
2. **spec-reviewer**：检查实现是否符合规格
3. **code-quality-reviewer**：检查代码质量

gstack 的并行专家模型：
- security、testing、performance、API contract、data migration、maintainability、red-team

**SpecForge 中的应用建议**：
- 在 `implementation` 阶段使用 implementer→spec-reviewer→code-quality-reviewer 三阶段模型
- 在 `quality` 阶段使用 gstack 式的并行专家子代理

### 5.6 依赖图引擎（OpenSpec OPSX）

**模式**：通过 YAML Schema 定义产物间的依赖关系，DAG 引擎计算每个产物的状态（BLOCKED/READY/DONE）。

```yaml
artifacts:
  - id: proposal
    generates: proposal.md
    requires: []
  - id: specs
    generates: "specs/**/*.md"
    requires: [proposal]
  - id: design
    generates: design.md
    requires: [proposal]
  - id: tasks
    generates: tasks.md
    requires: [specs, design]
apply:
  requires: [tasks]
```

**SpecForge 中的应用建议**：
- 定义 SpecForge 的阶段间产物依赖图
- CLI 命令 `specforge status` 查询当前阶段产物状态
- 支持自定义 Schema 以适配不同项目类型

### 5.7 扩展钩子系统（spec-kit）

**模式**：每个命令自动检查扩展配置，在前后执行自定义钩子。

```yaml
# .specify/extensions.yml
hooks:
  before_specify:
    - name: "检查环境变量"
      script: "scripts/check-env.sh"
      enabled: true
  after_specify:
    - name: "通知团队"
      script: "scripts/notify.sh"
      optional: true
```

**SpecForge 中的应用建议**：
- 在 `.specforge/extensions.yml` 中定义钩子
- 支持 `before_<phase>` 和 `after_<phase>` 钩子
- CLI 命令注册钩子：`specforge add-hook --phase design --script scripts/custom.sh`

### 5.8 渐进式信息披露（skills-main skill-creator）

**模式**：技能内容分三级加载：
1. **始终加载**：name + description（~100词）
2. **触发加载**：SKILL.md 完整正文（<500行）
3. **按需加载**：scripts/references/assets 等捆绑资源

**SpecForge 中的应用建议**：
- Commands 和 Skills 的 metadata 保持精简以控制上下文窗口
- 大型参考文档放入 `references/` 子目录按需加载
- SKILL.md 主体控制在合理长度

### 5.9 TDD 方法论应用于技能开发（superpowers-zh writing-skills）

**模式**：技能创建采用类 TDD 流程：
1. **基线测试**：无技能时 AI 的行为表现
2. **编写技能**：针对差距编写 SKILL.md
3. **压力测试**：在极端条件下测试（时间压力、范围压力、风险场景）
4. **堵漏洞**：发现并反驳 AI 可能用来绕过技能规则的借口
5. **重新验证**：更新后在相同场景下复测

**SpecForge 中的应用建议**：
- SpecForge 自身的技能开发采用此流程
- 为每个技能编写压力测试用例
- 建立技能质量 Eval 基准

### 5.10 模板渲染引擎（OpenSpec、claude-task-master）

**模式**：使用模板变量系统从模板生成文件。

- **OpenSpec**：`{{variableName}}` 简单替换语法（`template-renderer.ts`）
- **claude-task-master**：Handlebars `{{variable}}` + `{{#if condition}}` 条件块

**SpecForge 中的应用**：当前已采用 `{{placeholder}}` 模板渲染引擎，可考虑扩展支持条件渲染。

### 5.11 压力测试/反规避机制（superpowers-zh、grill-me）

**模式**：预先设计技能在极端条件下可能被绕过的方式，并设计对策。

superpowers-zh 的反规避策略：
- **说服原则**（权威、承诺、社会证明、稀缺性）
- **常见借口预反驳**（"就这一次"、"我累了"）
- **结构性约束**（门禁函数、格式要求）

grill-me 的反过早收敛：
- 当 AI 觉得"可以行动了"时必须多问 3 个问题
- 不要把总结误认为进展

**SpecForge 中的应用建议**：
- 在技能中嵌入反规避语言
- 在质量门禁中使用结构性约束而非仅依赖 Agent 自律

---

## 6. 对 SpecForge 开发的建议

### 6.1 技能系统架构建议

```
specforge/
├── commands/                  # CLI 命令（用户显式调用）
│   ├── init.md               # foundation: 初始化项目
│   ├── add-spec.md           # requirements: 添加规格
│   ├── add-design.md         # design: 创建设计文档
│   ├── add-plan.md           # planning: 创建实施计划
│   ├── add-tasks.md          # planning: 生成任务列表
│   ├── implement.md          # implementation: 执行实现
│   ├── review.md             # quality: 审查与测试
│   ├── release.md            # release: 发布部署
│   └── evolve.md             # evolution: 复盘归档
└── skills/                    # AI Agent 技能（自然语言触发）
    ├── architecture/          # 架构决策
    ├── code-styles/           # 编码风格
    ├── domain-rules/          # 领域规则
    ├── security/              # 安全规范
    ├── testing/               # 测试策略
    ├── ui-ux/                 # 用户界面
    └── workflow-steps/        # 工作流步骤
```

- **Commands** = 用户驱动的阶段推进（类似 spec-kit 的 `/` 命令 + OpenSpec 的 `/opsx:` 命令）
- **Skills** = AI 自主判断使用的辅助能力（类似 superpowers-zh 的领域技能）

### 6.2 命令 vs 技能的双轨模式建议

借鉴 OpenSpec 的双轨表示，让每个生命周期阶段同时拥有：

| 阶段 | 命令（用户用） | 技能（AI 用） |
|------|-------------|-------------|
| foundation | `/specforge:init` | `specforge-foundation-init` |
| requirements | `/specforge:spec` | `specforge-requirements-specify` |
| design | `/specforge:design` | `specforge-design-architect` |
| planning | `/specforge:plan` | `specforge-planning-breakdown` |
| implementation | `/specforge:implement` | `specforge-implementation-build` |
| quality | `/specforge:review` | `specforge-quality-verify` |
| release | `/specforge:release` | `specforge-release-deploy` |
| operations | `/specforge:ops` | `specforge-operations-monitor` |
| evolution | `/specforge:evolve` | `specforge-evolution-retrospect` |

两组文件从**同一个模板源**生成，通过 `profile` 配置决定启用哪些阶段。

### 6.3 Frontmatter Schema 设计建议

基于7个项目的综合分析，建议 SpecForge 技能/命令的 Frontmatter Schema：

```yaml
---
# === 必需字段 ===
name: specforge-requirements-specify       # kebab-case，带命名空间前缀
description: >
  从自然语言描述创建功能规格文档。在用户提出新功能需求时使用。
  包含用户故事、功能需求、成功标准和关键实体定义。
  触发场景："添加需求"、"创建规格"、"spec this feature"。
phase: requirements                        # 所属生命周期阶段
category: workflow-steps                   # 技能类别
                                           # domain-rules|code-styles|architecture|
                                           # testing|security|ui-ux|workflow-steps

# === 行为控制字段 ===
interactive: true                          # 是否需要与用户交互
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
triggers:                                  # 自然语言触发短语
  - 添加需求
  - 创建规格
  - spec this feature

# === 编排字段 ===
depends-on:                                # 前置依赖
  - specforge-foundation-init
hands-off-to:                              # 后继推荐
  - specforge-design-architect
preamble: |
  specforge check --phase requirements     # 引导脚本

# === 元信息字段 ===
version: "1.0.0"
license: MIT
generatedBy: "0.1.0"
---
```

### 6.4 生命周期阶段与技能的映射建议

参考所有项目的阶段划分和技能定义，为 SpecForge 的 9 个阶段填充核心技能：

| 阶段 | 核心技能 | 参考来源 | 关键机制 |
|------|---------|---------|---------|
| **foundation** | 项目初始化、宪法制定 | spec-kit constitution、OpenSpec init | 双目录搭建、Profile 选择 |
| **requirements** | 需求头脑风暴、规格编写、需求澄清 | superpowers-zh brainstorming、spec-kit specify+clarify、grill-me 提问框架 | Iron Law：禁止在需求澄清前实现 |
| **design** | 架构设计、技术方案、多视角审查 | gstack plan-*-review、OpenSpec design | 多视角评分、决策记录 |
| **planning** | 任务拆解、复杂度分析、依赖编排 | claude-task-master expand-task、spec-kit tasks | DAG 依赖图、按用户故事组织 |
| **implementation** | 子代理实现、TDD、代码生成 | superpowers-zh subagent-driven-dev + tdd | 实现→规格审查→质量审查三阶段 |
| **quality** | 测试、审查、验证、一致性分析 | gstack qa+review、OpenSpec verify+sync、spec-kit checklist+analyze | 并行专家审查、三维验证 |
| **release** | 发布、归档、版本管理 | gstack ship、OpenSpec archive | 增量规格合并、变更日志 |
| **operations** | 监控、告警、运维、工作树管理 | superpowers-zh using-git-worktrees、mcp-builder | 环境管理、平台适配 |
| **evolution** | 复盘、知识沉淀、技能优化 | gstack plan-tune+skillify、superpowers-zh writing-skills | 经验积累、技能持续改进 |

### 6.5 扩展机制建议

整合 spec-kit 的钩子系统 + OpenSpec 的 Schema 自定义：

```yaml
# .specforge/extensions.yml
hooks:
  before_requirements:
    - name: "加载项目上下文"
      command: "specforge context load"
      enabled: true
  after_implementation:
    - name: "运行测试套件"
      command: "npm test"
      enabled: true
      optional: false
  before_release:
    - name: "安全检查"
      command: "npm audit"
      enabled: true
```

```yaml
# .specforge/schema.yml (自定义阶段产物)
schema: default
phases:
  requirements:
    artifacts:
      - id: user-stories
        generates: "specs/user-stories.md"
        template: "user-stories-template.md"
        requires: []
      - id: functional-spec
        generates: "specs/functional-spec.md"
        requires: [user-stories]
```

---

## 附录 A：所有技能总表

以下是 7 个参考项目中定义的全部 70 个技能/命令/操作的完整索引。

| # | 技能/命令名称 | 所属项目 | 类型 | 功能摘要 |
|---|-------------|---------|------|---------|
| 1 | openspec-explore | OpenSpec | 技能 | 探索模式：头脑风暴、澄清需求 |
| 2 | openspec-propose | OpenSpec | 技能 | 一步创建变更和全部规划产物 |
| 3 | openspec-new-change | OpenSpec | 技能 | 仅创建变更脚手架 |
| 4 | openspec-continue-change | OpenSpec | 技能 | 按依赖顺序创建下一个产物 |
| 5 | openspec-ff-change | OpenSpec | 技能 | 快进：一次性创建所有产物 |
| 6 | openspec-apply-change | OpenSpec | 技能 | 实现阶段：遍历任务并执行 |
| 7 | openspec-verify-change | OpenSpec | 技能 | 三维验证：完整性、正确性、一致性 |
| 8 | openspec-sync-specs | OpenSpec | 技能 | 合并增量规格到主规格 |
| 9 | openspec-archive-change | OpenSpec | 技能 | 归档已完成的变更 |
| 10 | openspec-bulk-archive-change | OpenSpec | 技能 | 批量归档多个变更 |
| 11 | openspec-onboard | OpenSpec | 技能 | 11阶段导览教程 |
| 12 | feedback | OpenSpec | CLI | 收集匿名化用户反馈 |
| 13 | plan-ceo-review | gstack | 技能 | CEO视角计划审查（4模式） |
| 14 | plan-design-review | gstack | 技能 | 设计师视角计划审查（0-10评分） |
| 15 | plan-devex-review | gstack | 技能 | 开发者体验视角（3模式） |
| 16 | plan-eng-review | gstack | 技能 | 工程经理视角（架构/性能/测试） |
| 17 | plan-tune | gstack | 技能 | 自调优：问题敏感度配置 |
| 18 | qa | gstack | 技能 | QA测试+修复循环（3层） |
| 19 | qa-only | gstack | 技能 | 纯报告式QA测试 |
| 20 | review | gstack | 技能 | 上线前PR审查+并行专家子代理 |
| 21 | ship | gstack | 技能 | 发布：合并→测试→版本→推送→PR |
| 22 | skillify | gstack | 技能 | 固化成功的/scrape流程为技能 |
| 23 | brainstorming | superpowers-zh | 技能 | 头脑风暴→设计文档 |
| 24 | writing-plans | superpowers-zh | 技能 | 创建实施计划 |
| 25 | executing-plans | superpowers-zh | 技能 | 顺序执行计划所有任务 |
| 26 | subagent-driven-development | superpowers-zh | 技能 | 子代理实现+两阶段审查 |
| 27 | test-driven-development | superpowers-zh | 技能 | 红-绿-重构 TDD |
| 28 | systematic-debugging | superpowers-zh | 技能 | 四阶段系统调试 |
| 29 | verification-before-completion | superpowers-zh | 技能 | 完成前强制验证 |
| 30 | requesting-code-review | superpowers-zh | 技能 | 派发代码审查子代理 |
| 31 | receiving-code-review | superpowers-zh | 技能 | 技术评估审查反馈 |
| 32 | dispatching-parallel-agents | superpowers-zh | 技能 | 并行分派独立任务 |
| 33 | finishing-a-development-branch | superpowers-zh | 技能 | 完成分支：验证→4选项 |
| 34 | using-git-worktrees | superpowers-zh | 技能 | 创建隔离Git worktree |
| 35 | chinese-code-review | superpowers-zh | 技能 | 中文团队审查文化 |
| 36 | chinese-commit-conventions | superpowers-zh | 技能 | 中文Conventional Commits |
| 37 | chinese-documentation | superpowers-zh | 技能 | 中文技术写作规范 |
| 38 | chinese-git-workflow | superpowers-zh | 技能 | 中文平台Git工作流 |
| 39 | using-superpowers | superpowers-zh | 技能 | 入口元技能（平台适配） |
| 40 | mcp-builder | superpowers-zh | 技能 | MCP服务器构建方法 |
| 41 | workflow-runner | superpowers-zh | 技能 | 执行YAML工作流 |
| 42 | writing-skills | superpowers-zh | 技能 | TDD方法创建技能 |
| 43 | algorithmic-art | skills-main | 技能 | p5.js算法艺术生成 |
| 44 | brand-guidelines | skills-main | 技能 | Anthropic品牌色/字体 |
| 45 | canvas-design | skills-main | 技能 | 视觉设计(.png/.pdf) |
| 46 | claude-api | skills-main | 技能 | Claude API开发（多语言） |
| 47 | doc-coauthoring | skills-main | 技能 | 文档共创：Context→Refine→Test |
| 48 | docx | skills-main | 技能 | Word文档处理 |
| 49 | frontend-design | skills-main | 技能 | 生产级前端设计 |
| 50 | internal-comms | skills-main | 技能 | 企业内部沟通写作 |
| 51 | mcp-builder | skills-main | 技能 | MCP服务器构建指南 |
| 52 | pdf | skills-main | 技能 | PDF处理（读/写/合并/OCR） |
| 53 | pptx | skills-main | 技能 | PowerPoint创建/编辑 |
| 54 | skill-creator | skills-main | 技能 | 技能全生命周期管理 |
| 55 | slack-gif-creator | skills-main | 技能 | Slack动图制作 |
| 56 | theme-factory | skills-main | 技能 | 10个预设主题+自定义 |
| 57 | web-artifacts-builder | skills-main | 技能 | React+TS→单HTML打包 |
| 58 | webapp-testing | skills-main | 技能 | Playwright测试Web应用 |
| 59 | xlsx | skills-main | 技能 | Excel电子表格处理 |
| 60 | specify | spec-kit | 命令 | 创建功能规格 |
| 61 | clarify | spec-kit | 命令 | 澄清欠明确需求 |
| 62 | plan | spec-kit | 命令 | 实施规划（研究+设计+契约） |
| 63 | tasks | spec-kit | 命令 | 生成依赖排序任务列表 |
| 64 | implement | spec-kit | 命令 | 按阶段执行任务 |
| 65 | checklist | spec-kit | 命令 | 生成需求质量检查清单 |
| 66 | analyze | spec-kit | 命令 | 跨产物一致性分析 |
| 67 | constitution | spec-kit | 命令 | 创建/更新项目宪法 |
| 68 | taskstoissues | spec-kit | 命令 | 任务→GitHub Issues |
| 69 | parse-prd | claude-task-master | 操作 | PRD解析为结构化任务 |
| 70 | expand-task | claude-task-master | 操作 | 任务扩展为子任务 |
| 71 | grill-me | grill-me | 技能 | 高强度决策面试 |

---

## 附录 B：参考项目文件索引

| 项目 | 路径 | 关键文件 |
|------|------|---------|
| OpenSpec | `references/OpenSpec-main/` | `schemas/spec-driven/schema.yaml`、`src/core/profiles.ts`、`src/core/templates/workflows/*.ts`、`src/core/shared/skill-generation.ts`、`src/core/artifact-graph/` |
| gstack | `references/gstack/` | `plan-ceo-review/SKILL.md.tmpl`、`qa/SKILL.md`、`review/SKILL.md`、`review/specialists/` |
| superpowers-zh | `references/superpowers-zh/` | `skills/brainstorming/SKILL.md`、`skills/subagent-driven-development/SKILL.md`、`skills/writing-skills/SKILL.md`、`skills/test-driven-development/SKILL.md` |
| skills-main | `references/skills-main/` | `skills/skill-creator/SKILL.md`、`skills/skill-creator/references/schemas.md`、`template/SKILL.md` |
| spec-kit | `references/spec-kit-main/` | `templates/commands/specify.md`、`templates/commands/constitution.md`、`templates/spec-template.md` |
| claude-task-master | `references/claude-task-master-main/` | `task-master/parse-prd.json`、`task-master/expand-task.json`、`.taskmaster/templates/` |
| grill-me | `references/grill-me/` | `SKILL.md` |
