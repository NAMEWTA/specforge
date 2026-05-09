# AGENTS.md

本文档为所有 AI 编码代理（Claude Code、Cursor、Codex、Kiro、Aider 等）在本仓库工作时提供统一的指引。遵循 [agents.md](https://agents.md/) 约定。

## 项目概述

**SpecForge** 是一个 AI 原生的规格驱动开发工作流 CLI 工具，综合了多个成熟项目的最佳实践：

- **OpenSpec** — 双目录分离、产物 DAG、渐进式披露
- **gstack** — Preamble 初始化、多维评审
- **superpowers-zh** — 技能链编排、铁律约束、子代理驱动
- **spec-kit** — 扩展钩子、宪法治理、显式 Handoff
- **skills-main** — 技能创建方法论、渐进式披露
- **claude-task-master** — Handlebars 模板、复杂度分析
- **grill-me** — 多视角质询框架

当前版本：`v0.0.2`（早期开发阶段）。`references/` 目录包含被研究项目的完整源码，用于借鉴与融合。

## 语言规范

**所有场景默认使用中文。**

- 代码注释、函数命名文档、README、文档均使用中文
- 与用户的交互使用中文
- 生成的项目内容（README、spec、skill 等）默认使用中文
- 仅当依赖的外部 API、库、标准库本身要求英文时例外（如 npm 包名、保留字）

## 技术栈

- **运行时**：Node.js >= 24.14.1，纯 ESM（`"type": "module"`）
- **语言**：TypeScript 5.6，`NodeNext` 模块解析
- **包管理**：pnpm
- **CLI**：Commander 14
- **数据校验**：Zod 4
- **文件系统**：fs-extra、globby
- **交互**：inquirer、chalk、ora
- **测试**：Vitest
- **代码规范**：ESLint 9（flat config）+ Prettier 3

## 常用命令

```bash
pnpm dev -- --help                         # 开发模式运行 CLI
pnpm build                                 # TypeScript 编译
pnpm test                                  # 运行所有测试
pnpm test tests/unit/utils/path.test.ts    # 运行单个测试文件
pnpm lint                                  # ESLint 检查
pnpm format                                # Prettier 格式化
pnpm check                                 # lint + test + build 一站式检查
```

提交前应运行 `pnpm check` 确保通过。

## 项目结构

```
bin/specforge.ts            # CLI 入口（tsx shebang → src/cli/index.ts）
src/
  cli/index.ts              # Commander 程序，每个命令通过 dynamic import() 懒加载
  commands/                 # CLI 命令类，仅校验输入并编排服务层
    init.ts | add-command.ts | add-skill.ts | list.ts | status.ts | update.ts
    doctor.ts | profile.ts | run-hook.ts
  services/                 # 业务逻辑层
    scaffold-service.ts     # init：根据 templates/ 创建 .specforge/ + specforge/
    command-service.ts      # add-command：生成命令 .md 文件
    skill-service.ts        # add-skill：生成技能文件
    listing-service.ts      # list：glob + frontmatter 发现 commands 与 skills
    hooks-service.ts        # run-hook：加载并执行扩展钩子
    update-service.ts       # update：刷新框架资产
    status-service.ts       # status：查询阶段与 DAG 状态
  core/                     # 共享类型、常量、Zod Schema
    constants.ts            # 目录/文件名常量
    lifecycle-types.ts      # 8 个生命周期阶段
    metadata-schema.ts      # frontmatter 元数据 Schema
    profiles.ts             # minimal/standard/custom profile
    artifact-graph.ts       # 产物 DAG 状态机（BLOCKED/READY/DONE）
    hooks.ts                # 扩展钩子 schema 与 phase 校验
    compatibility.ts        # 检测已有 .specforge/，警告破坏性覆盖
    preamble.ts             # 技能 Preamble 生成
    type-values.ts          # 类型常量
  utils/                    # 纯工具层（无业务逻辑）
    fs.ts                   # fs-extra 封装
    logger.ts               # Chalk 日志
    path.ts                 # 路径工具
    template-renderer.ts    # {{placeholder}} 模板替换
    yaml.ts                 # YAML 解析 + frontmatter 提取
  adapters/
    windows-filename-adapter.ts  # Windows 禁止字符清洗
templates/                  # 初始化时的模板资产
  .specforge/               # 框架资产模板
  specforge/                # 用户资产模板
references/                 # 参考项目分析文档
```

## 初始化后的目录结构

`specforge init` 生成以下双目录结构：

```
project/
├── .specforge/             # 框架资产（由 specforge update 管理，勿手动修改）
│   ├── commands/
│   ├── skills/
│   │   ├── architecture/
│   │   ├── code-styles/
│   │   ├── domain-rules/
│   │   ├── security/
│   │   ├── testing/
│   │   ├── ui-ux/
│   │   └── workflow-steps/
│   └── templates/
└── specforge/              # 用户资产（用户管理，update 不触碰）
    ├── project.md          # 项目元数据
    ├── context/            # 项目上下文
    ├── spec/               # 当前规格（事实来源）
    ├── changes/            # 活跃的变更提案
    └── archive/            # 已完成的变更归档
```

## 生命周期阶段

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

**注意**：`operations` 不是独立阶段，runbook/监控/告警/回滚均归属 `release`。

## 关键设计原则

1. **纯 ESM + 懒加载** — 每个命令在运行时 `await import()`，保证 `--help` 快速响应
2. **双目录模型** — `.specforge/`（框架）vs `specforge/`（用户），`update` 可安全重新生成框架资产而不触碰用户内容
3. **分层架构** — `commands/` 只校验输入并编排，`services/` 承载业务逻辑，`utils/` 保持纯净
4. **模板变量** — 使用 `{{variableName}}` 语法，由 `template-renderer.ts` 渲染
5. **Frontmatter 驱动** — 所有 `.md` 文件使用 YAML frontmatter，由 `core/metadata-schema.ts` 的 Zod Schema 校验
6. **产物 DAG** — 阶段产物形成有向无环图，`status` 命令揭示就绪态
7. **语言无关工作流** — 命令模板描述抽象动作（test/lint/build），具体命令从 `language-adapters` 技能读取
8. **扩展钩子** — 项目在 `.specforge/extensions.yaml` 声明 before/after 阶段钩子

## 编码约定

### 通用规范

- 使用 TypeScript 严格模式，导入路径带 `.js` 扩展名（NodeNext 要求）
- 文件头部不要添加无意义注释，保持简洁
- 函数优先于类，除非需要状态封装
- 错误处理使用显式 `Error` 实例或自定义错误类，避免 `throw 'string'`
- 日志统一通过 `src/utils/logger.ts`（`info/success/warn/error/debug`），不要直接 `console.log`
- 路径操作统一通过 `src/utils/path.ts`（`resolveProjectRoot/joinPath/toPosixPath` 等），不要直接拼字符串

### 格式化

Prettier 配置（见 `package.json`）：

- `semi: true`
- `singleQuote: true`
- `trailingComma: "all"`
- `printWidth: 100`
- `tabWidth: 2`

提交前运行 `pnpm format` 或依赖 `lint-staged` 自动处理。

### 命令与服务的职责划分

- `src/commands/*.ts` — 仅负责参数解析、用户交互、调用服务层，**不包含业务逻辑**
- `src/services/*.ts` — 承载核心业务流程，可读写文件系统、调用 core/utils
- `src/core/*.ts` — 定义共享类型、常量、Schema，**不依赖文件系统**
- `src/utils/*.ts` — 纯工具函数，**不依赖业务概念**

## 工作流程

### 新增 CLI 命令

1. 在 `src/commands/` 新增命令类
2. 在 `src/cli/index.ts` 通过 `program.command().action(async () => { const { X } = await import('../commands/X.js'); ... })` 注册
3. 业务逻辑下沉到 `src/services/`
4. 新增 Zod Schema 到 `src/core/metadata-schema.ts`（如涉及 frontmatter）
5. 补充测试

### 新增技能或命令模板

- 技能放入 `templates/.specforge/skills/<category>/<skill-name>/SKILL.md`
- 命令模板放入 `templates/.specforge/commands/<group>/<name>/<name>.md`
- 不要在模板正文硬编码单一技术栈的命令，应引用 `language-adapters`

### 修改后验证

任何改动后至少执行：

```bash
pnpm lint
pnpm test
pnpm build
```

或一次性：`pnpm check`。

## 注意事项

- **不要手动修改 `.specforge/` 下的框架资产**；它们由 `specforge init` 和 `specforge update` 生成
- **不要在 `specforge/` 下生成框架代码**；那是用户区
- **不要引入新依赖**，除非明确必要；优先使用已有依赖（chalk、commander、fs-extra、globby、inquirer、js-yaml、ora、zod）
- **不要直接操作 `process.cwd()`**；使用 `src/utils/path.ts` 的 `resolveProjectRoot`
- **不要破坏 ESM 约定**（import 带 `.js`、禁用 CommonJS `require`）
- **不要在 CLI 顶层同步 import 命令模块**，必须 `await import()` 以维持启动性能
- 修改 `templates/` 时考虑对现有已初始化项目的兼容影响，必要时在 `update-service.ts` 补充迁移逻辑

## 参考资料

- [README.md](README.md) — 用户视角的功能介绍与用法
- [CLAUDE.md](CLAUDE.md) — Claude Code 专用指引（中文）
- [references/reference-projects-analysis.md](references/reference-projects-analysis.md) — 参考项目的详细分析
- [templates/](templates/) — 初始化模板源

## 许可证

MIT
