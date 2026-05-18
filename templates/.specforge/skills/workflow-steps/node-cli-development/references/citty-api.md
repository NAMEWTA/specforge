# citty 0.2.x — 命令路由与参数框架

零依赖、TypeScript-first 的 CLI 框架。0.2.x 是当前稳定主版本，安装体积从 0.1.x 的 267 kB 缩减到 22.8 kB，底层使用 `node:util.parseArgs`，纯 ESM 分发。

## 目录

1. [公开 API 总览](#1-公开-api-总览)
2. [defineCommand 完整字段](#2-definecommand-完整字段)
3. [参数类型完整参考](#3-参数类型完整参考)
4. [子命令（subCommands）](#4-子命令subcommands)
5. [插件（defineCittyPlugin）](#5-插件definecittyplugin)
6. [编程式调用（runCommand）](#6-编程式调用runcommand)
7. [自定义 help 输出](#7-自定义-help-输出)

## 1. 公开 API 总览

| 函数 / 类型 | 说明 |
|---|---|
| `defineCommand(def)` | 定义类型安全的命令（零运行时开销，纯类型辅助） |
| `runMain(cmd, opts?)` | CLI 入口，自动处理 `--help` / `--version`，出错时 `process.exit(1)` |
| `runCommand(cmd, opts)` | 编程式调用，错误向上抛，不调用 `process.exit` |
| `createMain(cmd)` | 返回 `(opts?) => Promise<void>`，封装 `runMain` 用于延迟启动 |
| `defineCittyPlugin(plugin)` | 定义可复用的 setup / cleanup 插件 |
| `parseArgs(rawArgs, argsDef)` | 手动解析参数，返回类型化对象 |
| `renderUsage(cmd, parent?)` | 生成帮助文本字符串 |
| `showUsage(cmd, parent?)` | 打印帮助到控制台 |

## 2. defineCommand 完整字段

```typescript
import { defineCommand } from 'citty';

defineCommand({
  // ── meta（命令身份信息）──────────────────────────────────
  meta: {
    name: 'my-cli',           // 命令名，用于 --help 标题
    version: '1.0.0',         // 激活 --version 标志
    description: '工具描述',
    alias: ['mc'],            // 子命令别名（父命令的 subCommands 键中使用）
    hidden: true,             // 从 --help 输出中隐藏此子命令
  },

  // ── args（参数 schema）────────────────────────────────────
  args: { /* 见 §3 */ },

  // ── subCommands（子命令）──────────────────────────────────
  subCommands: { /* 见 §4 */ },

  // ── plugins（可复用钩子）──────────────────────────────────
  plugins: [/* CittyPlugin */],

  // ── 生命周期（执行顺序：setup → run → cleanup）────────────
  setup({ args, cmd, rawArgs }) {
    // run() 之前执行；适合初始化资源
  },
  async run({ args, cmd, rawArgs }) {
    // 主逻辑
  },
  cleanup({ args }) {
    // run() 之后必定执行（finally 语义），适合释放资源
  },
});
```

## 3. 参数类型完整参考

```typescript
args: {
  // ── positional：按位置接收裸值 ─────────────────────────
  // 用法：my-cli <name>
  name: {
    type: 'positional',
    description: '项目名称',
    required: true,
    valueHint: 'name',         // 在 usage 输出中显示 <name>
  },

  // ── string：--output <value> ─────────────────────────
  output: {
    type: 'string',
    description: '输出目录',
    default: './dist',
    alias: ['o'],              // 短别名 -o（数组形式）
    required: false,           // 未填则类型为 string | undefined
  },

  // ── boolean：--watch / --no-watch ────────────────────
  watch: {
    type: 'boolean',
    description: '监听文件变化',
    default: false,
    alias: ['w'],
  },
  // 当 default: true 时配合 negativeDescription：
  color: {
    type: 'boolean',
    default: true,
    description: '彩色输出',
    negativeDescription: '禁用彩色输出',   // 自动生成 --no-color 帮助项
  },

  // ── number：--port <number> ──────────────────────────
  port: {
    type: 'number',
    description: '监听端口',
    default: 3000,
  },

  // ── enum：--format <json|yaml|toml> ─────────────────
  // 推断为字面量联合类型：'json' | 'yaml' | 'toml' | undefined
  format: {
    type: 'enum',
    description: '输出格式',
    options: ['json', 'yaml', 'toml'] as const,
    default: 'json',
  },
}
```

**类型推断规则（0.2.x）**：

| 条件 | 推断类型 |
|---|---|
| `required: true` | `T`（非 undefined） |
| `default: value` | `T`（非 undefined） |
| 其他（可选） | `T \| undefined` |
| `type: 'enum'`, `options: [...] as const` | `'a' \| 'b' \| ... \| undefined` |
| `type: 'number'` | `number \| undefined` |

**kebab-case 自动映射**：

```
--output-dir ./dist
```

在 `run({ args })` 中可通过 `args.outputDir` 或 `args['output-dir']` 访问（自动 Proxy）。

**`valueHint` 的作用**：

```typescript
args: {
  file: {
    type: 'positional',
    description: '输入文件',
    valueHint: 'file.json',    // --help 中显示：<file.json>
    required: true,
  },
}
```

## 4. 子命令（subCommands）

```typescript
// src/commands/deploy.ts
import { defineCommand } from 'citty';

export default defineCommand({
  meta: {
    name: 'deploy',
    description: '部署到指定环境',
    alias: ['d'],              // my-cli d 等同于 my-cli deploy
  },
  args: {
    env: {
      type: 'enum',
      options: ['staging', 'production'] as const,
      default: 'staging',
      alias: ['e'],
    },
  },
  async run({ args }) {
    console.log(`部署到 ${args.env}`);
  },
});

// src/index.ts
import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: { name: 'my-cli', version: '1.0.0', description: '我的 CLI' },
  subCommands: {
    // 懒加载（推荐）：只有执行到该子命令时才 import
    deploy: () => import('./commands/deploy.js').then(m => m.default),
    init:   () => import('./commands/init.js').then(m => m.default),
    // 内嵌别名（0.1.x 兼容写法）
    d: () => import('./commands/deploy.js').then(m => m.default),
  },
});

runMain(main);
```

**递归嵌套子命令**：

```typescript
// src/commands/config/index.ts
import { defineCommand } from 'citty';

export default defineCommand({
  meta: { name: 'config', description: '配置管理' },
  subCommands: {
    get: () => import('./get.js').then(m => m.default),
    set: () => import('./set.js').then(m => m.default),
  },
});
```

## 5. 插件（defineCittyPlugin）

```typescript
import { defineCittyPlugin, defineCommand, runMain } from 'citty';

// 定义可复用插件
const loggerPlugin = defineCittyPlugin({
  name: 'logger',
  setup({ args }) {
    // 在命令 setup 之前运行
    console.log('[logger] 开始，参数:', args);
  },
  cleanup() {
    // 在命令 cleanup 之后运行（逆序）
    console.log('[logger] 结束');
  },
});

const telemetryPlugin = defineCittyPlugin({
  name: 'telemetry',
  async setup({ args }) { /* 异步初始化 */ },
  async cleanup() { /* 异步清理 */ },
});

const main = defineCommand({
  meta: { name: 'app' },
  plugins: [loggerPlugin, telemetryPlugin],
  // 执行顺序：
  //   loggerPlugin.setup → telemetryPlugin.setup
  //   → main.setup → main.run → main.cleanup
  //   → telemetryPlugin.cleanup → loggerPlugin.cleanup
  run() { console.log('运行中'); },
});
```

## 6. 编程式调用（runCommand）

```typescript
import { runCommand } from 'citty';
import deployCmd from './commands/deploy.js';

// 在其他命令或测试中调用，不会触发 process.exit
const { result } = await runCommand(deployCmd, {
  rawArgs: ['--env', 'production'],
});
```

`runCommand` 与 `runMain` 的关键差异：出错时 `runCommand` 把异常向上抛，`runMain` 调用 `process.exit(1)`。测试与编程式调用一律用 `runCommand`。

## 7. 自定义 help 输出

```typescript
import { renderUsage, runMain } from 'citty';
import picocolors from 'picocolors';

runMain(main, {
  showUsage(cmd, parent) {
    const usage = renderUsage(cmd, parent);
    console.log(picocolors.cyan(usage));
  },
});
```

`renderUsage` 返回字符串，方便管道、二次加工或写入文件。`showUsage` 直接打印到 stdout。
