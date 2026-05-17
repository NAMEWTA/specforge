# Extensions 四大原语完整模式

> 何时阅读：实现自定义扩展、装饰、状态字段；需要完整可复制的扩展模板时。

## 1. Facet — 配置值聚合

```ts
import { Facet } from '@codemirror/state'

// 收集多个字符串输入，合并为只读数组
const myFacet = Facet.define<string, readonly string[]>({
  combine: values => values,
})

// 使用
const ext = myFacet.of('my-value')

// 读取
const values = state.facet(myFacet) // string[]
```

**适用场景**：
- 暴露给消费者的配置项
- 多扩展共同贡献的值（如多个 linter 共同贡献诊断结果）
- 需要从其他状态计算得出的静态值（用 `Facet.define({ combine, computed })`）

## 2. StateField — 与文档同步的可撤销状态

```ts
import { StateField, StateEffect } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

// 1. 定义 effect（触发状态变更的"动作"）
const setCount = StateEffect.define<number>({
  // 可选：当文档变化时映射位置
  map: (value, _changes) => value,
})

// 2. 定义字段
const counterField = StateField.define<number>({
  create() { return 0 },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setCount)) value = effect.value
    }
    return value
  },
  // 可选：通过此字段提供 facet
  provide: f => EditorView.decorations.from(f, _count => Decoration.none),
})

// 3. 分发 effect
view.dispatch({ effects: setCount.of(42) })

// 4. 读取
const count = view.state.field(counterField)
```

**适用场景**：可撤销的特性状态（折叠状态、断点、活动搜索匹配）、必须随事务流转的装饰集合。

## 3. ViewPlugin — DOM / 视图层

```ts
import { ViewPlugin, ViewUpdate, PluginValue, EditorView } from '@codemirror/view'

class MyPlugin implements PluginValue {
  private dom: HTMLElement

  constructor(view: EditorView) {
    this.dom = view.dom.appendChild(document.createElement('div'))
    this.dom.className = 'my-overlay'
    this.update({ view, docChanged: false, viewportChanged: true } as any)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.dom.textContent = `Lines: ${update.view.state.doc.lines}`
    }
  }

  destroy() {
    this.dom.remove() // 必须清理
  }
}

const myPlugin = ViewPlugin.fromClass(MyPlugin)
```

**适用场景**：依赖可视区域的 DOM 操作；不影响撤销历史的视觉特性（如 minimap、滚动条标记）。

## 4. Decoration — 装饰内容

```ts
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

// Mark 装饰：装饰一个区间
const myMark = Decoration.mark({ class: 'cm-highlight' })

// Widget 装饰：在指定位置插入 DOM 元素
class MyWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span')
    span.textContent = '★'
    return span
  }
  eq(_other: MyWidget) { return true }
}
const myWidget = Decoration.widget({ widget: new MyWidget(), side: 1 })

// Line 装饰：装饰整行
const myLineDeco = Decoration.line({ class: 'cm-active-line' })

// 从范围构建 DecorationSet（位置必须升序）
function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    // 仅遍历可视范围以提升性能
    // builder.add(pos, pos, myMark) — 必须按升序调用
  }
  return builder.finish()
}
```

**铁律**：StateField 中要先 map 再修改：

```ts
update(decos: DecorationSet, tr: Transaction) {
  decos = decos.map(tr.changes) // ← 永远先做这一步
  // 然后再添加/删除装饰
  return decos
}
```

**Line/Block 装饰特别说明**：影响块结构的行/块装饰**必须由 StateField 提供**（通过 `provide: f => EditorView.decorations.from(f)`），不要用 ViewPlugin 提供——会引发布局错误。

## 5. 完整扩展模板（可直接复制）

```ts
import {
  EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType,
} from '@codemirror/view'
import { StateField, StateEffect, Extension, RangeSetBuilder, Facet } from '@codemirror/state'

// ── 配置 ────────────────────────────────────────────────
interface MyFeatureConfig {
  color?: string
}

const myFeatureConfig = Facet.define<MyFeatureConfig, MyFeatureConfig>({
  combine: configs => configs[0] ?? {},
})

// ── Effects 与 State ────────────────────────────────────
export const toggleMyFeature = StateEffect.define<boolean>()

const myFeatureState = StateField.define<boolean>({
  create: () => false,
  update(val, tr) {
    for (const e of tr.effects) if (e.is(toggleMyFeature)) val = e.value
    return val
  },
})

// ── 装饰构建 ────────────────────────────────────────────
function buildDecos(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  // 仅在 view.visibleRanges 内构建
  return builder.finish()
}

const myPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) { this.decorations = buildDecos(view) }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecos(update.view)
      }
    }
  },
  { decorations: v => v.decorations },
)

// ── 主题（baseTheme 不会被用户主题覆盖） ────────────────
const baseTheme = EditorView.baseTheme({
  '.cm-my-mark': { backgroundColor: '#ff0', borderRadius: '2px' },
})

// ── 公共 API ────────────────────────────────────────────
export function myFeature(config: MyFeatureConfig = {}): Extension {
  return [
    myFeatureConfig.of(config),
    myFeatureState,
    myPlugin,
    baseTheme,
  ]
}
```

**导出原则**：只暴露一个工厂函数 + 必要的 `StateEffect`，把内部 Facet/Field/Plugin 私有化。
