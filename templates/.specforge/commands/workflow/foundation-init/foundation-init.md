---
name: foundation-init
type: workflow-command
description: >-
  项目初始化与宪法基线——搭建双目录结构、采集项目上下文、可选宪法制定、Profile 选择。
  触发场景：新项目启动、"初始化 SpecForge"、"搭建项目工作流"。
version: "1.0.0"
author: "wta"
---

<!-- preamble:bash
# 环境检测
specforge doctor --check-node
specforge doctor --check-compat
-->

<!-- route-statement
路由：foundation-init
Change-ID：{{changeId}}
已加载：
  - foundation-init.md (本文件)
未加载（后续按需）：
  - references/handoffs.md（预算 30 行）
  - references/phase-mapping.md（预算 25 行）
第一动作：检查项目是否已初始化，采集项目上下文
Token 预算估算：约 3000 tokens
-->

# 项目初始化与宪法基线

## Iron Law

> **禁止在未理解项目上下文前搭建结构。** 先盘点再动手。

---

## Step 1: 项目上下文采集

**目标**：全面理解项目现状，避免盲建。

### 1.1 技术栈盘点
- 编程语言与版本
- 主要框架与依赖
- 包管理器（npm/pnpm/yarn/maven）
- 构建工具与配置
- 测试框架

### 1.2 抽象层级识别
- 当前代码属于哪个抽象层级？（基础设施/领域模型/应用服务/用户界面）
- 已有架构模式？（MVC/微服务/单体/事件驱动）

### 1.3 现有约束梳理
- 团队规模与协作方式
- CI/CD 流程
- 部署环境与平台
- 合规或安全要求

### 1.4 Brownfield 探测

> 如果根目录至少存在一份主流清单文件（`package.json` / `pom.xml` / `Cargo.toml` / `go.mod` / `pyproject.toml`）且 `src/**/*.{ts,js,py,go,java,rs}` 匹配文件数 > 5，则判定为 **brownfield**（既有项目）。

**brownfield 场景处理**：
- 提示用户运行 `specforge project-inventory` 进行入场扫描
- 入场扫描将生成 `specforge/context/inventory.md`，覆盖技术栈 / 命名约定 / 既有抽象索引 / 禁动清单 / AI 文档 / 目录结构 / 测试框架 7 类信号
- 后续 `design-explore` 将在 Step 1.5 强制输出既有架构观察报告

**greenfield 场景**：跳过入场扫描，直接进入 Step 2。

---

## Step 2: 生成双目录结构

**目标**：创建 `.specforge/`（框架资产）+ `specforge/`（用户资产）两层目录。

### 2.1 框架资产 `.specforge/`
```
.specforge/
├── commands/workflow/   # 生命周期阶段命令（9个）
├── commands/tools/      # 独立工具命令
├── skills/              # 上下文注入技能（7类）
│   ├── domain-rules/
│   ├── code-styles/
│   ├── architecture/
│   ├── testing/
│   ├── security/
│   ├── ui-ux/
│   └── workflow-steps/
└── templates/           # 全局模板
```

### 2.2 用户资产 `specforge/`
```
specforge/
├── config.yaml          # 项目级机器源（context / rules / errors）
├── project.md           # 项目上下文与概览（人类可读，可选但推荐）
├── brainstorming/       # 头脑风暴产物（源，不回头合并）
├── context/             # 术语/ADR/经验沉淀
├── changes/             # 变更执行（进行态）
└── archive/             # 历史归档
```

约束：`.specforge/` 可由 `specforge update` 安全更新；`specforge/` 完全由用户管理，框架绝不触碰。

---

## Step 3: 生成 project.md

**目标**：创建项目元数据文件，作为所有后续阶段的上下文基础。

```yaml
---
name: <项目名称>
description: <一句话描述>
language: <主要编程语言>
framework: <主要框架>
packageManager: <npm|pnpm|yarn>
version: "0.1.0"
createdAt: "<YYYY-MM-DD>"
---
```

正文部分包含：
- 项目目标与愿景
- 技术栈详情
- 架构概览
- 团队与协作方式
- 外部依赖与集成

同时，确保 `specforge/config.yaml` 存在并补齐：
- `context`：项目真实上下文（技术栈、约束、术语入口）
- `rules`：项目级可执行规则（可覆盖框架默认）
- `errors`：项目特定错误沉淀入口

---

## Step 4: 宪法初始化（可选）

**目标**：制定项目不可协商的治理原则。如不需要可跳过，后续通过 `specforge add-command` 创建自定义命令时会提示。

### 4.1 交互式问卷

逐条询问并记录治理原则，每条原则包含：
- **id**: P1, P2, P3... 唯一编号
- **statement**: 一句话原则声明
- **rationale**: 为什么这条原则重要
- **source**: 来源（团队约定 / 线上事故教训 / 行业最佳实践）

将可执行条款同步沉淀到 `.specforge/config.yaml` / `specforge/config.yaml` 的 `rules`，确保后续阶段可以引用统一机器源。

### 4.2 宪法版本管理

- 使用语义化版本（MAJOR/MINOR/PATCH）
- 修改原则时记录 Sync Impact Report
- MAJOR：移除或根本性重定义原则
- MINOR：新增原则或实质性扩展
- PATCH：澄清措辞、修正错别字

宪法存储在 `.specforge/constitution.md`，是所有后续阶段的质量门禁依据。

---

## Step 5: Profile 选择

**目标**：确定项目使用的阶段范围。

| Profile | 包含阶段 | 适用场景 |
|---------|---------|---------|
| `minimal` | foundation → requirements → implementation → quality → release | 快速原型、概念验证 |
| `standard` | foundation → requirements → design → planning → implementation → quality → release → evolution | 正式项目（推荐） |
| `custom` | 用户自选阶段组合 | 有特殊流程需求 |

选择 `custom` 时，交互式勾选需要的阶段。

---

## Step 6: 完成衔接

**产物**：
- `.specforge/` 完整目录树（含命令模板和示例技能）
- `specforge/project.md` — 项目上下文与概览
- `specforge/config.yaml` — 项目级机器源（context / rules / errors）
- `specforge/brainstorming/` — 头脑风暴产物目录（空）
- `specforge/changes/` — 变更执行目录（空）
- `specforge/archive/` — 历史归档目录（空）
- `.specforge/constitution.md` — 宪法文件（如选择创建）

**下一步**：
- 如有具体功能需求 → 执行 `requirements-clarify` 命令
- 如需先探索想法 → 在 `specforge/brainstorming/` 中创建头脑风暴文档
- 如需制定架构决策 → 先完善 `specforge/project.md` 中的技术栈详情

---

## 长会话清窗协议

> **清窗协议**：当检测到清窗触发信号（token > 50k / 连续失败 ≥ 2 / 复读迹象 / 用户感觉打转）时，
> 加载 `context-reset-protocol` skill 并按其流程执行。
> 详见：`.specforge/skills/workflow-steps/context-reset-protocol/SKILL.md`

初始化流程可能因项目规模较大而耗时较长，AI 代理应在执行过程中关注上下文健康状态。若触发清窗信号，须按协议落盘 PROGRESS 后再重启会话。

---

## 常见阻断与纠偏（errors 引用）

- **E001_missingPrerequisiteArtifact**：如果初始化未产出 `specforge/config.yaml` 或用户资产目录不完整，先修复脚手架再进入 requirements。
- **E005_contextOverload**：如果宪法或技能文档开始膨胀，把长内容移动到 `references/`，保持渐进式披露。

---

## 反规避提醒

| 借口 | 现实 |
|------|------|
| "先写代码，项目结构后面再搭" | 99% 的项目结构文档永远不会被补上 |
| "这个项目太小，不需要宪法" | 小项目的技术债务往往因为没有约束而失控 |
| "Profile 选 minimal 就行，后面再加" | 从未有人在项目中途从 minimal 升级到 standard |
