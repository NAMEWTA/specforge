---
name: evolution-retrospect
type: workflow-command
description: >-
  复盘、沉淀、归档——回顾完整流程、识别摩擦点、经验沉淀到 context/、技能优化（TDD 迭代）、项目调优、生成复盘报告。
  触发场景："项目复盘"、"经验总结"、"流程优化"、"沉淀最佳实践"、"retrospective"、"lessons learned"、"process improvement"。
version: "2.0.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入 — 匹配复盘/学习/改进相关技能
specforge list --skills --triggers=retrospective,learn,improve,evolve,tune,skillify --format=json

# 前置产物检测（检查 change 是否完成）
specforge status --phase=evolution --check-requires --strict

# 环境检测
specforge doctor --check-deps --quiet

# 收集基础指标
specforge status --phase=all --metrics --quiet
-->

# 复盘、沉淀、归档

## Iron Law

> **禁止跳过复盘直接开始下一个任务。** 不复盘的团队会在同一个坑里跌倒两次。经验不沉淀到 context/ 和技能中，本次 change 的价值就损失了一半。

## HARD-GATE 检查清单

在进入复盘流程前，必须通过以下门禁：

- [ ] **E010_noChangeArtifacts**: `specforge/changes/<ChangeName>/` 存在且包含至少一个阶段产物
- [ ] **E011_incompleteWorkflow**: 当前 change 的 status 必须为 completed 或 pending-retrospect
- [ ] **E012_missingConfig**: `.specforge/config.yaml` 存在且包含 evolution 阶段配置

**任何一项失败 → 立即中断，报告具体错误编号并引导修复。**

---

## Step 0: 复盘范围评估

**目标**: 确定复盘深度。

### 0.1 复杂度检查

| change 规模 | 涉及阶段数 | 复盘模式 |
|------------|-----------|----------|
| 小型（<3 天）| ≤3 阶段   | 轻量复盘  |
| 中型（3-7 天）| 4-6 阶段 | 标准复盘  |
| 大型（>7 天）| 7+ 阶段   | 深度复盘  |

### 0.2 模式选择（D1 决策门控）

```
D1 — 选择复盘深度
项目/分支: <当前分支>
ELI10: 复盘深度决定了你要花多少时间回顾和沉淀。轻量复盘适合小改动，标准复盘适合大多数 change，深度复盘适合大型复杂 change。选错会导致要么浪费时间要么遗漏重要经验。
利害分析：选错复盘深度会导致经验沉淀不完整或过度消耗时间。
推荐：标准复盘 因为 它在时间和质量间取得平衡
完整性：轻量=5/10（核心经验）, 标准=8/10（完整沉淀）, 深度=10/10（TDD 迭代）
A) 轻量复盘（快速记录关键点，15 分钟）
B) 标准复盘（完整流程回顾+经验沉淀，30-45 分钟）(recommended)
C) 深度复盘（全流程详细分析+技能 TDD 迭代，1-2 小时）
```

**STOP** - 等待用户确认后再继续。不要批量处理此决策。

---

## Step 1: 复盘收集

**目标**: 回顾从 brainstorming 到 archive 的完整流程，收集数据。

同时读取：
- `.specforge/config.yaml` — evolution 门禁规则、错误字典、handoffs
- `specforge/config.yaml` — 项目级规则与错误沉淀入口

### 1.1 流程回顾

完整摩擦点分类和指标收集方法参见 `references/retrospective-patterns.md`。

核心收集维度：
- **流程问题**: 阶段产出不符合下游需要
- **工具问题**: CLI 命令不够用
- **技能问题**: 注入技能未起到指导作用
- **沟通问题**: 用户与 AI 反复澄清
- **架构问题**: 设计决策导致返工

### 1.2 数据收集脚本

```bash
# 收集关键指标
specforge status --phase=all --metrics
git log --since="<change-start-date>" --oneline | wc -l  # 提交数
find specforge/changes/<ChangeName>/ -name "*.md" | wc -l  # 产物数
```

### 1.3 改进项落点

每个摩擦点必须落地到"可执行改进项"，标注落点类型：
- `specforge/context/`（经验沉淀）
- `specforge/config.yaml`（规则/错误/上下文）
- `.specforge/commands/...`（命令模板改进）
- `.specforge/skills/...`（技能改进或新技能）

完整落点映射参见 `references/retrospective-patterns.md#改进项落点映射`。

---

## Step 2: 经验沉淀

**目标**: 将本次 change 中学到的经验固化到可复用资产中。

完整模板（术语表/ADR/经验教训）参见 `references/retrospective-patterns.md`。

### 2.1 术语表更新

在 `specforge/context/glossary.md` 中记录新术语（如有）。

### 2.2 架构决策记录

在 `specforge/context/adr/` 中创建 ADR（如有架构决策）。

### 2.3 经验教训记录

在 `specforge/context/learnings.md` 中追加经验教训。

### 2.4 沉淀质量检查

- [ ] 每条 learnings 是否包含"具体场景 + 可执行建议"？
- [ ] ADR 是否包含"决策理由"和"替代方案分析"？
- [ ] 术语定义是否避免了循环引用？

---

## Step 3: 技能优化

**目标**: 采用 TDD 迭代方法优化或创建技能。

完整 TDD 指南参见 `references/skill-tdd-guide.md`。

### 3.1 识别可固化模式

回顾本次流程中：
- 哪些操作反复执行？ → 可固化为 workflow-step 技能
- 哪些规则反复强调？ → 可固化为 domain-rule 技能
- 哪些错误反复出现？ → 需要创建 safety/testing 技能
- 哪些决策需要权威背书？ → 可固化为 architecture-rule 技能

### 3.2 TDD 迭代流程

核心 5 步（完整流程参见 `references/skill-tdd-guide.md`）：

1. **红（基线测试）**: 观察无技能时的失败模式
2. **绿（最小技能）**: 编写针对性 SKILL.md
3. **压力测试**: 极端条件验证
4. **重构（堵漏洞）**: 反驳 AI 合理化借口
5. **重新验证**: 确认改进有效

### 3.3 技能质量自检

- [ ] description 描述的是"何时使用"而非"做什么"？
- [ ] Iron Law 是否位于文件顶部（在任何流程之前）？
- [ ] 是否包含反规避语言表格（借口 → 现实）？
- [ ] Red Line 自检列表是否完整？
- [ ] 技能长度是否 < 500 行（渐进式加载）？

---

## Step 4: 项目调优

**目标**: 优化项目配置。

完整调优手册参见 `references/tuning-playbook.md`。

### 4.1 调整阶段启用

根据复盘结果：
- 某些阶段是否从未使用且不需要？ → 从 Profile 中移除
- 是否需要添加自定义阶段？ → 使用 `specforge add-command` 创建

### 4.2 调整技能触发词

如果某技能在本次 change 中未被触发但应该被触发：
1. 检查技能 description 的触发词覆盖率
2. 使用 `specforge list --skills --format=json` 导出当前触发词
3. 对比本次 change 中的实际操作关键词，补充缺失触发词

### 4.3 调整 Iron Law

如果在流程中发现新的不可妥协规则：
- 记录到 `.specforge/constitution.md`（MINOR 版本升级）
- 标注来源和触发场景

### 4.4 配置质量检查

- [ ] `config.yaml` 的 handoffs 是否反映最新流程？
- [ ] `errors` 字典是否覆盖本次 change 遇到的所有错误？
- [ ] `profile.enabledPhases` 是否与实际使用一致？

---

## Step 5: 生成复盘报告

**目标**: 生成结构化复盘报告，作为本次 change 的最终产物。

完整报告模板参见 `references/retrospective-patterns.md#复盘报告模板`。

### 5.1 报告审查（D2 决策门控）

```
D2 — 复盘报告审查
项目/分支: <当前分支>
ELI10: 复盘报告将作为本次 change 的最终产物存档。你可以选择直接完成、先审查再修改、或者保存草稿稍后完善。选错会导致报告质量不佳或流程卡住。
利害分析：报告质量决定下次 change 的起点高度。
推荐：先审查再修改 因为 这确保报告质量
完整性：直接=5/10, 审查=8/10, 草稿=3/10
A) 直接完成（报告已满意，立即归档）
B) 先审查再修改（review 报告内容，补充遗漏）(recommended)
C) 保存草稿（稍后完善，change 状态设为 pending-retrospect）
```

**STOP** - 等待用户选择。不要批量处理此决策。

---

## Step 6: 完成衔接 — 循环闭合

### 6.1 产物清单

- `specforge/changes/<ChangeName>/RETROSPECTIVE.md` — 复盘报告
- `specforge/context/learnings.md` — 追加经验教训
- `specforge/context/glossary.md` — 术语表（如有更新）
- `specforge/context/adr/` — 架构决策记录（如有新架构决策）
- 优化后的技能文件（如有）
- `specforge/changes/<ChangeName>/.specforge.json` — 变更元数据更新（status: completed）

### 6.2 完成状态报告

使用以下状态之一报告复盘完成状态：

- **DONE** — 复盘完成，所有经验已沉淀，产物齐全
- **DONE_WITH_CONCERNS** — 复盘完成，但有遗留问题需关注（列出具体问题）
- **BLOCKED** — 无法完成复盘（说明阻塞原因和已尝试的解决方案）
- **NEEDS_CONTEXT** — 缺少关键信息（明确说明需要什么信息）

格式：
```
STATUS: <状态>
REASON: <原因>
ATTEMPTED: <已尝试的操作>
RECOMMENDATION: <建议的下一步>
```

### 6.3 循环闭合

本次 change 的所有经验已沉淀。下一次 change 将自动受益于优化后的技能和配置。

> **注**：本阶段是 SpecForge 工作流的终点，也是下一次更优工作流的起点。

---

## 常见阻断与纠偏（errors 引用）

- **E005_contextOverload**: 复盘结论写进单个大文档导致膨胀 → 分别沉淀到 config/skills/references
- **E010_noChangeArtifacts**: 找不到 change 产物目录 → 确认 change 名称和路径
- **E011_incompleteWorkflow**: change 状态不是 completed → 先完成所有阶段再复盘
- **E012_missingConfig**: config.yaml 不存在或 evolution 配置缺失 → 运行 specforge init 或 add-command
- **E013_retrospectiveSkipped**: 跳过复盘直接进入新 change → 触发 Iron Law 阻断
- **E014_skillNotTested**: 技能优化未经过 TDD 测试 → 删除未测试技能，重新执行 TDD 循环

---

## 反规避提醒

核心借口（完整 15+ 条目借口表和红线列表参见 `references/excuse-table.md`）：

| 借口 | 现实 |
|------|------|
| "复盘太花时间，直接开始下一个任务" | 不复盘的团队会在同一个坑里跌倒两次 |
| "这次没什么好总结的，很顺利" | 顺利的原因本身就是有价值的经验 |
| "learnings.md 以后有空再写" | "以后"永远不存在。现在不写，永远不会被写 |
| "技能优化太复杂，先用着再说" | 摩擦损失会在 10 次使用后超过优化成本 |

完整借口分类（时间压力/过度自信/责任转移/技术回避）和红线列表参见 `references/excuse-table.md`。
