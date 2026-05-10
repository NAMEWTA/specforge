# AGENTS.md — SpecForge CLI 项目 AI 协作指南

> 本文件是给 AI 代理（Claude、Cursor、Kiro、Codex、GPT、Gemini 等）阅读的项目工作手册。  
> 面向开发本仓库（`@namewta/specforge`）本身的场景；如果你是在被初始化的目标项目中，请改读该项目的 `specforge/project.md`。

## 1. 项目身份

- **包名**：`@namewta/specforge`
- **定位**：AI-native 规格驱动开发（spec-driven development）工作流 CLI
- **语言/运行时**：TypeScript（严格模式）/ Node.js ≥ 24.14.1
- **分发形式**：npm 包 + `specforge` 全局命令
- **包管理器**：pnpm（`pnpm-lock.yaml` 是事实来源，勿用 npm/yarn）
- **许可证**：MIT

## 2. 核心架构（必读）

### 2.1 双目录模型

SpecForge 在被初始化的项目里生成两层目录，**本仓库自己也遵守这个模型**（仓库根忽略 `/specforge/` 与 `/.specforge/`，它们属于本地初始化产物而不是代码）：

```
.specforge/        框架资产：commands / skills / templates / config.yaml / extensions.yaml
                   —— 可被 `specforge update` 重新生成，禁止手改后期望长期保留
specforge/         用户资产：project.md / config.yaml / spec / brainstorming / context / changes / archive
                   —— 事实来源，框架绝不自动覆盖
```

本仓库自身的代码在 `src/`，模板机器源在 `templates/`（发布时随包一起打进 npm tarball）。

### 2.2 8 阶段生命周期

`foundation → requirements → design → planning → implementation → quality → release → evolution`

- 运维（runbook / 监控 / 告警 / 回滚）语义合并进 `release`，不再单列阶段
- 阶段间通过 **产物 DAG** 衔接：`PROPOSAL.md → DESIGN.md → TASKS.md → QUALITY-REPORT.md → archive/ → RETROSPECTIVE.md`
- DAG 状态机在 `src/core/artifact-graph.ts`，三态：`BLOCKED / READY / DONE`

### 2.3 Profile 体系

- `minimal`：5 阶段（foundation, requirements, implementation, quality, release）
- `standard`：8 阶段全启（**默认**）
- `custom`：用户声明 `enabledPhases`
- 实现：`src/core/profiles.ts`；配置优先级 `specforge/config.yaml` > `.specforge/config.yaml` > 内置默认

### 2.4 元数据统一 5 字段

所有 command / skill frontmatter 必须包含：`name / type / description / version / author`。

- **命令** `type` 以 `-command` 结尾（`workflow-command`、`tool-command`、`devflow-command`、`gitflow-command`）
- **技能** `type` 不以 `-command` 结尾（`domain-rule`、`code-style`、`architecture-rule`、`testing-rule`、`security-rule`、`ui-ux-rule`、`workflow-step`）
- 判定函数：`isCommandType()` / `isSkillType()`（`src/core/type-values.ts`）

### 2.5 三级渐进披露契约

| 层级 | 载入时机 | 内容 | 阈值 |
|------|---------|------|------|
| L1 Always | 始终加载 | YAML frontmatter（name + type + description） | description ≤ 200 字符 |
| L2 On Trigger | 命中触发词 | SKILL.md / command.md 主体 | ≤ 500 行 |
| L3 On Demand | 按需 | `references/`、`scripts/`、`templates/` | 必须从 L2 被引用 |

`specforge doctor --check-disclosure` 校验此契约，违例触发 `E005_contextOverload`。

## 3. 仓库布局

```
bin/specforge.ts                  开发时入口（tsx 直跑）
src/
├── index.ts                      公共 API 再导出
├── cli/index.ts                  Commander 路由 —— 所有命令注册
├── commands/                     命令实现（init/add-command/add-skill/list/status/update/run-hook/profile/doctor）
├── services/                     业务服务（scaffold/command/skill/listing/status/update/hooks）
├── core/                         领域模型（constants/lifecycle-types/profiles/hooks/artifact-graph/metadata-schema/compatibility/preamble/type-values）
├── utils/                        基础设施（fs/yaml/path/logger/template-renderer）
└── adapters/                     平台适配（windows-filename-adapter）

templates/
├── .specforge/                   模板 → 项目 .specforge/
│   ├── commands/workflow/*       8 个 workflow command（foundation-init … evolution-retrospect）
│   ├── commands/tools/*          tool command（debugging 等）
│   ├── skills/<category>/*       7 类技能
│   ├── templates/                产物模板（PROPOSAL.md/DESIGN.md/TASKS.md/CHECKLIST.md/RETROSPECTIVE.md）
│   ├── config.yaml               框架级机器源
│   └── extensions.yaml           钩子声明
└── specforge/                    模板 → 项目 specforge/
    ├── project.md                项目元数据（含 {{projectName}} 占位符）
    ├── config.yaml               项目级机器源
    ├── spec/, brainstorming/, context/, changes/, archive/

scripts/
├── inject-shebang.mjs            build 后向 dist/cli/index.js 注入 shebang
└── verify-bin.mjs                publish 前验证 bin 产物可执行

tests/
├── unit/                         单测（core/services/commands/utils/scripts/adapters）
└── integration/                  集成测（全生命周期、模板 scaffold）

.github/
├── actions/setup/                composite action（Node + pnpm + cache + install）
├── workflows/ci.yml              lint + test + build
├── workflows/release.yml         tag 触发：verify-bin → pnpm publish → softprops/action-gh-release
├── workflows/label-pr.yml        PR 自动打标
├── dependabot.yml                npm + github-actions 周更
└── labeler.yml                   路径→标签映射
```

## 4. 开发命令

| 场景 | 命令 |
|------|------|
| 启动开发（tsx 直跑源码） | `pnpm dev <args>` |
| 编译（含 shebang 注入） | `pnpm build` |
| 单元测试一次 | `pnpm test` |
| 监听式运行测试 | **不要使用**；请告知用户手动运行 `pnpm vitest` |
| Lint | `pnpm lint` |
| 格式化 | `pnpm format` |
| 发布前全量校验 | `pnpm check`（= lint + test + build） |
| 验证 bin 产物 | `pnpm build:check-bin`（= `node scripts/verify-bin.mjs`） |

**发布前 checklist（由 `prepublishOnly` 强制）**：`pnpm check` 必须通过。

## 5. CLI 命令速查

本仓库生产的 CLI 自己是 AI 代理在"被初始化项目"中最常调用的工具。以下表格是你在协作时要理解的入口：

| CLI 命令 | 作用 | 常用标志 |
|----------|------|---------|
| `specforge init [path]` | 初始化双目录 | `--project-name`、`--force`、`--profile {minimal\|standard\|custom}`、`--enabled-phases <a,b,c>` |
| `specforge add-command` | 生成 command 骨架 | `--type <workflow-command\|tool-command>`、`--name <kebab-case>` |
| `specforge add-skill <name>` | 生成 skill 骨架 | `--type <domain-rule\|...>`、`--mode <directory\|single-file>` |
| `specforge list` | 列出命令/技能 | `--commands`、`--skills`、`--type <t>`、`--triggers <kw1,kw2>`、`--format <xml\|json\|text>` |
| `specforge status` | 当前 change 阶段状态 | `--phase <name>`、`--check-requires`、`--graph`、`--json` |
| `specforge update [path]` | 刷新 `.specforge/`（不碰 `specforge/`） | `--force` |
| `specforge run-hook` | 跑 `extensions.yaml` 钩子 | `--phase <name>`、`--stage <before\|after>`、`--json` |
| `specforge profile show` | 显示当前 profile | `--json` |
| `specforge profile set <name>` | 切换 profile（写入 `specforge/config.yaml`） | `--enabled-phases <a,b,c>`（仅 custom） |
| `specforge doctor` | 项目诊断 | `--check-deps`、`--check-node`、`--check-compat`、`--check-disclosure`、`--quiet` |

全局：`--no-color` 禁用彩色输出；Commander `--version` 读取 `package.json`。

## 6. 扩展机制

### 6.1 Preamble（命令体内嵌的 bash 块）

command / skill 主体可声明 `<!-- preamble:bash ... -->` 块，AI 在加载命令时可按需解析执行（见 `src/core/preamble.ts`）：

```markdown
<!-- preamble:bash
specforge list --skills --triggers=test,qa --format=json
specforge status --phase=quality --check-requires
specforge doctor --check-deps --quiet
-->
```

### 6.2 Extensions Hooks（`.specforge/extensions.yaml`）

spec-kit 风格的 before/after 钩子。键名 `before_<phase>` / `after_<phase>`，串行执行，必需钩子失败即阻断；`optional: true` 的钩子失败仅 warn。

由 `specforge run-hook --phase <p> --stage <s>` 在命令的 preamble 中触发。实现：`src/core/hooks.ts` + `src/services/hooks-service.ts`。

### 6.3 产物 DAG（`src/core/artifact-graph.ts`）

标准图：`proposal → design → tasks → quality-report → archive → retrospective`（`tasks` 同时依赖 `proposal` 和 `design`）。

状态规则：
- `DONE`：对应文件存在
- `READY`：所有 `requires` 已 DONE，但本产物自身未生成
- `BLOCKED`：至少一个依赖未 DONE（`blockedBy` 字段给出原因）

状态机包含循环依赖检测（DFS 三色）与重复 id / 未知依赖校验。

## 7. AI 代理行为规约

### 7.1 改代码前必查

1. 任务涉及**命令行为** → 先读 `src/cli/index.ts` + 对应 `src/commands/*.ts` + 对应 `src/services/*.ts`
2. 任务涉及**模板产物** → 先看 `templates/` 对应文件 + `src/services/scaffold-service.ts`
3. 任务涉及**类型/元数据校验** → 先读 `src/core/metadata-schema.ts` + `src/core/type-values.ts`
4. 任务涉及**生命周期/Profile** → 先读 `src/core/lifecycle-types.ts` + `src/core/profiles.ts`

### 7.2 改代码时必做

- 保持 `src/` 与 `templates/` 的双目录语义一致：改模板要跟进 `scaffold-service.ts`，改 CLI 行为要跟进命令/技能/测试
- 所有新 command / skill 必须符合 **统一 5 字段 frontmatter** 和 **三级渐进披露契约**
- 新增生命周期阶段或 profile 选项必须同时更新 `LIFECYCLE_TYPES`、`BUILTIN_PROFILES`、`PHASE_TO_WORKFLOW_DIR`、`PHASE_DEPENDENCIES`、`PHASE_ARTIFACTS`、`PHASE_COMMANDS`
- 新增命令类型 / 技能类型必须在 `COMMAND_TYPES` / `SKILL_TYPES` 注册，并附 `isValidCommandType` / `isValidSkillType` 测试

### 7.3 写代码风格

- TypeScript **strict 模式**（`tsconfig.json`），不要放开 strictness
- 模块系统 NodeNext，文件内 `import` 使用 `.js` 后缀（ES Module 规范）
- 错误消息使用**中文**（用户面向）；代码注释也用中文（仓库惯例）
- 使用 `src/utils/logger.ts` 输出（`logger.info/success/warn/error`），不要直接 `console.log`，除非是 CLI 数据输出（JSON/XML 格式）
- 异步用 `async/await`，避免 `.then` 链
- Schema 校验统一走 `zod`

### 7.4 测试要求

- 新增 service → 在 `tests/unit/services/` 加对应 `.test.ts`
- 新增 core 领域类型 → 在 `tests/unit/core/` 加对应 `.test.ts`
- 新增命令行为 → 优先在 `tests/unit/commands/` 加用例；跨命令联动在 `tests/integration/` 加场景
- 运行 `pnpm test` 必须全绿再提交

### 7.5 发布与 Git 约定

- **提交规范**：Conventional Commits（`feat:` / `fix:` / `docs:` / `chore:` / `refactor:` / `test:` / `ci:`）
- **禁止**：直接推 `main`（release.yml 由 `v*` tag 触发，版本号必须与 `package.json` 对齐）
- **发布流水线**：tag → setup → lint → test → build → **verify-bin** → npm publish（`--provenance --access public`）→ softprops/action-gh-release
- 改动涉及模板或 CLI 对外行为时同步更新 `CHANGELOGS.md`

## 8. 常见陷阱

| 陷阱 | 说明 |
|------|------|
| 忘记 `.js` 后缀 | NodeNext ESM 下 `import './foo'` 会在运行时报错，必须写 `import './foo.js'` |
| 直接 `npm publish` | 会绕过 `prepublishOnly` 校验；始终走 tag → release.yml |
| 改 `templates/` 不跑 test | 模板变更要同步看 `tests/integration/scaffold-templates.test.ts` |
| 命令名不合 kebab-case | `CommandService.generateCommand` 会抛错；skill 名同理 |
| 在 `.specforge/` 里写业务数据 | 会被 `specforge update` 覆盖；所有项目事实来源放 `specforge/` |
| 加新阶段忘了 `PHASE_TO_WORKFLOW_DIR` | `scaffold-service` 找不到模板目录，profile custom 会复制不全 |

## 9. 相关文档

- 用户面向介绍：`README.md` / `README-ZH.md`
- 版本历史：`CHANGELOGS.md`
- 当前活跃 spec：`.kiro/specs/cicd-and-templates-optimization/`
- 模板机器源：`templates/.specforge/config.yaml`（全文注释型）
- 仓库运营与发布：`.agents/skills/github-ops/SKILL.md`
- 文档同步工作流：`.agents/skills/docs-sync/SKILL.md`
