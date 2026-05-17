# CM5 → CM6 迁移对照表

> 何时阅读：维护遗留 CM5 项目并升级到 CM6 时；理解为什么常见 CM5 写法在 CM6 中行不通。

## 1. API 对照表

| CM5 用法 | CM6 等价写法 |
|----------|-------------|
| `CodeMirror.fromTextArea(ta)` | `new EditorView({ parent })`（手动隐藏 textarea） |
| `editor.getValue()` | `view.state.doc.toString()` |
| `editor.setValue(str)` | `view.dispatch({ changes: { from: 0, to: doc.length, insert: str } })` |
| `editor.getDoc().getCursor()` | `view.state.selection.main.head` |
| `editor.getDoc().getSelection()` | `view.state.sliceDoc(sel.from, sel.to)` |
| `editor.replaceSelection(s)` | `view.dispatch(view.state.replaceSelection(s))` |
| `editor.setOption('mode', m)` | `langCompartment.reconfigure(m)`（用 Compartment） |
| `editor.setOption('readOnly', true)` | `EditorState.readOnly.of(true)` |
| `editor.on('change', cb)` | `EditorView.updateListener.of(u => { if (u.docChanged) cb() })` |
| `editor.on('cursorActivity', cb)` | `EditorView.updateListener.of(u => { if (u.selectionSet) cb() })` |
| `editor.markText(from, to, opts)` | `Decoration.mark({...})` + StateField 提供 |
| `editor.addLineClass(line, where, cls)` | `Decoration.line({ class })` + StateField |
| `editor.addWidget(pos, dom)` | `Decoration.widget({ widget: new MyWidget() })` |
| `editor.refresh()` | 不需要——CM6 自动管理布局 |
| `editor.focus()` | `view.focus()` |
| `editor.scrollIntoView(pos)` | `view.dispatch({ effects: EditorView.scrollIntoView(pos) })` |
| `editor.getOption('lineNumbers')` | 检查 `state.facet(...)` 或扩展配置 |

## 2. CSS 类名对照

| CM5 | CM6 |
|-----|-----|
| `.CodeMirror` | `.cm-editor` |
| `.CodeMirror-line` | `.cm-line` |
| `.CodeMirror-focused` | `.cm-focused` |
| `.CodeMirror-gutters` | `.cm-gutters` |
| `.CodeMirror-cursor` | `.cm-cursor` |
| `.CodeMirror-selected` | `.cm-selectionBackground` |
| `.CodeMirror-activeline` | `.cm-activeLine` |
| `.CodeMirror-matchingbracket` | `.cm-matchingBracket` |
| `.CodeMirror-scroll` | `.cm-scroller` |

## 3. 模式系统

CM5 的 `.mode.js` 文件 → CM6 的两条路径：

1. **官方语言包**（推荐）：`@codemirror/lang-javascript` 等，提供完整 Lezer 语法树
2. **legacy-modes 适配**：旧 mode 文件没人移植时用 `StreamLanguage.define(legacyMode)` 包装

```ts
// CM5
CodeMirror.defineMode('mylang', () => ({ token(stream) { ... } }))

// CM6 适配
import { StreamLanguage } from '@codemirror/language'
const legacyMode = { token(stream) { /* ... */ } } // 同样的 token 函数
const myLang = StreamLanguage.define(legacyMode)
```

## 4. 常见迁移陷阱

### 4.1 同步 vs 事务

CM5 是命令式：`editor.setValue('x'); editor.getValue()` 立即得到 `'x'`。

CM6 也立即生效——但**所有变更必须经事务**，且事务内多条变更的 `from/to` 都引用变更前文档：

```ts
// ❌ 错误：第二条 from 期望接在第一条插入之后
view.dispatch({
  changes: [
    { from: 0,  insert: 'hello' },
    { from: 5,  insert: ' world' }, // 此时 5 还指向原始文档第 5 位
  ],
})
```

### 4.2 onChange 节流

CM5 的 `change` 事件每条变更触发一次。CM6 一个事务内多条变更只触发一次 `updateListener`。

```ts
EditorView.updateListener.of(update => {
  if (!update.docChanged) return
  // update.changes 包含一个事务内所有 ChangeSet
  update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    console.log('change:', fromA, toA, '->', inserted.toString())
  })
})
```

### 4.3 事件不在 view 上

CM5 用 `editor.on('xxx', cb)`。CM6 把所有"事件"统一为：

- 文档/选区/视口变化 → `EditorView.updateListener`
- DOM 事件（鼠标/键盘） → `EditorView.domEventHandlers({ keydown(ev, view) { ... } })`
- 焦点 → `EditorView.focusChangeEffect.of(...)` 或监听 `update.focusChanged`

### 4.4 主题不再是 .CodeMirror.cm-s-xxx

CM5 通过 className 切主题。CM6 用 `EditorView.theme(...)` 返回扩展，配合 `Compartment.reconfigure` 切换。

## 5. 渐进迁移策略

大型项目无法一次切换时，建议：

1. **新模块用 CM6**：保留旧 CM5 编辑器实例不动
2. **共享数据层抽象**：在你的应用层定义 `Editor` 接口（`getValue / setValue / focus / on('change')`），分别用 CM5 / CM6 实现
3. **逐个文件替换**：每次迁移一个使用点，验证后再下一个
4. **统一退出**：所有 CM5 用法切完后再删除 `codemirror@5` 依赖

**不要混用风险**：CM5 和 CM6 的 CSS 类名前缀不同（`.CodeMirror-*` vs `.cm-*`），可以共存于同页面，但务必避免共用同一 DOM 容器。

## 6. 弃用功能与替代

| CM5 特性 | CM6 替代 |
|---------|---------|
| `vim` / `emacs` keymap 内置 | `@replit/codemirror-vim` / `@replit/codemirror-emacs` |
| `simplescrollbars` | CM6 默认现代滚动条；自定义 `EditorView.theme` 调整 |
| `searchcursor` 插件 | `@codemirror/search` 包 |
| `placeholder` addon | `placeholder` 内置于 `@codemirror/view` |
| `runmode` | `@codemirror/language` 提供 `highlightTree` |
| `merge` addon | 第三方 `@codemirror/merge` 包 |
