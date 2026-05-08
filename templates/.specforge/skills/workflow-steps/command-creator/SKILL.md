---
name: command-creator
type: workflow-step
description: 创建、改造、扩充 SpecForge command 模板（workflow-command 与 tool-command），包括：命令命名与目录结构、YAML frontmatter 元数据、preamble 生成、handoffs 设计、产物清单与门禁（Iron Laws）、错误字典引用（E001…）、以及渐进式披露拆分（SKILL.md vs references/ vs scripts/）。当用户说“新增命令/补齐 templates 命令内容/添加 tools command/改造 command 生成器/specforge add-command”或需要批量重构 command 模板时使用。
version: "1.0.0"
author: "wta"
---

# Command Creator（命令模板创建/重构）

> 目标：让 command 模板成为“可直接指导开发执行”的可复用资产，而不是一页空壳 Markdown。

## Iron Law

> **禁止创建没有 Iron Law、产物清单和 handoff 的命令模板。** 空壳命令模板不是资产，是技术债务。

## 快速开始（你应该怎么做）

当要新增/重构一个 command（workflow 或 tools）时，按顺序执行：
- 先用 `scripts/init_command.py` 初始化目录与模板
- 再用 `scripts/quick_validate_command.py` 快速校验命名/元数据
- 然后填充命令正文：门禁、产物、handoff、常见错误纠偏

## 目录结构（必须）

对齐 SpecForge 当前约定（与 `src/services/command-service.ts` 生成结构一致）：

```
<command-name>/
├── <command-name>.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   ├── type: (required)  # workflow-command | tool-command
│   │   ├── description: (required)
│   │   ├── version: (required)
│   │   └── author: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - 可执行脚本（用于确定性操作）
    ├── references/       - 长参考文档（按需加载，渐进式披露）
    └── assets/           - 输出用资产（模板、图标等）
```

## 命名规范（必须）

- `command-name` 必须是 kebab-case：`^[a-z][a-z0-9-]*$`
- workflow command 建议：`<phase>-<verb>`，如 `requirements-clarify`
- tool command 建议：单词能力名，如 `review`、`worktree`

## Frontmatter 规范（必须）

最小字段（与 `src/core/metadata-schema.ts` 一致）：
- `name`：命令名（目录名同名）
- `type`：`workflow-command` 或 `tool-command`
- `description`：必须包含触发场景（用户可能说的话 + 英文关键词），用于发现与检索
- `version`：语义化版本
- `author`：作者标识

## preamble 规范（推荐）

如果命令会依赖技能/前置产物/环境检查，在开头加入：

```markdown
<!-- preamble:bash
specforge list --skills --triggers=<逗号分隔触发词> --format=json
specforge status --phase=<phase> --check-requires
specforge doctor --check-deps --quiet
-->
```

## 命令正文的“最小可用结构”（必须）

每个 command 至少包含四块：
- **Iron Laws / HARD-GATE**：明确哪些情况必须阻断
- **产物清单**：本命令必须生成/更新哪些文件（路径与最小章节/字段）
- **handoff**：完成后下一步推荐哪个 workflow（引用 `.specforge/config.yaml` 的 handoffs）
- **常见错误与纠偏**：引用 `.specforge/config.yaml` 的错误编号（E001…）

## 渐进式披露（必须遵守）

当命令正文开始变长时（接近 300-500 行）：
- 把“清单库/案例库/长指南”移动到 `references/`
- 命令正文只保留：导航、关键门禁、最小结构、以及引用 links

## References 导航（按需读取）

- `references/phase-mapping.md`：8 阶段 ↔ 参考技能/机制映射（从 `reference-projects-analysis.md` 抽取）
- `references/frontmatter-spec.md`：frontmatter 规范与常见错误
- `references/preamble-patterns.md`：preamble 触发词与阶段校验模式
- `references/handoffs.md`：handoff 设计原则与示例

## 命令模板自检列表

创建或重构命令模板后，检查：

- [ ] frontmatter 包含所有必需字段（name/type/description/version/author）？
- [ ] description 包含触发场景？
- [ ] preamble 包含技能注入、前置产物检测、环境检测？
- [ ] Iron Law 明确且可执行？
- [ ] 产物清单完整且路径正确？
- [ ] handoff 明确下一步命令？
- [ ] 常见阻断与纠偏引用错误字典？
- [ ] 反规避提醒有针对性？
- [ ] 命令正文控制在 300-500 行以内（长内容在 references/）？

