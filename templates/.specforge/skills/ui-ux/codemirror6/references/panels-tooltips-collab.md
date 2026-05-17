# 面板、悬浮提示与协同编辑

> 何时阅读：需要在编辑器内/上方挂面板、显示悬浮提示、或实现多人协同时。

## 1. Panel — 编辑器顶部/底部面板

```ts
import { showPanel, Panel, EditorView } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'

export const togglePanel = StateEffect.define<boolean>()

const panelState = StateField.define<boolean>({
  create: () => false,
  update(val, tr) {
    for (const e of tr.effects) if (e.is(togglePanel)) val = e.value
    return val
  },
  provide: f => showPanel.from(f, show => show ? createPanel : null),
})

function createPanel(view: EditorView): Panel {
  const dom = document.createElement('div')
  dom.className = 'cm-my-panel'

  const input = document.createElement('input')
  input.placeholder = '搜索...'
  dom.appendChild(input)

  const close = document.createElement('button')
  close.textContent = '×'
  close.onclick = () => view.dispatch({ effects: togglePanel.of(false) })
  dom.appendChild(close)

  return {
    dom,
    top: false,           // top: true = 显示在编辑器上方；false = 下方
    mount() { input.focus() }, // 可选生命周期
    update(update) {       // 每次视图更新时调用
      // 同步面板内容
    },
    destroy() {            // 面板移除时调用
      // 清理资源
    },
  }
}

export const myPanel = panelState
```

## 2. Tooltip — 悬浮提示

### 2.1 hoverTooltip（光标悬停触发）

```ts
import { hoverTooltip, Tooltip } from '@codemirror/view'

const wordHover = hoverTooltip(async (view, pos): Promise<Tooltip | null> => {
  const word = view.state.wordAt(pos)
  if (!word) return null

  // 异步加载文档（如调用 LSP hover 接口）
  const docs = await fetchDocsFor(view.state.sliceDoc(word.from, word.to))

  return {
    pos: word.from,
    end: word.to,
    above: true,
    create() {
      const dom = document.createElement('div')
      dom.className = 'cm-hover-tooltip'
      dom.textContent = docs
      return { dom }
    },
  }
})
```

### 2.2 静态 Tooltip（StateField 控制位置）

```ts
import { showTooltip, Tooltip } from '@codemirror/view'
import { StateField } from '@codemirror/state'

const cursorTooltip = StateField.define<readonly Tooltip[]>({
  create: () => [],
  update(tooltips, tr) {
    if (!tr.docChanged && !tr.selection) return tooltips
    return tr.state.selection.ranges
      .filter(r => r.empty)
      .map(r => ({
        pos: r.head,
        above: true,
        create: () => {
          const dom = document.createElement('div')
          dom.textContent = `Line ${tr.state.doc.lineAt(r.head).number}`
          return { dom }
        },
      }))
  },
  provide: f => showTooltip.computeN([f], state => state.field(f)),
})
```

## 3. 协同编辑（@codemirror/collab）

### 3.1 客户端

```ts
import {
  collab, getSyncedVersion, receiveUpdates, sendableUpdates, Update,
} from '@codemirror/collab'
import { ChangeSet } from '@codemirror/state'

// 初始化（startVersion 来自服务端）
const startState = EditorState.create({
  doc: serverDoc,
  extensions: [collab({ startVersion: serverVersion })],
})

// 接收服务端 updates
function applyServerUpdates(view: EditorView, updates: Update[]) {
  view.dispatch(receiveUpdates(view.state, updates))
}

// 推送本地变更到服务端
async function push(view: EditorView) {
  const updates = sendableUpdates(view.state)
  if (!updates.length) return
  const version = getSyncedVersion(view.state)
  await fetch('/api/push', {
    method: 'POST',
    body: JSON.stringify({
      version,
      updates: updates.map(u => ({
        clientID: u.clientID,
        changes: u.changes.toJSON(),
      })),
    }),
  })
}
```

### 3.2 服务端核心逻辑

```ts
// 伪代码：服务端维护单一权威 doc 与 update 序列
let doc = ''
const updates: Update[] = []

function handlePush(version: number, clientUpdates: Update[]) {
  if (version !== updates.length) {
    return { type: 'rebase' } // 客户端版本落后，让其重新拉取
  }
  for (const u of clientUpdates) {
    doc = ChangeSet.fromJSON(u.changes).apply(doc).toString()
    updates.push(u)
  }
  // 广播给其他客户端
  broadcast(updates.slice(version))
}
```

### 3.3 实战要点

- **clientID 冲突解决**：CM6 内部通过 clientID + version 排序合并并发更新
- **网络断线重连**：拉取 `updates.length - localVersion` 之后的更新即可恢复
- **持久化**：服务端定期把 `updates[]` flush 到数据库，并存最终 `doc` 快照，避免 update 数组无限增长
- **光标同步**：collab 包不提供光标共享，需自己用 awareness 协议（参考 [yjs](https://github.com/yjs/y-codemirror.next) 集成方案）

## 4. 替代方案：Yjs 集成

更复杂的协同需求（光标 awareness、富文本、离线同步）建议直接用 Yjs：

```ts
import * as Y from 'yjs'
import { yCollab } from 'y-codemirror.next'
import { WebsocketProvider } from 'y-websocket'

const ydoc = new Y.Doc()
const provider = new WebsocketProvider('wss://demos.yjs.dev', 'my-room', ydoc)
const ytext = ydoc.getText('codemirror')

EditorState.create({
  doc: ytext.toString(),
  extensions: [
    basicSetup,
    javascript(),
    yCollab(ytext, provider.awareness), // 含光标 awareness
  ],
})
```
