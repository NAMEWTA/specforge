# preamble 模式库（按需使用）

> 目标：在不污染正文的前提下，把“技能注入/前置检查/环境检查”放到可执行块里。

## 基本形态

```markdown
<!-- preamble:bash
specforge list --skills --triggers=<触发词> --format=json
specforge status --phase=<phase> --check-requires
specforge doctor --check-deps --quiet
-->
```

## 触发词建议

- requirements：`clarify,specify,brainstorm,requirements`
- design：`architecture,design,interface,contract`
- planning：`tasks,breakdown,planning,complexity`
- implementation：`implement,subagent,tdd,build`
- quality：`verify,test,review,checklist,qa`
- release：`release,deploy,ship,publish,runbook,monitor`
- evolution：`retrospective,learn,improve,evolve,tune`

## 工具命令（tools）触发词建议

- debugging：`debug,bug,fix,排查,调试`
- documentation：`文档,规范,documentation,写作`
- review：`review,quality,coherence,一致性,审查`
- qa：`qa,test,verify,回归,质量`

