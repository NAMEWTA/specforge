# 主题、样式与键位映射

> 何时阅读：自定义编辑器外观、配色、快捷键、命令时。

## 1. 内置主题

```ts
import { oneDark } from '@codemirror/theme-one-dark'

EditorState.create({ extensions: [basicSetup, oneDark] })
```

第三方主题集合（强烈推荐 `@uiw/codemirror-themes` 系列，35+ 主题）：

```ts
import { dracula }     from '@uiw/codemirror-theme-dracula'
import { githubLight } from '@uiw/codemirror-theme-github'
import { vscodeDark }  from '@uiw/codemirror-theme-vscode'
import { tokyoNight }  from '@uiw/codemirror-theme-tokyo-night'
```

## 2. 自定义主题（EditorView.theme）

`EditorView.theme(spec, { dark })` 返回的扩展会被注入 ShadowRoot 风格的 CSS：

```ts
import { EditorView } from '@codemirror/view'

const myTheme = EditorView.theme({
  '&': {
    color: '#c9d1d9',
    backgroundColor: '#0d1117',
    fontSize: '14px',
    fontFamily: '"JetBrains Mono", monospace',
  },
  '.cm-content': {
    caretColor: '#58a6ff',
    padding: '8px 0',
  },
  '.cm-line': {
    padding: '0 16px',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#58a6ff',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    background: '#264f78',
  },
  '.cm-gutters': {
    backgroundColor: '#0d1117',
    color: '#484f58',
    border: 'none',
  },
  '.cm-activeLineGutter, .cm-activeLine': {
    backgroundColor: '#161b22',
  },
  '.cm-tooltip': {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
  },
}, { dark: true })
```

**选择器约定**：
- `&` 表示编辑器根节点（带 `cm-editor` class）
- `&.cm-focused` 表示获得焦点时的根节点
- 直接写 `.cm-content` 等子选择器（无 `&`）会被自动加上后代选择器前缀

**baseTheme vs theme**：
- `EditorView.theme(...)` → 用户主题，优先级高
- `EditorView.baseTheme(...)` → 扩展自带的基础样式，优先级低，方便用户主题覆盖

自定义扩展应使用 `baseTheme`，避免与用户主题冲突。

## 3. 语法高亮 HighlightStyle

```ts
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

const myHighlight = HighlightStyle.define([
  { tag: t.keyword,                color: '#ff7b72' },
  { tag: t.string,                 color: '#a5d6ff' },
  { tag: t.comment,                color: '#8b949e', fontStyle: 'italic' },
  { tag: t.number,                 color: '#79c0ff' },
  { tag: t.function(t.variableName), color: '#d2a8ff' },
  { tag: t.typeName,               color: '#ffa657' },
  { tag: t.operator,               color: '#ff7b72' },
])

const ext = [myTheme, syntaxHighlighting(myHighlight)]
```

**所有可用 tag**：见 [@lezer/highlight 源码](https://github.com/lezer-parser/highlight/blob/main/src/highlight.ts) 顶部的 `tags` 对象。常用：
`keyword / controlKeyword / atom / number / string / comment / lineComment / blockComment / variableName / propertyName / function() / className / typeName / operator / punctuation / heading / link / emphasis`

## 4. Keymap 与命令

```ts
import { keymap } from '@codemirror/view'
import { defaultKeymap, historyKeymap, indentWithTab, history } from '@codemirror/commands'
import { EditorView, KeyBinding } from '@codemirror/view'

const customKeys: KeyBinding[] = [
  {
    key: 'Mod-s',          // Mod = Cmd (macOS) / Ctrl (其他)
    preventDefault: true,
    run(view) {
      console.log('保存触发')
      return true          // true = 已处理；false = 继续传递
    },
  },
  {
    key: 'Mod-Shift-f',
    run: formatDocument,
  },
  {
    key: 'Alt-ArrowUp',
    run: moveLineUp,
  },
]

const ext = [
  history(),
  keymap.of([
    ...customKeys,         // 自定义放最前，优先级高
    ...defaultKeymap,
    ...historyKeymap,
    indentWithTab,         // Tab 缩进 / Shift-Tab 反缩进
  ]),
]

function formatDocument(view: EditorView): boolean {
  const formatted = prettyPrint(view.state.doc.toString())
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: formatted },
  })
  return true
}
```

### 4.1 命令函数签名

```ts
type Command = (view: EditorView) => boolean
```

返回 `true` 表示已处理（阻止后续 keymap 执行）；返回 `false` 把按键继续往下派发。

### 4.2 按键格式

- 修饰符：`Mod` / `Ctrl` / `Cmd` / `Alt` / `Shift`
- 多个键并列：`'Cmd-k Cmd-c'`（先按 Cmd-k 再按 Cmd-c）
- 平台专属：`{ key: 'Cmd-c', mac: 'Cmd-c', win: 'Ctrl-c' }`

### 4.3 标准命令导出

`@codemirror/commands` 提供常用命令，可直接绑定：

```ts
import {
  selectAll, copyLineUp, copyLineDown, moveLineUp, moveLineDown,
  toggleComment, toggleBlockComment, toggleLineComment,
  indentMore, indentLess, indentSelection,
  cursorLineUp, cursorLineDown, cursorCharLeft, cursorCharRight,
  undo, redo, undoSelection, redoSelection,
  cursorMatchingBracket,
} from '@codemirror/commands'
```

## 5. 只读与禁用编辑

```ts
// 只读（光标可移动可选中，不能输入）
EditorState.readOnly.of(true)

// 编辑全禁用（连选中都不能）
EditorView.editable.of(false)

// 动态切换：放进 Compartment
const readOnly = new Compartment()
EditorState.create({ extensions: [readOnly.of(EditorState.readOnly.of(false))] })
view.dispatch({ effects: readOnly.reconfigure(EditorState.readOnly.of(true)) })
```

## 6. 字体与行高常见配置

```ts
EditorView.theme({
  '&': { height: '100%' },              // 让编辑器填满父容器
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: '"JetBrains Mono", monospace',
    lineHeight: '1.6',
  },
  '.cm-gutters': { userSelect: 'none' },
})
```

**重要**：CM6 默认不限制高度，必须给 `&` 或外层容器明确高度，否则编辑器会无限扩展。
