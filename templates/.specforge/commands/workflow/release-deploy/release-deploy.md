---
name: release-deploy
type: workflow-command
description: >-
  Change 归档收尾——校验产物完整性、迁移 change 目录到 archive、更新元数据并输出摘要。
  仅做归档，不处理版本号 / CHANGELOG / Git tag / 部署 / PR。
  触发："归档变更"、"change 收尾"、"archive change"、"finalize"。
version: "3.0.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入 — 匹配归档与收尾语义
specforge list --skills --triggers=archive,finalize,close-out,handoff --format=json

# 前置产物检测（quality 阶段产物是否就绪）
specforge status --phase=release --check-requires

# 环境检测
specforge doctor --check-deps --quiet

# 当前 change 上下文
echo "CHANGE_DIR: $(ls -1d specforge/changes/*/ 2>/dev/null | head -1 || echo 'none')"
ls -1 specforge/archive/ 2>/dev/null | wc -l | awk '{print "ARCHIVE_COUNT: "$1}'
-->

<!-- route-statement
路由：release-deploy（change 归档收尾）
Change-ID：{{changeId}}
已加载：
  - release-deploy.md（本文件，主体）
  - QUALITY-REPORT.md（质量门禁结果，前置产物）
未加载（后续按需）：
  - references/archive-patterns.md（≈ 80 行，归档脚本与冲突处理细节）
第一动作：检查质量门禁状态与产物完整性，确认归档前置条件
Token 预算估算：约 1800 tokens
-->

# Change 归档收尾

> **职责边界**：本命令只负责把已完成的 change 归档到 `specforge/archive/`，不处理版本号 / CHANGELOG / Git tag / 部署 / PR / 上线发布。
> 这些 ship/deploy 类工作如果项目需要，请在仓库自建 `release-ship` 等 tool-command 中实现。

## Iron Law

> **绝对阻断规则 —— 以下情况禁止执行归档：**
>
> 1. **质量门禁非 PASS**：`QUALITY-REPORT.md` 中 Gate Decision 不是 PASS → 回到 `quality-verify`
> 2. **change 目录定位失败**：找不到当前 change 对应的 `specforge/changes/<name>/` → 先确认 change 上下文
> 3. **归档目标已存在且未协商处理**：`specforge/archive/YYYY-MM-DD-<name>/` 已存在 → 必须先按"归档冲突处理"明确选择
> 4. **未确认即跳过未完成产物/任务警告**：必需产物或任务未完成时，必须显示警告并等用户书面确认才能继续
>
> **跳过任何一步检查 = 不是归档，是丢档。**

门禁引用：`.specforge/config.yaml` 的 `rules.release.hardGates`、`errors.E001/E008`

---

## Step 1: 归档前置检查

### 1.1 质量门禁

读取 `specforge/changes/<name>/QUALITY-REPORT.md`，确认：

- [ ] Gate Decision = PASS
- [ ] 无残留 Critical 反馈
- [ ] 所有 Important 反馈已处理或显式记入 TODO

**未通过则阻断**，返回 `quality-verify` 阶段，禁止继续归档。

### 1.2 必需产物完整性

逐项确认 change 目录下的核心产物：

- [ ] `proposal.md` — 需求提案
- [ ] `design.md` — 设计文档
- [ ] `tasks.md` — 任务列表
- [ ] `quality-report.md` — 质量报告
- [ ] `.specforge.json` — 元数据

**有缺失时**：显示缺失清单，询问用户是否继续。**未获书面确认禁止 `mv`**。

### 1.3 任务完成度

```bash
TASKS_FILE="specforge/changes/<name>/tasks.md"
if [ -f "$TASKS_FILE" ]; then
  INCOMPLETE=$(grep -c '\- \[ \]' "$TASKS_FILE" 2>/dev/null || echo "0")
  COMPLETE=$(grep -c '\- \[x\]' "$TASKS_FILE" 2>/dev/null || echo "0")
  echo "任务完成：$COMPLETE/$((INCOMPLETE + COMPLETE))"
fi
```

**有未完成任务时**：列出前 10 条未完成任务，询问用户是否继续归档（未完成任务会被一同归档）。

> 详细前置检查脚本与异常分支：[references/archive-patterns.md](references/archive-patterns.md#归档流程)

---

## Step 2: 执行归档

### 2.1 归档命名

固定规则：`YYYY-MM-DD-<change-name>`（日期取本机日历日）。

```bash
ARCHIVE_DATE=$(date +%Y-%m-%d)
CHANGE_NAME="<change-name>"
ARCHIVE_NAME="${ARCHIVE_DATE}-${CHANGE_NAME}"
ARCHIVE_DIR="specforge/archive/${ARCHIVE_NAME}"
```

### 2.2 冲突检查（强制）

```bash
mkdir -p specforge/archive

if [ -d "$ARCHIVE_DIR" ]; then
  echo "ERROR: 归档目标已存在：$ARCHIVE_DIR"
  echo "→ 触发 E008_archiveExists，进入冲突处理流程"
  # 不得静默覆盖；交由用户在以下三个选项中选择：
  #   A) 重命名现有归档为 ${ARCHIVE_NAME}-old，然后归档新的
  #   B) 使用不同日期（用户输入）
  #   C) 取消归档
  exit 1
fi
```

### 2.3 移动 change 目录

```bash
# 必须用 mv，保留所有隐藏文件（.specforge.json 等）；禁止 cp + rm 二步
mv "specforge/changes/${CHANGE_NAME}" "$ARCHIVE_DIR"

# 验证关键文件未丢失
test -f "$ARCHIVE_DIR/.specforge.json" || echo "WARNING: 元数据文件丢失"
```

### 2.4 更新归档元数据

更新 `$ARCHIVE_DIR/.specforge.json`：

- `status` → `"completed"`
- `timestamps.completedAt` → 当前 ISO 8601 时间戳
- `archive.location` → `"$ARCHIVE_DIR"`
- `archive.archivedAt` → 当前 ISO 8601 时间戳

> 完整 jq 脚本与降级处理：[references/archive-patterns.md](references/archive-patterns.md#step-4更新元数据)

---

## Step 3: 归档摘要与状态报告

### 3.1 归档摘要（必须输出）

```markdown
## Archive Complete

**Change:** <change-name>
**Archived to:** specforge/archive/YYYY-MM-DD-<change-name>/
**Tasks:** $COMPLETE/$TOTAL complete
**Artifacts:** All complete / N incomplete（如有警告需明示）
**Quality Gate:** PASS
```

### 3.2 完成状态协议

使用以下状态之一报告本命令结果：

- **DONE**：归档完成，元数据已更新，摘要已输出
- **DONE_WITH_CONCERNS**：归档完成，但存在未完成任务/产物（已与用户确认）
- **BLOCKED**：前置门禁未通过或归档冲突未解决（说明阻塞点 + 已尝试方法）
- **NEEDS_CONTEXT**：无法定位 change 目录 / 元数据缺失（说明需要的信息）

升级触发条件：

- 同根因连续失败 ≥ 2 次（触发 P9 / `E010_repeatedFailurePattern`）
- 归档冲突无法在用户协商内解决

---

## 产物清单

本命令必须生成/更新：

- `specforge/archive/YYYY-MM-DD-<change-name>/` — 归档目录（由 change 目录原地移动而来，保留全部产物）
- `specforge/archive/YYYY-MM-DD-<change-name>/.specforge.json` — 元数据（`status: completed` + `timestamps.completedAt` + `archive.location` + `archive.archivedAt`）
- 控制台 / 对话输出 — Step 3.1 的归档摘要

本命令**不**生成：版本文件、CHANGELOG、Git tag、PR/MR、运维 runbook 等。如有需要，请在专门的 ship/deploy 命令中处理。

---

## 常见阻断与纠偏（errors 引用）

- **E001_missingPrerequisiteArtifact**：`QUALITY-REPORT.md` 缺失或 Gate 非 PASS → 回到 `quality-verify`
- **E008_archiveExists**：归档目标已存在 → 重命名旧归档（追加 `-old`）或换日期，禁止覆盖
- **E010_repeatedFailurePattern**：同一根因（例如反复 `mv` 失败）连续 ≥ 2 次未声明差异 → 暂停重试，按 P9 书面回答差异或反问用户

---

## 反规避提醒

| 借口 | 现实 |
| ---- | ---- |
| "Gate 应该是 PASS 吧" | 必须读 `QUALITY-REPORT.md` 中的 Gate Decision 字段 |
| "目录看起来差不多了，归档吧" | 必需产物清单逐项打勾才算"完整" |
| "归档目标已存在，覆盖一下就行" | E008，禁止覆盖；必须协商重命名或换日期 |
| "用 cp 再删原目录也是一样的" | 不一样，隐藏文件可能丢失，必须 `mv` |
| "未完成任务太麻烦了，悄悄归档" | 必须显示警告 + 用户确认；偷偷归档 = 丢档 |
| "这次顺手把版本号也 bump 一下" | 出本命令职责边界；交给专门的 ship 命令 |

---

## 归档自检列表

完成归档后逐项确认：

- [ ] 质量门禁读到 PASS（有原文截取）？
- [ ] 必需产物全部存在（或未完成项已被用户确认）？
- [ ] 归档目标无冲突，命名符合 `YYYY-MM-DD-<change-name>`？
- [ ] 使用 `mv` 而非 `cp` + `rm` 完成迁移？
- [ ] `.specforge.json` 已更新 `status` / `completedAt` / `archive.*`？
- [ ] 控制台输出了 Step 3.1 的归档摘要？
- [ ] `specforge/changes/<change-name>/` 已不存在（已被原地移走）？

任何一项未通过 = 归档未完成，不得报告 DONE。

---

## 完成衔接（handoff）

- 归档完成后统一进入 → 执行 `evolution-retrospect` 命令进行复盘沉淀
- 上线 / 部署 / 监控 / 回滚等 ship 工作不在本命令职责内，由项目自建命令承担

Handoff 引用：`.specforge/config.yaml` 的 `handoffs.release-deploy.next`

---

## References 导航（按需读取）

| 场景 | 参考文档 | 核心内容 |
| ---- | -------- | -------- |
| 归档脚本 / 冲突处理细节 / 元数据降级方案 | [references/archive-patterns.md](references/archive-patterns.md) | 完整归档流程、guardrails、目录结构、常见错误 |
