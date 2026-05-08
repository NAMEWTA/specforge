# Command frontmatter 规范

## 必填字段

- `name`：命令名（kebab-case），必须与目录名一致
- `type`：`workflow-command` 或 `tool-command`
- `description`：必须包含触发场景/关键词（中英混合可）
- `version`：语义化版本字符串
- `author`：作者标识

## 常见错误

- `name` 与目录名不一致 → 会导致检索/生成器混乱
- `description` 太泛（如“SpecForge 命令”）→ 触发失败
- `type` 写成 `workflow`/`tool` → 不符合 schema

