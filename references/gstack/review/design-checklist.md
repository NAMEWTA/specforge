# 设计审查清单（精简版）

> **DESIGN_METHODOLOGY 的子集**——如果这里新增条目，也要同步更新 `scripts/gen-skill-docs.ts` 中的 `generateDesignMethodology()`，反之亦然。

## 说明

这份清单适用于 **diff 中的源代码**，不适用于渲染后的结果。请阅读每个变更过的前端文件（完整文件，不只是 diff 片段），并标记反模式。

**触发条件：** 只有当 diff 触及前端文件时才运行这份清单。使用 `gstack-diff-scope` 检测：

```bash
source <(~/.claude/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)
```

如果 `SCOPE_FRONTEND=false`，就静默跳过整个设计审查。

**DESIGN.md 校准：** 如果仓库根目录存在 `DESIGN.md` 或 `design-system.md`，先读取它。所有发现都要按项目声明的设计系统来校准。`DESIGN.md` 里明确认可的模式不要标记。如果没有 `DESIGN.md`，就按通用设计原则判断。

---

## 置信度等级

每一项都会标注检测置信度：

- **[HIGH]** —— 可通过 grep / 模式匹配可靠检测，属于明确发现。
- **[MEDIUM]** —— 可通过模式聚合或启发式检测。可以作为发现提出，但可能有噪音。
- **[LOW]** —— 需要理解视觉意图。展示为：“Possible issue — verify visually or run /design-review.”

---

## 分类

**AUTO-FIX**（仅机械性的 CSS 修复 —— HIGH 置信度，不需要设计判断）：
- `outline: none` 没有替代方案 → 加上 `outline: revert` 或 `&:focus-visible { outline: 2px solid currentColor; }`
- 新 CSS 中出现 `!important` → 删除并修正选择器优先级
- 正文文本 `font-size` 小于 16px → 提升到 16px

**ASK**（其余全部 —— 需要设计判断）：
- 所有 AI slop 发现、排版结构、间距选择、交互状态缺失、`DESIGN.md` 违例

**LOW 置信度项** → 以“Possible: [description]. Verify visually or run /design-review.” 的形式呈现。绝不 AUTO-FIX。

---

## 输出格式

```
Design Review: N issues (X auto-fixable, Y need input, Z possible)

**AUTO-FIXED:**
- [file:line] Problem → fix applied

**NEEDS INPUT:**
- [file:line] Problem description
  Recommended fix: suggested fix

**POSSIBLE (verify visually):**
- [file:line] Possible issue — verify with /design-review
```

可选：`test_stub` —— 使用项目测试框架为该发现生成的测试骨架代码。

如果没有发现问题：`Design Review: No issues found.`

如果没有前端文件变更：静默跳过，不输出任何内容。

---

## 分类项

### 1. AI Slop 检测（6 项）——最高优先级

这些是 AI 生成 UI 的典型特征，真正受尊重的设计工作室不会交付这种东西。

- **[MEDIUM]** 紫 / 紫罗兰 / 靛蓝渐变背景，或蓝到紫的配色方案。查找 `linear-gradient`，尤其是 `#6366f1` 到 `#8b5cf6` 这一段，或解析到紫 / 紫罗兰的 CSS 自定义属性。

- **[LOW]** 三列特性网格：彩色圆圈里的图标 + 粗体标题 + 两行描述，且对称重复 3 次。查找恰好有 3 个子元素的 grid / flex 容器，每个子元素都包含圆形元素 + 标题 + 段落。

- **[LOW]** 用彩色圆圈包裹图标作为区块装饰。查找带 `border-radius: 50%` 且带背景色、仅用于装饰图标的元素。

- **[HIGH]** 全部居中：所有标题、描述和卡片都用了 `text-align: center`。grep `text-align: center` 的密度——如果 >60% 的文本容器都居中，就要标记。

- **[MEDIUM]** 所有元素都用了统一的圆润 border-radius：卡片、按钮、输入框、容器都采用同一个大圆角（16px+）。统计 `border-radius`，如果 >80% 都是相同且 ≥16px 的值，就要标记。

- **[MEDIUM]** 通用 hero 文案："Welcome to [X]"、"Unlock the power of..."、"Your all-in-one solution for..."、"Revolutionize your..."、"Streamline your workflow"。grep HTML / JSX 内容查找这些模式。

### 2. 排版（4 项）

- **[HIGH]** 正文文本 `font-size` 小于 16px。grep `body`、`p`、`.text` 或基础样式中的 `font-size` 声明。低于 16px（或在 16px 基准下小于 1rem）的都要标记。

- **[HIGH]** diff 中引入了超过 3 种字体家族。统计不同的 `font-family` 声明。若跨变更文件出现超过 3 种独立字体，就要标记。

- **[HIGH]** 标题层级跳级：同一文件 / 组件里 `h1` 之后直接出现 `h3`，没有 `h2`。检查 HTML / JSX 的标题标签。

- **[HIGH]** 黑名单字体：Papyrus、Comic Sans、Lobster、Impact、Jokerman。grep `font-family` 查找这些名字。

### 3. 间距与布局（4 项）

- **[MEDIUM]** 当 `DESIGN.md` 指定了间距尺度时，出现不在 4px / 8px 网格上的任意间距值。检查 `margin`、`padding`、`gap` 是否符合声明的尺度。只有在 `DESIGN.md` 定义了尺度时才标记。

- **[MEDIUM]** 容器宽度固定但没有响应式处理：容器上出现 `width: NNNpx`，但没有 `max-width` 或 `@media` 断点。移动端容易横向滚动。

- **[MEDIUM]** 文本容器缺少 `max-width`：正文或段落容器没有设置 `max-width`，会导致每行超过 75 个字符。检查文本包装器是否有限宽。

- **[HIGH]** 新 CSS 规则中出现 `!important`。grep 新增行里的 `!important`。这通常是不得已的优先级逃逸，应该正确修复。

### 4. 交互状态（3 项）

- **[MEDIUM]** 交互元素（按钮、链接、输入框）缺少 hover / focus 状态。检查新的交互样式里是否有 `:hover` 和 `:focus` 或 `:focus-visible` 伪类。

- **[HIGH]** `outline: none` 或 `outline: 0`，但没有替代的焦点指示器。grep `outline:\s*none` 或 `outline:\s*0`。这会破坏键盘可访问性。

- **[LOW]** 交互元素的点击目标小于 44px。检查按钮和链接的 `min-height` / `min-width` / `padding`。需要从多个属性推算实际尺寸，属于低置信度判断。

### 5. `DESIGN.md` 违例（3 项，条件触发）

仅在存在 `DESIGN.md` 或 `design-system.md` 时适用：

- **[MEDIUM]** 颜色不在声明的调色板中。将变更 CSS 中的颜色值与 `DESIGN.md` 定义的调色板比较。

- **[MEDIUM]** 字体不在声明的排版章节中。将 `font-family` 与 `DESIGN.md` 的字体列表比较。

- **[MEDIUM]** 间距值超出声明的尺度。将 `margin` / `padding` / `gap` 与声明的 spacing scale 比较。

---

## 忽略项

不要标记：
- `DESIGN.md` 中明确写明为有意选择的模式
- 第三方 / vendor CSS 文件（node_modules、vendor 目录）
- CSS reset 或 normalize 样式表
- 测试夹具文件
- 生成后 / 压缩后的 CSS