# 上线前审查清单

## 说明

审查 `git diff origin/main` 输出里下面列出的内容。要具体——引用 `file:line` 并给出修复建议。没问题的就跳过。只标记真实问题。

**双阶段审查：**
- **Pass 1（CRITICAL）：** 先跑 SQL & Data Safety、Race Conditions & Concurrency、LLM Output Trust Boundary、Shell Injection 和 Enum Completeness。优先级最高。
- **Pass 2（INFORMATIONAL）：** 再跑下面其余类别。虽然严重性低一些，但仍然要处理。
- **专项类别（由并行 subagent 处理，不属于这份清单）：** Test Gaps、Dead Code、Magic Numbers、Conditional Side Effects、Performance & Bundle Impact、Crypto & Entropy。见 `review/specialists/`。

所有发现都要通过 Fix-First Review 处理：明显的机械修复自动应用，真正有争议的问题合并到一个用户问题里。

**输出格式：**

```text
Pre-Landing Review: N issues (X critical, Y informational)

**AUTO-FIXED:**
- [file:line] Problem → fix applied

**NEEDS INPUT:**
- [file:line] Problem description
  Recommended fix: suggested fix
```

如果没有发现问题：`Pre-Landing Review: No issues found.`

要简洁。每个问题：一行描述问题，一行描述修复。不要前言，不要总结，不要“整体看起来不错”。

---

## 审查类别

### Pass 1 —— CRITICAL

#### SQL & Data Safety
- SQL 中的字符串插值（即使值经过 `.to_i` / `.to_f` 也不行——要用参数化查询，Rails 用 `sanitize_sql_array` / Arel，Node 用 prepared statements，Python 用参数化查询）
- TOCTOU 竞态：本应原子化的 `WHERE` + `update_all` 却写成先检查再设置
- 绕过模型校验直接写 DB（Rails: `update_column`；Django: `QuerySet.update()`；Prisma: raw queries）
- N+1 查询：在循环 / 视图里用到关联时，没有做 eager loading（Rails: `.includes()`；SQLAlchemy: `joinedload()`；Prisma: `include`）

#### Race Conditions & Concurrency
- 没有唯一性约束的 read-check-write，或者没有捕获重复键错误并重试（例如 `where(hash:).first` 然后 `save!`，却没处理并发插入）
- 没有唯一 DB 索引的 find-or-create——并发调用会造出重复记录
- 状态迁移没有用原子化的 `WHERE old_status = ? UPDATE SET new_status`——并发更新可能跳过或重复执行迁移
- 对用户可控数据做不安全 HTML 渲染（Rails: `.html_safe` / `raw()`；React: `dangerouslySetInnerHTML`；Vue: `v-html`；Django: `|safe` / `mark_safe()`）会导致 XSS

#### LLM Output Trust Boundary
- LLM 生成的值（邮箱、URL、名字）在没有格式校验的情况下写入 DB 或传给邮件发送器。持久化前加轻量校验（`EMAIL_REGEXP`、`URI.parse`、`.strip`）。
- 结构化工具输出（数组、hash）在写数据库前没有类型 / 形状校验。
- 拉取 LLM 生成的 URL 时没有 allowlist——如果 URL 指向内网，会有 SSRF 风险（Python: `urllib.parse.urlparse` → 先检查 hostname 是否在 blocklist 之外，再 `requests.get` / `httpx.get`）
- 把 LLM 输出存进知识库或向量数据库时没有清理——会形成持久化 prompt injection 风险

#### Shell Injection（Python 特有）
- `subprocess.run()` / `subprocess.call()` / `subprocess.Popen()` 在 `shell=True` 且命令字符串里用了 f-string / `.format()` 插值——改成参数数组
- `os.system()` 带变量插值——改用参数数组的 `subprocess.run()`
- 对 LLM 生成的代码直接 `eval()` / `exec()`，却没有沙箱

#### Enum & Value Completeness
当 diff 引入新的 enum 值、status 字符串、tier 名称或 type 常量时：
- **跟踪到每一个消费者。** 读取（不是只 grep——要 READ）所有对这个值做 switch、filter 或展示的文件。如果任何消费者没有处理新值，就标记出来。常见遗漏：前端下拉新增了值，但后端模型 / 计算方法没有持久化它。
- **检查 allowlist / filter 数组。** 搜索包含同级值的数组或 `%w[]` 列表（例如给 tiers 增加 `revise`，就找出所有 `%w[quick lfg mega]`，确认需要的地方都加上了 `revise`）。
- **检查 `case` / `if-elsif` 链。** 如果现有代码按 enum 分支，新值是否会落入错误的默认分支？
执行方式：用 Grep 找到所有引用同级值的地方（例如 grep `lfg` 或 `mega`，找出所有 tier consumer）。逐个读取匹配项。这个步骤必须读取 diff 外的代码。

### Pass 2 —— INFORMATIONAL

#### Async/Sync Mixing（Python 特有）
- 在 `async def` endpoint 里调用同步的 `subprocess.run()`、`open()`、`requests.get()`——会阻塞 event loop。改用 `asyncio.to_thread()`、`aiofiles` 或 `httpx.AsyncClient`。
- 在 async 函数里用 `time.sleep()`——改成 `asyncio.sleep()`
- 在 async 上下文里同步访问 DB，却没有用 `run_in_executor()` 包裹

#### Column/Field Name Safety
- 检查 ORM 查询里的列名（`.select()`、`.eq()`、`.gte()`、`.order()`）是否和实际 DB schema 对得上——列名写错会静默返回空结果或抛出被吞掉的错误
- 检查 query result 上的 `.get()` 调用，列名是否和实际选中的字段一致
- 如有 schema 文档，交叉对照

#### Dead Code & Consistency（只针对 version / changelog，其它由 maintainability specialist 处理）
- PR 标题与 VERSION / CHANGELOG 文件中的版本不一致
- CHANGELOG 条目对变更描述不准确（例如写“从 X 改成 Y”，但 X 从未存在）

#### LLM Prompt Issues
- prompt 里用了 0 索引列表（LLM 更稳定地返回 1 索引）
- prompt 里列出的工具 / 能力与 `tool_classes` / `tools` 数组里实际接上的不一致
- 在多个地方写了可能漂移的字数 / token 限制

#### Completeness Gaps
- 完整版本只需不到 30 分钟 CC 时间的 shortcut 实现（例如 partial enum handling、不完整错误路径、容易补上的边界情况）
- 只给出 human-team 的工作量估计——应该同时给出 human 和 CC+gstack 时间
- 测试覆盖缺口，而补测试是“小湖”不是“大海”（例如缺少 negative-path 测试、缺少和 happy-path 结构镜像的边界测试）
- 功能完成度只有 80-90%，而实际上只要少量代码就能做到 100%

#### Time Window Safety
- 按日期键查找时默认“今天”覆盖 24 小时——例如 PT 上午 8 点看到的只有当天 0 点到 8 点的数据
- 相关功能之间的时间窗口不一致——一个用小时桶，另一个用天键，却在处理同一份数据

#### Type Coercion at Boundaries
- Ruby → JSON → JS 的边界上，值的类型可能变化（数字 vs 字符串）—— hash / digest 输入必须规范化类型
- hash / digest 输入在序列化前没有 `.to_s` 或等价转换——`{ cores: 8 }` 和 `{ cores: "8" }` 会产生不同 hash

#### View/Frontend
- partial 里有内联 `<style>` 块（每次渲染都会重新解析）
- view 中的 O(n*m) 查找（循环里用 `Array#find`，而不是哈希化的 `index_by`）
- Ruby 侧对 DB 结果做 `.select{}` 过滤，本来可以写成 `WHERE` 子句（除非是在刻意避免前缀通配 `LIKE`）

#### Distribution & CI/CD Pipeline
- CI/CD workflow 变更（`.github/workflows/`）：检查构建工具版本是否与项目要求一致、artifact 名称 / 路径是否正确、secrets 是否使用 `${{ secrets.X }}` 而不是硬编码值
- 新 artifact 类型（CLI binary、library、package）：检查是否存在发布 / release workflow，并且目标平台正确
- 跨平台构建：检查 CI matrix 是否覆盖所有目标 OS / arch 组合，或者是否明确说明哪些未测试
- 版本 tag 格式一致性：`v1.2.3` vs `1.2.3`——VERSION 文件、git tag、publish 脚本必须一致
- 发布步骤幂等性：重复运行 publish workflow 不应失败（例如先 `gh release delete` 再 `gh release create`）

**不要标记：**
- 已有自动部署流水线的 Web 服务（Docker build + K8s deploy）
- 不对团队外分发的内部工具
- 只改测试的 CI 变更（只加测试步骤，不涉及发布步骤）

---

## 严重性分类

```text
CRITICAL（最高严重性）：         INFORMATIONAL（主 agent）：        SPECIALIST（并行 subagent）：
├─ SQL & Data Safety              ├─ Async/Sync Mixing             ├─ Testing specialist
├─ Race Conditions & Concurrency  ├─ Column/Field Name Safety      ├─ Maintainability specialist
├─ LLM Output Trust Boundary      ├─ Dead Code（仅 version）       ├─ Security specialist
├─ Shell Injection                ├─ LLM Prompt Issues             ├─ Performance specialist
└─ Enum & Value Completeness      ├─ Completeness Gaps             ├─ Data Migration specialist
                                   ├─ Time Window Safety            ├─ API Contract specialist
                                   ├─ Type Coercion at Boundaries   └─ Red Team（条件触发）
                                   ├─ View/Frontend
                                   └─ Distribution & CI/CD Pipeline

所有发现都通过 Fix-First Review 处理。严重性决定呈现顺序，以及 AUTO-FIX / ASK 的分类方式——critical 发现更倾向 ASK（风险更高），informational 发现更倾向 AUTO-FIX（更机械）。
```

---

## Fix-First 启发式

这个启发式同时被 `/review` 和 `/ship` 引用。它决定 agent 是自动修复一个发现，还是询问用户。

```text
AUTO-FIX（agent 无需询问直接修复）：   ASK（需要人工判断）：
├─ Dead code / unused variables            ├─ Security（auth、XSS、injection）
├─ N+1 queries（缺少 eager loading）      ├─ Race conditions
├─ Stale comments contradicting code       ├─ Design decisions
├─ Magic numbers → named constants         ├─ Large fixes（>20 行）
├─ Missing LLM output validation           ├─ Enum completeness
├─ Version/path mismatches                 ├─ Removing functionality
├─ Variables assigned but never read       └─ Anything changing user-visible
└─ Inline styles, O(n*m) view lookups        behavior
```

**经验法则：** 如果修复是机械性的，而且一个资深工程师不用讨论就会这么改，那就是 AUTO-FIX。如果合理的工程师可能对这个修复有分歧，那就是 ASK。

**Critical 发现默认倾向 ASK**（因为本身风险更高）。
**Informational 发现默认倾向 AUTO-FIX**（因为更机械）。

---

## 忽略项 —— 不要标记这些

- “X 和 Y 是重复的”——只要冗余无害、还能提高可读性，就不要标记（例如 `present?` 和 `length > 20` 的冗余）
- “加一个注释解释为什么选了这个阈值 / 常量”——阈值会在调参中变化，注释会过时
- “这个断言还可以更严格”——如果当前断言已经覆盖行为，就不要标记
- 仅仅为了统一风格建议改写（比如加条件包装一个值，只为了和另一个常量的保护方式保持一致）
- “这个正则没覆盖边缘情况 X”——如果输入受约束，且实际不会出现 X，就不要标记
- “这个测试同时覆盖了多个 guard”——没问题，测试不需要把每个 guard 都拆开
- 调整 eval 阈值（max_actionable、min scores）——这些是经验调出来的，会持续变化
- 无害的 no-op（例如对数组里根本不存在的元素调用 `.reject`）
- 你在 review 的 diff 里已经处理过的任何内容——评论前先读完整个 FULL diff