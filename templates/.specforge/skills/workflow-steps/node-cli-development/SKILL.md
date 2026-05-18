---
name: node-cli-development
type: workflow-step
description: >-
  用 citty + @clack/prompts 构建 Node.js CLI 的端到端工作流，覆盖命令路由、参数 schema、
  终端交互、异步任务 UI 与 ESM 发布。触发词：citty、clack、prompts、CLI、命令行、子命令、
  交互式、spinner、defineCommand、runMain、ESM 发布。
version: "1.0.0"
author: "wta"
---

# Node CLI 开发工作流（citty + @clack/prompts）

构建 Node.js CLI 时使用此技能。锁定版本：`citty@0.2.2` · `@clack/prompts@1.4.0` · Node.js ≥ 20.12 · 纯 ESM（`"type": "module"`）。

本主干仅给出**核心骨架 + 选型流程**。所有 API 细节、模板、模式、陷阱已下沉到 [references/](references/)，按需加载。

## 1. 工作流主线

按以下步骤推进 CLI 开发，每一步都对应 references 中的具体章节。

```
1. 初始化项目 ─→ references/templates.md §1（目录结构 + tsconfig）
2. 设计命令树 ─→ references/citty-api.md §1-3（defineCommand / 子命令 / args）
3. 实现交互 ──→ references/clack-prompts-api.md（按 prompt 类型查阅）
4. 组合架构 ──→ references/templates.md §2（生产级 CLI 模板）
5. 编写实战 ──→ references/patterns.md（CI 检测 / 错误恢复 / 流式输出 等）
6. 自查陷阱 ──→ references/pitfalls.md（ESM / 类型变化 / spinner API 迁移）
7. 准备发布 ──→ references/templates.md §3（package.json + bin shebang）
```

## 2. 最小可运行骨架

任何新 CLI 项目从这三个文件开始。完整版本（含懒加载子命令、cancel 工具）见 [references/templates.md](references/templates.md)。

**`src/index.ts`**：

```typescript
#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: {
    name: 'my-cli',
    version: '1.0.0',
    description: '工具描述',
  },
  subCommands: {
    // 懒加载：只在调用对应子命令时才 import
    init: () => import('./commands/init.js').then(m => m.default),
  },
});

runMain(main);
```

**`src/commands/init.ts`**：

```typescript
import { defineCommand } from 'citty';
import * as p from '@clack/prompts';
import { assertOk } from '../utils/cancel.js';

export default defineCommand({
  meta: { name: 'init', description: '创建新项目' },
  args: {
    name: { type: 'positional', required: false, description: '项目名' },
    yes:  { type: 'boolean', alias: ['y'], description: '非交互模式' },
  },
  async run({ args }) {
    p.intro('🚀 创建新项目');
    const name = args.name ?? assertOk(await p.text({ message: '项目名？' }));
    p.outro(`已创建：${name}`);
  },
});
```

**`src/utils/cancel.ts`**（取消处理工具，每个 prompt 必用）：

```typescript
import { isCancel, cancel } from '@clack/prompts';

export function assertOk<T>(value: T | symbol, msg = '操作已取消'): T {
  if (isCancel(value)) {
    cancel(msg);
    process.exit(0);
  }
  return value as T;
}
```

`package.json` 最关键的两行：`"type": "module"`、`"bin": { "my-cli": "./dist/index.js" }`。完整配置见 [references/templates.md §3](references/templates.md)。

## 3. 选型决策表

实现命令时按下表查阅 references。**先决策、再实现**，避免回头改 schema。

### 3.1 参数类型选型

| 用户输入形式 | citty 参数 type | 链接 |
|---|---|---|
| `my-cli <file>` 裸值 | `positional` | [citty-api.md §3](references/citty-api.md) |
| `--name foo` 字符串 | `string` | 同上 |
| `--watch` / `--no-watch` | `boolean` | 同上 |
| `--port 3000` 数字 | `number` | 同上 |
| `--format <json\|yaml>` 枚举 | `enum` + `options as const` | 同上 |

### 3.2 交互式 prompt 选型

| 需要从用户得到 | @clack/prompts API | 链接 |
|---|---|---|
| 单行文本 | `text` | [clack-prompts-api.md §3.4](references/clack-prompts-api.md) |
| 密码 / token | `password` | §3.5 |
| 多行文本 | `multiline` | §3.6 |
| 是 / 否 | `confirm` | §3.7 |
| 单选 | `select` / `selectKey`（按键即响应） | §3.8 / §3.12 |
| 多选 | `multiselect` / `groupMultiselect` | §3.9 / §3.10 |
| 带搜索过滤 | `autocomplete` | §3.11 |
| 文件路径 | `path` | §3.13 |
| 日期 | `date` | §3.14 |

### 3.3 异步反馈选型

| 场景 | API | 链接 |
|---|---|---|
| 单个任务转圈 | `spinner` | [clack-prompts-api.md §3.15](references/clack-prompts-api.md) |
| 多个任务列表 | `tasks` | §3.16 |
| 已知总量的进度条 | `progress` | §3.17 |
| 实时输出日志（pnpm install 之类） | `taskLog` | §3.18 |
| LLM / 流式响应 | `stream` | §3.20 |

### 3.4 多步骤向导选型

涉及 3 个以上连续 prompt 时使用 `group()` 统一管理取消逻辑，见 [clack-prompts-api.md §3.21](references/clack-prompts-api.md) 与 [patterns.md §4](references/patterns.md)。

## 4. 必守原则（高频陷阱速查）

完整陷阱清单见 [references/pitfalls.md](references/pitfalls.md)。以下是写每行代码时都要自检的硬约束：

1. **每个 import 路径写 `.js` 后缀**：`import './foo.js'`，否则 NodeNext ESM 运行时报错。
2. **每个 prompt 之后立即检查取消**：`assertOk(await p.text(...))`；不检查会让后续代码收到 symbol 引发逻辑错误。
3. **spinner 运行中禁用 `console.log`**：与旋转动画冲突，用 `s.message()` 更新文字。
4. **`spinner.stop(msg, code)` 已废弃**：1.x 改成 `s.stop()` / `s.cancel()` / `s.error()` 三个独立方法。
5. **0.2.x 可选参数类型为 `T | undefined`**：未设 `required` / `default` 的参数必须判空再用，0.1.x 的非空假设会编译失败。
6. **`--no-<flag>` 仅在设置 `negativeDescription` 时输出**：依赖 help 中显示 `--no-color` 时记得加这字段。
7. **父命令同时有 positional 与 subCommands 会冲突**：同名字符串路由到子命令，避免在有子命令的命令上定义 positional。
8. **`runMain` 出错调用 `process.exit(1)`**：测试或编程式调用改用 `runCommand`，错误向上抛便于断言。
9. **CI / 无 TTY 环境必须支持 `--yes` 跳过 prompts**：否则脚本挂起。检测方式：`process.env.CI === 'true' || !process.stdin.isTTY`。
10. **TypeScript 严格模式下 prompt 返回值需断言**：`assertOk` 工具内部已用 `as T`，统一通过它消除联合类型。

## 5. 端到端任务清单

新 CLI 从零到发布，按此顺序执行：

```
□ 用 pnpm 初始化，固定 Node ≥ 20.12 与 "type":"module"
□ 写最小骨架（§2）跑通 pnpm dev hello
□ 按 §3 选型表把命令树分文件落到 src/commands/
□ 子命令统一用懒加载 () => import(...).then(m => m.default)
□ 引入 @clack/prompts 实现交互，所有 prompt 用 assertOk 包装
□ 复杂任务用 tasks / progress / taskLog 提供可见反馈
□ 加 --yes 标志支持非交互模式
□ tsc 编译后 chmod +x dist/index.js（或脚本里 "tsc && chmod +x ..."）
□ 跑 references/pitfalls.md 自查清单
□ 配 prepublishOnly，准备 tag 触发的发布流水线
```

## 6. references 索引

| 文件 | 何时读取 |
|---|---|
| [references/citty-api.md](references/citty-api.md) | 设计命令树、定义参数 schema、实现插件、自定义 help 时 |
| [references/clack-prompts-api.md](references/clack-prompts-api.md) | 选择 prompt 类型、调用具体 API、查参数选项时 |
| [references/templates.md](references/templates.md) | 初始化项目、抄完整模板、配置 package.json 与 bin 时 |
| [references/patterns.md](references/patterns.md) | 实战遇到 CI 检测 / 错误恢复 / 动态选项 / 流式输出 等场景时 |
| [references/pitfalls.md](references/pitfalls.md) | 报错排查、版本升级、提交前自查时 |
