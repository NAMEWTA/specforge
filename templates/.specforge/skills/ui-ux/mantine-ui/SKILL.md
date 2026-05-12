---
name: mantine-ui
type: ui-ux-rule
description: >-
  使用 Mantine 组件库构建 React UI。涵盖核心组件选型、主题定制、Styles API、
  布局模式、表单处理、日期选择器、图表、日程组件、通知系统与模态框管理。
  触发词：Mantine、UI 组件、主题配置、Styles API、DatePicker、Schedule、
  Heatmap、通知、模态框、表单布局。
version: "1.0.0"
author: "wta"
---

# Mantine UI 开发规范

为 AI 代理提供使用 Mantine 构建 React 应用的程序性知识。覆盖组件选型决策、样式定制模式与扩展包集成。

## 1. 包体系与安装

Mantine 采用模块化包结构，按需安装：

| 包名 | 用途 | 样式导入 |
|------|------|---------|
| `@mantine/core` | 核心组件（Button、Input、Modal 等 120+） | `@mantine/core/styles.css` |
| `@mantine/hooks` | 状态与 UI 管理 hooks（100+） | 无 |
| `@mantine/form` | 表单状态管理与校验 | 无 |
| `@mantine/dates` | 日期/时间选择器（依赖 dayjs） | `@mantine/dates/styles.css` |
| `@mantine/charts` | 图表组件（依赖 recharts） | `@mantine/charts/styles.css` |
| `@mantine/schedule` | 日程视图（日/周/月/年） | `@mantine/schedule/styles.css` |
| `@mantine/notifications` | 通知系统 | `@mantine/notifications/styles.css` |
| `@mantine/modals` | 模态框管理器 | 无（复用 core） |
| `@mantine/spotlight` | 全局搜索面板 | `@mantine/spotlight/styles.css` |
| `@mantine/carousel` | 轮播组件（依赖 embla） | `@mantine/carousel/styles.css` |
| `@mantine/dropzone` | 文件拖放上传 | `@mantine/dropzone/styles.css` |
| `@mantine/tiptap` | 富文本编辑器 | `@mantine/tiptap/styles.css` |

**关键规则**：扩展包样式必须在 `@mantine/core/styles.css` **之后**导入。

## 2. 应用骨架

```tsx
import '@mantine/core/styles.css';
// 按需导入扩展包样式...

import { createTheme, MantineProvider } from '@mantine/core';

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'Inter, sans-serif',
});

function App() {
  return (
    <MantineProvider theme={theme}>
      {/* 应用内容 */}
    </MantineProvider>
  );
}
```

PostCSS 配置（必需）：

```js
// postcss.config.cjs
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
```

## 3. 主题定制

### 3.1 Theme 对象核心字段

```tsx
import { createTheme } from '@mantine/core';

const theme = createTheme({
  primaryColor: 'blue',           // 主色（theme.colors 的 key）
  primaryShade: { light: 6, dark: 8 }, // 明暗模式下的色阶
  autoContrast: true,             // 自动计算文字对比色
  defaultRadius: 'md',           // 全局圆角
  fontFamily: 'Inter, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, monospace',
  headings: { fontFamily: 'Greycliff CF, sans-serif' },
  spacing: { xs: '0.5rem', sm: '0.75rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
  colors: {
    brand: ['#f0f4ff', /* ...10 色阶 */ '#001a4d'],
  },
});
```

### 3.2 全局组件默认值

```tsx
import { Button, createTheme } from '@mantine/core';

const theme = createTheme({
  components: {
    Button: Button.extend({
      defaultProps: { variant: 'filled', radius: 'md' },
      classNames: { root: 'my-button-root' },
    }),
  },
});
```

### 3.3 暗色模式

使用 `useMantineColorScheme` hook 切换：

```tsx
import { useMantineColorScheme, ActionIcon } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';

function ColorSchemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  return (
    <ActionIcon onClick={toggleColorScheme} variant="default">
      {colorScheme === 'dark' ? <IconSun /> : <IconMoon />}
    </ActionIcon>
  );
}
```

CSS 中使用 `light` / `dark` mixin：

```css
.card {
  @mixin light { background-color: var(--mantine-color-white); }
  @mixin dark { background-color: var(--mantine-color-dark-7); }
}
```

## 4. Styles API 模式

所有 Mantine 组件支持 Styles API，通过 `classNames` / `styles` / `vars` 定制内部元素。

### 4.1 classNames（推荐）

```tsx
import { TextInput } from '@mantine/core';
import classes from './MyInput.module.css';

<TextInput
  classNames={{
    root: classes.root,
    input: classes.input,
    label: classes.label,
  }}
/>
```

### 4.2 CSS 变量覆盖

```tsx
import { Button, createTheme } from '@mantine/core';

const theme = createTheme({
  components: {
    Button: Button.extend({
      vars: (theme, props) => {
        if (props.size === 'xxl') {
          return { root: { '--button-height': '4rem', '--button-fz': '1.5rem' } };
        }
        return { root: {} };
      },
    }),
  },
});
```

### 4.3 静态选择器

每个组件暴露 `.mantine-{Component}-{selector}` 格式的静态类名，可用于全局 CSS 覆盖。

## 5. 布局组件选型

| 需求 | 组件 | 关键 props |
|------|------|-----------|
| 应用外壳（侧边栏+头部） | `AppShell` | `navbar`, `header`, `aside`, `footer` |
| 弹性布局 | `Flex` / `Group`（水平）/ `Stack`（垂直） | `gap`, `align`, `justify` |
| 网格系统 | `Grid` + `Grid.Col` | `span`, `offset`, 响应式 `span={{ base: 12, md: 6 }}` |
| 简单等分 | `SimpleGrid` | `cols={{ base: 1, sm: 2, lg: 4 }}` |
| 居中 | `Center` | — |
| 间距 | `Space` | `h`, `w` |
| 容器 | `Container` | `size` (`xs`–`xl`) |

## 6. 常用组件速查

### 输入类

`TextInput` / `NumberInput` / `PasswordInput` / `Textarea` / `Select` / `MultiSelect` / `Autocomplete` / `ColorInput` / `FileInput` / `Checkbox` / `Radio` / `Switch` / `Slider` / `Rating`

### 数据展示

`Table` / `Card` / `Accordion` / `Timeline` / `Badge` / `Avatar` / `Image` / `Spoiler` / `Kbd`

### 覆盖层

`Modal` / `Drawer` / `Popover` / `Tooltip` / `HoverCard` / `Menu` / `Dialog`

### 导航

`Tabs` / `NavLink` / `Breadcrumbs` / `Pagination` / `Stepper` / `Anchor`

### 反馈

`Notification` / `Alert` / `Progress` / `Loader` / `Skeleton`

## 7. 扩展包使用指南

### 7.1 日期选择器（@mantine/dates）

依赖 `dayjs`。核心组件：

- `DatePicker` — 内联日历（支持 `type="default"|"range"|"multiple"`）
- `DatePickerInput` — 带输入框的日期选择
- `DateTimePicker` — 日期 + 时间
- `InlineDateTimePicker` — 内联日期时间（支持 range）
- `TimePicker` / `TimeInput` / `TimeGrid` — 时间选择

全局配置用 `DatesProvider`（locale、firstDayOfWeek）。

详见 [references/dates/](references/dates/) 获取完整 Props 与示例。

### 7.2 图表（@mantine/charts）

基于 recharts。核心组件：

- `AreaChart` / `BarChart` / `LineChart` / `CompositeChart`
- `DonutChart` / `PieChart` / `RadarChart` / `ScatterChart`
- `Heatmap` — GitHub 风格热力图
- `Sparkline` / `Treemap` / `FunnelChart`

详见 [references/charts/heatmap.md](references/charts/heatmap.md) 获取 Heatmap 用法。

### 7.3 日程组件（@mantine/schedule）

统一的日程视图组件，支持日/周/月/年切换、拖拽、事件调整大小、循环事件。

```tsx
import { Schedule } from '@mantine/schedule';

<Schedule
  events={events}
  withEventsDragAndDrop
  onEventDrop={handleDrop}
  withEventResize
  onEventResize={handleResize}
  layout="responsive"  // 自动响应式切换视图
/>
```

详见 [references/schedule/schedule.md](references/schedule/schedule.md) 获取完整用法。

### 7.4 通知系统（@mantine/notifications）

```tsx
import { Notifications } from '@mantine/notifications';
import { notifications } from '@mantine/notifications';

// 在 App 根部渲染一次
<Notifications position="top-right" />

// 任意位置调用
notifications.show({
  title: '操作成功',
  message: '数据已保存',
  color: 'green',
  autoClose: 3000,
});
```

详见 [references/other/notifications_system.md](references/other/notifications_system.md)。

### 7.5 模态框管理器（@mantine/modals）

```tsx
import { ModalsProvider } from '@mantine/modals';
import { modals } from '@mantine/modals';

// 包裹应用
<ModalsProvider>{/* app */}</ModalsProvider>

// 确认弹窗
modals.openConfirmModal({
  title: '确认删除',
  children: <Text>此操作不可撤销</Text>,
  labels: { confirm: '删除', cancel: '取消' },
  confirmProps: { color: 'red' },
  onConfirm: () => handleDelete(),
});

// 内容弹窗
modals.open({
  title: '编辑信息',
  children: <EditForm />,
});
```

详见 [references/other/modals.md](references/other/modals.md)。

## 8. 最佳实践

### 8.1 样式优先级

1. **Props**（`color`, `variant`, `size`）— 首选
2. **CSS 变量**（`vars` prop 或 theme.components）— 需要动态计算时
3. **classNames + CSS Modules** — 复杂样式定制
4. **styles prop**（内联对象）— 仅用于一次性覆盖

### 8.2 响应式设计

- 使用 style props 的对象语法：`<Box p={{ base: 'sm', md: 'xl' }}>`
- `Grid.Col` 的 `span` 支持响应式：`span={{ base: 12, sm: 6, lg: 4 }}`
- `SimpleGrid` 的 `cols` 同理
- `visibleFrom` / `hiddenFrom` props 控制组件可见性

### 8.3 表单处理

使用 `@mantine/form` 的 `useForm` hook：

```tsx
import { useForm } from '@mantine/form';

const form = useForm({
  initialValues: { email: '', name: '' },
  validate: {
    email: (value) => (/^\S+@\S+$/.test(value) ? null : '邮箱格式错误'),
    name: (value) => (value.length < 2 ? '名称至少 2 个字符' : null),
  },
});

<form onSubmit={form.onSubmit(handleSubmit)}>
  <TextInput label="邮箱" {...form.getInputProps('email')} />
  <TextInput label="名称" {...form.getInputProps('name')} />
  <Button type="submit">提交</Button>
</form>
```

### 8.4 可访问性

- 所有输入组件自动关联 `label` 与 `aria-describedby`
- 使用 `aria-label` / `ariaLabels` prop 为无文字控件提供标签
- `VisuallyHidden` 组件用于屏幕阅读器专用文本
- 日期组件支持完整键盘导航

### 8.5 性能

- 使用 `React.lazy` 按需加载重型扩展包（charts、tiptap）
- `Skeleton` 组件用于加载态占位
- `ScrollArea` 替代原生滚动以获得一致的跨浏览器体验
- 避免在 `styles` prop 中创建新对象（会导致重渲染），改用 `classNames`

## 9. LLM 文档资源

Mantine 提供 LLM 友好的文档格式：

- 索引：`https://mantine.dev/llms.txt`
- 单组件文档：`https://mantine.dev/llms/core-{component}.md`
- 完整文档：`https://mantine.dev/llms-full.txt`

当需要查阅特定组件的完整 Props 或 Styles API 时，优先访问上述 URL。
