# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

> 日期采用 UTC；`[Unreleased]` 段落记录尚未发布到 npm 的变更。

---

## [Unreleased]

### 计划中

- 完善产物模板（PROPOSAL.md / DESIGN.md / TASKS.md / CHECKLIST.md / RETROSPECTIVE.md）的默认章节与 `{{variableName}}` 占位符契约
- 扩展技能覆盖面（architecture、testing、security、workflow-steps/language-adapters）
- 强化 `specforge doctor --check-disclosure` 校验规则与错误消息

---

## [0.0.5] — 2026-05-10

### 新增

- **模板**：新增 `templates/.specforge/skills/workflow-steps/docs-sync/` —— 把仓库级 `docs-sync` 技能（基于 git 差异的增量文档同步工作流）同步为项目级可复用模板，附 `references/`（readme / agents / changelog / state-json-schema 四份契约）
- **模板**：`skill-creator` 汉化并补齐 5 字段 frontmatter（`type: workflow-step`、`version`、`author`），`init_skill.py` / `package_skill.py` / `quick_validate.py` 三个脚本同步刷新
- **文档同步基线**：仓库根新增 `.docs-sync-state.json`，作为 docs-sync 工作流的事实来源

### 变更

- **docs-sync（仓库级）**：SKILL.md 与四份 references 重写为通用化版本（不再硬编码 SpecForge 语境），新增 `templates/state.json.tmpl` 首次运行骨架
- **AGENTS.md**：新增"注意"小节，规范长文件的分批读/分块写策略与中断后的退回路径

### 移除

- 删除仓库级 `.agents/skills/docs-sync/state.json`（已迁移为仓库根 `.docs-sync-state.json`，不再放在技能目录内）
- 删除 `templates/.specforge/skills/workflow-steps/skill-creator/-`（无意义的空文件残留）

---

## [0.0.4] — 2026-05-10

### 新增

- **技能**：新增仓库级 `docs-sync` 技能（`.agents/skills/docs-sync/`），基于 git 差异增量同步四份对外文档（`README.md` / `README-ZH.md` / `AGENTS.md` / `CHANGELOGS.md`），附四份 references 契约（readme / agents / changelog / state-json-schema）与 `state.json` 基线
- **文档**：新增 `README-ZH.md`（与英文 README 结构对等的中文镜像）
- **文档**：新增 `CHANGELOGS.md`（Keep a Changelog 格式，覆盖 0.0.1 – 0.0.4）

### 变更

- **README.md**：重写为 Heritage 驱动的结构，顶部新增"借鉴五个开源项目"表（OpenSpec / gstack / superpowers / claude-task-master / Anthropic skills），新增 Concepts 小节（Artifact DAG / Extensions Hooks / Preamble / Hard Gates / Error Dictionary），补全 Progressive Disclosure 表与完整 CLI Reference
- **AGENTS.md**：对齐当前仓库实际布局（`src/` + `templates/` + `.github/` 目录树），扩充"AI 代理行为规约"、"常见陷阱"、"扩展机制"小节，并补充 `docs-sync` / `github-ops` 技能索引

### 移除

- 删除 `CLAUDE.md`、`UPGRADE_SUMMARY.md`、`references/reference-projects-analysis.md`（内容已吸收进新 README 的 Heritage 表与 AGENTS.md）

---

## [0.0.3] — 2026-05-10

### 新增

- **模板**：丰富 `command-creator` 技能（更完整的 SOP、references、scripts）
- **模板**：新增 `github-ops` 技能（取代早期的 `github-npm-git-ops` 命名），覆盖 GitHub 仓库操作、CI/安全运维、issue/PR 三角流程、npm token 配置、workflow YAML 参考、问题排查手册

### 变更

- 重命名 `github-npm-git-ops` → `github-ops`，并在仓库 `.gitignore` 中屏蔽 Python `__pycache__/`

### 文档

- 新增 `github-ops` SKILL.md 及其 references 完整集合

---

## [0.0.2] — 2025-xx-xx

### 新增

- **CI/CD**：完善 GitHub Actions 流水线
  - 抽取 `.github/actions/setup/` composite action（Node + pnpm + cache + install）
  - `ci.yml` 三 job（lint / test / build）共享同一 setup，消除重复步骤
  - `release.yml` tag 触发：setup → lint → test → build → `verify-bin` → `npm publish --provenance --access public` → `softprops/action-gh-release@v2`
  - 新增 `label-pr.yml`（PR 自动打标）+ `labeler.yml` 规则
  - 新增 `dependabot.yml`（npm + github-actions 周更，每类最多 5 个 PR，`dependencies` 标签）
- **构建**：修复 npm bin 入口
  - `package.json#bin.specforge` 指向 `./dist/cli/index.js`（不再是 `./bin/specforge.ts`）
  - 新增 `scripts/inject-shebang.mjs`：`pnpm build` 后自动向 `dist/cli/index.js` 注入 `#!/usr/bin/env node` 并 `chmod 755`
  - 新增 `scripts/verify-bin.mjs`：release 前校验产物存在、shebang 正确、`node dist/cli/index.js --help` 退出码为 0
  - `files` 字段改为发布 `dist/` + `templates/`，移除源码 `bin/`
- **模板**：新增技能模板与脚本工具（`command-creator`、`skill-creator` 等）
- **npm**：包名变更为 `@namewta/specforge`（scoped 包发布需 `--access public`）
- **npm provenance**：补全 `repository` 字段以通过 npm provenance 验证
- **测试**：补充 `UpdateService`、`path` 工具的单元测试

### 修复

- `release.yml` 使用 npm trusted publishing，移除历史上无效的 `initial` dist-tag 配置
- 发布流程作者字段与校验脚本顺序

### 文档

- `AGENTS.md`（早期版本）：完整的代理协作约定与框架说明

---

## [0.0.1] — 2025-xx-xx

### 初始发布

首次发布到 npm 的骨架版本。

#### CLI 命令

- `specforge init [path]` — 生成 `.specforge/`（框架资产）与 `specforge/`（用户资产）双目录，支持 `--profile`、`--enabled-phases`、`--project-name`、`--force`
- `specforge add-command --type <t> --name <n>` — 生成命令骨架
- `specforge add-skill <name>` — 生成技能骨架（directory / single-file 模式）
- `specforge list` — 列出命令/技能，支持 `--commands`、`--skills`、`--type`、`--triggers`、`--format xml|json|text`
- `specforge status` — 查询当前 change 的阶段状态，支持 `--phase`、`--check-requires`、`--graph`（产物 DAG：BLOCKED/READY/DONE）、`--json`
- `specforge update [path]` — 刷新框架资产，保留用户资产
- `specforge run-hook --phase <p> --stage <s>` — 执行 `.specforge/extensions.yaml` 钩子
- `specforge profile show|set` — 查看/切换 profile（minimal / standard / custom）
- `specforge doctor` — 诊断 Node 版本、依赖目录、结构兼容性、三级渐进披露契约

#### 核心模型

- **双目录模型**：`.specforge/`（可 update）+ `specforge/`（用户管理）
- **8 阶段生命周期**：foundation → requirements → design → planning → implementation → quality → release → evolution（运维语义并入 release）
- **Profile 体系**：`minimal`（5 阶段）/ `standard`（8 阶段，默认）/ `custom`（用户声明 enabledPhases）
- **统一 5 字段 frontmatter**：`name / type / description / version / author`
  - 命令类型以 `-command` 结尾；技能类型不以 `-command` 结尾
- **三级渐进披露**：L1 frontmatter / L2 主体（≤500 行）/ L3 `references/`；`doctor --check-disclosure` 校验
- **产物 DAG**（`src/core/artifact-graph.ts`）：proposal → design → tasks → quality-report → archive → retrospective，带循环依赖检测
- **硬门禁** + **错误字典**（E001–E005）：在 `templates/.specforge/config.yaml` 统一声明

#### 扩展机制

- **Preamble**：命令/技能内嵌 `<!-- preamble:bash ... -->` 注释块，AI 加载时按需解析（`src/core/preamble.ts`）
- **Extensions Hooks**：`.specforge/extensions.yaml` 声明 `before_<phase>` / `after_<phase>`，由 `specforge run-hook` 触发；`optional: true` 的钩子失败仅 warn（`src/core/hooks.ts` + `src/services/hooks-service.ts`）

#### 模板

- `templates/.specforge/commands/workflow/*` — 8 个 workflow command（`foundation-init`、`requirements-clarify`、`design-explore`、`planning-breakdown`、`implementation-build`、`quality-verify`、`release-deploy`、`evolution-retrospect`），每个带 `references/`（部分带 `scripts/`）
- `templates/.specforge/commands/tools/debugging/` — tool command 示例
- `templates/.specforge/skills/<7 类>/*` — architecture / code-styles / domain-rules / security / testing / ui-ux / workflow-steps
- `templates/.specforge/templates/` — 产物模板（PROPOSAL.md / DESIGN.md / TASKS.md / CHECKLIST.md / RETROSPECTIVE.md）
- `templates/specforge/` — 用户资产模板（`project.md`、`config.yaml`、`spec/`、`brainstorming/`、`context/`、`changes/`、`archive/`）

#### 工程化

- TypeScript 严格模式 + NodeNext ESM
- Vitest 单元 + 集成测试
- ESLint + Prettier + husky + lint-staged
- pnpm 管理依赖

---

## 版本链接

- [Unreleased](https://github.com/NAMEWTA/specforge/compare/v0.0.5...HEAD)
- [0.0.5](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.5)
- [0.0.4](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.4)
- [0.0.3](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.3)
- [0.0.2](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.2)
- [0.0.1](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.1)
