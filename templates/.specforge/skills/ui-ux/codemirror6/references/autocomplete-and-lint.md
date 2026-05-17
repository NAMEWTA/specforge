# 自动补全与诊断（Autocomplete & Lint）

> 何时阅读：需要为编辑器添加 IntelliSense、错误提示、LSP 集成时。

## 1. 自动补全

### 1.1 静态列表

```ts
import { autocompletion, completeFromList } from '@codemirror/autocomplete'

const staticComplete = completeFromList([
  { label: 'console',     type: 'variable', info: 'Global console object' },
  { label: 'console.log', type: 'function', apply: 'console.log(${})', detail: '(...args)' },
  { label: 'function',    type: 'keyword', boost: 99 }, // boost 控制排序权重
])

const ext = autocompletion({ override: [staticComplete] })
```

### 1.2 动态/异步补全源

```ts
import { CompletionContext, CompletionResult } from '@codemirror/autocomplete'

async function myCompletionSource(context: CompletionContext): Promise<CompletionResult | null> {
  // 1. 判断触发位置
  const word = context.matchBefore(/\w*/)
  if (!word || (word.from === word.to && !context.explicit)) return null

  // 2. 异步获取候选
  const options = await fetchCompletions(word.text)

  return {
    from: word.from,
    options,
    validFor: /^\w*$/, // 用户继续输入匹配此正则时复用结果，避免重新查询
  }
}

const ext = autocompletion({
  override: [myCompletionSource], // override 会替换语言默认补全
  activateOnTyping: true,
  maxRenderedOptions: 100,
  closeOnBlur: false,
})
```

### 1.3 与语言默认补全协同

`override` 会**替换**语言提供的补全。要保留语言默认 + 添加自定义，使用 `language.data.of`：

```ts
const enhancedJs = javascript().extension
const myAddons = javascriptLanguage.data.of({ autocomplete: myCompletionSource })

const ext = [enhancedJs, myAddons, autocompletion()]
```

### 1.4 Completion 对象详解

| 字段 | 含义 |
|------|------|
| `label` | 候选项显示文本 |
| `type` | 图标类别：`variable / function / class / keyword / namespace / property / text / interface / type / constant` |
| `apply` | 字符串或函数；指定后插入此值代替 label。函数签名 `(view, completion, from, to) => void` |
| `detail` | 右侧灰色细节文本（如签名） |
| `info` | 文档说明（字符串或返回 DOM 的函数，可异步） |
| `boost` | 排序权重，正值靠前 |

### 1.5 自定义渲染

```ts
{
  label: 'foo',
  type: 'function',
  info() {
    const dom = document.createElement('div')
    dom.innerHTML = '<strong>foo()</strong><br>Returns the foo value'
    return { dom }
  },
}
```

## 2. 诊断（Lint）

### 2.1 基于 linter() 的同步/异步检查

```ts
import { linter, lintGutter, Diagnostic } from '@codemirror/lint'

const myLinter = linter(view => {
  const diagnostics: Diagnostic[] = []
  const text = view.state.doc.toString()

  if (text.includes('eval(')) {
    const idx = text.indexOf('eval(')
    diagnostics.push({
      from: idx,
      to: idx + 5,
      severity: 'warning', // 'error' | 'warning' | 'info' | 'hint'
      message: 'Avoid using eval()',
      source: 'my-linter',
      actions: [
        {
          name: 'Remove',
          apply(view, from, to) {
            view.dispatch({ changes: { from, to, insert: '' } })
          },
        },
      ],
    })
  }
  return diagnostics
}, {
  delay: 500,        // 用户停止输入 500ms 后才执行
  needsRefresh: u => u.docChanged,
})

const ext = [myLinter, lintGutter()]
```

异步诊断直接返回 Promise：

```ts
linter(async view => {
  const result = await fetch('/api/lint', {
    method: 'POST',
    body: view.state.doc.toString(),
  })
  return await result.json()
})
```

### 2.2 手动派发诊断（LSP 集成必备）

```ts
import { setDiagnostics } from '@codemirror/lint'

view.dispatch(setDiagnostics(view.state, [
  { from: 0, to: 5, severity: 'error', message: 'Type error' },
]))
```

LSP 流程典型用法：
1. WebSocket/HTTP 收到服务端 `textDocument/publishDiagnostics`
2. 转换为 CM6 `Diagnostic[]`
3. `view.dispatch(setDiagnostics(view.state, diagnostics))`

### 2.3 LSP 完整集成

直接使用 [`codemirror-languageserver`](https://github.com/FurqanSoftware/codemirror-languageserver)：

```ts
import { languageServer } from 'codemirror-languageserver'

const ls = languageServer({
  serverUri: 'ws://localhost:3000/lsp',
  rootUri: 'file:///path/to/project',
  documentUri: 'file:///path/to/project/main.ts',
  languageId: 'typescript',
})

EditorState.create({ extensions: [basicSetup, javascript(), ls] })
```

该扩展会自动处理 completion、diagnostic、hover、signature help 四类能力。

## 3. 自定义命令打开补全

```ts
import { startCompletion, completionStatus } from '@codemirror/autocomplete'

const triggerComplete = {
  key: 'Ctrl-Space',
  run: startCompletion,
}

// 检查当前是否在补全状态
if (completionStatus(view.state) === 'active') { /* ... */ }
```
