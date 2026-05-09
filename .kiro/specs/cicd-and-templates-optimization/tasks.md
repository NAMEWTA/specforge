# Tasks

## Task 1: 创建 Composite Action 消除 CI 重复 Setup

- [x] 1.1 创建 `.github/actions/setup/action.yml` composite action，封装 checkout、Node.js setup、pnpm setup、cache 配置、依赖安装
- [x] 1.2 重构 `.github/workflows/ci.yml`，lint/test/build 三个 job 改为引用 composite action
- [x] 1.3 重构 `.github/workflows/release.yml`，setup 步骤改为引用 composite action
- [x] 1.4 验证 CI 工作流语法正确（本地 `actionlint` 或推送后观察）

## Task 2: 修复 npm 发布时的 bin 入口问题

- [x] 2.1 创建 `scripts/inject-shebang.mjs`，在 `dist/cli/index.js` 头部注入 `#!/usr/bin/env node` shebang（幂等）
- [x] 2.2 创建 `scripts/verify-bin.mjs`，验证 dist/cli/index.js 存在、包含 shebang、可通过 `node dist/cli/index.js --help` 启动
- [x] 2.3 修改 `package.json`：`bin.specforge` 指向 `./dist/cli/index.js`，`files` 移除 `bin` 目录，`build` 脚本追加 shebang 注入步骤
- [x] 2.4 为 `inject-shebang.mjs` 和 `verify-bin.mjs` 编写单元测试
- [x] 2.5 运行 `pnpm build` 验证完整构建流程，确认 `dist/cli/index.js` 包含 shebang 且可执行

## Task 3: 替换已弃用的 GitHub Release Action

- [x] 3.1 在 `release.yml` 中将 `actions/create-release@v1` 替换为 `softprops/action-gh-release@v2`，启用 `generate_release_notes: true`
- [x] 3.2 在 `release.yml` 的 build 步骤后、publish 步骤前添加 bin 入口验证步骤（调用 `verify-bin.mjs`）
- [x] 3.3 确保 Release 失败时 npm 发布结果保留（GitHub Release 创建作为独立步骤，不影响已完成的 npm publish）

## Task 4: 添加 Dependabot 配置

- [x] 4.1 创建 `.github/dependabot.yml`，配置 npm 和 github-actions 两个生态系统的每周自动检测，每类最多 5 个 PR，添加 `dependencies` 标签

## Task 5: 添加 PR 自动标签

- [x] 5.1 创建 `.github/labeler.yml`，定义路径到标签的映射规则（ci、templates、cli、docs）
- [x] 5.2 创建 `.github/workflows/label-pr.yml` 工作流，使用 `actions/labeler@v5` 在 PR 创建时自动添加标签

## Task 6: 添加产物模板文件

- [x] 6.1 创建 `templates/.specforge/templates/PROPOSAL.md`，包含 frontmatter 和 config.yaml 中定义的必需章节（目标与非目标、用户故事/用例、范围边界、验收标准、风险与未知项）
- [x] 6.2 创建 `templates/.specforge/templates/DESIGN.md`，包含 frontmatter 和必需章节（架构概览、接口契约、错误分类与错误码策略、数据流/状态机、测试策略）
- [x] 6.3 创建 `templates/.specforge/templates/TASKS.md`，包含 frontmatter 和必需结构（每个任务含目标、范围、依赖、验收方式）
- [x] 6.4 创建 `templates/.specforge/templates/CHECKLIST.md`，包含 frontmatter 和质量检查清单结构
- [x] 6.5 创建 `templates/.specforge/templates/RETROSPECTIVE.md`，包含 frontmatter 和必需结构（摩擦点、根因、改进项、落地位置）
- [x] 6.6 删除 `templates/.specforge/templates/.gitkeep`（目录已有实际文件）

## Task 7: 补充缺失的用户资产目录

- [x] 7.1 创建 `templates/specforge/spec/.gitkeep`
- [x] 7.2 创建 `templates/specforge/project.md`，包含 `{{projectName}}` 占位符和标准章节（项目概述、技术栈、架构约束、领域术语、关键非功能需求、仓库约定）

## Task 8: 扩展技能覆盖面 — architecture 类别

- [x] 8.1 创建 `templates/.specforge/skills/architecture/event-driven-design/SKILL.md`，包含完整 frontmatter 和事件驱动架构模式内容
- [x] 8.2 创建 `templates/.specforge/skills/architecture/layered-architecture/SKILL.md`，包含完整 frontmatter 和分层架构约束内容

## Task 9: 扩展技能覆盖面 — testing 类别

- [x] 9.1 创建 `templates/.specforge/skills/testing/tdd-workflow/SKILL.md`，包含完整 frontmatter 和 TDD 流程内容
- [x] 9.2 创建 `templates/.specforge/skills/testing/integration-test-strategy/SKILL.md`，包含完整 frontmatter 和集成测试策略内容

## Task 10: 扩展技能覆盖面 — security 和 workflow-steps 类别

- [x] 10.1 创建 `templates/.specforge/skills/security/auth-patterns/SKILL.md`，包含完整 frontmatter 和认证授权模式内容
- [x] 10.2 创建 `templates/.specforge/skills/workflow-steps/language-adapters/references/node.md`，Node.js 语言适配器
- [x] 10.3 创建 `templates/.specforge/skills/workflow-steps/language-adapters/references/go.md`，Go 语言适配器
- [x] 10.4 将现有 `python-conventions.md` 重命名或确认其作为 Python 适配器的角色（已满足 python.md 需求）

## Task 11: 验证 init 命令对新模板的兼容性

- [x] 11.1 编写集成测试验证 `specforge init` 后 `.specforge/templates/` 目录包含所有 5 个产物模板
- [x] 11.2 编写集成测试验证 `specforge init` 后 `specforge/spec/` 目录存在
- [x] 11.3 编写集成测试验证 `specforge init` 后 `specforge/project.md` 存在且 `{{projectName}}` 已被替换
- [x] 11.4 运行 `pnpm test` 确认所有测试通过

## Task 12: 最终验证

- [x] 12.1 运行 `pnpm check`（lint + test + build）确认全部通过
- [x] 12.2 验证 `node dist/cli/index.js --help` 正常输出
- [x] 12.3 验证 `node dist/cli/index.js init --help` 正常输出
