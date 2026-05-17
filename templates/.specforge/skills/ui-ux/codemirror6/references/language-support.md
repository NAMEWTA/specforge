# 语言支持

> 何时阅读：需要为编辑器添加语法高亮、缩进、折叠、自定义 DSL 时。

## 1. 内置语言包

```ts
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { sql, PostgreSQL } from '@codemirror/lang-sql'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data' // 懒加载所有语言

// 配置选项
javascript({ typescript: true, jsx: true })
sql({ dialect: PostgreSQL, schema: { my_table: ['col1', 'col2'] } })
markdown({ base: markdownLanguage, codeLanguages: languages })
```

**`@codemirror/language-data`** 提供 130+ 语言的懒加载入口，适合"用户在编辑器里切语言"的场景：

```ts
import { LanguageDescription } from '@codemirror/language'
import { languages } from '@codemirror/language-data'

const desc = LanguageDescription.matchFilename(languages, 'main.go')
const support = await desc?.load() // 按需加载
```

## 2. Legacy Modes（100+ 旧语言）

CM5 时代的 `.mode.js` 通过 `StreamLanguage` 适配：

```ts
import { StreamLanguage } from '@codemirror/language'
import { go } from '@codemirror/legacy-modes/mode/go'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { lua } from '@codemirror/legacy-modes/mode/lua'

const goLang = StreamLanguage.define(go)
const rubyLang = StreamLanguage.define(ruby)
```

**特性差异**：StreamLanguage 没有完整语法树，因此 `syntaxTree()` 返回的节点信息有限，自动补全/重构等高级特性受限。需要语法树时优先选 LR 包（如 `@codemirror/lang-*`）。

## 3. 自定义语言包（基于 Lezer）

```ts
import {
  LRLanguage, LanguageSupport,
  indentNodeProp, foldNodeProp, foldInside,
} from '@codemirror/language'
import { completeFromList } from '@codemirror/autocomplete'
import { parser } from './my-language.grammar' // Lezer 编译产物

// 1. 定义语言
export const myLanguage = LRLanguage.define({
  name: 'my-lang',
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Block: cx => cx.lineIndent(cx.state.doc.lineAt(cx.from)) + cx.unit,
      }),
      foldNodeProp.add({ Block: foldInside }),
    ],
  }),
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: ['(', '[', '{', '"', "'"] },
    indentOnInput: /^\s*[}\]]$/,
  },
})

// 2. 通过 languageData facet 添加补全
const myCompletion = myLanguage.data.of({
  autocomplete: completeFromList([
    { label: 'fn',  type: 'keyword' },
    { label: 'let', type: 'keyword' },
  ]),
})

// 3. 导出 LanguageSupport（推荐：消费方一行接入）
export function myLang(): LanguageSupport {
  return new LanguageSupport(myLanguage, [myCompletion])
}
```

**Lezer 语法编写流程**：
1. 写 `.grammar` 文件（参考 [Lezer 系统指南](https://lezer.codemirror.net/docs/guide/)）
2. 用 `@lezer/generator` CLI 编译为 `.ts`：`lezer-generator my-language.grammar -o my-language.grammar.ts`
3. 在编译产物上配置 `props`（缩进、折叠、高亮 tag 映射）

**高亮 tag 绑定**（让自定义语言识别 `HighlightStyle`）：

```ts
import { styleTags, tags as t } from '@lezer/highlight'

parser.configure({
  props: [
    styleTags({
      'if while for return': t.controlKeyword,
      Identifier: t.variableName,
      String: t.string,
      Number: t.number,
      LineComment: t.lineComment,
    }),
  ],
})
```

## 4. 读取语法树

```ts
import { syntaxTree } from '@codemirror/language'
import { SyntaxNode } from '@lezer/common'

// 获取当前状态的解析树
const tree = syntaxTree(view.state)

// 遍历子树
tree.cursor().iterate(
  (node: SyntaxNode) => {
    console.log(node.name, node.from, node.to)
    return true // 返回 true 进入子节点；返回 false 跳过
  },
  (node: SyntaxNode) => {
    // 离开节点时回调
  },
)

// 在指定位置查找节点
const node = tree.resolveInner(view.state.selection.main.head, -1)
console.log(node.name) // 例如 'Identifier' / 'String' / 'Comment'

// 沿父链向上查找特定类型
let parent: SyntaxNode | null = node
while (parent && parent.name !== 'FunctionDeclaration') parent = parent.parent
```

**性能要点**：`syntaxTree()` 是**增量解析**——CM6 在后台分块解析大文档，第一次调用时可能只能拿到部分树。需要等待完整树时使用 `ensureSyntaxTree(state, upto, timeout)` 或在异步任务里轮询。

## 5. 缩进与折叠服务

不写完整语言包但需要自定义缩进/折叠时：

```ts
import { indentService, foldService } from '@codemirror/language'

const customIndent = indentService.of((cx, pos) => {
  const line = cx.state.doc.lineAt(pos)
  // 返回缩进列数；返回 null 表示不处理，交给下一个 service
  return /^\s*[}\]]/.test(line.text) ? cx.lineIndent(line.from) - cx.unit : null
})

const customFold = foldService.of((state, lineStart, lineEnd) => {
  // 返回折叠区间或 null
  return null
})
```
