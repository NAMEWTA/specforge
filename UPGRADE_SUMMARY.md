# SpecForge 命令与技能模板融合升级总结

## 升级概览

本次升级按照 `command-creator/SKILL.md` 定义的结构规范，对 workflow commands 和 skills 进行了全面融合升级，并创建了 references 共享资源文档。当前 v0.2.0 标准生命周期为 8 阶段，`operations` 已合并进 `release`。

---

## Phase 2: 升级 8 个 Workflow Commands ✅

### 升级内容

所有命令统一遵循以下结构：
1. **YAML Frontmatter** - name, type, description（含触发场景）, version, author
2. **Preamble** - 技能注入 + 前置产物检测 + 环境检测
3. **Iron Law** - 不可妥协规则
4. **Steps** - 结构化步骤（含"同时读取"config.yaml说明）
5. **完成衔接** - 产物清单 + 下一步命令 + 警告
6. **常见阻断与纠偏** - 错误字典引用（E001-E005）
7. **反规避提醒** - 借口 vs 现实对照表

### 具体改进

| 命令 | 主要改进 |
|------|---------|
| **foundation-init** | 调整步骤顺序（宪法版本管理移到Step 4内），统一产物清单格式，补充错误字典引用位置 |
| **requirements-clarify** | 强化产物清单（完整路径+描述），明确 handoff 条件 |
| **design-explore** | 标准化产物清单格式，明确 handoff 到 planning-breakdown |
| **planning-breakdown** | 统一产物清单格式，修正 phase 字段（tasks → planning） |
| **implementation-build** | 统一产物清单格式，明确 handoff 到 quality-verify |
| **quality-verify** | 统一产物清单格式，明确 handoff 到 release-deploy |
| **release-deploy** | 统一产物清单格式，承接 runbook/监控/告警/回滚语义，明确 handoff 到 evolution-retrospect |
| **evolution-retrospect** | 添加 Iron Law，统一产物清单格式，标注为工作流终点和起点 |

---

## Phase 3: 升级 7 个 Skills ✅

### 升级内容

所有技能统一遵循以下结构：
1. **YAML Frontmatter** - name, type, description（含触发场景和触发词）, version, author
2. **Iron Law** - 不可妥协规则
3. **核心规则/具体内容** - 规则、模板、清单
4. **自检列表/Red Flags** - 质量检查点
5. **反模式**（如适用）- 反模式对照表

### 具体改进

| 技能 | 类型 | 主要改进 |
|------|------|---------|
| **microservices-boundary** | architecture-rule | 添加 Iron Law（禁止未定义接口契约就开始开发），增加反模式表格 |
| **chinese-commit-conventions** | code-style | 添加 Iron Law（禁止非 Conventional Commits 格式），增加自检列表和反模式表格 |
| **chinese-code-review** | domain-rule | 添加 Iron Law（禁止无建设性批评），增加审查完成自检列表 |
| **sql-injection-prevention** | security-rule | 添加 Iron Law（禁止字符串拼接构造 SQL），调整 Red Flags 和自检列表顺序 |
| **api-test-strategy** | testing-rule | 添加 Iron Law（禁止测试前写生产代码），增加测试自检列表 |
| **mobile-adaptation** | ui-ux-rule | 添加 Iron Law（禁止未做移动端测试就声称支持），增加移动端适配自检列表 |
| **git-commit-template** | workflow-step | 添加 Iron Law（禁止提交破坏构建的代码），增加提交完成自检列表 |

---

## Phase 4: 创建 References 共享资源 ✅

### 创建的文档

| 文档 | 路径 | 内容 |
|------|------|------|
| **phase-mapping.md** | `foundation-init/references/` | 8阶段↔参考技能/机制映射表，核心机制详解，错误字典引用 |
| **frontmatter-spec.md** | `foundation-init/references/` | Frontmatter完整规范，字段说明，命名规范，常见错误示例，校验规则 |
| **preamble-patterns.md** | `foundation-init/references/` | Preamble标准结构，各阶段示例，技能注入机制，阶段校验模式 |
| **handoffs.md** | `foundation-init/references/` | Handoff设计原则，标准格式，各阶段示例，错误处理Handoff，最佳实践 |

---

## Phase 5: 验证与测试 ✅

### 验证结果

运行 `validate_templates.sh` 脚本：
- ✅ 错误数：0
- ✅ 警告数：0
- ✅ 所有文件验证通过

### 验证项

1. **Frontmatter 格式** - 所有文件包含必需的5个字段（name/type/description/version/author）
2. **Iron Law** - 所有命令和技能都包含 Iron Law 部分
3. **完成衔接** - 所有命令都包含完成衔接步骤
4. **自检列表** - 所有技能都包含自检列表
5. **反规避提醒** - 所有命令都包含反规避提醒

---

## 关键成功标准达成情况

| 标准 | 状态 | 说明 |
|------|------|------|
| 所有命令和技能遵循统一结构 | ✅ | 8 workflow commands + skills 全部统一 |
| Iron Law 明确且可执行 | ✅ | 每个文件都有针对性的 Iron Law |
| 产物清单清晰且完整 | ✅ | 使用完整路径+描述格式 |
| handoff 平滑无断层 | ✅ | 明确下一步命令+警告信息 |
| 错误字典引用一致 | ✅ | 统一使用 E001-E005 编号 |
| 反规避提醒有针对性 | ✅ | 每个命令4-5条针对性的借口vs现实 |
| 渐进式披露合理 | ✅ | 长内容移动到 references/ |

---

## 文件变更统计

### 修改的文件（16个）

**Commands (8个)**：
- `templates/.specforge/commands/workflow/foundation-init/foundation-init.md`
- `templates/.specforge/commands/workflow/requirements-clarify/requirements-clarify.md`
- `templates/.specforge/commands/workflow/design-explore/design-explore.md`
- `templates/.specforge/commands/workflow/planning-breakdown/planning-breakdown.md`
- `templates/.specforge/commands/workflow/implementation-build/implementation-build.md`
- `templates/.specforge/commands/workflow/quality-verify/quality-verify.md`
- `templates/.specforge/commands/workflow/release-deploy/release-deploy.md`
- `templates/.specforge/commands/workflow/evolution-retrospect/evolution-retrospect.md`

**Skills (7个)**：
- `templates/.specforge/skills/architecture/microservices-boundary/SKILL.md`
- `templates/.specforge/skills/code-styles/chinese-commit-conventions/SKILL.md`
- `templates/.specforge/skills/domain-rules/chinese-code-review/SKILL.md`
- `templates/.specforge/skills/security/sql-injection-prevention/SKILL.md`
- `templates/.specforge/skills/testing/api-test-strategy/SKILL.md`
- `templates/.specforge/skills/ui-ux/mobile-adaptation/SKILL.md`
- `templates/.specforge/skills/workflow-steps/git-commit-template/SKILL.md`

**Command Creator (1个)**：
- `templates/.specforge/skills/workflow-steps/command-creator/SKILL.md`

### 新建的文件（5个）

**References (4个)**：
- `templates/.specforge/commands/workflow/foundation-init/references/phase-mapping.md`
- `templates/.specforge/commands/workflow/foundation-init/references/frontmatter-spec.md`
- `templates/.specforge/commands/workflow/foundation-init/references/preamble-patterns.md`
- `templates/.specforge/commands/workflow/foundation-init/references/handoffs.md`

**验证脚本 (1个)**：
- `validate_templates.sh`

---

## 后续建议

1. **持续维护**：新增命令或技能时，参照 `command-creator/SKILL.md` 和 references 文档
2. **定期验证**：运行 `validate_templates.sh` 确保所有文件符合规范
3. **渐进式披露**：当命令正文超过 300-500 行时，将长内容移动到 references/
4. **错误字典扩展**：根据实际需要扩展 E006+ 错误编号
5. **技能优化**：使用 evolution-retrospect 阶段的 TDD 迭代方法持续优化技能

---

## 总结

本次融合升级成功地将 SpecForge 的命令和技能模板统一到一致的结构规范下，强化了 Iron Laws、产物清单、handoff、错误字典、反规避提醒等关键元素，并创建了完善的 references 共享资源。所有文件通过了自动化验证，确保了质量和一致性。

**升级完成时间**：2026-05-06
**升级执行者**：AI Assistant
**验证状态**：✅ 全部通过（0错误，0警告）

---

# v0.2.0 升级（2026-05-08）

## 破坏性变更

### 1. operations 阶段彻底移除（9 阶段 → 8 阶段）

**生命周期**：`foundation → requirements → design → planning → implementation → quality → release → evolution`

`operations` 阶段的语义（runbook/监控/告警/回滚/运维移交）已全部并入 `release-deploy` 命令的 Step 7（运维移交），并作为该阶段的必需产物 `OPS-RUNBOOK.md`。

**受影响代码**：
- `src/core/lifecycle-types.ts`、`src/core/metadata-schema.ts`：移除 `operations` 枚举值与 `opsRunbook` 字段
- `src/services/command-service.ts`、`src/services/status-service.ts`、`src/commands/status.ts`：移除所有 operations 映射
- `templates/.specforge/config.yaml`：rules.operations 删除（合并进 rules.release.hardGates）；handoffs 链路改为 `release-deploy → evolution-retrospect`
- `templates/.specforge/commands/workflow/operations-monitor/`：目录已删除
- `templates/.specforge/commands/workflow/release-deploy/release-deploy.md`：新增 Step 7 运维移交，原 Step 7/8 顺移为 Step 8/9

**迁移指引**：已存在的项目升级到 v0.2.0 后，运行 `specforge update` 时若检测到旧的 `.specforge/commands/workflow/operations-monitor/` 目录会输出 deprecation 提示；用户可手动将其内容并入 release 阶段的 OPS-RUNBOOK.md 或保留为只读历史。

### 2. 方法论语言无关化

SpecForge 是方法论框架，命令与技能正文不再绑定单一技术栈。新增统一适配层：

- **`templates/.specforge/skills/workflow-steps/language-adapters/SKILL.md`**：覆盖 Node / Python / Java(Spring Boot) / Go / Rust 五种语言生态的包管理、测试、Lint、构建、版本源、`.gitignore` 模式、项目结构标识与依赖锁文件映射。
- 命令模板中的 `pnpm test` / `node -e` 等硬编码示例改为"参见 language-adapters"软引用。
- `validate-project-setup.sh` 扩展支持 Maven/Gradle/Go/Rust/.NET 检测。
- 安全/提交规范/微服务边界/API 测试等技能的代码示例补齐 Java/Spring + Python 列。

### 3. references 精华全面内化

完整内化 `references/reference-projects-analysis.md` 中尚未消化的 8 项设计模式：

| # | 精华 | 来源 | 落地位置 |
|---|------|------|---------|
| 1 | Profile 系统（minimal/standard/custom） | OpenSpec | `src/core/profiles.ts` + `specforge profile` CLI |
| 2 | 扩展钩子运行时（before/after_phase） | spec-kit | `src/core/hooks.ts` + `specforge run-hook` CLI |
| 3 | 产物 DAG 状态机（BLOCKED/READY/DONE） | OpenSpec OPSX | `src/core/artifact-graph.ts` |
| 4 | 多视角 Plan 审查（CEO/eng/design/devex） | gstack | `design-explore.md` + `references/multi-perspective-review.md` |
| 5 | 三层 QA 测试分档（Quick/Standard/Exhaustive） | gstack qa | `quality-verify.md` + `references/qa-tiers.md` |
| 6 | 子代理三层串联（implementer→spec→quality） | superpowers-zh | `implementation-build.md` 主流程串联 |
| 7 | 三级渐进披露契约 | skills-main skill-creator | `config.yaml.rules.global.progressiveDisclosure` + `doctor --check-disclosure` |
| 8 | TDD 写技能 + 复杂度自动评分 | writing-skills + task-master | `skill-creator/SKILL.md` + `complexity-guide.md` 评分公式 |

## CLI 新增命令

- `specforge profile <show|set>`：查看/切换 profile
- `specforge run-hook --phase <name> --stage <before|after>`：执行扩展钩子（用于 preamble）
- `specforge doctor --check-disclosure`：校验三级渐进披露层次

## 验证

- `pnpm check`（lint + test + build）通过
- `tests/integration/full-lifecycle.test.ts` 覆盖 init→8 阶段 scaffold→status→list 链路
