# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

> 日期采用 UTC；`[Unreleased]` 段落记录尚未发布到 npm 的变更。

---

## [Unreleased]

---

## [0.0.16] — 2026-05-18

### Added

- **模板**：新增 `workflow-steps/node-cli-development` skill（`type: workflow-step`，~1425 行）—— 用 `citty@0.2.2` + `@clack/prompts@1.4.0` 构建 Node.js CLI 的端到端工作流，覆盖命令路由、参数 schema、终端交互、异步任务 UI 与 ESM 发布：
  - SKILL.md 主体：最小可运行骨架（`defineCommand` / `runMain` / `assertOk` 取消工具）、参数类型选型表（positional / string / boolean / number / enum）、prompt 类型选型表（text / password / confirm / select / multiselect / autocomplete / path / date 等 §3.4–§3.21）、异步反馈选型表（spinner / tasks / progress / taskLog / stream）、10 条必守原则（ESM `.js` 后缀 / 取消检查 / spinner API 迁移 / CI `--yes` 支持等）、端到端任务清单
  - `references/citty-api.md`：`defineCommand` / 子命令懒加载 / args schema / 插件 API / 自定义 help
  - `references/clack-prompts-api.md`：全部 prompt 类型 API（§3.4–§3.21）含参数选项与示例
  - `references/templates.md`：项目初始化目录结构 / 生产级 CLI 完整模板 / `package.json` + bin shebang 配置
  - `references/patterns.md`：CI 检测 / 错误恢复 / 动态选项 / 流式输出等实战模式
  - `references/pitfalls.md`：ESM 陷阱 / `spinner.stop()` API 迁移 / 0.2.x 类型变化速查清单

### Changed

- **模板**：整合 `release-deploy` command 的 references 文档，减少碎片化：
  - 删除独立文件 `changelog-voice-guide.md` / `pr-body-template.md` / `version-management-guide.md`（内容合并进主工作流）
  - 更新 `archive-patterns.md` 明确 Step 1–3 引用关系
  - 精简 `release-deploy.md` 指向整合后的文档

---

## [0.0.15] — 2026-05-17

### Fixed

- **模板**：统一 `evolution-retrospect` 系列与 `foundation-init/references/handoffs.md` 中的三层项目级文档引用，与 AGENTS.md § 2.6、`scaffold-service` 与 `update-service` 的实际事实来源对齐——废弃旧引用 `learnings.md` / `glossary.md` / `context/adr/`，改为：
  - `specforge/context/lessons.md` —— LESSONS 层（L-NNN 条目，由 `evolution-retrospect` Step 2.3 提名追加）
  - `specforge/context/context.md` —— Rules 层（领域术语 / 禁动清单 / code-style 等增量）
  - `specforge/context/architecture.md` —— Structure 层（ADR 列表 / 跨模块契约 / 扩展点等增量）
  - 涉及 5 个模板文件、~14 处引用：`evolution-retrospect.md`（Step 2.1/2.2/2.3 描述 / Step 6.1 产物清单 / 反规避提醒表）、`evolution-retrospect/references/excuse-table.md`（借口表 / 红线列表 / 使用指南示例）、`evolution-retrospect/references/retrospective-patterns.md`（改进项落点映射 / 复盘深度指南）、`foundation-init/references/handoffs.md`（evolution-retrospect 示例产物清单 / 流程图末行）、`templates/specforge/config.yaml`（context 段「领域术语」链接）
  - 全仓 grep 终审验证：旧引用 0 处遗漏

---

## [0.0.14] — 2026-05-17

### Added

- **模板**：新增 `ui-ux/codemirror6` skill（`type: ui-ux-rule`，~1534 行）—— 为 AI 代理提供使用 [CodeMirror 6](https://codemirror.net/) 构建浏览器内代码编辑器的程序性知识，禁用范围明确划在 Monaco / CM5 / 服务端文本处理之外：
  - SKILL.md 主体覆盖：心智模型（不可变 state、事务驱动、扩展可组合、DOM 库托管、位置基线）、`@codemirror/*` 包地图与版本一致性铁律（同 minor 锁定）、Vanilla / React 最小启动模板、State 与事务（`from/to` 引用变更前文档的同时性约束）、扩展四大原语（ViewPlugin / StateField / Facet / StateEffect）选型决策表、Compartment 动态重配（语言 / 主题 / 只读 / 特性开关）、性能规则、React 集成基本规则、反模式速查、调试与诊断
  - 7 份按需加载的 references：`extensions-primitives.md` / `language-support.md` / `autocomplete-and-lint.md` / `themes-and-keymaps.md` / `panels-tooltips-collab.md` / `react-integration.md` / `migration-cm5-to-cm6.md`
  - frontmatter 严格遵守 SpecForge 统一 5 字段（`name` / `type` / `description` / `version` / `author`），`description` 控制在 L1 ≤ 200 字契约内

---

## [0.0.13] — 2026-05-17

### Added

- **模板**：新增 `tools/npm-cicd-release` tool-command（~619 行）—— 把 `git-commit-template` / `docs-sync` / `github-ops` 三个 workflow-step skill 串成单向 npm 包发布流水线（Phase 0–6）：
  - **Phase 0 前置检测**：嗅探 `.github/workflows/release.yml` 是否含 `npm publish` / `pnpm publish` / `yarn publish` / `JS-DevTools/npm-publish` / `cycjimmy/semantic-release-action` / `changesets/action` 等模式，决定 Phase 5 是否做 npm 端校验
  - **Phase 1 Commit**：调用 `git-commit-template` Iron Law（lint + test 全绿、Conventional Commits、粒度审查）
  - **Phase 2 Docs Sync**：调用 `docs-sync` 6 步 SOP（不在此阶段推进 `last_sync_sha`，延后到 Phase 6；保留 `[Unreleased]` 占位段落）
  - **Phase 3 bump + tag**：调用 `github-ops` SOP（迁移 `[Unreleased]` → `[X.Y.Z]`、`pnpm check`、release commit、tag 严格指向 release commit SHA、push main + tag）
  - **Phase 4 监控**：`gh run watch` 关注 Verify tag / Extract release notes / Publish to npm / Create GitHub Release 等关键步骤
  - **Phase 5 三端验证（条件分支）**：`PUBLISH_TO_NPM=true` 走 `npm view + gh release view + gh run`；`false` 仅校验 GitHub Release 与 workflow，跳过 `npm view`
  - **Phase 6 state 推进**：原子写 `.docs-sync-state.json`，commit `docs: 推进 docs-sync 基线至 vX.Y.Z release commit`
  - 配套 3 份 references：`preflight-checklist.md`（11 项前置探测）/ `publish-detection.md`（release.yml 形态判定矩阵 + 误判排除）/ `failure-recovery.md`（4 类失败场景的回滚剧本 + 与 P9 的衔接）
  - 通过 `command-creator` skill 的 `quick_validate_command.py` 结构校验

---

## [0.0.12] — 2026-05-17

### Added

- **模板**：新增 `ui-ux/pierre-diffs-trees` skill（`type: ui-ux-rule`，~4276 行）—— 为 AI 代理提供使用 [@pierre/diffs](https://diffs.com/docs)（高性能代码差异渲染）与 [@pierre/trees](https://trees.software/docs)（路径优先文件树）构建 IDE / PR / Merge Conflict / 代码审查界面的程序性知识：
  - SKILL.md 主体覆盖：包结构与子路径入口、核心心智模型（HTML-first + Shadow DOM、路径优先 model）、组件选型决策表、Diffs 关键能力（annotations / accept-reject hunks / merge conflict resolution / 主题）、Trees 关键能力（Git 状态 / 自定义图标 / 命令式状态变更）、Shadow DOM 主题陷阱、性能优化路径（Virtualizer + Worker Pool）、SSR、CodeMirror 6 集成、常见陷阱速查
  - 9 份按需加载的 references：`diffs-react-api.md` / `diffs-vanilla-api.md` / `trees-react-api.md` / `trees-vanilla-api.md` / `advanced-rendering.md` / `theming-and-shadow-dom.md` / `codemirror-integration.md` / `accept-reject-and-conflicts.md` / `troubleshooting.md`
  - frontmatter 严格遵守 SpecForge 统一 5 字段（`name` / `type` / `description` / `version` / `author`），`description` 196 字符达 L1 ≤200 字契约

---

## [0.0.11] — 2026-05-17

### Added

- **模板**：`workflow-steps/github-ops` skill 升级到 `v1.1.0`，新增基于 `CHANGELOGS.md` 的 GitHub Release notes 注入完整方案：
  - 新增 `references/release-notes-injection.md`（236 行）—— awk 抽取 `## [X.Y.Z]` 段落 → `body_path` 注入；含事后回填（`gh release edit --notes-file`）、批量历史版本回填、多语言 CHANGELOG 拼接、PR 流程下的 `.github/release.yml` 分类配置 4 类进阶模式
  - 新增 `references/version-bump-flow.md`（232 行）—— bump → release commit → tag 指向 release commit SHA → push → 三端验证完整 SOP；含失败回滚 4 类场景（publish 前 / publish 后步骤失败 / npm 已上传但 workflow 报错 / npm 不允许重发同版本号）
- `workflow-yaml-reference.md` 新增 `Extract release notes from CHANGELOGS.md` 步骤的完整 YAML + 注解，并补充 `body_path` 与 `generate_release_notes: true` 的共存语义说明（人写说明 + 机器追溯索引叠加）
- `troubleshooting-playbook.md` 新增两类故障案例：#10 「GitHub Release 正文为空 / 仅一行 Full Changelog」、#11 「Extract release notes 步骤抽空」；排查 checklist 从 8 项扩到 10 项

### Changed

- `workflow-steps/github-ops` skill frontmatter 补齐 SpecForge 统一 5 字段（原缺 `type / version / author`），`description` 从 280+ 字符精简到 196 字符以达 L1 ≤200 字契约
- `workflow-steps/github-ops` SKILL.md 主体瘦身（358 → 282 行），保留导航 + 关键 SOP，大块细节按主题下沉到 references；新增 §5.3「Release notes 不能为空」作为 npm 发布的强约束指针
- 仓库自身 `.github/workflows/release.yml`：在 `Verify bin entry` 与 `Publish to npm` 之间插入 `Extract release notes from CHANGELOGS.md` 步骤；`Create GitHub Release` 增加 `body_path: release-notes.md`，使每次 release 的 GitHub 页面正文与 CHANGELOG 段落严格一致

---

## [0.0.10] — 2026-05-17

### Changed

- `foundation-init` workflow command 升级到 `v1.1.0`：在双目录搭建之外，新增 Step 4 「AI 协作文档同步（AGENTS.md + CLAUDE.md）」，把项目根目录的 AI 协作手册视为初始化产物的一部分；Iron Law 同步收紧——只产出 `specforge/` 双目录而不落地或更新 AGENTS.md / CLAUDE.md 视为残次品。
- `foundation-init` 后续步骤顺序整理：原 Step 4「宪法初始化」顺延为 Step 5；原 Step 5「Profile 选择」顺延为 Step 6；首轮 Token 预算估算从 ~3000 调整为 ~3500。
- `foundation-init` brownfield 分支处理增强：当根目录已存在 AGENTS.md / CLAUDE.md 时，由 `project-inventory` 走采纳决策（参见 `tools/project-inventory/references/ai-doc-merge-policy.md`），foundation-init 在 Step 4 仅做差量补齐而非覆写。

### Added

- `foundation-init` 新增决策矩阵：根目录 AGENTS.md / CLAUDE.md 在 greenfield / brownfield 两类场景下的处理路径；并列出 AGENTS.md 必须涵盖的最小章节集（项目身份 / 核心架构 / 仓库布局 / 开发命令 / 代理行为规约 / 常见陷阱 / 相关文档）。
- `foundation-init` 引入 4 条 Karpathy 编码原则作为 CLAUDE.md 的强制骨架（编码前思考 / 简洁优先 / 精准修改 / 目标驱动执行），每条原则需配 ❌ 反例 + ✅ 正例 + "What this prevents"。
- `foundation-init` 新增可选的 docs-sync 状态登记步骤：将 AGENTS.md / CLAUDE.md 写入 `.docs-sync-state.json#tracked_docs`，便于后续长期同步。
- `foundation-init` Step 4 新增自检清单：AGENTS.md ≤ 500 行 / 仓库布局与实际目录一致 / 开发命令均能在根目录执行 / CLAUDE.md 4 条原则齐全 / 不覆盖既有 brownfield 项目铁律 / 已在 project.md 与 config.yaml 引用这两份文件。
- `foundation-init` 错误字典扩展：补齐 `E001_missingPrerequisiteArtifact` / `E005_contextOverload` / `E010_repeatedFailurePattern` 触发场景说明，并新增 References 导航表。
- `foundation-init` 新增 References：`agents-md-sync.md`（AGENTS.md 完整章节模板）、`claude-md-principles.md`（4 条编码原则展开）。
- **模板**：新增 `workflow-steps/long-run-goal-builder` skill —— 为长跑 AI Coding 任务（Codex /goal、Claude Code、Cursor、Kiro autopilot）构建可审计、不假完成、抗漂移的 goal 提示词；激活后按 7 阶段流程澄清需求 / 自动加载 AGENTS.md / 当前 spec / lessons.md / 输出 5 段式 goal 与长跑健康守则；附 6 份 references（context-loading / examples / long-run-health / project-types / scenarios / tool-adapters）。

---

## [0.0.9] — 2026-05-15

### Changed

- `requirements-clarify` workflow command 升级到 `v2.1.0`：强化规格产出门禁，要求在 requirements 阶段显式产出独立标题 `目标（Goals）` 与 `非目标（Non-Goals）`，并在方案模板与自检步骤中加入非目标可审查性检查。
- 重写 `requirements-clarify` 的 PROPOSAL 章节建议：从旧的 `Why/What Changes/Capabilities` 导向切换为 `Context + Goals + Non-Goals + EARS 验收标准 + 风险/待确认项` 导向。
- 对齐框架规则与模板：`templates/.specforge/config.yaml` 的 requirements `requiredSections` 改为分别要求 `目标（Goals）` 与 `非目标（Non-Goals）` 两个独立章节。
- `templates/.specforge/templates/PROPOSAL.md` 增强：新增可选章节 `待确认项（Open Questions）` 与 `关键决策固化（Decision Log）`，并强化非目标写作约束。
- 更新下游参考 `planning-breakdown/references/artifact-graph-spec.md`，消除对旧 proposal 章节命名的引用漂移。

### Added

- 新增 `requirements-clarify` 参考文档：`references/requirements-spec-blueprint.md`，沉淀高密度 requirements 结构蓝图（Goals/Non-Goals 双标题、Open Questions、EARS、Impact/Validation、Decision Log）。

---

## [0.0.8] — 2026-05-12

### Changed

- 重命名 `templates/.specforge/skills/ui-ux/mantine-ui/` 为 `mantine/`（简化命名）
- 增强 `UpdateService`：支持检测并补全缺失的用户资产文件（`context.md` / `architecture.md` / `lessons.md`）
- 改进 `specforge update` 命令输出：显示补全的用户资产文件列表

### Fixed

- 修复 `.gitignore` 误忽略 `templates/` 子目录导致模板文件缺失的问题
- 补全缺失的模板文件（`templates/.specforge/` 下的 workflow commands 和 skills）

### Added

- Mantine UI skill 新增参考文档：`advanced-patterns.md`、`hooks-cheatsheet.md`、`spotlight-and-navigation.md`

---

## [0.0.7] — 2026-05-12

### Added

- 三层项目级文档体系：`specforge/context/context.md`（rules）/ `architecture.md`（structure）/ `lessons.md`（LESSONS L-NNN）
- DESIGN 模板 § 9 架构沉淀建议章节
- `evolution-retrospect` 架构沉淀同步 Step（§ 9 批量 promote）
- `project-inventory` tool-command（Brownfield 入场扫描 + AI 文档交互）
- `codebase-health` tool-command（探针巡检 + 禁动清单 upsert）
- `context-reset-protocol` skill（清窗/重启协议 + PROGRESS 模板）
- `design-explore` Step 1.5 既有架构对齐（Brownfield 分支）
- `design-explore` Step 3.5 v0 草稿门禁
- `implementation-build` 提交前边界对账（`enforceBoundary` + E009）
- `implementation-build` LESSONS grep + 声明差异步骤
- LESSONS 提名四条件过滤 + `L-NNN` 格式（`lessons-service`）
- `validateV0Draft` 校验函数（5 类违例）
- `checkL3LoadBudget` / `checkRoutingStatement` 接入 `doctor --check-disclosure`
- `loadDisclosureConfig` 向后兼容加载（缺配置回退默认值）
- 路由声明六要素 preamble（8 个 workflow command）
- Token 成本预算章节（README.md / README-ZH.md）
- **模板**：新增 `workflow-steps/language-adapters` skill（Go / Node / Python / Spring Boot 四语言适配器）
- **服务层**：新增 `design-explore-service`（v0 草稿校验 + 既有架构对齐）
- **服务层**：新增 `evolve-service`（架构沉淀同步 + LESSONS 提名）
- **服务层**：新增 `health-service`（探针巡检 + 禁动清单 upsert）
- **服务层**：新增 `implementation-service`（边界对账 + LESSONS grep）
- **服务层**：新增 `inventory-service`（Brownfield 入场扫描 + AI 文档检测）
- **服务层**：新增 `lessons-service`（L-NNN 条目 CRUD + 四条件过滤）
- **Core**：新增 `disclosure-config`（L3 预算 + 路由声明配置加载）
- **Core**：新增 `task-schema`（TASKS.md 结构化 Zod schema）

### Changed

- Constitution 升版 1.0.0 → 1.1.0（新增 P9 反重复与验证前置）
- `doctor --check-compat` 新增 P9 引用校验
- TASKS 模板追加 `read_files` / `write_files` 字段
- `.gitignore` 新增 `.specforge/` 和 `specforge/` 忽略规则（本地初始化产物不入库）
- 从版本控制中移除 `.specforge/` 和 `specforge/` 目录（`git rm --cached`）
- Workflow command 模板精简（移除冗余 v0-draft-template reference，优化 preamble）
- `scaffold-service` 优化 context 文件创建逻辑（upsertUserAsset 语义）

### Removed

- 删除仓库级 `.agents/skills/` 目录（github-ops / skill-creator 已完全迁移至 `templates/.specforge/skills/`）
- 删除 `CLAUDE.md`（内容已吸收进 AGENTS.md）
- 删除 `UPGRADE_SUMMARY.md`（一次性文档，已完成使命）
- 删除 `references/reference-projects-analysis.md`（内容已吸收进 README Heritage 表）
- 删除 `templates/.specforge/commands/tools/debugging/`（tool command 示例已由 codebase-health / project-inventory 取代）
- 删除 `.specforge/extensions.yaml`（钩子声明已内化到 config.yaml）
- 删除 `.specforge/templates/` 中的 PROPOSAL.md / CHECKLIST.md / RETROSPECTIVE.md（精简为 DESIGN.md + TASKS.md + PROGRESS.md）

### Docs

- README Heritage 表格追加 flow-kit (rihebty) 行
- README Acknowledgements 追加 flow-kit 条目
- README 导语新增「吸收方法论，而非复制实现」声明
- AGENTS.md 新增 § 2.5 P9 / § 2.6 三层文档 / § 7.6-7.8 L3 预算+路由+LESSONS grep

### Constitution

- P9 — 反重复与验证前置（antiRepetitionAndEvidence）
- E009_scopeBoundaryViolation 错误码
- E010_repeatedFailurePattern 错误码

---

## [0.0.6] — 2026-05-10

### 新增

- **模板（语言栈技能扩容）**：新增 6 个符合 SpecForge 三级渐进披露契约的技能模板，统一 5 字段 frontmatter、description ≤ 200 字、正文 ≤ 500 行：
  - `code-styles/python-patterns` —— Python 惯用法与代码风格（PEP 8、类型注解、EAFP、dataclass、装饰器、并发选型、pyproject 工具链）
  - `code-styles/pytorch-patterns` —— PyTorch 设备无关代码、可复现实验、训练/评估循环、DataLoader、AMP、checkpoint、`torch.compile`
  - `testing/python-testing-pytest` —— pytest 断言、fixture 分层、parametrize、mock 与 patch 口诀、async 测试、tmp_path、覆盖率门禁
  - `testing/springboot-tdd` —— JUnit 5 + Mockito、`@WebMvcTest` / `@DataJpaTest` / `@SpringBootTest` 切片矩阵、Testcontainers、JaCoCo 门禁
  - `workflow-steps/springboot-verification` —— Spring Boot 发布前六相闭环（构建 / 静态 / 测试 + 覆盖率 / 安全扫描 / 格式化 / diff review）
  - `security/springboot-security` —— Spring Security 生产基线（认证授权、Bean Validation、CSRF/CORS/响应头、密码哈希、秘密管理、限流、上传、日志脱敏、依赖 CVE）
- **模板**：新增 `ui-ux/editorial-minimalism` —— 对标 Linear / Raycast / Arc 的 Editorial Minimalism 设计规范（Tailwind + Framer Motion + Lucide，OKLCH + Accent-Dim + rounded-2xl + Bento Grid）

### 变更

- **AGENTS.md**：新增"语言与本地化"小节，统一约定用户交互 / 代码注释 / 文档 / commit message / 模板文案的中英文使用边界
- **skills 目录整理**：移除仓库级 `.agents/skills/` 下的 docs-sync / github-ops / skill-creator 镜像（已迁移至 `.specforge/skills/` 与 `templates/.specforge/skills/` 的单一事实来源，避免双写）

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

- [Unreleased](https://github.com/NAMEWTA/specforge/compare/v0.0.11...HEAD)
- [0.0.11](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.11)
- [0.0.10](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.10)
- [0.0.9](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.9)
- [0.0.8](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.8)
- [0.0.7](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.7)
- [0.0.6](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.6)
- [0.0.5](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.5)
- [0.0.4](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.4)
- [0.0.3](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.3)
- [0.0.2](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.2)
- [0.0.1](https://github.com/NAMEWTA/specforge/releases/tag/v0.0.1)
