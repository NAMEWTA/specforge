# CLAUDE.md

本文档为 Claude Code（claude.ai/code）在此仓库中工作时提供指引。

## 项目概述

SpecForge 是一个 AI 原生的规格驱动开发工作流 CLI 工具。它综合了 OpenSpec（增量规格、产物依赖图、OPSX 工作流）、gstack（技能系统 with preamble、计划模式安全、先修后审、经验积累）、spec-kit（用户故事模板、优先级需求、Given/When/Then）、superpowers-zh（子代理驱动开发、头脑风暴）、以及 claude-task-master（任务拆分与复杂度分析）中的模式。

项目处于早期开发阶段（v0.1.0）。`references/` 目录包含上述被研究项目的完整源码，用于学习借鉴和融合——任何功能开发都应交叉参考它们。

## 语言要求

**重要：所有场景均须使用中文。**
- 代码注释、变量命名、函数命名、README、文档等均使用中文
- 与用户的交互使用中文
- 生成的项目内容（README、文档、spec、skill 等）默认使用中文
- 仅当代码依赖的外部 API、库、或框架本身要求英文时例外（如 npm 包名、标准库函数名）

## 常用命令

```bash
pnpm dev -- --help          # 开发模式运行 CLI（tsx src/cli/index.ts）
pnpm build                   # TypeScript 编译（tsc）
pnpm test                    # 运行所有测试（vitest run）
pnpm test tests/unit/utils/path.test.ts  # 运行单个测试文件
pnpm lint                    # ESLint 检查（flat config）
pnpm format                  # Prettier 格式化
pnpm check                   # lint + test + build 一站式检查
```

## 架构

### 源码结构

```
bin/specforge.ts            # 入口（tsx shebang → 加载 src/cli/index.ts）
src/
  cli/index.ts              # Commander 程序，每个命令通过 dynamic import() 懒加载
  commands/                 # 每个 CLI 命令一个类，校验输入并编排服务层
    init.ts | add-command.ts | add-skill.ts | list.ts | status.ts | update.ts | doctor.ts
    profile.ts | run-hook.ts
  services/                 # 业务逻辑层
    scaffold-service.ts     # init：根据 templates/ 目录创建 .specforge/ + specforge/
    command-service.ts      # add-command：生成命令 .md 文件
    skill-service.ts        # add-skill：生成技能文件（目录模式或单文件模式）
    listing-service.ts      # list：通过 glob + frontmatter 发现并解析 commands 和 skills
    hooks-service.ts        # run-hook：加载并执行 .specforge/extensions.yaml 钩子
    update-service.ts       # update：刷新框架资产，并提示 operations-monitor 迁移
  core/                     # 共享类型、常量、Zod Schema、兼容性检查
    constants.ts            # 目录/文件名常量（.specforge, specforge, commands, skills 等）
    lifecycle-types.ts      # 8 个生命周期阶段
    metadata-schema.ts      # command/spec/skill/change 元数据的 Zod Schema
    profiles.ts             # minimal/standard/custom profile 解析
    artifact-graph.ts       # 产物 DAG 状态机（BLOCKED/READY/DONE）
    hooks.ts                # 扩展钩子 schema 与 phase 校验
    compatibility.ts        # 检测已有 .specforge/，警告破坏性覆盖
  utils/                    # 纯工具层（零业务逻辑）
    fs.ts                   # fs-extra 封装（ensureDirectory, writeFile, readFile 等）
    logger.ts               # Chalk 日志：info/success/warn/error/debug
    path.ts                 # resolveProjectRoot, joinPath, toPosixPath, specforgeDir, specforgeUserDir
    template-renderer.ts    # {{placeholder}} 模板替换引擎
    yaml.ts                 # YAML 解析 + frontmatter 提取
  adapters/                 # 跨平台适配
    windows-filename-adapter.ts  # 针对 Windows 禁止字符进行文件名清洗
```

### 初始化后目录结构

`specforge init` 读取 `templates/` 目录生成以下结构：

```
project/
├── .specforge/             # 框架资产（框架管理，可被 update 重新生成）
│   ├── commands/           # 生命周期阶段命令
│   ├── skills/
│   │   ├── architecture/
│   │   ├── code-styles/
│   │   ├── domain-rules/
│   │   ├── security/
│   │   ├── testing/
│   │   ├── ui-ux/
│   │   └── workflow-steps/
│   └── templates/          # 可复用模板
└── specforge/              # 用户资产（用户管理，update 不触碰）
    ├── project.md          # 项目元数据（YAML frontmatter + markdown 正文）
    ├── context/            # 项目上下文
    ├── spec/               # 当前规格文档（事实来源）
    ├── changes/            # 活跃的变更提案
    └── archive/            # 已完成的变更归档
```

### 生命周期阶段

```
foundation      → 从 0 到 1 的初始化与可行性
requirements    → 需求澄清与结构化
design          → 方案与架构设计
planning        → 任务拆解与依赖编排
implementation  → 开发实现与代码交付
quality         → 测试、审查、修复闭环
release         → 部署、发布、上线与运维移交（含 runbook/监控/告警/回滚）
evolution       → 复盘、沉淀、归档
```

`operations` 不再是独立阶段；runbook、监控、告警、回滚、运维移交统一属于 `release`。

### Profile 系统

SpecForge 支持三种 profile：

- `minimal`：foundation、requirements、implementation、quality、release
- `standard`：8 阶段全启（默认）
- `custom`：从 `specforge/config.yaml` 的 `profile.enabledPhases` 显式读取

相关命令：

```bash
specforge init ./project --profile=standard
specforge profile show
specforge profile set custom --enabled-phases=foundation,requirements,implementation,quality,release
```

### 语言适配层

SpecForge 是方法论框架，命令模板默认使用语言无关表述。具体测试、Lint、构建、依赖安装、版本同步命令统一从以下技能读取：

```text
.specforge/skills/workflow-steps/language-adapters/SKILL.md
```

新增或修改 workflow command 时，不要在正文中硬编码单一技术栈命令；应引用 language-adapters。

### 扩展钩子

项目可在 `.specforge/extensions.yaml` 中声明 before/after 阶段钩子，并由 CLI 执行：

```bash
specforge run-hook --phase implementation --stage before
specforge run-hook --phase implementation --stage after
```

钩子缺失时应静默跳过；钩子失败策略由 `optional` 决定。

### YAML Frontmatter 模式

所有生成的 `.md` 文件使用 `---` 分隔的 YAML frontmatter。`core/metadata-schema.ts` 中的 Zod Schema 定义了 commands、specs、skills、changes 的元数据结构。`services/command-service.ts` 和 `services/skill-service.ts` 在生成文件时写入这些 frontmatter。

### 技能类别

- `domain-rules` — 领域规则与业务逻辑约束
- `code-styles` — 编码风格与约定
- `architecture` — 架构决策与模式
- `testing` — 测试策略与方法
- `security` — 安全规范与检查
- `ui-ux` — 用户界面与体验
- `workflow-steps` — 工作流步骤

## 关键设计决策

- **纯 ESM**（`"type": "module"`），要求 Node >= 24.14.1，使用 `NodeNext` 模块解析
- **懒加载 CLI 命令** — 每个命令在运行时 `await import()`，确保 `specforge --help` 快速响应
- **双目录模型** — `.specforge/`（框架）vs `specforge/`（用户），源自 OpenSpec 的关注点分离设计。`update` 可安全重新生成框架资产而不触碰用户内容
- **模板变量** 使用 `{{variableName}}` 语法，由 `template-renderer.ts` 渲染
- **`.gitkeep` 文件** 放置在空目录中以确保被 Git 跟踪
