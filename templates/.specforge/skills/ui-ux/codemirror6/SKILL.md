---
name: codemirror6
type: ui-ux-rule
description: >-
  构建、扩展或调试 CodeMirror 6 浏览器代码编辑器，覆盖状态事务、扩展原语、
  装饰、Compartment、语言包、补全诊断、主题、React 集成与 CM5→CM6 迁移。
  触发词：CodeMirror 6、CM6、@codemirror/、EditorView、StateField、
  Lezer、@uiw/react-codemirror。
version: "1.0.0"
author: "wta"
---

# CodeMirror 6 编辑器开发规范

为 AI 代理提供使用 CodeMirror 6 (CM6) 构建浏览器内代码编辑器的程序性知识。**禁用范围**：Monaco Editor、CodeMirror 5（旧版本）、服务端文本处理。

## 1. 心智模型（务必先读）

CM6 与 CM5 及大多数 JS 库**根本性不同**，违反这些规则的代码几乎一定出错：

| 概念 | CM6 规则 |
|------|---------|
| **状态（State）** | 完全不可变与函数式——**永不直接 mutate** |
| **更新（Updates）** | 所有变更必须经 `view.dispatch(transaction)` |
| **扩展（Extensions）** | 可组合；扩展可以包含其他扩展 |
| **DOM** | 由库托管——**永不直接操作 `.cm-content`** |
| **位置（Positions）** | 始终引用**事务开始时**的文档位置 |

**强制要求**：写第一行 CM6 代码前先读 [系统指南](https://codemirror.net/docs/guide/)。

## 2. 包地图（按需安装）

所有核心包前缀均为 `@codemirror/`：

| 包 | 主要用途 |
|----|---------|
| `@codemirror/state` | EditorState、Transaction、StateField、Facet、StateEffect、Compartment |
| `@codemirror/view` | EditorView、ViewPlugin、Decoration、keymap、panel、tooltip |
| `@codemirror/language` | LRLanguage、LanguageSupport、syntaxTree、indent/fold service |
| `@codemirror/commands` | 标准命令（undo/redo/selectAll/indent…） |
| `@codemirror/autocomplete` | autocompletion()、CompletionContext、CompletionResult |
| `@codemirror/lint` | linter()、setDiagnostics()、Diagnostic |
| `@codemirror/search` | search()、SearchCursor |
| `@codemirror/collab` | 协同编辑原语 |
| `codemirror` | 元包：再导出 `basicSetup` + 全部核心包 |

**语言包**（独立安装）：`@codemirror/lang-{javascript,python,css,html,json,markdown,sql,java,cpp,rust,xml,vue}` 等；100+ 旧模式通过 `@codemirror/legacy-modes` 提供 `StreamLanguage` 适配。

**React 封装**（事实标准）：[`@uiw/react-codemirror`](https://github.com/uiwjs/react-codemirror) v4+ = CM6。

**版本一致性**：所有 `@codemirror/*` 包必须**锁定到同一 minor 版本**，否则会因重复加载导致诡异错误。

## 3. 最小启动模板

### 3.1 Vanilla JS

```ts
import { EditorState } from '@codemirror/state'
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'

const view = new EditorView({
  state: EditorState.create({
    doc: 'console.log("hello")',
    extensions: [basicSetup, javascript()],
  }),
  parent: document.getElementById('editor')!,
})
```

### 3.2 React（推荐使用 `@uiw/react-codemirror`）

```tsx
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

export function Editor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <CodeMirror
      value={value}
      height="400px"
      extensions={[javascript({ jsx: true, typescript: true })]}
      theme={oneDark}
      onChange={onChange}
    />
  )
}
```

**铁律**：永远不要在 React render 函数体里 `new EditorView()`。要么用 `@uiw/react-codemirror`，要么放到 `useEffect` 并在卸载时 `view.destroy()`。

## 4. State 与事务（必掌握）

### 4.1 读取状态

```ts
const text = view.state.doc.toString()                       // 全文
const line = view.state.doc.line(3)                          // 第 3 行（1-indexed）
const { head, anchor } = view.state.selection.main           // 主选区
const sel  = view.state.sliceDoc(                            // 选中文本
  view.state.selection.main.from,
  view.state.selection.main.to,
)
const lineInfo = view.state.doc.lineAt(42)                   // 位置 → 行
```

### 4.2 分发变更

```ts
// 在光标处插入
view.dispatch(view.state.replaceSelection('new text'))

// 替换区间（位置是文档位置，不是 line/column）
view.dispatch({ changes: { from: 0, to: 5, insert: 'hello' } })

// 一个事务里组合：变更 + 选区 + 滚动 + 用户事件标注
view.dispatch({
  changes: { from: 0, insert: '// comment\n' },
  selection: { anchor: 11 },
  scrollIntoView: true,
  annotations: Transaction.userEvent.of('input'),
})
```

**⚠️ 关键**：单个事务里多条变更的 `from/to` **全部都引用变更前的原始文档**——它们在概念上同时发生。

## 5. 扩展四大原语（速览 + 选型）

下表是选型决策依据；**完整代码模式见 [references/extensions-primitives.md](references/extensions-primitives.md)**。

| 原语 | 何时使用 | 心智 |
|------|---------|------|
| **Facet** | 暴露配置项 / 多扩展共同贡献的值 / 静态计算值 | 输入聚合 |
| **StateField** | 与文档同步演化的可撤销状态、装饰集合、面板开关 | 不可变值，随事务流转 |
| **ViewPlugin** | DOM 操作、依赖可视范围、不影响撤销历史 | 视图层副作用容器 |
| **Decoration** | 范围样式（mark）、行样式（line）、行内/块部件（widget） | 装饰是 RangeSet |

**最常见误解**：装饰要不要进 ViewPlugin 还是 StateField？

- 若装饰**只取决于可视区域、与撤销历史无关** → ViewPlugin（如语法高亮）
- 若装饰**需要被事务驱动、可撤销、跨视图共享** → StateField（如已选中的搜索匹配、活动断点）

## 6. Compartment（动态重配）

`Compartment` 是运行时切换扩展的唯一正确方式（语言、主题、只读、特性开关）：

```ts
import { Compartment } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'

const language = new Compartment()

EditorState.create({
  extensions: [language.of(javascript())],
})

// 运行时切换
view.dispatch({ effects: language.reconfigure(python()) })

// 读取当前
language.get(view.state)
```

**React 中**：Compartment 必须**在组件外**创建（保持稳定引用），通过 `useMemo` 把 `compartment.of(...)` 喂给 `extensions` prop。详见 [references/react-integration.md](references/react-integration.md)。

## 7. 选型决策导航

按需查阅对应 reference 文档（**仅在需要时加载**）：

| 任务 | 参考文档 |
|------|---------|
| 自定义扩展、装饰、状态字段、完整模板 | [references/extensions-primitives.md](references/extensions-primitives.md) |
| 内置语言 / legacy-modes / 自定义 Lezer 语言包 / 语法树遍历 | [references/language-support.md](references/language-support.md) |
| 静态/异步补全、与语言默认补全协作、诊断（lint）与 LSP | [references/autocomplete-and-lint.md](references/autocomplete-and-lint.md) |
| 内置主题、自定义主题、HighlightStyle、keymap、命令 | [references/themes-and-keymaps.md](references/themes-and-keymaps.md) |
| React 受控模式、ref 命令式访问、动态扩展、自定义 hook | [references/react-integration.md](references/react-integration.md) |
| Panel、tooltip、协同编辑（@codemirror/collab） | [references/panels-tooltips-collab.md](references/panels-tooltips-collab.md) |
| CM5 → CM6 迁移对照、反模式清单 | [references/migration-cm5-to-cm6.md](references/migration-cm5-to-cm6.md) |

## 8. 性能规则（写代码前默念）

| 场景 | 规则 |
|------|------|
| 大文档 | 在 ViewPlugin 中使用 `view.visibleRanges`，**禁用** `doc.toString()` 全量读 |
| 装饰 | StateField 中先 `decos = decos.map(tr.changes)` 再修改，**否则位置错乱** |
| 补全 | 返回 `validFor` 正则，避免每次按键都重新查询 |
| 多扩展 | 把相关扩展打包成单个数组导出，外部 import 一次到位 |
| React 重渲染 | 用 `useMemo` 包裹 `extensions` 数组；动态切换走 Compartment 而非依赖数组 |
| 语法树 | `syntaxTree(state)` 是增量解析的——**不要**自己整文档重新解析 |

## 9. React 集成基本规则

```tsx
// ✅ 受控值 + onChange
<CodeMirror value={value} onChange={onChange} extensions={[javascript()]} />

// ✅ 命令式访问（插入/格式化/聚焦）
const ref = useRef<ReactCodeMirrorRef>(null)
ref.current?.view?.dispatch(ref.current.view.state.replaceSelection('text'))

// ❌ 在 render 里 new EditorView()
// ❌ 直接 setState 同时也直接修改 view.state
// ❌ 把动态 extensions 数组放进依赖项导致频繁销毁重建 → 改用 Compartment
```

更多模式（自定义 hook、SSR 注意点、Compartment 配 useMemo）见 [references/react-integration.md](references/react-integration.md)。

## 10. 反模式速查（**永远不要**）

```ts
// ❌ 直接 mutate state
view.state.doc = Text.of(['hello'])

// ❌ 直接操作 DOM
document.querySelector('.cm-content')!.textContent = 'bad'

// ❌ 在 React render 里 new EditorView
// ✅ 用 @uiw/react-codemirror 或 useEffect

// ❌ 大文档热路径里 doc.toString()
// ✅ view.visibleRanges + 局部 sliceDoc

// ❌ StateField.update() 里忘记 decos.map(tr.changes)
// ✅ 永远先 map 再修改

// ❌ 通过 ViewPlugin 提供影响块结构的行装饰
// ✅ 行装饰 / 块装饰必须由 StateField 提供

// ❌ 在 ViewPlugin 中忘记 destroy() 清理
// ✅ 在 destroy() 里移除事件监听 / DOM 节点

// ❌ 同时 import 不同版本的 @codemirror/state
// ✅ 锁定所有 @codemirror/* 到同一版本
```

## 11. 调试与诊断

- **状态查看**：`view.state.toJSON({ history: historyField })` 序列化当前状态
- **事务监听**：`EditorView.updateListener.of(update => console.log(update))`
- **位置可视化**：装饰渲染异常时优先打印 `view.visibleRanges` 与生成的 `RangeSet` 列表
- **遇到难题**：[CodeMirror 官方论坛](https://discuss.codemirror.net) 通常 24 小时内有维护者回复

## 12. 关键参考链接

- [系统指南（必读）](https://codemirror.net/docs/guide/)
- [API 参考手册](https://codemirror.net/docs/ref/)
- [官方示例集](https://codemirror.net/examples/)
- [扩展生态](https://codemirror.net/docs/extensions/)
- [社区论坛](https://discuss.codemirror.net)
- [@uiw/react-codemirror 文档](https://uiwjs.github.io/react-codemirror/)
- [CM6 学习博客（推荐）](https://thetrevorharmon.com/blog/learning-codemirror/)
- [LSP 集成参考实现](https://github.com/FurqanSoftware/codemirror-languageserver)
