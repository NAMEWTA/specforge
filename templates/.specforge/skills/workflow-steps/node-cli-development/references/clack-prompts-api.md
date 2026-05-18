# @clack/prompts 1.x — 终端交互 UI

@clack/prompts 是轻量（80% 小于同类库）、预样式化的终端 UI 库。1.x 纯 ESM，依赖 Node.js 内置 `styleText`（替代 picocolors）。

## 目录

1. [全量导出速查表](#1-全量导出速查表)
2. [会话控制](#2-会话控制)
3. [取消处理（核心模式）](#3-取消处理核心模式)
4. [text — 单行文本](#4-text--单行文本)
5. [password — 掩码输入](#5-password--掩码输入)
6. [multiline — 多行文本（1.3.0+）](#6-multiline--多行文本130)
7. [confirm — 是 / 否确认](#7-confirm--是--否确认)
8. [select — 单选列表](#8-select--单选列表)
9. [multiselect — 多选](#9-multiselect--多选)
10. [groupMultiselect — 分组多选](#10-groupmultiselect--分组多选)
11. [autocomplete — 带搜索的单选](#11-autocomplete--带搜索的单选)
12. [selectKey — 按键即响应](#12-selectkey--按键即响应)
13. [path — 路径输入](#13-path--路径输入)
14. [date — 日期选择器（1.2.0+）](#14-date--日期选择器120)
15. [spinner — 单任务旋转指示器](#15-spinner--单任务旋转指示器)
16. [tasks — 多任务列表](#16-tasks--多任务列表)
17. [progress — 进度条](#17-progress--进度条)
18. [taskLog — 实时日志任务](#18-tasklog--实时日志任务)
19. [log — 日志输出](#19-log--日志输出)
20. [stream — 流式输出（LLM / 异步迭代器）](#20-stream--流式输出llm--异步迭代器)
21. [group — 批量编排 prompts](#21-group--批量编排-prompts)
22. [updateSettings — 全局设置](#22-updatesettings--全局设置)

## 1. 全量导出速查表

```typescript
import {
  // ── 会话控制 ─────────────────────────────────────────────
  intro,            // 开场横幅（带上边框线）
  outro,            // 结束横幅（带下边框线）
  cancel,           // 取消提示（灰色，带 ✖）
  isCancel,         // 类型守卫：判断 prompt 返回值是否为取消 symbol

  // ── 文本输入 ─────────────────────────────────────────────
  text,             // 单行文本
  password,         // 掩码输入
  multiline,        // 多行文本（1.3.0+）

  // ── 选择类 ───────────────────────────────────────────────
  confirm,          // 是 / 否确认
  select,           // 单选列表
  multiselect,      // 多选列表（空格切换，回车确认）
  groupMultiselect, // 分组多选
  autocomplete,     // 带搜索过滤的单选
  selectKey,        // 按键即响应的快捷选择

  // ── 特殊输入 ─────────────────────────────────────────────
  path,             // 文件/目录路径（带 Tab 补全）
  date,             // 日期选择器（1.2.0+）

  // ── 异步任务 UI ───────────────────────────────────────────
  spinner,          // 旋转指示器（单任务）
  tasks,            // 多任务并行列表
  progress,         // 带进度条的指示器
  taskLog,          // 带实时日志流的任务

  // ── 日志与展示 ────────────────────────────────────────────
  log,              // log.info / .success / .warn / .error / .step / .message
  note,             // 带边框的信息卡片
  stream,           // 流式输出（LLM / 异步迭代器）

  // ── 分组执行 ─────────────────────────────────────────────
  group,            // 顺序执行一组 prompt，统一取消处理

  // ── 全局设置 ─────────────────────────────────────────────
  updateSettings,   // 全局配置（guide 线、消息本地化等）
  settings,         // 读取当前全局设置
} from '@clack/prompts';
```

## 2. 会话控制

```typescript
import { intro, outro } from '@clack/prompts';

intro('🚀 create-my-app');    // ┌  create-my-app
// ... prompts ...
outro('✅ 全部完成！');        // └  全部完成！
```

## 3. 取消处理（核心模式）

每个 prompt 在用户按 `Ctrl+C` 时返回 `symbol`（而非预期类型），**必须在每次 await 后检查**。

**推荐封装**（`src/utils/cancel.ts`）：

```typescript
import { isCancel, cancel } from '@clack/prompts';

/**
 * 断言 prompt 结果非取消，否则打印消息并退出。
 * @example const name = assertOk(await text({ message: '名称？' }))
 */
export function assertOk<T>(value: T | symbol, msg = '操作已取消'): T {
  if (isCancel(value)) {
    cancel(msg);
    process.exit(0);
  }
  return value as T;
}
```

## 4. text — 单行文本

```typescript
import { text } from '@clack/prompts';

const name = await text({
  message: '项目名称？',
  placeholder: 'my-app',         // 灰色占位文字
  initialValue: '',               // 预填值（用户可编辑）
  validate(value) {
    if (!value?.length) return '名称不能为空';
    if (!/^[a-z0-9-]+$/.test(value)) return '只允许小写字母、数字和连字符';
    // 返回 string → 显示为错误；返回 Error → 同上；返回 undefined → 通过
  },
});
// 返回类型：string | symbol
```

## 5. password — 掩码输入

```typescript
import { password } from '@clack/prompts';

const token = await password({
  message: '输入 API Token：',
  mask: '●',                      // 掩码字符，默认 '•'
  validate(value) {
    if (!value || value.length < 16) return 'Token 长度不足';
  },
});
```

## 6. multiline — 多行文本（1.3.0+）

```typescript
import { multiline } from '@clack/prompts';

const description = await multiline({
  message: '项目描述（Alt+Enter 换行，Enter 提交）：',
  placeholder: '描述你的项目...',
  validate(value) {
    if (!value?.trim()) return '描述不能为空';
  },
});
```

## 7. confirm — 是 / 否确认

```typescript
import { confirm } from '@clack/prompts';

const overwrite = await confirm({
  message: '目录已存在，是否覆盖？',
  initialValue: false,
  active: '覆盖',                 // 自定义 Yes 文本
  inactive: '取消',              // 自定义 No 文本
  // vertical: true,             // 上下排列而非左右（1.0.1+）
});
// 返回类型：boolean | symbol
```

## 8. select — 单选列表

```typescript
import { select } from '@clack/prompts';

const framework = await select({
  message: '选择框架：',
  options: [
    { value: 'react',   label: 'React',   hint: '推荐' },
    { value: 'vue',     label: 'Vue 3' },
    { value: 'solid',   label: 'SolidJS' },
    { value: 'angular', label: 'Angular', disabled: true },
  ],
  initialValue: 'react',
});
// 返回类型：value 字面量类型 | symbol
```

## 9. multiselect — 多选

```typescript
import { multiselect } from '@clack/prompts';

const tools = await multiselect({
  message: '选择额外工具（空格切换）：',
  options: [
    { value: 'eslint',   label: 'ESLint',   hint: '推荐' },
    { value: 'prettier', label: 'Prettier' },
    { value: 'vitest',   label: 'Vitest' },
    { value: 'husky',    label: 'Husky',    disabled: true },
  ],
  required: false,               // 允许一个都不选,默认 true
  // cursorAt: 'prettier',       // 初始光标位置
});
// 返回类型:value[] | symbol
```

## 10. groupMultiselect — 分组多选

```typescript
import { groupMultiselect } from '@clack/prompts';

const selections = await groupMultiselect({
  message: '选择依赖：',
  options: {
    'UI 框架': [
      { value: 'react', label: 'React' },
      { value: 'vue',   label: 'Vue' },
    ],
    '工具链': [
      { value: 'vite',    label: 'Vite' },
      { value: 'rollup',  label: 'Rollup' },
    ],
  },
  required: false,
  selectableGroups: true,        // 允许选中整个分组（1.0.1+ 默认 true）
  groupSpacing: 1,               // 分组间空行数（1.0.0+）
});
```

## 11. autocomplete — 带搜索的单选

```typescript
import { autocomplete } from '@clack/prompts';

const pkg = await autocomplete({
  message: '搜索包名：',
  placeholder: 'react',          // Tab 键接受占位值（1.2.0+）
  options: [
    { value: 'react',   label: 'React' },
    { value: 'vue',     label: 'Vue' },
    { value: 'angular', label: 'Angular' },
    { value: 'svelte',  label: 'Svelte' },
  ],
  // 自定义过滤（支持模糊搜索）：
  filter: (search, option) =>
    option.label.toLowerCase().includes(search.toLowerCase()),
  // 动态选项（函数形式，同步，this.userInput 为当前输入）：
  // options: function() {
  //   return fetchOptions(this.userInput);
  // },
});
```

## 12. selectKey — 按键即响应

```typescript
import { selectKey } from '@clack/prompts';

const action = await selectKey({
  message: '选择操作（按对应键）：',
  options: [
    { value: 'd', label: '部署到 staging' },
    { value: 'p', label: '部署到 production' },
    { value: 'q', label: '退出' },
  ],
});
// 用户按下 'd' 立即响应,无需回车
// 返回类型:string | symbol
```

## 13. path — 路径输入

```typescript
import { path } from '@clack/prompts';

const dir = await path({
  message: '选择目标目录：',
  directory: true,               // 仅目录；false = 文件或目录均可
  initialValue: './',
  validate(value) {
    if (!value) return '路径不能为空';
  },
});
```

## 14. date — 日期选择器（1.2.0+）

```typescript
import { date } from '@clack/prompts';

const due = await date({
  message: '选择截止日期：',
  format: 'YMD',                              // 'YMD' | 'MDY' | 'DMY'
  minDate: new Date(Date.UTC(2025, 0, 1)),
  maxDate: new Date(Date.UTC(2026, 11, 31)),
  defaultValue: new Date(),
  validate(value) {
    if (value < new Date()) return '不能选择过去的日期';
  },
});
// 返回类型：Date | symbol
```

## 15. spinner — 单任务旋转指示器

```typescript
import { spinner } from '@clack/prompts';

const s = spinner({
  indicator: 'dots',             // 'dots'（默认）| 'timer'（显示计时）
  cancelMessage: '已取消',       // Ctrl+C 触发的消息（国际化支持）
  errorMessage: '出现错误',
});

s.start('正在部署...');
s.message('连接服务器...');      // 运行中更新文字，不换行

try {
  await deploy();
  s.stop('部署成功');            // 成功：绿色 ✓
} catch (err) {
  s.error(`部署失败：${err}`);   // 错误：红色 ✗，保留消息
  // 其他方法：
  // s.cancel('用户中止');       // 取消：黄色 ○
}
```

**0.x → 1.x 迁移**：`stop(msg, 1)` → `cancel(msg)`，`stop(msg, 2)` → `error(msg)`

## 16. tasks — 多任务列表

```typescript
import { tasks } from '@clack/prompts';

await tasks([
  {
    title: '安装依赖',
    task: async (message) => {
      message('解析依赖树...');   // 更新当前旋转文字
      await install();
      return '安装完成';          // 返回 string = 成功消息（✓）
                                  // throw Error = 失败消息（✗）
    },
    enabled: shouldInstall,       // 条件启用/禁用
  },
  {
    title: '初始化 Git',
    task: async () => {
      await gitInit();
      return 'Git 已初始化';
    },
  },
]);
```

## 17. progress — 进度条

```typescript
import { progress } from '@clack/prompts';

const p = progress({ max: files.length });
p.start('处理文件...');

for (const file of files) {
  await processFile(file);
  p.advance(1, `处理中 (${p.value}/${files.length})`);
}

p.stop('处理完成');
// 错误：p.error('处理失败')
// 取消：p.cancel('已中止')
```

## 18. taskLog — 实时日志任务

```typescript
import { taskLog } from '@clack/prompts';

const log = taskLog({ title: 'pnpm install' });

for await (const line of spawnpnpmInstall()) {
  log.message(line);            // 实时展示每行输出
}

log.success('安装成功');        // 成功时清除日志（只保留标题 + ✓）
// log.error('安装失败');       // 失败时保留完整日志可见
```

## 19. log — 日志输出

```typescript
import { log, note } from '@clack/prompts';

log.info('ℹ 提示信息');
log.success('✓ 操作成功');
log.warn('⚠ 注意');
log.error('✗ 出错了');
log.step('→ 步骤说明');
log.message('自定义消息', { symbol: '~' });

// note：带边框的信息卡片
note(
  '项目创建完成！\ncd my-app && pnpm run dev',
  '后续步骤',
);
```

## 20. stream — 流式输出（LLM / 异步迭代器）

```typescript
import { stream } from '@clack/prompts';

// 同步生成器
stream.info((function* () {
  yield '正在分析...';
  yield ' 完成';
})());

// 异步生成器（适合 LLM 流式响应）
async function* llmStream() {
  const res = await fetch('/api/chat', { method: 'POST', body });
  for await (const chunk of res.body!) {
    yield new TextDecoder().decode(chunk);
  }
}

stream.success(llmStream());

// 自定义符号
stream.message(asyncIter, { symbol: '→' });

// 其他方法：stream.warn() / stream.error() / stream.step()
```

## 21. group — 批量编排 prompts

```typescript
import * as p from '@clack/prompts';

const config = await p.group(
  {
    name: () => p.text({
      message: '项目名称？',
      validate: (v) => !v ? '必填' : undefined,
    }),

    type: () => p.select({
      message: '项目类型？',
      options: [
        { value: 'app', label: '应用程序' },
        { value: 'lib', label: '库' },
      ],
    }),

    // 基于前面答案动态决定是否展示
    lint: ({ results }) =>
      results.type === 'lib'
        ? p.confirm({ message: '添加 ESLint？', initialValue: true })
        : undefined,   // undefined = 跳过此 prompt，config.lint 为 undefined
  },
  {
    onCancel({ results }) {
      p.cancel('已取消');
      process.exit(0);
    },
  },
);

// config.name: string, config.type: string, config.lint: boolean | undefined
```

## 22. updateSettings — 全局设置

```typescript
import { updateSettings, settings } from '@clack/prompts';

// 关闭引导线（适合 CI / 管道输出）
updateSettings({ withGuide: false });

// 国际化 spinner 消息
updateSettings({
  messages: {
    cancel: '已取消',     // Ctrl+C 消息
    error: '出现错误',    // 错误状态消息
  },
});

// 读取当前设置
console.log(settings.messages.cancel);
```
