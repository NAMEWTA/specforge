# 实战模式集

8 个高频场景的可复用代码模板。每个模式都给出"何时用 + 代码 + 关键点"。

## 目录

1. [CI / 非交互环境检测](#1-ci--非交互环境检测)
2. [带错误恢复的 spinner](#2-带错误恢复的-spinner)
3. [异步加载动态 select 选项](#3-异步加载动态-select-选项)
4. [多步骤向导（group 最佳实践）](#4-多步骤向导group-最佳实践)
5. [流式 LLM 输出到终端](#5-流式-llm-输出到终端)
6. [国际化 spinner 消息](#6-国际化-spinner-消息)
7. [note 展示配置摘要](#7-note-展示配置摘要)
8. [带 valueHint 的 positional 参数](#8-带-valuehint-的-positional-参数)

## 1. CI / 非交互环境检测

**何时用**：CLI 既要支持交互又要能在 CI 跑。

```typescript
const isCi = process.env.CI === 'true' || !process.stdin.isTTY;

const name = isCi
  ? (args.name ?? 'default')
  : assertOk(await p.text({ message: '名称？' }));
```

**关键点**：CI 流水线（GitHub Actions、GitLab CI 等）会设置 `CI=true`；非 TTY 环境（管道、Docker exec）`process.stdin.isTTY` 为 false。两个条件取或覆盖更全。

## 2. 带错误恢复的 spinner

**何时用**：长任务可能失败，需要清晰的失败展示与退出。

```typescript
const s = p.spinner();
s.start('正在部署...');
try {
  await deploy();
  s.stop('部署成功');
} catch (err) {
  s.error(`部署失败：${(err as Error).message}`);
  p.log.error('请检查日志后重试');
  process.exit(1);
}
```

**关键点**：`s.error()` 让旋转动画停在红色 ✗，并保留消息可见；`process.exit(1)` 让外层脚本能感知失败状态。

## 3. 异步加载动态 select 选项

**何时用**：选项需要先从远端拉取（npm 包列表、远程模板等）。

```typescript
const s = p.spinner();
s.start('加载远程模板...');
const templates = await fetchRemoteTemplates();
s.stop(`已加载 ${templates.length} 个模板`);

const chosen = assertOk(await p.select({
  message: '选择模板：',
  options: templates.map(t => ({
    value: t.id,
    label: t.name,
    hint: t.description,
  })),
}));
```

**关键点**：先 spinner 显示加载状态，stop 后再展示 select，避免数据未就绪时阻塞用户输入。

## 4. 多步骤向导（group 最佳实践）

**何时用**：3 个以上连续 prompt 且部分 prompt 依赖前面答案。

```typescript
const answers = await p.group(
  {
    name:    () => p.text({ message: '项目名？' }),
    pkg:     () => p.select({ message: '包管理器？', options: [
                    { value: 'pnpm' }, { value: 'npm' }, { value: 'bun' },
                  ]}),
    git:     () => p.confirm({ message: '初始化 Git？', initialValue: true }),
    // 有条件的 prompt
    remote:  ({ results }) => results.git
               ? p.text({ message: 'Git 远程仓库 URL（可选）：', required: false })
               : undefined,
  },
  {
    onCancel: () => { p.cancel('已取消'); process.exit(0); },
  },
);
```

**关键点**：
- `group` 自动处理每个 prompt 的取消，不需要逐个 `assertOk`
- 条件 prompt 返回 `undefined` 时该字段被跳过
- `onCancel` 在用户中途按 Ctrl+C 时触发，统一退出

## 5. 流式 LLM 输出到终端

**何时用**：调用 LLM API、SSE 接口，希望逐字展示。

```typescript
async function* streamLLM(prompt: string) {
  const res = await fetch('https://api.example.com/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield dec.decode(value);
  }
}

p.stream.success(streamLLM('解释 citty'));
```

**关键点**：`stream.success` 接受异步生成器，自动逐 chunk 输出并保持单行刷新。

## 6. 国际化 spinner 消息

**何时用**：CLI 面向中文用户，希望 Ctrl+C / 报错时也是中文。

```typescript
import { updateSettings } from '@clack/prompts';

// 在入口处全局设置一次
updateSettings({
  messages: {
    cancel: '操作已中止',
    error:  '发生错误，请稍后重试',
  },
});
```

**关键点**：在 `runMain` 之前调用，影响所有 spinner / progress / taskLog 默认消息。

## 7. note 展示配置摘要

**何时用**：执行前让用户确认完整配置；执行后给出后续步骤。

```typescript
p.note(
  [
    `项目名称：${name}`,
    `模板：    ${template}`,
    `路径：    ${resolve(name)}`,
    `工具：    ${extras.join(', ') || '无'}`,
  ].join('\n'),
  '配置摘要',
);
```

**关键点**：用对齐空格让多行内容工整；第二个参数是 note 的标题。

## 8. 带 valueHint 的 positional 参数

**何时用**：希望 `--help` 输出更易读。

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

**关键点**：默认 `--help` 只显示参数名 `<file>`，加 `valueHint` 后变成 `<file.json>`，提示用户期望的格式。
