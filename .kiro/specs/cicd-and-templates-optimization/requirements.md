# Requirements Document

## Introduction

本文档定义 SpecForge 项目在 CI/CD 流程完善和 templates/ 优化两个方面的需求。SpecForge 当前处于 v0.0.2 早期开发阶段，CI/CD 流程存在已弃用 Action、重复 setup 步骤、缺少自动化等问题；templates/ 目录虽已建立双目录模型和高质量 workflow commands，但在产物模板、技能覆盖面、目录完整性方面仍有提升空间。本需求旨在系统化解决这些问题，使项目具备生产级发布能力和更完善的模板体系。

## Glossary

- **CI_Pipeline**: GitHub Actions 持续集成流水线，负责代码质量检查（lint、test、build）
- **Release_Pipeline**: GitHub Actions 发布流水线，由 git tag 触发，执行 npm 发布和 GitHub Release 创建
- **Build_System**: TypeScript 编译系统，将 `src/` 编译到 `dist/`，由 `tsc` 执行
- **Package_Config**: `package.json` 中定义的包元数据，包括 `bin`、`files`、`exports` 等字段
- **Template_System**: `templates/` 目录下的初始化模板资产，由 `specforge init` 命令复制到目标项目
- **Framework_Assets**: `.specforge/` 目录下的框架资产，包含 commands、skills、templates
- **User_Assets**: `specforge/` 目录下的用户资产，包含 config、context、spec、changes、archive
- **Artifact_Template**: `.specforge/templates/` 下的产物模板文件（如 PROPOSAL.md、DESIGN.md、TASKS.md）
- **Skill_Template**: `.specforge/skills/<category>/<name>/SKILL.md` 格式的技能定义文件
- **Dependabot_Config**: GitHub Dependabot 配置文件，自动检测和更新依赖版本
- **Composite_Action**: GitHub Actions 可复用的组合操作，封装重复步骤为单一引用

## Requirements

### Requirement 1: 替换已弃用的 GitHub Release Action

**User Story:** 作为项目维护者，我希望发布流水线使用现代且受维护的 GitHub Release 创建方案，以避免安全风险和功能缺失。

#### Acceptance Criteria

1. WHEN Release_Pipeline 执行到 GitHub Release 创建步骤时，THE Release_Pipeline SHALL 使用 `softprops/action-gh-release` 或 GitHub CLI (`gh release create`) 替代已弃用的 `actions/create-release@v1`
2. WHEN Release_Pipeline 成功发布 npm 包后，THE Release_Pipeline SHALL 创建对应的 GitHub Release，包含 tag 名称、版本号和 changelog 链接
3. WHEN Release_Pipeline 创建 GitHub Release 时，THE Release_Pipeline SHALL 自动从 git log 或 CHANGELOG.md 生成 release notes 内容
4. IF Release_Pipeline 创建 GitHub Release 失败，THEN THE Release_Pipeline SHALL 输出错误信息并以非零退出码终止，同时保留已成功的 npm 发布结果

### Requirement 2: 消除 CI 流水线中的重复 Setup 步骤

**User Story:** 作为项目维护者，我希望 CI 流水线中的重复环境配置步骤被抽取为可复用组件，以降低维护成本并保持一致性。

#### Acceptance Criteria

1. THE CI_Pipeline SHALL 通过 Composite Action 或 reusable workflow 将 checkout、Node.js setup、pnpm setup、cache 配置、依赖安装封装为单一可复用步骤
2. WHEN CI_Pipeline 的 lint、test、build 三个 job 执行时，THE CI_Pipeline SHALL 各自引用同一个可复用 setup 步骤，而非各自重复定义
3. WHEN 需要修改 Node.js 版本或 pnpm 版本时，THE CI_Pipeline SHALL 仅需在一处修改即可全局生效
4. THE CI_Pipeline SHALL 在 lint、test、build 三个 job 全部通过后才允许 PR 合并（通过 branch protection 配置）

### Requirement 3: 修复 npm 发布时的 bin 入口问题

**User Story:** 作为 npm 包使用者，我希望安装 specforge 后能直接运行 `specforge` 命令，而无需依赖 tsx 运行时。

#### Acceptance Criteria

1. THE Build_System SHALL 在编译阶段生成 `dist/cli/index.js` 作为 CLI 入口文件
2. THE Package_Config SHALL 将 `bin.specforge` 字段指向编译后的 JavaScript 文件（如 `./dist/cli/index.js`），而非源码文件 `./bin/specforge.ts`
3. WHEN 用户通过 npm 全局安装 specforge 后执行 `specforge` 命令时，THE Build_System SHALL 确保入口文件包含正确的 Node.js shebang（`#!/usr/bin/env node`）
4. WHILE 开发阶段使用 `pnpm dev` 命令时，THE Build_System SHALL 保留 tsx 直接运行源码的能力，不影响开发体验
5. THE Package_Config SHALL 在 `files` 字段中移除 `bin` 目录（源码入口），仅发布 `dist` 和 `templates`

### Requirement 4: 添加依赖自动更新配置

**User Story:** 作为项目维护者，我希望依赖版本更新能被自动检测并创建 PR，以减少手动维护负担并及时获取安全补丁。

#### Acceptance Criteria

1. THE Dependabot_Config SHALL 配置对 npm 依赖（`package.json`）的自动版本检测，检测频率为每周一次
2. THE Dependabot_Config SHALL 配置对 GitHub Actions 依赖（`.github/workflows/`）的自动版本检测，检测频率为每周一次
3. WHEN Dependabot 检测到可用更新时，THE Dependabot_Config SHALL 自动创建包含版本升级的 Pull Request
4. THE Dependabot_Config SHALL 将 PR 数量限制为每类最多 5 个同时打开的 PR，避免 PR 洪泛
5. THE Dependabot_Config SHALL 为生成的 PR 添加 `dependencies` 标签以便筛选

### Requirement 5: 添加产物模板文件

**User Story:** 作为使用 SpecForge 的开发者，我希望 `specforge init` 后 `.specforge/templates/` 目录包含标准产物模板，以便 workflow commands 在各阶段生成结构化产物时有模板可用。

#### Acceptance Criteria

1. THE Template_System SHALL 在 `templates/.specforge/templates/` 目录下提供以下产物模板文件：PROPOSAL.md、DESIGN.md、TASKS.md、CHECKLIST.md、RETROSPECTIVE.md
2. WHEN workflow command 需要生成阶段产物时，THE Template_System SHALL 提供包含 YAML frontmatter（name、type、phase、version）和标准章节结构的模板
3. THE Artifact_Template SHALL 使用 `{{variableName}}` 占位符语法，与 `template-renderer.ts` 兼容
4. THE Artifact_Template SHALL 在每个模板中包含该产物的必需章节（对应 `config.yaml` 中 `rules.<phase>.artifacts` 定义的 `requiredSections`）
5. IF 产物模板缺少必需章节，THEN THE Template_System SHALL 在 `specforge doctor` 检查时报告 E001_missingPrerequisiteArtifact 错误

### Requirement 6: 补充缺失的用户资产目录

**User Story:** 作为使用 SpecForge 的开发者，我希望 `specforge init` 后用户资产目录结构完整，包含 AGENTS.md 中描述的 `spec/` 和 `project.md`。

#### Acceptance Criteria

1. THE Template_System SHALL 在 `templates/specforge/` 目录下包含 `spec/` 子目录（含 `.gitkeep`）
2. THE Template_System SHALL 在 `templates/specforge/` 目录下包含 `project.md` 模板文件
3. WHEN `specforge init` 执行时，THE Template_System SHALL 将 `project.md` 模板中的 `{{projectName}}` 占位符替换为实际项目名称
4. THE User_Assets 的 `project.md` SHALL 包含以下章节：项目概述、技术栈、架构约束、领域术语、关键非功能需求、仓库约定

### Requirement 7: 扩展技能覆盖面

**User Story:** 作为使用 SpecForge 的开发者，我希望每个技能类别包含更多实用的示例技能，以便快速参考和复用。

#### Acceptance Criteria

1. THE Skill_Template SHALL 为 `architecture/` 类别补充至少 2 个技能：`event-driven-design`（事件驱动架构模式）和 `layered-architecture`（分层架构约束）
2. THE Skill_Template SHALL 为 `testing/` 类别补充至少 2 个技能：`tdd-workflow`（测试驱动开发流程）和 `integration-test-strategy`（集成测试策略）
3. THE Skill_Template SHALL 为 `security/` 类别补充至少 1 个技能：`auth-patterns`（认证授权模式）
4. THE Skill_Template SHALL 为 `workflow-steps/` 类别补充 `language-adapters/` 下的至少 3 个语言适配器：`node.md`、`python.md`、`go.md`
5. WHEN 新增技能时，THE Skill_Template SHALL 遵循渐进式披露三级规范：SKILL.md 主体不超过 500 行，详细参考材料放入 `references/` 子目录
6. THE Skill_Template SHALL 确保每个新增技能包含完整的 YAML frontmatter（name、description、version、author）

### Requirement 8: 确保 init 命令正确复制 templates 内容

**User Story:** 作为使用 SpecForge 的开发者，我希望 `specforge init` 命令能完整且正确地将 templates/ 中的所有内容复制到目标项目，包括新增的产物模板和技能文件。

#### Acceptance Criteria

1. WHEN `specforge init` 执行时，THE Template_System SHALL 将 `templates/.specforge/` 的完整目录结构复制到目标项目的 `.specforge/` 目录
2. WHEN `specforge init` 执行时，THE Template_System SHALL 将 `templates/specforge/` 的完整目录结构复制到目标项目的 `specforge/` 目录
3. WHEN `specforge init` 执行时，THE Template_System SHALL 处理所有 `.md` 文件中的 `{{variableName}}` 占位符替换
4. IF 目标项目已存在 `specforge/` 目录，THEN THE Template_System SHALL 提示用户确认是否覆盖，默认保留用户资产不覆盖
5. WHEN `specforge init` 完成后，THE Template_System SHALL 验证 `.specforge/templates/` 目录下的产物模板文件均已正确复制

### Requirement 9: Release 流水线增加 bin 入口验证

**User Story:** 作为项目维护者，我希望发布流水线在 npm publish 前验证 bin 入口文件的正确性，以防止发布损坏的 CLI 包。

#### Acceptance Criteria

1. WHEN Release_Pipeline 执行 build 步骤后，THE Release_Pipeline SHALL 验证 `dist/cli/index.js` 文件存在
2. WHEN Release_Pipeline 执行 build 步骤后，THE Release_Pipeline SHALL 验证 CLI 入口文件的第一行包含 `#!/usr/bin/env node` shebang
3. WHEN Release_Pipeline 执行 build 步骤后，THE Release_Pipeline SHALL 通过 `node dist/cli/index.js --help` 验证 CLI 可正常启动
4. IF bin 入口验证失败，THEN THE Release_Pipeline SHALL 终止发布流程并输出具体的验证失败原因

### Requirement 10: CI 流水线增加 PR 自动化

**User Story:** 作为项目维护者，我希望 PR 能自动获得标签分类，以便快速识别变更类型和影响范围。

#### Acceptance Criteria

1. WHEN 新 PR 被创建时，THE CI_Pipeline SHALL 根据修改的文件路径自动添加标签（如 `ci`、`templates`、`cli`、`docs`）
2. THE CI_Pipeline SHALL 通过 `.github/labeler.yml` 配置文件定义路径到标签的映射规则
3. WHEN PR 修改了 `.github/workflows/` 下的文件时，THE CI_Pipeline SHALL 自动添加 `ci` 标签
4. WHEN PR 修改了 `templates/` 下的文件时，THE CI_Pipeline SHALL 自动添加 `templates` 标签
5. WHEN PR 修改了 `src/` 下的文件时，THE CI_Pipeline SHALL 自动添加 `cli` 标签

### Requirement 11: 产物模板与 workflow commands 的契合性

**User Story:** 作为使用 SpecForge 的开发者，我希望产物模板的章节结构与对应 workflow command 的输出要求一致，以确保工作流的连贯性。

#### Acceptance Criteria

1. THE Artifact_Template 的 PROPOSAL.md SHALL 包含 `config.yaml` 中 `rules.requirements.artifacts.proposal.requiredSections` 定义的所有章节：目标与非目标、用户故事/用例、范围边界、验收标准、风险与未知项
2. THE Artifact_Template 的 DESIGN.md SHALL 包含 `config.yaml` 中 `rules.design.artifacts.design.requiredSections` 定义的所有章节：架构概览、接口契约、错误分类与错误码策略、数据流/状态机、测试策略
3. THE Artifact_Template 的 TASKS.md SHALL 包含 `config.yaml` 中 `rules.planning.artifacts.tasks.requiredFields` 要求的结构：每个任务含目标、范围、依赖、验收方式
4. WHEN workflow command 引用产物模板生成输出时，THE Template_System SHALL 确保模板中的占位符与 command 传入的变量名一致
5. THE Artifact_Template 的 RETROSPECTIVE.md SHALL 包含 `config.yaml` 中 `rules.evolution.hardGates` 要求的结构：摩擦点、根因、改进项、落地位置
