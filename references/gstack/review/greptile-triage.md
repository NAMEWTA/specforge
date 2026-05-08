# Greptile 评论 triage

这是一个共享参考，用于抓取、过滤和分类 GitHub PR 上的 Greptile 审查评论。`/review`（Step 2.5）和 `/ship`（Step 3.75）都会引用这份文档。

---

## 抓取

运行以下命令以检测 PR 并抓取评论。两个 API 调用并行执行。

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null)
PR_NUMBER=$(gh pr view --json number --jq '.number' 2>/dev/null)
```

**如果任意一个失败或为空：** 静默跳过 Greptile triage。这个集成只是附加能力——没有它，工作流也能运行。

```bash
# 并行抓取行级审查评论和顶层 PR 评论
gh api repos/$REPO/pulls/$PR_NUMBER/comments \
  --jq '.[] | select(.user.login == "greptile-apps[bot]") | select(.position != null) | {id: .id, path: .path, line: .line, body: .body, html_url: .html_url, source: "line-level"}' > /tmp/greptile_line.json &
gh api repos/$REPO/issues/$PR_NUMBER/comments \
  --jq '.[] | select(.user.login == "greptile-apps[bot]") | {id: .id, body: .body, html_url: .html_url, source: "top-level"}' > /tmp/greptile_top.json &
wait
```

**如果 API 出错，或者两个端点合起来也没有 Greptile 评论：** 静默跳过。

行级评论里的 `position != null` 过滤器会自动跳过 force push 后失效的旧评论。

---

## 忽略项检查

推导项目专属历史路径：

```bash
REMOTE_SLUG=$(browse/bin/remote-slug 2>/dev/null || ~/.claude/skills/gstack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
PROJECT_HISTORY="$HOME/.gstack/projects/$REMOTE_SLUG/greptile-history.md"
```

如果 `$PROJECT_HISTORY` 存在，就读取它（项目级忽略项）。每一行都记录一次历史 triage 结果：

```text
<date> | <repo> | <type:fp|fix|already-fixed> | <file-pattern> | <category>
```

**Categories**（固定集合）：`race-condition`、`null-check`、`error-handling`、`style`、`type-safety`、`security`、`performance`、`correctness`、`other`

把每条抓到的评论和这些历史条目比对：
- `type == fp`（只忽略已知误报，不忽略以前修过的真实问题）
- `repo` 与当前仓库匹配
- `file-pattern` 与评论的文件路径匹配
- `category` 与评论里体现的问题类型匹配

匹配到的评论按 **SUPPRESSED** 跳过。

如果历史文件不存在，或者某些行无法解析，就跳过这些行继续——永远不要因为历史文件格式不对而失败。

---

## 分类

对每条未被忽略的评论：

1. **行级评论：** 读取指定 `path:line` 的文件和上下文（上下各 10 行）
2. **顶层评论：** 读取完整评论正文
3. 把评论与完整 diff（`git diff origin/main`）和审查清单交叉比对
4. 分类为：
   - **VALID & ACTIONABLE** —— 真实 bug、竞态、安全问题或当前代码里确实存在的正确性问题
   - **VALID BUT ALREADY FIXED** —— 这是个真实问题，但已经在分支后续提交里修掉了。要找到修复它的 commit SHA。
   - **FALSE POSITIVE** —— 评论误解了代码、在别处已处理，或者只是风格噪音
   - **SUPPRESSED** —— 已经在上面的忽略项检查里过滤掉了

---

## 回复 API

回复 Greptile 评论时，要根据评论来源使用正确的 endpoint：

**行级评论**（来自 `pulls/$PR/comments`）：
```bash
gh api repos/$REPO/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies \
  -f body="<reply text>"
```

**顶层评论**（来自 `issues/$PR/comments`）：
```bash
gh api repos/$REPO/issues/$PR_NUMBER/comments \
  -f body="<reply text>"
```

**如果回复 POST 失败**（例如 PR 已关闭，没有写权限）：发出警告后继续。不要因为回复失败而中断整个流程。

---

## 回复模板

所有 Greptile 回复都要使用这些模板。一定要包含具体证据——不要发空泛回复。

### Tier 1（首次回复）——友好、带证据

**用于 FIXES（用户选择修复问题）：**

```text
**Fixed** in `<commit-sha>`.

```diff
- <old problematic line(s)>
+ <new fixed line(s)>
```

**Why:** <1-sentence explanation of what was wrong and how the fix addresses it>
```

**用于 ALREADY FIXED（该问题已在分支上的先前提交中修复）：**

```text
**Already fixed** in `<commit-sha>`.

**What was done:** <1-2 sentences describing how the existing commit addresses this issue>
```

**用于 FALSE POSITIVES（评论是错误的）：**

```text
**Not a bug.** <1 sentence directly stating why this is incorrect>

**Evidence:**
- <specific code reference showing the pattern is safe/correct>
- <e.g., "The nil check is handled by `ActiveRecord::FinderMethods#find` which raises RecordNotFound, not nil">

**Suggested re-rank:** This appears to be a `<style|noise|misread>` issue, not a `<what Greptile called it>`. Consider lowering severity.
```

### Tier 2（Greptile 在先前回复后再次标记）——强硬、证据充分

当下面的升级检测发现同一线程里已经有过 GStack 回复时，使用 Tier 2。要提供尽可能充分的证据来结束讨论。

```text
**This has been reviewed and confirmed as [intentional/already-fixed/not-a-bug].**

```diff
<full relevant diff showing the change or safe pattern>
```

**Evidence chain:**
1. <file:line permalink showing the safe pattern or fix>
2. <commit SHA where it was addressed, if applicable>
3. <architecture rationale or design decision, if applicable>

**Suggested re-rank:** Please recalibrate — this is a `<actual category>` issue, not `<claimed category>`. [Link to specific file change permalink if helpful]
```

---

## 升级检测

在撰写回复前，先检查这个评论线程里是否已经存在 GStack 的先前回复：

1. **行级评论：** 通过 `gh api repos/$REPO/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies` 获取回复。检查是否有任何回复正文包含 GStack 标记：`**Fixed**`、`**Not a bug.**`、`**Already fixed**`。
2. **顶层评论：** 扫描抓取到的 issue comments，找出在 Greptile 评论之后发布、且包含 GStack 标记的回复。
3. **如果已经存在 GStack 先前回复，并且 Greptile 又在同一个文件 + 分类上重新发言：** 使用 Tier 2（强硬）模板。
4. **如果不存在 GStack 先前回复：** 使用 Tier 1（友好）模板。

如果升级检测失败（API 错误、线程含义不明确）：默认使用 Tier 1。不要在模糊情况下升级。

---

## 严重性评估与重新分级

在分类评论时，也要判断 Greptile 暗示的严重性是否符合实际：

- 如果 Greptile 把问题标成 **security / correctness / race-condition**，但实际上只是 **style / performance** 级别：在回复里加上 `**Suggested re-rank:**`，要求修正分类。
- 如果 Greptile 把低严重性样式问题说成了 critical：在回复里明确反驳。
- 一定要具体说明为什么需要重新分级——引用代码和行号，不要只说观点。

---

## 历史文件写入

写入前，确保两个目录都存在：

```bash
REMOTE_SLUG=$(browse/bin/remote-slug 2>/dev/null || ~/.claude/skills/gstack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
mkdir -p "$HOME/.gstack/projects/$REMOTE_SLUG"
mkdir -p ~/.gstack
```

每次 triage 结果都要往 **两个** 文件里追加一行（项目级用于 suppressions，global 用于回溯）：
- `~/.gstack/projects/$REMOTE_SLUG/greptile-history.md`（项目级）
- `~/.gstack/greptile-history.md`（全局聚合）

格式：
```text
<YYYY-MM-DD> | <owner/repo> | <type> | <file-pattern> | <category>
```

示例：
```text
2026-03-13 | garrytan/myapp | fp | app/services/auth_service.rb | race-condition
2026-03-13 | garrytan/myapp | fix | app/models/user.rb | null-check
2026-03-13 | garrytan/myapp | already-fixed | lib/payments.rb | error-handling
```

---

## 输出格式

在输出头部包含 Greptile 汇总：
```text
+ N Greptile comments (X valid, Y fixed, Z FP)
```

对每条已分类评论，展示：
- 分类标签：`[VALID]`、`[FIXED]`、`[FALSE POSITIVE]`、`[SUPPRESSED]`
- File:line 引用（行级评论）或 `[top-level]`
- 一行评论摘要
- permalink URL（`html_url` 字段）