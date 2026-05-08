# TODOS.md 格式参考

这是标准 `TODOS.md` 格式的共享参考。`/ship`（Step 5.5）和 `/plan-ceo-review`（TODOS.md 更新部分）都会引用它，以确保 TODO 条目结构一致。

---

## 文件结构

```markdown
# TODOS

## <Skill/Component>     ← 例如：## Browse、## Ship、## Review、## Infrastructure
<items 按 P0、P1、P2、P3、P4 的顺序排列>

## Completed
<已完成项目，并附上完成注记>
```

**分区方式：** 按技能或组件组织（`## Browse`、`## Ship`、`## Review`、`## QA`、`## Retro`、`## Infrastructure`）。每个分区内按优先级排序，P0 放在最上面。

---

## TODO 条目格式

每个条目都作为该分区下的 H3：

```markdown
### <Title>

**What:** 对工作的单行描述。

**Why:** 它解决的具体问题，或者它能解锁的价值。

**Context:** 需要足够详细，让 3 个月后接手的人也能理解动机、当前状态，以及从哪里开始。

**Effort:** S / M / L / XL
**Priority:** P0 / P1 / P2 / P3 / P4
**Depends on:** <前置条件，或 "None">
```

**必填字段：** What、Why、Context、Effort、Priority
**可选字段：** Depends on、Blocked by

---

## 优先级定义

- **P0** —— 阻塞项：必须在下个版本前完成
- **P1** —— 关键项：本周期应完成
- **P2** —— 重要项：等 P0 / P1 清空后处理
- **P3** —— 可选项：等采纳 / 使用数据后再看
- **P4** —— 未来再说：好点子，但不着急

---

## 已完成条目格式

当条目完成后，把它移动到 `## Completed` 分区，并保留原始内容，追加：

```markdown
**Completed:** vX.Y.Z (YYYY-MM-DD)
```