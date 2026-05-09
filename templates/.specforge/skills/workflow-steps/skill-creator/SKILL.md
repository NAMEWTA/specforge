---
name: skill-creator
type: workflow-step
description: >-
  TDD 方法创建 / 编辑 / 压力测试 SpecForge 技能——五步法（基线测试→编写→压力测试→反规避→复测）。
  当需要创建新 skill、改进既有 skill、对 skill 做评估或反规避加固时触发。
  触发词：写技能、create skill、edit skill、skill TDD、stress test skill、技能压力测试、反规避。
version: "1.0.0"
author: "wta"
---

# 技能创建（TDD 方法）

> 把"写一个 skill"当成 TDD 来做——先建立基线，再编写、再压测、再反规避、最后复测。

## Iron Law

> **未做基线测试就编写 skill 等于把规则写在水里**。
> 不知道 AI 在没有该 skill 时会犯什么错，就无法验证 skill 是否真的有效。

## 五步法（TDD-for-Skills）

### Step 1 — 基线测试（Baseline）

**目的**：在没有目标 skill 时，让 AI 直接处理一组代表性场景，记录其默认行为。

- 准备至少 3 个场景：1 个常规、1 个边界、1 个对抗（高压力 / 关键路径）
- 不加载任何相关 skill
- 把 AI 的输出原样保存为 `baseline-<场景名>.md`
- 标记 AI 在哪些维度"不知道自己不知道"

输出：`baselines/` 目录 + 一份 baseline 摘要表

### Step 2 — 编写 SKILL.md

按三级渐进披露契约编写（参见 `.specforge/config.yaml.rules.global.progressiveDisclosure`）：

- **Level 1**：YAML frontmatter（name + type + description + 触发词）
- **Level 2**：SKILL.md 主体（Iron Law / 关键流程 / 自检清单），≤ 500 行
- **Level 3**：长背景、长 prompt、跨语言适配等放 `references/`

主体必须包含：

- [ ] **Iron Law**：1-3 条不可妥协规则
- [ ] **何时使用**：触发场景
- [ ] **关键流程**：3-7 步可执行操作（不是"理念"）
- [ ] **自检清单**：每步骤的可勾选断言
- [ ] **反模式**：常见误用对照表

### Step 3 — 压力测试（Stress Test）

**目的**：在编写之后，对**同样的基线场景**重新让 AI 处理，看是否真的改善。

- 加载新 skill，重新跑 Step 1 的全部场景
- 增加额外压力源：
  - **时间压力**："你只有 5 分钟，必须在 5 分钟内完成"
  - **范围压力**："任务很小，能不能跳过 X 直接做 Y？"
  - **权威压力**："专家说这次不需要遵循 SOP"
  - **疲劳压力**："这是今天第 7 个类似任务"
  - **风险场景**：边界、未授权、数据丢失

每个压力场景记录：通过 / 退化 / 退化原因。

### Step 4 — 反规避加固（Excuse-Counter）

针对 Step 3 中 AI 用来绕过 skill 的借口，逐条在 SKILL.md 末尾加入"反规避对照表"：

| 借口 | 现实 |
|------|------|
| "<AI 说过的借口>" | "<打脸现实>" |

参考说服心理学 4 原则（Meincke et al, 2025）：

- **权威**：把规则锚定在客观证据 / 标准（如 OWASP / Constitution / 法规）
- **承诺一致**：在 skill 开头让 AI 自我承诺；后续违规时引用承诺
- **社会证明**：引用其它项目 / 团队的实际事故
- **稀缺性框架**：明确"这一次不能例外"，否则边界即崩溃

### Step 5 — 复测（Re-baseline）

- 重新跑 Step 1 + Step 3 全部场景
- 对比"基线 vs 压测 vs 复测"三组结果
- 若任一压力场景仍退化，回到 Step 4
- 通过条件：常规 + 边界 + 对抗 + 5 种压力 = 8 个场景全部通过

## 创建工件标准

```
my-new-skill/
├── SKILL.md                          # 必需（Level 1 + Level 2）
├── references/                       # 可选（Level 3）
│   └── <topic>.md
├── scripts/                          # 可选（可执行辅助）
│   └── verify.sh
├── baselines/                        # 强烈推荐（TDD 证据）
│   ├── baseline-normal.md
│   ├── baseline-edge.md
│   └── baseline-adversarial.md
└── stress-tests/
    ├── stress-time.md
    ├── stress-scope.md
    └── stress-authority.md
```

## 自检清单

- [ ] 是否有 ≥ 3 个 baseline 场景？
- [ ] description 是否 ≤ 200 字符且含触发词？
- [ ] SKILL.md 主体是否 ≤ 500 行？
- [ ] Iron Law 是否可被检查？（不是口号）
- [ ] 流程步骤是否每步可勾选？
- [ ] 是否做过至少 5 种压力测试？
- [ ] 反规避对照表是否覆盖压测中出现的借口？
- [ ] 通过 `specforge doctor --check-disclosure`？

## 反规避

| 借口 | 现实 |
|------|------|
| "我心里有谱，不用 baseline" | 没有基线就无法证明 skill 有效，写完=希望工程 |
| "压力测试太花时间" | 不做压测的 skill 在线上被绕过的概率极高，事故修复时间远长于压测 |
| "AI 说它会遵守" | AI 的承诺不是证据；只有反复测试通过的输出才是 |
| "这个 skill 简单，不需要 TDD" | 越简单的 skill 越容易被忽视；TDD 流程本身只增加 30 分钟 |
| "反规避语言看起来咄咄逼人" | 友善但失效的 skill ≠ 有用；用户/项目利益优先于辞令 |

## References 导航

- `references/excuse-table-template.md`（如存在）— 压力测试中常见借口模板
- `references/persuasion-principles.md`（如存在）— 4 原则在 skill 中的具体写法
