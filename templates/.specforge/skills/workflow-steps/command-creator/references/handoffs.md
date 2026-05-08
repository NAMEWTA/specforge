# handoff 设计原则与写法

## 原则

- handoff 必须可执行：明确“下一步命令”与“为什么”
- handoff 必须引用机器源：优先从 `.specforge/config.yaml` 的 `handoffs` 获取
- handoff 只给 1-2 个默认推荐，避免选择瘫痪

## 示例（文字层）

```markdown
## 完成衔接（handoff）

**下一步**：执行 `planning-breakdown`，把 DESIGN.md 拆成 TASKS.md。
```

## 示例（配置层）

```yaml
handoffs:
  design-explore:
    next:
      - command: planning-breakdown
        reason: "契约与错误策略明确后进入任务拆解。"
```

