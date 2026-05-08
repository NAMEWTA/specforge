---
spec_id: "2026-05-04-specforge-cli-design"
title: "SpecForge CLI 完整设计方案"
date: "2026-05-04"
status: superseded
owner: "wta"
source_command: ".specforge/commands/workflow/design-explore/design-explore.md"
tags:
  - specforge
  - cli
  - architecture
  - lifecycle
  - workflow
---

> ⚠️ **历史文档（已被 v0.2.0 部分取代）**
>
> 本设计文档基于 9 阶段方案（含 `operations`）。自 v0.2.0 起 SpecForge 收敛为 **8 阶段**，
> `operations` 已被并入 `release` 阶段（参见 `UPGRADE_SUMMARY.md` 的 v0.2.0 章节）。
>
> 请以 `CLAUDE.md` 与 `UPGRADE_SUMMARY.md` 为当前状态的事实来源；
> 本文档保留以记录早期设计推演与方法论选型理由。


# SpecForge CLI 完整设计方案

> 本文档融合 7 个参考项目（OpenSpec、gstack、superpowers-zh、spec-kit、claude-task-master、grill-me、skills-main）的精华设计模式，基于 SpecForge 需求分析技术文档的基线，形成完整的 CLI 设计方案。

---

## 1. 设计决策摘要

| # | 决策项 | 选择 | 参考来源 |
|---|--------|------|---------|
| 1 | 命令触发模式 | 单轨手动触发（用户 @.specforge/commands/... 调用） | 需求文档 + 用户决策 |
| 2 | 阶段衔接 | 松散独立，不阻断，status 命令运行时检测前置 | OpenSpec + 用户决策 |
| 3 | 技能注入 | bash preamble 调用 `specforge list --skills --triggers=...` 扫描 description 匹配 | gstack preamble + 用户决策 |
| 4 | 扩展机制 | 命令文件内嵌 bash preamble，无全局钩子文件 | 用户决策 |
| 5 | 头脑风暴位置 | 融合进 requirements 阶段（方案探索） | superpowers-zh brainstorming + 用户决策 |
| 6 | design 阶段定位 | 纯架构与技术设计（方案探索已前置到 requirements） | gstack + OpenSpec + 用户决策 |
| 7 | 规范文件流向 | brainstorming/ → changes/ → archive/，单向不回头合并 | 用户决策 |
| 8 | Frontmatter Schema | 统一 5 字段：name/type/description/version/author | 用户决策 |
| 9 | 命令/技能区分 | type 以 `-command` 结尾为命令层，否则为技能层 | 用户决策 |
| 10 | 命令子类型 | workflow-command（生命周期）+ tool-command（独立工具）+ 预留扩展 | 用户决策 |
| 11 | 融合策略 | 按阶段特性分别借鉴最佳匹配参考项目 | 用户决策 |

---

## 2. 总体架构

### 2.1 三层架构

```
┌──────────────────────────────────────────────┐
│  CLI 入口层 (specforge)                        │
│  Commander + 懒加载 + bash preamble 执行       │
├──────────────────────────────────────────────┤
│  命令系统 (.specforge/commands/)              │
│  9 个阶段命令，每个 type-name/type-name.md     │
│  内嵌 bash preamble → 技能注入 → 步骤执行      │
├──────────────────────────────────────────────┤
│  用户资产层 (specforge/)                      │
│  brainstorming/ → changes/ → archive/         │
│  单向流动，不回头合并                          │
└──────────────────────────────────────────────┘
```

### 2.2 完整目录结构

```text
<project-root>/
├── .specforge/                              # 框架资产（可更新不覆盖用户）
│   ├── constitution.md                      # 项目宪法（可选）
│   ├── commands/                            # 用户可调用命令（type 以 -command 结尾）
│   │   ├── workflow/                        # type: workflow-command（生命周期阶段）
│   │   │   ├── foundation-init/foundation-init.md
│   │   │   ├── requirements-clarify/requirements-clarify.md
│   │   │   ├── design-explore/design-explore.md
│   │   │   ├── planning-breakdown/planning-breakdown.md
│   │   │   ├── implementation-build/implementation-build.md
│   │   │   ├── quality-verify/quality-verify.md
│   │   │   ├── release-deploy/release-deploy.md
│   │   │   ├── operations-monitor/operations-monitor.md
│   │   │   └── evolution-retrospect/evolution-retrospect.md
│   │   └── tools/                           # type: tool-command（独立工具命令）
│   │       ├── debugging/debugging.md
│   │       └── documentation/documentation.md
│   ├── skills/                              # 上下文注入技能（type 不以 -command 结尾）
│   │   ├── domain-rules/
│   │   ├── code-styles/
│   │   ├── architecture/
│   │   ├── testing/
│   │   ├── security/
│   │   ├── ui-ux/
│   │   └── workflow-steps/
│   └── templates/                           # 全局模板（跨命令复用）
│
├── specforge/                               # 用户资产（更新不触碰）
│   ├── project.md                           # 项目上下文与概览
│   ├── context/                             # 术语/ADR/经验沉淀
│   ├── brainstorming/                       # 头脑风暴产物（源，不回头合并）
│   │   └── YYYY-MM-DD-TopicName.md
│   ├── changes/                             # 变更执行（进行态）
│   │   └── <YYYY-MM-DD-ChangeName>/
│   │       ├── .specforge.json
│   │       ├── PROPOSAL.md                  # requirements 产物
│   │       ├── DESIGN.md                    # design 产物
│   │       └── TASKS.md                     # planning 产物
│   └── archive/                             # 历史归档
│       └── <yyyy-mm>/<YYYY-MM-DD-ChangeName>/
```

### 2.3 数据流向

```
brainstorming/YYYY-MM-DD-Topic.md (源)
       │
       ▼
changes/<ChangeName>/                 (执行)
  ├── PROPOSAL.md                     ← requirements（需求澄清 + 方案探索）
  ├── DESIGN.md                       ← design（架构与技术设计）
  └── TASKS.md                        ← planning（小步骤任务拆解）
       │
       ▼
archive/<yyyy-mm>/<ChangeName>/       (归档)
```

关键约束：**单向流动，绝不回头合并**。brainstorming/ 是设计思考的源头，changes/ 是执行记录，change 完成后直接归档。

---

## 3. 统一 Frontmatter Schema

所有 `.md` 文件（命令、技能）统一使用 5 字段，通过 `type` 字段区分命令与技能。

### 3.1 统一 5 字段

```yaml
---
name: <kebab-case-identifier>    # 英文唯一标识符
type: <type-value>               # 类型（核心区分字段）
description: >-                  # 简短中文描述
  <用途与触发场景>
version: "1.0.0"               # 语义化版本号
author: "wta"                   # 作者标识
---
```

### 3.2 命令/技能区分规则

```
type 以 -command 结尾  →  命令层（用户 @.specforge/commands/... 调用）
type 不以 -command 结尾 →  技能层（CLI 扫描注入 AI 上下文）
```

CLI 一行代码即可判断：`type.endsWith('-command')`。新增任何命令类型无需改判断逻辑。

### 3.3 Type 值定义

**命令层：**

| type 值 | 含义 | 示例 name |
|---------|------|-----------|
| `workflow-command` | 生命周期阶段命令，按阶段顺序推进 | `design-explore`、`planning-breakdown` |
| `tool-command` | 独立工具命令，随时可调用，无产物输出 | `debugging`、`documentation` |
| `devflow-command` | （预留）其他开发流命令 | — |
| `gitflow-command` | （预留）Git 工作流命令 | — |

**技能层：**

| type 值 | 含义 | 示例 name |
|---------|------|-----------|
| `domain-rule` | 领域规则约束 | `ecommerce-order-rules` |
| `code-style` | 编码风格约定 | `typescript-naming` |
| `architecture-rule` | 架构决策记录 | `microservices-boundary` |
| `testing-rule` | 测试策略方法 | `api-test-strategy` |
| `security-rule` | 安全规范检查 | `sql-injection-prevention` |
| `ui-ux-rule` | 界面体验规范 | `mobile-adaptation` |
| `workflow-step` | 工作流步骤辅助 | `git-commit-template` |

### 3.4 命令 Frontmatter 示例

```yaml
---
name: design-explore
type: workflow-command
description: >-
  基于已批准方案进行严格的架构与技术设计。
version: "1.0.0"
author: "wta"
---
```

### 3.5 技能 Frontmatter 示例

```yaml
---
name: chinese-code-review
type: domain-rule
description: >-
  中文团队代码审查文化——用建议替代命令、提问替代否定。
  当收到代码审查反馈或审查他人代码时自动触发。
version: "1.0.0"
author: "wta"
---
```

### 3.6 头脑风暴产物 Frontmatter

```yaml
---
spec_id: "2026-05-04-notification-center"
title: "Notification Center 通知中心"
date: "2026-05-04"
status: draft                                 # draft | executing | completed
owner: "team-or-user"
source_command: ".specforge/commands/workflow/requirements-clarify/requirements-clarify.md"
tags:
  - notification
  - real-time
---
```

### 3.7 Change 元数据 `.specforge.json`

```json
{
  "changeId": "2026-05-04-NotificationCenter",
  "status": "draft",
  "phase": "proposal",
  "worktree": {
    "branch": "feature/notification-center",
    "rootPath": "/abs/path/to/worktree",
    "changePath": "specforge/changes/2026-05-04-NotificationCenter"
  },
  "artifacts": {
    "proposal": "PROPOSAL.md",
    "design": "DESIGN.md",
    "tasks": "TASKS.md"
  },
  "timestamps": {
    "createdAt": "2026-05-04T11:00:00+08:00",
    "updatedAt": "2026-05-04T11:20:00+08:00"
  }
}
```

`phase` 取值对应生命周期产物：
- `proposal` → requirements 阶段产出 PROPOSAL.md
- `design` → design 阶段产出 DESIGN.md
- `tasks` → planning 阶段产出 TASKS.md

---

## 4. CLI 命令全景图

### 4.1 命令列表

```
specforge
├── init [path]                 # foundation — 初始化双目录结构
├── add-command                 # 命令管理 — 创建命令文件
│     --type=<type>             #   命令类型（workflow-command | tool-command）
│     --name=<name>             #   命令名称（kebab-case）
├── add-skill                   # 技能管理 — 创建技能文件
│     --type=<type>             #   技能类型（domain-rule | code-style 等）
│     --name=<name>             #   技能名称（kebab-case）
├── list                        # 资产管理 — 列出命令/技能
│     --commands                #   仅列命令（type 以 -command 结尾）
│     --skills                  #   仅列技能（type 不以 -command 结尾）
│     --type=<t1,t2>            #   按具体 type 值筛选
│     --triggers=<k1,k2>        #   按触发词筛选（扫描 description）
│     --format=json             #   JSON 输出（preamble 用）
├── status                      # 状态查询 — 产物状态图（仅 workflow-command）
│     --phase=<name>            #   指定阶段
│     --check-requires          #   检查前置产物
│     --json                    #   机器可读
├── update [path]               # 框架更新 — 更新 .specforge/ 保留 specforge/
├── doctor                      # 诊断检查 — 结构完整性/兼容性
│     --check-deps              #   依赖检查
│     --check-node              #   Node 版本检查
│     --quiet                   #   精简输出（preamble 用）
└── help                        # 帮助信息
```

### 4.2 CLI 源码结构扩展

```
src/
├── cli/index.ts               # + status 命令注册，add-phase 改为 add-command
├── commands/
│   ├── init.ts | add-command.ts | add-skill.ts
│   ├── list.ts | update.ts | doctor.ts
│   └── status.ts              # 新增 — 产物状态检测（仅 workflow-command）
├── core/
│   ├── constants.ts           # type 值常量定义
│   ├── lifecycle-types.ts
│   ├── metadata-schema.ts     # 简化为 5 字段 Zod Schema
│   ├── compatibility.ts
│   └── preamble.ts            # 新增 — bash preamble 解析与执行
├── services/
│   ├── scaffold-service.ts | command-service.ts
│   ├── skill-service.ts | listing-service.ts
│   ├── update-service.ts
│   └── status-service.ts      # 新增 — 产物状态依赖检测
```

### 4.3 bash preamble 执行模式

每个命令 .md 文件开头嵌入 bash 代码块，CLI 执行时解析并运行：

```markdown
---
name: design-explore
type: workflow-command
description: >-
  基于已批准方案进行严格的架构与技术设计。
version: "1.0.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入 — 通过触发词匹配技能（扫描 description 字段）
specforge list --skills --triggers=architecture,comparison,design --format=json

# 前置产物检测（松散提醒，仅 workflow-command 生效）
specforge status --phase=design --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->

# 命令正文开始...

## Step 1: 准备上下文
...
```

**执行流程**：

```
用户触发: @.specforge/commands/workflow/design-explore/design-explore.md
                │
                ▼
┌──────────────────────────────────┐
│ 1. CLI 读取命令 .md 文件          │
│    - 解析 YAML Frontmatter        │
│    - 提取 <!-- preamble:bash --> │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│ 2. 执行 preamble bash 脚本        │
│    ┌─────────────────────────┐   │
│    │ specforge list          │   │
│    │   --skills              │   │
│    │   --triggers=...        │   │
│    │   --format=json         │   │
│    └──────────┬──────────────┘   │
│               │ stdout JSON       │
│               ▼                   │
│    ┌─────────────────────────┐   │
│    │ specforge status        │   │
│    │   --phase=design       │   │
│    │   --check-requires      │   │
│    └──────────┬──────────────┘   │
│               │ 前置产物就绪?      │
│               ▼                   │
│    ┌─────────────────────────┐   │
│    │ specforge doctor        │   │
│    │   --check-deps --quiet  │   │
│    └─────────────────────────┘   │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│ 3. 注入技能列表到 AI 上下文       │
│    "检测到以下匹配技能：           │
│     - architecture/xxx            │
│     - code-styles/yyy             │
│     是否加载？[Y/n]"             │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│ 4. AI 按命令正文步骤执行          │
│    Step 1 → Step 2 → Step 3 →   │
│    Step 4: 生成产物 + 衔接提示    │
└──────────────────────────────────┘
```

### 4.4 status 命令输出示例

```bash
$ specforge status --phase=design --check-requires

  阶段: design (架构与技术设计)

  前置产物:
  ✓ requirements-clarify → .../PROPOSAL.md (done)
  ⚠ foundation-init → .specforge/commands/... (not found, 可跳过)

  当前阶段产物:
  ○ DESIGN.md — 未生成

  建议: 前置产物就绪，可以执行 design-explore 命令
```

---

## 5. 9 阶段详细设计

### 阶段融合矩阵

| 阶段 | 核心借鉴项目 | 关键机制 |
|------|-------------|---------|
| foundation | OpenSpec init + spec-kit constitution + gstack preamble | 双目录搭建、宪法生成、Profile 选择 |
| requirements | spec-kit specify/clarify + grill-me 12视角 + superpowers-zh brainstorming + OpenSpec proposal | 需求澄清分类法、多视角提问、方案对比2-3个、用户批准门禁、驳斥草案法 |
| design | gstack plan-eng/design/devex-review + OpenSpec design + spec-kit constitution check | 多视角技术审查(0-10打分)、接口契约、数据流、宪法合规 |
| planning | superpowers-zh writing-plans + claude-task-master + OpenSpec DAG + spec-kit tasks | 文件结构先行、小步骤(2-5分钟)、禁止占位符、复杂度分析、依赖编排、规格覆盖自检 |
| implementation | superpowers-zh subagent/TDD + OpenSpec apply + spec-kit implement | 三层子代理审查、TDD 红-绿-重构、宪法门禁 |
| quality | gstack qa/review + OpenSpec verify + spec-kit checklist/analyze + superpowers-zh verification | 三层QA、7专家并行审查、三维验证、Iron Law无证据禁止声称完成 |
| release | gstack ship + OpenSpec archive + superpowers-zh finishing | 发布流、CHANGELOG、归档、worktree清理 |
| operations | superpowers-zh worktrees/mcp-builder + spec-kit taskstoissues | 隔离环境、运维工具、外部系统关联 |
| evolution | superpowers-zh writing-skills + gstack plan-tune/skillify + OpenSpec onboard | TDD迭代技能、自调优、流程固化、经验沉淀 |

---

### 5.1 foundation — 项目初始化与宪法基线

**命令文件**：`.specforge/commands/workflow/foundation-init/foundation-init.md`

**bash preamble**：
```bash
specforge doctor --check-node
specforge doctor --check-compat
```

**步骤流程**：

1. **项目上下文采集** — 技术栈盘点、抽象层级识别、现有约束梳理
2. **生成双目录结构** — `.specforge/`（框架资产）+ `specforge/`（用户资产）
3. **生成 project.md** — 项目元数据（YAML Frontmatter + 正文）
4. **宪法初始化（可选）** — 交互式问卷生成 `.specforge/constitution.md`
   - 语义化版本（MAJOR/MINOR/PATCH）
   - 修改原则时需记录 Sync Impact Report
5. **Profile 选择** — `minimal`（快速原型）/ `standard`（全9阶段，默认）/ `custom`（自选）
6. **完成衔接** → requirements-clarify

**产物**：
- `.specforge/` 完整目录树
- `specforge/project.md`
- `specforge/brainstorming/`（空目录）
- `specforge/changes/`（空目录）
- `specforge/archive/`（空目录）
- `.specforge/constitution.md`（可选）

---

### 5.2 requirements — 需求澄清 + 方案探索

**命令文件**：`.specforge/commands/workflow/requirements-clarify/requirements-clarify.md`

**bash preamble**：
```bash
specforge list --skills --triggers=clarify,specify,brainstorm,requirements --format=json
specforge status --phase=requirements --check-requires
specforge doctor --check-deps --quiet
```

**步骤流程**：

1. **加载上下文** — 读取 brainstorming/ 下相关文档（如有），扫描代码库结构，识别既有约束
2. **需求澄清**（借鉴 spec-kit clarify 分类法 + grill-me 12视角）：
   - 功能范围、领域与数据模型、交互与UX、非功能质量、集成与依赖、边界情况
   - 静默使用多视角提问（第一性原理、约束暴露、隐藏假设、事前验尸、钢铁人反论）
   - 最多5个 `[NEEDS CLARIFICATION]` 标记
3. **方案探索**（借鉴 superpowers-zh brainstorming 9步法）：
   - 理解用户意图与期望结果
   - 提出 2-3 种可行方案（每个方案：思路/关键决策/适用场景/trade-off）
   - 展示对比矩阵 + 给出推荐理由
4. **方案批准 HARD-GATE** — 未批准则循环回步骤3调整；模糊反馈时使用**驳斥草案法**（先产生具体方案让用户批判）
5. **创建 change 目录** — `specforge/changes/<YYYY-MM-DD-ChangeName>/` + `.specforge.json`
6. **生成 PROPOSAL.md** — Why（动机）/ What Changes（变更范围）/ Approach（已批准方案）/ Alternatives Considered（方案对比表）/ Capabilities（能力列表）/ Impact（影响评估）
7. **完成衔接** → design-explore

**Iron Law**：
> 禁止在方案批准前进入任何实现或详细设计。反驳："先写着代码，方案后面再定" → 99% 的方案文档永远不会被补上。

**产物**：
- `specforge/changes/<YYYY-MM-DD-ChangeName>/`（新目录）
- `.specforge.json`（phase: proposal）
- `PROPOSAL.md`（含需求澄清 + 方案探索 + 已批准方案）

---

### 5.3 design — 架构与技术设计

**命令文件**：`.specforge/commands/workflow/design-explore/design-explore.md`

**bash preamble**：
```bash
specforge list --skills --triggers=architecture,design,interface,contract --format=json
specforge status --phase=design --check-requires
specforge doctor --check-deps --quiet
```

**步骤流程**：

1. **加载 PROPOSAL.md** — 获取已批准方案
2. **多视角技术审查**：
   - 工程视角（架构/数据流/边界/性能）— 借鉴 gstack plan-eng-review
   - 设计视角（组件/接口/交互一致性，0-10打分）— 借鉴 gstack plan-design-review
   - 开发者体验（API易用性/调试友好/文档）— 借鉴 gstack plan-devex-review
3. **宪法合规检查** — 如 `.specforge/constitution.md` 存在，设计方案须通过宪法检查
4. **生成 DESIGN.md**：
   - Architecture Overview（架构总览）
   - Component / Module Design（组件/模块设计）
   - Data Flow（数据流）
   - Interface Definitions（API/数据结构契约）
   - Error Handling Strategy
   - Testing Strategy
   - Key Decisions & Trade-offs（关键决策记录）
   - Files/Directories Involved（涉及文件清单）
   - DevEx Assessment（开发者体验评估）
5. **完成衔接** → planning-breakdown

**Iron Law**：
> 设计必须包含接口契约和错误处理策略。没有契约的设计不是设计，是草图。

**产物**：
- `specforge/changes/<ChangeName>/DESIGN.md`
- `.specforge.json` 更新（phase: design）

---

### 5.4 planning — 任务拆解与依赖编排

**命令文件**：`.specforge/commands/workflow/planning-breakdown/planning-breakdown.md`

**bash preamble**：
```bash
specforge list --skills --triggers=tasks,breakdown,planning,complexity --format=json
specforge status --phase=planning --check-requires
specforge doctor --check-deps --quiet
```

**步骤流程**：

1. **加载 DESIGN.md** — 读取架构设计、接口契约、文件清单
2. **范围检查**（借鉴 writing-plans）— 如 DESIGN.md 涵盖多个独立子系统，建议拆分为独立计划；每个计划应能独立产出可工作、可测试的软件
3. **文件结构先行**（借鉴 writing-plans）— 拆任务前先锁定文件清单和职责：
   - 创建：`exact/path/to/new-file.ts`
   - 修改：`exact/path/to/existing.ts:42-68`
   - 测试：`tests/exact/path/to/test.ts`
   - 设计原则：每个文件一个职责、一起变更的文件放在一起、优先小而专注的文件
4. **小步骤任务拆解**（借鉴 writing-plans + spec-kit tasks）— 每步2-5分钟：
   - "编写失败的测试" → "运行测试确认失败" → "实现最少代码" → "运行测试确认通过" → "Commit"
   - 按阶段组织：Setup → Foundational → User Stories(P1/P2/P3) → Polish
5. **复杂度分析**（借鉴 claude-task-master）— 评估每个任务的复杂度，标记高复杂度任务推荐拆解
6. **依赖编排**（借鉴 OpenSpec DAG）— 标注前置依赖、标记可并行任务 [P]、计算推荐执行顺序
7. **禁止占位符扫描**（借鉴 writing-plans）— 检查并修复6种"计划缺陷"：
   - ✗ "待定"/"TODO"/"后续实现"
   - ✗ "添加适当的错误处理"（没有具体方式）
   - ✗ "为上述代码编写测试"（没有实际测试）
   - ✗ "类似任务N"（重复代码引用）
   - ✗ 只描述做什么不展示怎么做
   - ✗ 引用未定义的类型/函数/方法
8. **生成 TASKS.md** — 每个任务包含精确文件路径、完整代码块、精确命令和预期输出
9. **规格覆盖自检**（借鉴 writing-plans self-check）— 对照 DESIGN.md 逐需求核对、类型一致性检查、内联修复
10. **执行交接** — "计划已完成。两种方式：①子代理驱动(推荐) ②内联执行"
11. **完成衔接** → implementation-build

**产物**：
- `specforge/changes/<ChangeName>/TASKS.md`（已通过占位符扫描 + 规格覆盖自检）
- `.specforge.json` 更新（phase: tasks, status: executing）

---

### 5.5 implementation — 子代理驱动开发

**命令文件**：`.specforge/commands/workflow/implementation-build/implementation-build.md`

**bash preamble**：
```bash
specforge list --skills --triggers=implement,subagent,tdd,build --format=json
specforge status --phase=implementation --check-requires
specforge doctor --check-deps --quiet
```

**步骤流程**：

1. **加载 TASKS.md + DESIGN.md**
2. **宪法门禁**（借鉴 spec-kit implement）— 检查计划是否符合宪法原则，未通过则终止
3. **按依赖顺序 + 并行标记执行任务** — 对每个待执行任务：
   - ① 派发 implementer 子代理：读取任务→TDD(先写失败测试)→实现最少代码→提交
   - ② 派发 spec-reviewer 子代理：检查实现是否符合 DESIGN.md，报告 PASS/NEEDS_FIX/NEEDS_DESIGN_UPDATE
   - ③ 派发 code-quality 子代理：风格/安全/性能/可维护，Critical→立即修复，Important→继续前修复，Minor→记录
   - ④ 修复反馈 + 标记任务 [x]
4. **阶段收尾检查** — 所有 P0/P1 任务 [x]？测试全部通过？无残留 Critical 反馈？
5. **完成衔接** → quality-verify

**Iron Laws**：
> 禁止在测试之前编写生产代码。必须先有失败的测试才能写实现。
>
> 禁止跳过子代理三层审查。实现完成只是开发的一半。

**产物**：代码变更（在 git worktree 中）、任务复选框全部标记 [x]、`.specforge.json` 更新

---

### 5.6 quality — 测试、审查、验证闭环

**命令文件**：`.specforge/commands/workflow/quality-verify/quality-verify.md`

**bash preamble**：
```bash
specforge list --skills --triggers=verify,test,review,checklist,qa --format=json
specforge status --phase=quality --check-requires
specforge doctor --check-deps --quiet
```

**步骤流程**：

1. **加载所有产物** — PROPOSAL + DESIGN + TASKS
2. **生成质量检查清单**（借鉴 spec-kit checklist）— 交互询问深度（Quick/Standard/Exhaustive）
3. **分层测试验证**（借鉴 gstack qa）：
   - Quick: 关键路径 + 高优先级测试
   - Standard: + 中等优先级 + 回归测试
   - Exhaustive: + 外观 + 边界 + 压力测试
4. **三维验证**（借鉴 OpenSpec verify）：
   - Completeness — 所有 P0/P1 任务完成？所有接口实现？
   - Correctness — 测试通过？规格符合？边界覆盖？
   - Coherence — 代码与设计一致？产物间无矛盾？
5. **并行专家审查**（借鉴 gstack review）— 7 个子代理并发：security / testing / performance / api-contract / data-migration / maintainability / red-team
6. **修复循环** — Critical → 立即修复；Important → 修复后重审；Minor → 记录不阻断
7. **生成 QUALITY-REPORT.md**
8. **完成衔接** → release-deploy

**Iron Law**（借鉴 superpowers-zh verification-before-completion）：
> 无新验证证据，禁止声称完成。不计为验证证据的：linter通过、agent说成功、上次验证过、改动太小。验证证据必须是：你亲自运行的测试命令输出 PASS。

**产物**：`specforge/changes/<ChangeName>/QUALITY-REPORT.md`、`.specforge.json` 更新

---

### 5.7 release — 发布、部署与归档

**命令文件**：`.specforge/commands/workflow/release-deploy/release-deploy.md`

**bash preamble**：
```bash
specforge list --skills --triggers=release,deploy,ship,publish --format=json
specforge status --phase=release --check-requires
specforge doctor --check-deps --quiet
```

**步骤流程**：

1. **发布前验证** — 确认 QUALITY-REPORT.md Gate = PASS，无残留 Critical/Important 反馈，未通过则阻断
2. **发布准备**（借鉴 gstack ship）— 检测/合并基分支、运行完整测试、审查 diff、确定版本号(semver)、更新 CHANGELOG
3. **执行发布** — 提交 CHANGELOG+版本号、创建 tag、推送到远程、创建 PR
4. **分支收尾**（借鉴 superpowers-zh finishing）— 4选项：①本地合并 ②推送+PR ③保持 ④丢弃
5. **归档**（借鉴 OpenSpec archive）— 移动 change 到 `archive/<yyyy-mm>/<ChangeName>/`、更新 status→completed、清理 worktree
6. **完成衔接** → operations-monitor 或 evolution-retrospect

**产物**：CHANGELOG 更新、Git tag、`archive/<yyyy-mm>/<ChangeName>/`、`.specforge.json` 更新

---

### 5.8 operations — 运行监控与运维

**命令文件**：`.specforge/commands/workflow/operations-monitor/operations-monitor.md`

**bash preamble**：
```bash
specforge list --skills --triggers=monitor,operations,deploy,runbook --format=json
specforge status --phase=operations --check-requires
specforge doctor --check-deps --quiet
```

**步骤流程**：

1. **部署确认** — 检查部署状态、确认环境变量与配置、验证健康检查端点
2. **监控配置** — 设置告警规则、配置日志收集、建立回滚触发条件
3. **运维工具集成**（借鉴 superpowers-zh mcp-builder）— 生成运维 MCP 工具（如需要）、关联外部系统（GitHub Issues/Linear）、配置通知渠道
4. **生成运维手册 OPS-RUNBOOK.md**（可选）
5. **完成衔接** → evolution-retrospect

**产物**：`specforge/changes/<ChangeName>/OPS-RUNBOOK.md`（可选）、外部系统关联

---

### 5.9 evolution — 复盘、沉淀、归档

**命令文件**：`.specforge/commands/workflow/evolution-retrospect/evolution-retrospect.md`

**bash preamble**：
```bash
specforge list --skills --triggers=retrospective,learn,improve,evolve,tune --format=json
specforge status --phase=evolution --check-requires
specforge doctor --check-deps --quiet
```

**步骤流程**：

1. **复盘收集** — 回顾完整流程(brainstorming→change→archive)、识别摩擦点、收集经验数据、评估产物质量
2. **经验沉淀**（借鉴 gstack skillify）— 识别可固化模式→技能模板、识别可固化流程→技能、记录到 `specforge/context/`（glossary.md / adr/ / learnings.md）
3. **技能优化**（借鉴 superpowers-zh writing-skills TDD）— 基线测试→差距分析→编写→压力测试→堵漏洞→重验证
4. **调优**（借鉴 gstack plan-tune）— 调整问题敏感度、调整阶段启用、写入配置
5. **生成复盘报告 RETROSPECTIVE.md**
6. **完成** — 循环闭合，下一 change 应用优化后的技能和配置

**产物**：`specforge/changes/<ChangeName>/RETROSPECTIVE.md`、`specforge/context/learnings.md`（追加）、可固化的技能文件（按需）

---

## 6. 技能系统

### 6.1 技能 Type 值（共 7 类）

| type 值 | 目录 | 用途 | 借鉴来源 |
|---------|------|------|---------|
| `domain-rule` | `.specforge/skills/domain-rules/` | 领域规则与业务逻辑约束 | superpowers-zh |
| `code-style` | `.specforge/skills/code-styles/` | 编码风格与约定 | skills-main |
| `architecture-rule` | `.specforge/skills/architecture/` | 架构决策与模式 | gstack |
| `testing-rule` | `.specforge/skills/testing/` | 测试策略与方法 | superpowers-zh TDD |
| `security-rule` | `.specforge/skills/security/` | 安全规范与检查 | gstack review |
| `ui-ux-rule` | `.specforge/skills/ui-ux/` | 用户界面与体验 | skills-main |
| `workflow-step` | `.specforge/skills/workflow-steps/` | 工作流步骤辅助 | spec-kit |

### 6.2 技能组织模式

```text
.specforge/skills/
├── <category>/
│   ├── <skill-name>/           # 目录模式（推荐）
│   │   ├── SKILL.md
│   │   ├── references/         # 按需加载的参考文档
│   │   └── templates/          # 输出模板
│   └── <skill-name>.md         # 单文件模式（兼容）
```

### 6.3 技能注入流程

1. 命令 bash preamble 调用 `specforge list --skills --triggers=yyy --format=json`
2. CLI 扫描 `.specforge/skills/` 下所有技能的 Frontmatter
3. 用 `--triggers` 关键词匹配技能的 `description` 字段
4. 返回 JSON 格式的匹配技能列表
5. AI 上下文获得技能清单，询问用户是否加载
6. 用户确认后，将匹配的 SKILL.md 内容注入当前会话

### 6.4 技能示例

**中文代码审查技能**（借鉴 superpowers-zh chinese-code-review）：

```markdown
---
name: chinese-code-review
type: domain-rule
description: >-
  中文团队代码审查文化——用建议替代命令、提问替代否定。
  当收到代码审查反馈或审查他人代码时自动触发。
version: "1.0.0"
author: "wta"
---

# 中文代码审查规范

## 三级标注
- [必须修复] — 影响功能或安全，必须改
- [建议修复] — 改进点，不强制
- [供参考] — 可选优化建议

## 沟通原则
- 用"建议"替代"命令"：❌"改成X" → ✅"建议改成X，因为..."
- 用"提问"替代"否定"：❌"这样不对" → ✅"考虑过Y方案吗？"
- 每条建议附带理由和代码示例
```

---

## 7. 治理护栏与质量门禁

### 7.1 宪法治理（借鉴 spec-kit constitution）

`.specforge/constitution.md` 作为不可协商的治理文档。每个计划需通过宪法检查。

```markdown
---
version: "1.0.0"
date: "2026-05-04"
principles:
  - id: P1
    statement: "测试优先 — 生产代码前必须有失败测试"
    source: superpowers-zh TDD iron-law
  - id: P2
    statement: "复用优先 — 新增代码前先检索已有实现"
    source: SpecForge B5 护栏
  - id: P3
    statement: "契约先行 — 设计必须包含接口定义和错误处理"
    source: SpecForge design iron-law
  - id: P4
    statement: "渐进式加载 — 上下文可控，避免一次性注入过载"
    source: skills-main progressive disclosure
---
```

### 7.2 6 大治理护栏（GR）

| 护栏 | 名称 | 描述 |
|------|------|------|
| B1 | 入场扫描 | 技术栈/抽象盘点 |
| B2 | 架构对齐 | 明确复用与新引入边界 |
| B3 | 边界约束 | read/write 范围声明与越界阻断 |
| B4 | 破坏性门槛 | 公共接口/大删改先引用图再确认 |
| B5 | 复用优先 | 先检索再新增 |
| B6 | 视觉语汇对齐 | 前端场景强制视觉一致性检查 |

### 7.3 Iron Laws 总览（借鉴 superpowers-zh）

| Iron Law | 适用阶段 | 来源 |
|----------|---------|------|
| 禁止在方案批准前进入实现或详细设计 | requirements | superpowers-zh brainstorming HARD-GATE |
| 设计必须包含接口契约和错误处理策略 | design | SpecForge |
| 禁止占位符——TASKS.md 每步必须包含实际代码和命令 | planning | superpowers-zh writing-plans |
| 禁止在测试之前编写生产代码 | implementation | superpowers-zh TDD |
| 禁止跳过子代理三层审查 | implementation | superpowers-zh subagent-driven-dev |
| 无新验证证据禁止声称完成 | quality | superpowers-zh verification-before-completion |
| 无 PASS 的质量门禁禁止发布 | release | gstack ship |

### 7.4 反规避语言（借鉴 superpowers-zh）

针对常见借口的预反驳：
- "这次很简单，不需要X" → 简单代码也会出错，小改动引起的回归是最常见的线上事故
- "我先做Y，后面补X" → 99%的情况下X不会被补上
- "linter通过了" → linter不管逻辑对错，不是验证证据
- "agent说成功了" → agent经常在失败时声称成功，必须亲自运行验证命令

---

## 8. 非功能需求（NFR）

| # | 需求 | 指标 |
|---|------|------|
| NFR-1 | 可移植性 | macOS/Linux/Windows |
| NFR-2 | 离线可用 | 核心命令不依赖网络 |
| NFR-3 | 轻量性 | init < 3s, list < 1s |
| NFR-4 | 上下文可控 | 技能渐进式加载，不超过3级 |
| NFR-5 | 可维护性 | update 安全保留用户资产 |
| NFR-6 | 可审计性 | 需求→设计→实现→测试→复盘链路可追踪 |

---

## 9. 技术栈

| 类别 | 选型 | 版本约束 |
|------|------|---------|
| Runtime | Node.js | >= 24.14.1 |
| Package Manager | pnpm | >= 10.33.0 |
| Language | TypeScript | 5.6.x |
| CLI Framework | commander | 14.0.1 |
| File Operations | fs-extra | 11.3.2 |
| Terminal Output | chalk | 5.6.2 |
| Interactive Input | inquirer | 12.9.6 |
| YAML Processing | js-yaml | 4.1.0 |
| File Matching | globby | 14.1.0 |
| Schema Validation | zod | 4.1.5 |
| Testing | vitest | 2.1.8 |

---

## 10. 实现优先级建议

### Phase 1：核心引擎 + Type 体系（P0）
1. Frontmatter Schema 精简为 5 字段（`metadata-schema.ts` 重构）
2. Type 值常量定义与 `endsWith('-command')` 判断逻辑
3. `status` 命令（产物状态检测 + 前置依赖检查，仅对 workflow-command）
4. `preamble.ts` 核心模块（bash preamble 解析与执行）
5. 重构 `list` 命令（`--commands/--skills/--type/--triggers/--format=json`）
6. `add-phase` 重命名为 `add-command`，支持 `--type` 参数

### Phase 2：工作流命令模板（P1）
7. `requirements-clarify` 命令模板（5 字段 frontmatter + 新 preamble）
8. `design-explore` 命令模板
9. `planning-breakdown` 命令模板
10. `implementation-build` 命令模板

### Phase 3：工具命令 + 质量交付（P2）
11. `debugging` tool-command 模板（参考 systematic-debugging）
12. `documentation` tool-command 模板（参考 chinese-documentation）
13. `quality-verify` 命令模板
14. `release-deploy` 命令模板
15. Constitution 治理支持（`constitution.md` 生成/检查）

### Phase 4：运维与演进（P3）
16. `operations-monitor` 命令模板
17. `evolution-retrospect` 命令模板
18. 经验积累引擎（learnings.jsonl 等）

---

## 11. 验收标准

- [ ] 所有 .md 文件 Frontmatter 统一为 name/type/description/version/author 5 字段
- [ ] type 以 `-command` 结尾为命令，否则为技能，CLI 可正确区分
- [ ] `specforge list --commands` 列出所有命令
- [ ] `specforge list --skills` 列出所有技能
- [ ] `specforge list --type=xxx` 支持按具体 type 值筛选
- [ ] `specforge list --skills --triggers=xxx --format=json` 通过扫描 description 匹配触发词
- [ ] `specforge status` 仅对 workflow-command 执行产物依赖检测
- [ ] `add-command --type=xxx --name=yyy` 替代原 `add-phase`，支持所有命令类型
- [ ] 目录结构包含 `commands/workflow/`、`commands/tools/`、`skills/`
- [ ] debugging、documentation 作为 tool-command 可正常调用
- [ ] `.specforge/` 仅承载框架能力资产（commands/skills/templates）
- [ ] 项目持久化资产仅落在 `specforge/` 根下
- [ ] `specforge/brainstorming` 为独立目录，与 changes 单向流动不回头合并
- [ ] `specforge/changes` 下目录命名均为 `<YYYY-MM-DD-ChangeName>/`
- [ ] 每个 change 目录包含 `.specforge.json`，含 status/phase/worktree 定位字段
- [ ] change 工件按命令阶段逐步生成（PROPOSAL→DESIGN→TASKS）
- [ ] 技能注入通过 bash preamble 中的 `specforge list --skills --triggers=...` 自动化完成
- [ ] CLI 技术结构与版本清单可直接指导实现与发布

---

## 12. 融合来源索引

| 借鉴项目 | 融合进 SpecForge 的设计点 |
|---------|------------------------|
| **OpenSpec** | 双目录模型、产物依赖图(DAG)、status 命令、懒加载 CLI、Profile 系统、archive 归档机制 |
| **gstack** | bash preamble 注入、多视角技术审查(eng/design/devex)、三层 QA(Quick/Standard/Exhaustive)、7 专家并行审查、ship 发布流、plan-tune 调优、skillify 流程固化 |
| **superpowers-zh** | Iron Laws 铁律、HARD-GATE 硬性门禁、反规避语言、方案探索(9步brainstorming)、方案对比(2-3)、驳斥草案法、子代理三层审查(implementer/spec-reviewer/code-quality)、TDD 红-绿-重构、verification-before-completion、writing-plans 小步骤粒度+禁止占位符+规格覆盖自检、writing-skills TDD迭代技能 |
| **spec-kit** | constitution 宪法治理、Syn Impact Report、需求澄清分类法(6维度)、用户故事模板(P1/P2/P3)、checklist 质量门禁、analyze 跨产物一致性、handoffs 衔接图、taskstoissues 外部关联 |
| **claude-task-master** | 复杂度分析、推荐子任务数量、Handlebars 条件模板思路 |
| **grill-me** | 12 视角提问框架（静默使用）、驳斥草案法、反过早收敛（多问3个问题）、结构化会话日志 |
| **skills-main** | 渐进式信息披露(3级加载)、技能目录标准结构、skill-creator 技能创建方法、description 作为触发机制 |
