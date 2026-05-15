# SpecForge

> **AI-native 规格驱动开发工作流 CLI** —— 汲取 [OpenSpec](https://github.com/Fission-AI/OpenSpec)、[gstack](https://github.com/garrytan/gstack)、[superpowers](https://github.com/obra/superpowers)、[claude-task-master](https://github.com/eyaltoledano/claude-task-master)、[Anthropic skills](https://github.com/anthropics/skills) 五个开源项目的精华，融合内化为一套本地 CLI + 可复用工作流模板。

[![npm](https://img.shields.io/npm/v/@namewta/specforge.svg)](https://www.npmjs.com/package/@namewta/specforge)
[![node](https://img.shields.io/node/v/@namewta/specforge.svg)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**语言版本：** [English](./README.md) · **简体中文**

---

## 设计血脉：站在五个开源项目的肩膀上

SpecForge 并不重新发明规格驱动开发，而是**内化并融合**开源生态中最经得起实战检验的模式，把它们熔铸成一套连贯的工具链。SpecForge **吸收方法论，而非复制实现**——下表列出的每个项目，我们只取其设计思想与工作流模式：

| 借鉴项目 | SpecForge 吸收的设计 |
|---|---|
| [**OpenSpec**（Fission-AI）](https://github.com/Fission-AI/OpenSpec) | 双目录模型（`.specforge/` 框架资产 + `specforge/` 用户资产）、产物 DAG（`BLOCKED / READY / DONE` 状态机）、Profile 体系（`minimal` / `standard` / `custom`）、Commands + Skills 双轨表示 |
| [**gstack**（garrytan）](https://github.com/garrytan/gstack) | Preamble 引导系统（命令内嵌 `<!-- preamble:bash -->`）、多视角 Plan 审查、会话感知的上下文收集 |
| [**superpowers**（obra）](https://github.com/obra/superpowers) | Iron Laws 硬门禁、技能链式调用、子代理驱动实现、反规避语言、压力测试纪律 |
| [**claude-task-master**（eyaltoledano）](https://github.com/eyaltoledano/claude-task-master) | PRD → 任务分解管线、Zod Schema 校验、复杂度分析、结构化响应契约 |
| [**Anthropic skills**](https://github.com/anthropics/skills) | 三级渐进披露（L1 frontmatter → L2 主体 → L3 `references/`）、skill-creator 方法论、基准驱动的技能编写 |
| [**flow-kit**（rihebty）](https://github.com/rihebty/flow-kit) | Brownfield 五护栏（入场扫描、既有架构对齐、read/write 边界、提交前对账、既有抽象 grep）、清窗/重启协议与 PROGRESS 产物、三层项目级文档（rules / structure / LESSONS）、L3 加载预算（≤ 150 行）、v0 草稿门禁、LESSONS 提名精化与 L-NNN 格式、Token 成本透明化 |

同时还借鉴了 [spec-kit](https://github.com/github/spec-kit) 的宪法/扩展钩子模式，以及 [grill-me](https://github.com/obra/grill-me) 的多视角提问框架。

SpecForge 的使命是：**保留每个项目的精华**——产物门禁、渐进加载、Profile 裁剪、子代理衔接——并把它们统一在一个 CLI 后面，让你不必同时采用五个独立工具就能享受它们带来的收益。

## 它解决什么问题

和 AI 协作写真实项目，最大的卡点几乎从来不是"模型写不出来"，而是：

- **阶段边界模糊** —— 需求、设计、实现、QA、发布全揉进同一段对话，代理容易跳步
- **上下文膨胀** —— 所有规则、风格、SOP 一次性灌入；命中率下降，成本暴涨
- **经验不沉淀** —— 每开一个项目都要从零口述一遍"我们团队的约定"
- **工具链割裂** —— Claude、Cursor、Kiro、Codex 各有一套 prompt 结构，无法复用

SpecForge 把这些全部钉在文件系统上。它在你的仓库中生成 `.specforge/`（框架资产）和 `specforge/`（用户资产），把 8 阶段生命周期、命令、技能、产物依赖、扩展钩子都编码成普通文件，再让 AI 代理沿既定工作流前进——同时让人类对每一步都可审计、可修改、可回滚。

## 核心设计

### 双目录模型（来自 OpenSpec）

```
.specforge/          # 框架资产——可被 `specforge update` 重新生成
  ├── commands/      #   workflow + tool 命令
  ├── skills/        #   7 类技能
  ├── templates/     #   产物模板（DESIGN.md / TASKS.md / PROGRESS.md）
  └── config.yaml    #   框架级机器源（context / rules / errors / handoffs / hooks）

specforge/           # 用户资产——事实来源，框架绝不自动覆盖
  ├── config.yaml    #   项目级覆盖/追加
  ├── spec/          #   当前规格
  ├── brainstorming/ #   头脑风暴产物
  ├── context/       #   三层文档（context.md / architecture.md / lessons.md）
  ├── changes/       #   活跃变更
  └── archive/       #   已归档变更
```

### 8 阶段生命周期

```
foundation → requirements → design → planning → implementation → quality → release → evolution
```

- 每个阶段对应一个 `workflow-command` 和一份**标准产物**
- 阶段间通过**产物 DAG** 衔接；缺前置产物被硬门禁阻断（`specforge status --check-requires`）
- 运维（runbook / 监控 / 回滚）语义合并进 `release`，不再单列阶段

### 三级渐进披露（来自 Anthropic skills）

| 层级 | 载入时机 | 内容 | 预算 |
|------|---------|------|------|
| L1 Always | 始终加载 | frontmatter（name / type / description） | description ≤ 200 字符 |
| L2 On Trigger | 命中触发词 | 命令 / 技能主体 | ≤ 500 行 |
| L3 On Demand | 按需 | `references/`、`scripts/`、`templates/` | 必须从 L2 被引用 |

违规由 `specforge doctor --check-disclosure` 捕获。

### Profile 体系（来自 OpenSpec）

| Profile | 启用阶段 | 适用场景 |
|---------|---------|---------|
| `minimal` | foundation, requirements, implementation, quality, release（5 阶段） | 快速原型 / POC |
| `standard` | 全部 8 阶段（**默认**） | 正式项目 |
| `custom` | 用户声明 `enabledPhases` | 裁剪组合 |

## 快速开始

### 环境要求

- Node.js ≥ **24.14.1**
- 推荐 pnpm（npm / yarn 亦可）

### 安装

```bash
# 全局安装
npm install -g @namewta/specforge
# 或
pnpm add -g @namewta/specforge

# 或不装直接用 npx
npx @namewta/specforge --version
```

### 初始化

```bash
cd your-project
specforge init
# 指定 profile / 项目名
specforge init --profile standard --project-name my-app
```

完成后：

```
your-project/
├── .specforge/       # 框架资产（可 update）
└── specforge/        # 用户资产（事实来源）
```

### 沿生命周期推进

每个 workflow command 位于 `.specforge/commands/workflow/<阶段>-<动词>/<阶段>-<动词>.md`，AI 代理通过 `@.specforge/commands/workflow/foundation-init/foundation-init.md` 形式加载。

```bash
# 查看当前阶段状态
specforge status

# 查看产物 DAG
specforge status --graph

# 检查某阶段的前置产物是否就绪
specforge status --phase design --check-requires

# 列出命令 / 技能（机器可读）
specforge list --format json
specforge list --skills --triggers=test,qa

# 刷新框架资产（不碰 specforge/）
specforge update
```

## CLI 参考

| 命令 | 用途 |
|------|------|
| `specforge init [path]` | 初始化双目录。`--profile`、`--enabled-phases`、`--project-name`、`--force` |
| `specforge add-command` | 生成命令骨架。`--type workflow-command\|tool-command --name <kebab-case>` |
| `specforge add-skill <name>` | 生成技能骨架。`--type <domain-rule\|...>`、`--mode directory\|single-file` |
| `specforge list` | 列出命令 / 技能。`--commands`、`--skills`、`--type`、`--triggers`、`--format xml\|json\|text` |
| `specforge status` | 当前 change 的阶段状态。`--phase`、`--check-requires`、`--graph`、`--json` |
| `specforge update [path]` | 刷新 `.specforge/`（保留 `specforge/`）。`--force` |
| `specforge run-hook` | 执行 `extensions.yaml` 钩子。`--phase --stage before\|after --json` |
| `specforge profile show` | 显示当前 profile。`--json` |
| `specforge profile set <name>` | 切换 profile，写入 `specforge/config.yaml`。`custom` 需 `--enabled-phases` |
| `specforge doctor` | 诊断。`--check-node`、`--check-deps`、`--check-compat`、`--check-disclosure`、`--quiet` |

全局：`--no-color` 禁用彩色；`--version` / `-V` 显示版本。

## 概念速览

### 命令 vs 技能（来自 OpenSpec 的双轨表示）

- **命令** —— `type` 以 `-command` 结尾（`workflow-command` / `tool-command` / `devflow-command` / `gitflow-command`）。命令是**动作**，推进阶段。
- **技能** —— `type` 不以 `-command` 结尾（`domain-rule` / `code-style` / `architecture-rule` / `testing-rule` / `security-rule` / `ui-ux-rule` / `workflow-step`）。技能是**上下文**，按触发词注入。

两者共享同一份 5 字段 frontmatter：`name / type / description / version / author`。

### 产物 DAG

```
proposal ──► design ──► tasks ──► quality-report ──► archive ──► retrospective
                       ▲
        tasks 同时依赖 proposal 与 design
```

三种节点状态：`DONE`（文件存在）、`READY`（所有依赖已 DONE）、`BLOCKED`（至少一个依赖未 DONE）。DAG 支持三色 DFS 循环依赖检测，并拒绝未知 / 重复 id。

### 扩展钩子（来自 spec-kit）

在 `.specforge/extensions.yaml` 声明 `before_<phase>` / `after_<phase>` 钩子，workflow command 在 preamble 中通过 `specforge run-hook` 触发。必需钩子失败即阻断；`optional: true` 的钩子失败仅 warn。

```yaml
hooks:
  before_release:
    - name: 安全审计
      command: pnpm audit
      enabled: true
      optional: true
      timeoutMs: 60000
```

### Preamble（来自 gstack）

命令和技能可内嵌 `<!-- preamble:bash ... -->` 注释块，代理加载文件时按需解析执行，用于自动收集上下文：

```markdown
<!-- preamble:bash
specforge list --skills --triggers=test,qa --format=json
specforge status --phase=quality --check-requires
specforge doctor --check-deps --quiet
-->
```

### 硬门禁（来自 superpowers / Iron Laws）

每个阶段有可执行的硬约束，声明在 `templates/.specforge/config.yaml` 的 `rules.<phase>.hardGates`：

- `requirements` —— 方案未批准禁止进入 design
- `design` —— 没有接口契约与错误策略禁止进入 planning
- `implementation` —— 禁止在测试之前写生产代码（TDD）
- `quality` —— 无新验证证据禁止声称完成
- `release` —— 没有 runbook 禁止上线

### 错误字典

`E001_missingPrerequisiteArtifact`、`E002_unapprovedSolution`、`E003_contractMissing`、`E004_noVerificationEvidence`、`E005_contextOverload` —— 全部定义在 `templates/.specforge/config.yaml` 的 `errors` 段，便于命令和技能用稳定编号引用。

## 开发

```bash
pnpm install         # 装依赖
pnpm dev -- init     # tsx 直跑源码（参数放 -- 后）
pnpm test            # 单元 + 集成测试
pnpm lint            # ESLint
pnpm format          # Prettier
pnpm build           # tsc + shebang 注入
pnpm build:check-bin # 校验 dist/cli/index.js 可执行
pnpm check           # lint + test + build（prepublishOnly 自动跑）
```

项目结构：

```
src/
├── cli/             # Commander 路由
├── commands/        # 命令实现（init / add-* / list / status / update / run-hook / profile / doctor / codebase-health / project-inventory）
├── services/        # 业务服务（scaffold / command / skill / listing / status / update / hooks / health / inventory / lessons / design-explore / evolve / implementation）
├── core/            # 领域模型（constants / lifecycle-types / profiles / artifact-graph / hooks / metadata-schema / disclosure-config / task-schema / ...）
├── utils/           # 基础设施（fs / yaml / path / logger / template-renderer）
└── adapters/        # 平台适配（windows-filename-adapter）
templates/           # 初始化模板（随 npm 包发布）
scripts/             # inject-shebang.mjs / verify-bin.mjs
tests/               # 单元 + 集成测试
```

详细架构与协作约定见 [`AGENTS.md`](AGENTS.md)。

## 发布流程

- GitHub Actions：`ci.yml`（push / PR）+ `release.yml`（`v*` tag 触发）
- 步骤：setup → lint → test → build → **verify-bin** → `npm publish --provenance --access public` → GitHub Release（`softprops/action-gh-release@v2`）
- 规则：`package.json` 版本必须与 git tag（去掉 `v` 前缀）一致
- Dependabot 每周扫描 npm 与 GitHub Actions 依赖

## Token 成本预算

> 以下区间基于方法论层面的工作量估计，**非精确度量**；实际消耗受模型、会话长度、代码库规模、探针命中率等因素影响。

### 规模分档

| Change 规模 | 代码行数 | 估算 Token 区间（一次完整生命周期） | 典型场景 |
|---|---|---|---|
| 小 change | < 100 行 | 约 20k – 60k tokens | 单点 bugfix / 小功能增补 |
| 中 change | 100 – 500 行 | 约 80k – 200k tokens | 单模块功能实现 / 重构局部 |
| 中大 change | 500 – 1500 行 | 约 250k – 600k tokens | 新增 service + 若干命令 |
| 大 milestone | 1500+ 行 | 600k+ tokens（建议拆分） | 跨维度改造（如本次 flow-kit 集成） |

### 决策指南：何时该走 SpecForge

- ✅ 改动会影响 ≥ 2 个模块的契约
- ✅ 存在"需要沉淀到项目级知识"的决策或规则
- ✅ 团队需要审计线（哪个方案被否、为什么）
- ✅ Brownfield 项目首次引入 AI 协作（需要先 project-inventory）
- ✅ 需要跨阶段产物衔接（proposal → design → tasks → quality）

### 决策指南：何时不该走 SpecForge

- ❌ 一次性拼写错 / 格式化 / 依赖小版本升级
- ❌ 只需 ≤ 5 行代码改动的 hotfix
- ❌ 纯探索性脚本（写完即弃）
- ❌ 时间压力下对交付质量不敏感的场景（承担 LESSONS 缺失的代价）
- ❌ 已有成熟 SOP 且无需沉淀新知识的重复性任务

### 省 Token 的六个习惯

1. **先加载 inventory.md / context.md**：避免每次重新介绍项目，让代理直接进入工作状态
2. **严守 write_files 边界**：越界会让 AI 不断扩大上下文窗口，成本指数增长
3. **使用 v0 草稿**：500 字的方向校准远便宜于详细 DESIGN 推倒重来
4. **遵守 L3 加载预算 ≤ 150 行**：超预算就把内容挪到 `references/` 按需引用
5. **清窗前落 PROGRESS**：避免恢复后重复尝试已排除方案（触发 E010）
6. **定期跑 codebase-health**：把死代码/未用依赖写进禁动清单，降低 AI 误触概率

## 文档

- [`AGENTS.md`](AGENTS.md) —— AI 代理协作指南（使用 AI 的贡献者必读）
- [`CHANGELOGS.md`](CHANGELOGS.md) —— 版本历史
- [`README.md`](README.md) —— 本 README 的英文版

## 致谢

SpecForge 站在以下开源项目的肩膀上：

- [**OpenSpec**](https://github.com/Fission-AI/OpenSpec) by Fission-AI —— 双目录模型、产物 DAG、Profile
- [**gstack**](https://github.com/garrytan/gstack) by garrytan —— Preamble 引导、多视角审查
- [**superpowers**](https://github.com/obra/superpowers) by obra —— Iron Laws、技能链式调用、子代理驱动开发
- [**claude-task-master**](https://github.com/eyaltoledano/claude-task-master) by eyaltoledano —— PRD → 任务、复杂度分析
- [**skills**](https://github.com/anthropics/skills) by Anthropic —— 渐进式披露、skill-creator 方法论
- [**flow-kit**](https://github.com/rihebty/flow-kit) by rihebty —— Brownfield 护栏、清窗协议、三层文档、Token 成本透明化

感谢上述每一个项目的作者。

## License

MIT © namewta
