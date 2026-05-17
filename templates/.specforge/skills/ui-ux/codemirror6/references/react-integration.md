# React 集成模式

> 何时阅读：在 React 应用里嵌入 CM6 编辑器；处理受控值、动态扩展、命令式访问。

## 1. 受控值（推荐做法）

`@uiw/react-codemirror` 的 `value` + `onChange` 组合等价于受控 input：

```tsx
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'

function ControlledEditor({ value, onChange }: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={[javascript()]}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        autocompletion: true,
      }}
    />
  )
}
```

**性能要点**：每次外部 `value` 变化都会触发 diff 应用。**不要**在每次 onChange 后立即把同一字符串再传回 `value`——会形成无效 round-trip。建议：

- 把 `value` 当作"初始值/外部强制重置点"
- 用户输入期间通过 `onChange` 收集变更
- 仅在**外部数据源真的变化时**（如加载文件）才更新 `value`

## 2. 命令式访问（useRef）

```tsx
import { useRef, useCallback } from 'react'
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror'

function Editor() {
  const editorRef = useRef<ReactCodeMirrorRef>(null)

  const insertText = useCallback((text: string) => {
    const view = editorRef.current?.view
    if (!view) return
    view.dispatch(view.state.replaceSelection(text))
    view.focus()
  }, [])

  const formatAll = useCallback(() => {
    const view = editorRef.current?.view
    if (!view) return
    const formatted = prettyPrint(view.state.doc.toString())
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: formatted },
    })
  }, [])

  return (
    <>
      <button onClick={() => insertText('// TODO\n')}>插入 TODO</button>
      <button onClick={formatAll}>格式化</button>
      <CodeMirror ref={editorRef} value="" />
    </>
  )
}
```

`ReactCodeMirrorRef` 暴露的字段：`view`（EditorView）、`state`（EditorState）、`editor`（容器 DOM）。

## 3. 动态扩展（用 Compartment，不用依赖数组）

**反模式**：把动态值写进 `extensions` 数组导致编辑器整个销毁重建：

```tsx
// ❌ 切换 language 会销毁编辑器，丢失光标/历史
function BadEditor({ language }: { language: 'js' | 'py' }) {
  const ext = language === 'js' ? javascript() : python()
  return <CodeMirror extensions={[ext]} />
}
```

**正确做法**：在组件外创建 Compartment，运行时 `reconfigure`：

```tsx
import { useEffect, useRef, useMemo } from 'react'
import { Compartment } from '@codemirror/state'
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'

// 组件外创建（保持稳定引用）
const langCompartment = new Compartment()

function Editor({ language }: { language: 'js' | 'py' }) {
  const ref = useRef<ReactCodeMirrorRef>(null)

  // 初始扩展只设一次
  const extensions = useMemo(
    () => [langCompartment.of(language === 'js' ? javascript() : python())],
    [], // ← 故意空依赖
  )

  // 通过 reconfigure 切换，不销毁编辑器
  useEffect(() => {
    const view = ref.current?.view
    if (!view) return
    view.dispatch({
      effects: langCompartment.reconfigure(
        language === 'js' ? javascript() : python(),
      ),
    })
  }, [language])

  return <CodeMirror ref={ref} value="" extensions={extensions} />
}
```

**典型 Compartment 用例**：语言切换、主题切换、只读切换、特性开关、字体大小调整。

## 4. 自定义 Hook（不依赖 @uiw 封装）

需要在 React 中直接驾驭 vanilla CM6（高度定制场景）：

```tsx
import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Extension } from '@codemirror/state'

interface UseCodeMirrorOptions {
  initialDoc?: string
  extensions: Extension[]
}

export function useCodeMirror({ initialDoc = '', extensions }: UseCodeMirrorOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: initialDoc,
        extensions: [basicSetup, ...extensions],
      }),
      parent: containerRef.current,
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, []) // ← 故意空依赖，避免每次 extensions 变化都重建

  return { containerRef, viewRef }
}

// 使用
function Editor() {
  const { containerRef } = useCodeMirror({
    initialDoc: 'hello',
    extensions: [javascript()],
  })
  return <div ref={containerRef} style={{ height: 400 }} />
}
```

**关键**：`useEffect` 依赖必须为空——动态扩展通过 Compartment 在外部 `dispatch reconfigure`，不要依赖 React 重新跑 effect。

## 5. SSR 注意事项

CM6 依赖 `window` / `document`，**不能在 SSR 时挂载**：

- **Next.js (App Router)**：把编辑器组件标记为 client component，并用动态导入禁用 SSR：
  ```tsx
  'use client'
  // 或在父级使用：
  import dynamic from 'next/dynamic'
  const Editor = dynamic(() => import('./Editor'), { ssr: false })
  ```
- **Remix / Astro**：`<ClientOnly>` 包裹，或确认运行在 client island 中

## 6. StrictMode 兼容

React 18 StrictMode 在 dev 下会双调用 effect。`@uiw/react-codemirror` 已内部处理；自定义 hook 必须确保 `useEffect` 的清理函数能完整 `view.destroy()`，否则会出现"两份 EditorView"的诡异状况。

## 7. 与表单库集成（react-hook-form 示例）

```tsx
import { Controller, useForm } from 'react-hook-form'
import CodeMirror from '@uiw/react-codemirror'

function CodeForm() {
  const { control, handleSubmit } = useForm<{ code: string }>()
  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      <Controller
        control={control}
        name="code"
        defaultValue=""
        render={({ field: { value, onChange } }) => (
          <CodeMirror value={value} onChange={onChange} extensions={[javascript()]} />
        )}
      />
      <button type="submit">提交</button>
    </form>
  )
}
```

## 8. 性能调优清单

| 症状 | 原因 | 解决方案 |
|------|------|---------|
| 切换语言/主题闪烁 | 用依赖数组重建编辑器 | 改用 Compartment + `reconfigure` |
| 大文档输入卡顿 | ViewPlugin 在每次 update 全量遍历文档 | 只在 `view.visibleRanges` 内构建装饰 |
| 受控值 round-trip 卡顿 | onChange → setState → 重新传 value 形成循环 | 把 value 当初始值；状态用 ref 持有 |
| 频繁重新挂载 | `extensions` 数组在 render 中新建引用 | `useMemo` 包裹；动态部分走 Compartment |
| StrictMode 下编辑器闪两次 | 自定义 hook 没正确 destroy | useEffect 清理函数确保调用 `view.destroy()` |
