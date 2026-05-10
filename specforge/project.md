---
name: 'project-metadata'
type: 'project'
version: '0.1.0'
---

# specforge-cli 项目元数据

> 本文件是用户资产（`specforge/`），`specforge update` 不会覆盖本文件。
> 目的：作为 SpecForge 后续所有生命周期阶段（requirements → design → planning → implementation → quality → release → evolution）的事实来源。

## 项目概述

- **项目名称**：`@namewta/specforge`（全局命令 `specforge`）
- **一句话定位**：AI-native 规格驱动开发（spec-driven development）工作流 CLI，把 8 阶段生命周期、产物 DAG、渐进披露契约固化到仓库文件系统。
- **核心价值**：
  - 把 OpenSpec / gstack / superpowers / claude-task-master / Anthropic skills 等开源项目中最经得起打磨的模式统一到一把 CLI 之后，让 AI 代理在真实代码库里的协作不再依赖聊天窗口的临场发挥。
  - 双目录模型（`.specforge/` 框架资产 + `specforge/` 用户资产）保证「框架可升级、用户资产不被覆盖」。
  - 产物 DAG + Profile + 三级渐进披露共同构成硬门禁，抑制 AI 跳步、上下文膨胀、无记忆重建等典型失配。
- **目标用户**：
  - 使用 Claude / Cursor / Kiro / Codex / GPT / Gemini 等多平台 AI 代理协作的开发者和小型团队
  - 希望给 AI 协作流程加约束、可审计、可回滚的工程团队
- **当前阶段**：早期开发（npm 已发布 `0.0.x`，处于 API 与模板持续打磨期，尚未进入 `1.0.0`）。

## 技术栈

- **语言与运行时**：
  - TypeScript 5.6.3（strict 模式，`moduleResolution: NodeNext`）
  - Node.js ≥ `24.14.1`（见 `package.json#engines`）
- **主要框架 / 库**：
  - CLI：`commander@14`
  - 交互：`inquirer@12`
  - 输出与动效：`chalk@5`、`ora@8`
  - Schema 校验：`zod@4`
  - 文件与路径：`fs-extra@11`、`globby@14`
  - YAML 解析：`js-yaml@4`
- **包管理**：pnpm（`pnpm-lock.yaml` 是事实来源；**禁止** 用 npm / yarn 操作依赖）
- **构建工具**：`tsc -p tsconfig.json` + `scripts/inject-shebang.mjs`（构建后向 `dist/cli/index.js` 注入 `#!/usr/bin/env node`）
- **测试框架**：`vitest@2.1`；监听模式不由 AI 代理触发，由用户手动跑 `pnpm vitest`
- **代码规范工具**：`eslint@9` + `typescript-eslint@8` + `prettier@3` + `husky@9` + `lint-staged@15`
- **CI/CD 平台**：GitHub Actions
  - `.github/actions/setup/` composite action（Node + pnpm + cache + install）
  - `ci.yml`：lint + test + build
  - `release.yml`：tag(`v*`) 触发 → verify-bin → `pnpm publish --provenance --access public` → `softprops/action-gh-release`
  - `label-pr.yml` + `labeler.yml`：路径 → 标签映射
  - `dependabot.yml`：npm + github-actions 周更

> 具体命令（test / lint / build）由 `.specforge/skills/workflow-steps/language-adapters/` 对应语言适配器提供；本仓库为 Node.js 适配器。

## 架构约束

以下是本项目不可协商、已在 `AGENTS.md` 与 `.specforge/config.yaml` 中沉淀的硬约束：

- **双目录模型**：`.specforge/`（框架资产，可被 `specforge update` 重生成）与 `specforge/`（用户资产，框架绝不覆盖）的语义必须严格分离。业务事实一律落在 `specforge/`。
- **分层**：`cli → commands → services → core + utils + adapters`，严格单向依赖；`core` 不依赖 `services`/`commands`。
- **模板与代码同步**：`src/` 与 `templates/` 双目录语义一致——改模板必须跟进 `scaffold-service.ts` 和对应集成测试；改 CLI 行为必须跟进命令、技能、测试。
- **ESM + NodeNext**：源码 `import` 路径 **必须显式带 `.js` 后缀**，否则运行时报错。
- **接口风格**：本项目对外是 CLI（全局命令 `specforge`），对内是 TypeScript 公共 API（`src/index.ts` 再导出）。
- **持久化策略**：无数据库；所有状态落在项目文件系统（`.specforge/` + `specforge/`）。
- **并发模型**：CLI 单进程、异步 I/O；禁止 `.then` 链，统一 `async/await`。
- **不可违反的硬约束**：
  - 所有 command / skill frontmatter 必须含 **统一 5 字段**：`name / type / description / version / author`。
  - 命令类型以 `-command` 结尾（`workflow-command` / `tool-command` / `devflow-command` / `gitflow-command`），技能类型不以 `-command` 结尾。
  - **三级渐进披露契约**：L1 frontmatter 始终加载（description ≤ 200 字符）；L2 正文 ≤ 500 行；L3 放 `references/` / `scripts/` / `templates/` 且必须被 L2 引用。违例触发 `E005_contextOverload`。
  - 生命周期阶段、Profile 枚举、命令/技能类型枚举的任何增减，必须同步更新 `src/core/` 下的 `LIFECYCLE_TYPES` / `BUILTIN_PROFILES` / `PHASE_TO_WORKFLOW_DIR` / `PHASE_DEPENDENCIES` / `PHASE_ARTIFACTS` / `PHASE_COMMANDS` / `COMMAND_TYPES` / `SKILL_TYPES`。
  - 日志统一走 `src/utils/logger.ts`（`logger.info/success/warn/error`），禁止直接 `console.log`（CLI 的 JSON/XML 数据输出除外）。

## 领域术语（Glossary）

| 术语 | 定义 | 同义词 / 旧称 | 备注 |
| ---- | ---- | ------------- | ---- |
| Command | L1/L2 契约下的工作流/工具命令；type 以 `-command` 结尾 | workflow / devflow / gitflow / tool | 模板位于 `.specforge/commands/` |
| Skill | 上下文注入技能；type 不以 `-command` 结尾 | rule / adapter | 7 类：domain-rules / code-styles / architecture / testing / security / ui-ux / workflow-steps |
| Profile | 决定启用阶段集合的预设 | minimal / standard / custom | 实现 `src/core/profiles.ts` |
| 产物 DAG | 阶段产物的依赖有向图 | artifact graph | 状态机 `BLOCKED / READY / DONE`，实现 `src/core/artifact-graph.ts` |
| 渐进披露 | L1/L2/L3 三级加载契约 | progressive disclosure | 由 `specforge doctor --check-disclosure` 校验 |
| Preamble | 命令/技能正文内嵌的 `<!-- preamble:bash -->` 脚本块 | — | 解析实现 `src/core/preamble.ts` |
| Extensions Hook | `extensions.yaml` 中的 `before_<phase>` / `after_<phase>` 钩子 | spec-kit 钩子 | 由 `specforge run-hook` 触发 |
| 双目录模型 | `.specforge/` 框架资产 + `specforge/` 用户资产 | dual-directory | 源自 OpenSpec |

## 关键非功能需求（Non-functional Requirements）

- **启动性能**：CLI 冷启动（`specforge --help` / `specforge status`）目标 ≤ 500ms（Node 24 + SSD）。
- **可用性**：关键命令（`init` / `status` / `doctor` / `profile`）必须在网络断开、未安装其他依赖的情况下可用。
- **可维护性**：
  - 所有 `src/services/*.ts` 必须有对应 `tests/unit/services/*.test.ts`
  - 所有 `src/core/` 领域类型必须有对应单测
  - `pnpm check` 在发布前必须全绿（由 `prepublishOnly` 强制）
- **兼容性**：
  - 支持 macOS / Linux / Windows；Windows 特定文件名处理走 `src/adapters/windows-filename-adapter.ts`
  - Node 24 为底线，禁止使用更新版 Node 才引入的 API，除非放到 `engines` 并在 `doctor --check-node` 中覆盖
- **安全性**：
  - npm publish 走 `--provenance`，保证包来源可验证
  - 禁止把敏感信息写进模板；模板中的样例字段不得包含真实密钥
- **可观测性**：CLI 错误必须命中编号错误沉淀（`E001..` / `E005_contextOverload` / `P001..`），便于用户与 AI 代理快速定位。
- **国际化**：用户可见文案（错误、日志、模板说明、README、CHANGELOGS、commit 描述）使用中文；标识符、commit type 前缀、schema 键名使用英文。

## 仓库约定

- **目录布局**：参见 `README.md`、`README-ZH.md` 与 `AGENTS.md` 第 3 节。
- **分支策略**：trunk-based；功能分支短生命周期，合并回 `main`。
- **提交规范**：Conventional Commits（英文前缀 `feat:` / `fix:` / `docs:` / `chore:` / `refactor:` / `test:` / `ci:`，描述体使用中文）。
- **代码评审规则**：PR 必须跑过 `ci.yml`（lint + test + build）；涉及模板 / CLI 对外行为的改动需同步更新 `CHANGELOGS.md`。
- **发布流程**：
  - 仅通过打 `v*` tag 触发 `release.yml`；**禁止**本地 `npm publish` 或 `pnpm publish` 绕过 `prepublishOnly`。
  - 版本号与 `package.json#version` 必须对齐。
  - `prepublishOnly = pnpm check` 为硬门禁。
- **文档更新规则**：
  - 变更对外行为 → 同步 `CHANGELOGS.md` 的 `[Unreleased]` 段
  - 变更模板机器源 → 同步 `.specforge/config.yaml` 或 `specforge/config.yaml` 对应条目
  - 变更工作流 → 同步对应 `commands/workflow/*.md`
- **AI 协作约定**：参见 `AGENTS.md`；本仓库使用 SpecForge 自举（自己用自己）完成规格驱动开发。

## 相关文档

- 用户面向介绍：`README.md` / `README-ZH.md`
- AI 代理手册：`AGENTS.md`
- 版本历史：`CHANGELOGS.md`
- 框架机器源：`.specforge/config.yaml`（全文注释型）
- 项目机器源：`specforge/config.yaml`
- 当前规格：`specforge/spec/`
- 活跃变更：`specforge/changes/`
- 历史归档：`specforge/archive/`
