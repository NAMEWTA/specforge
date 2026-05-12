# Mantine 核心模式速查

## 目录

- [AppShell 布局](#appshell-布局)
- [常用 Hooks](#常用-hooks)
- [Combobox 模式](#combobox-模式)
- [表单校验模式](#表单校验模式)
- [响应式模式](#响应式模式)
- [多态组件](#多态组件)

## AppShell 布局

```tsx
import { AppShell, Burger, Group, NavLink, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

function Layout() {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text fw={700}>应用名称</Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink label="首页" href="/" />
        <NavLink label="设置" href="/settings" />
      </AppShell.Navbar>

      <AppShell.Main>
        {/* 页面内容 */}
      </AppShell.Main>
    </AppShell>
  );
}
```

## 常用 Hooks

| Hook | 用途 | 示例 |
|------|------|------|
| `useDisclosure` | 布尔开关（modal/drawer/burger） | `const [opened, { open, close, toggle }] = useDisclosure(false)` |
| `useForm` | 表单状态与校验 | `const form = useForm({ initialValues, validate })` |
| `useDebouncedValue` | 防抖值 | `const [debounced] = useDebouncedValue(value, 300)` |
| `useMediaQuery` | 媒体查询 | `const matches = useMediaQuery('(min-width: 768px)')` |
| `useClipboard` | 剪贴板 | `const { copy, copied } = useClipboard()` |
| `useLocalStorage` | 本地存储 | `const [value, setValue] = useLocalStorage({ key: 'theme' })` |
| `useHotkeys` | 快捷键 | `useHotkeys([['mod+s', handleSave]])` |
| `useIntersection` | 交叉观察 | `const { ref, entry } = useIntersection()` |
| `useScrollIntoView` | 滚动到视图 | `const { scrollIntoView, targetRef } = useScrollIntoView()` |
| `useClickOutside` | 点击外部 | `const ref = useClickOutside(() => setOpened(false))` |
| `useViewportSize` | 视口尺寸 | `const { height, width } = useViewportSize()` |
| `useOs` | 操作系统检测 | `const os = useOs()` |
| `useNetwork` | 网络状态 | `const { online, type } = useNetwork()` |
| `useIdle` | 空闲检测 | `const idle = useIdle(2000)` |
| `usePagination` | 分页逻辑 | `const pagination = usePagination({ total: 10, page: 1 })` |

## Combobox 模式

自定义 Select/Autocomplete/MultiSelect 的底层组件：

```tsx
import { Combobox, InputBase, useCombobox } from '@mantine/core';

function CustomSelect({ data }: { data: string[] }) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const [value, setValue] = useState<string | null>(null);

  const options = data.map((item) => (
    <Combobox.Option value={item} key={item}>
      {item}
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        setValue(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          onClick={() => combobox.toggleDropdown()}
        >
          {value || <InputBase.Placeholder>选择...</InputBase.Placeholder>}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>{options}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
```

## 表单校验模式

### 基础校验

```tsx
import { useForm, isNotEmpty, isEmail, hasLength, matches } from '@mantine/form';

const form = useForm({
  mode: 'uncontrolled',
  initialValues: { name: '', email: '', age: 0 },
  validate: {
    name: hasLength({ min: 2, max: 50 }, '名称 2-50 字符'),
    email: isEmail('邮箱格式错误'),
    age: (value) => (value < 18 ? '必须年满 18 岁' : null),
  },
});
```

### 嵌套字段与列表

```tsx
const form = useForm({
  initialValues: {
    profile: { firstName: '', lastName: '' },
    members: [{ name: '', email: '' }],
  },
});

// 嵌套访问
form.getInputProps('profile.firstName');

// 列表操作
form.insertListItem('members', { name: '', email: '' });
form.removeListItem('members', 0);
form.getInputProps(`members.${index}.name`);
```

### Schema 校验（zod）

```tsx
import { zodResolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, '名称至少 2 字符'),
  email: z.string().email('邮箱格式错误'),
});

const form = useForm({
  initialValues: { name: '', email: '' },
  validate: zodResolver(schema),
});
```

## 响应式模式

### Style Props 响应式

```tsx
import { Box, Text } from '@mantine/core';

// 对象语法：base → xs → sm → md → lg → xl
<Box p={{ base: 'xs', sm: 'md', lg: 'xl' }} />
<Text fz={{ base: 'sm', md: 'lg' }} />
```

### 条件渲染

```tsx
import { Box } from '@mantine/core';

// visibleFrom：仅在指定断点及以上可见
<Box visibleFrom="sm">桌面端内容</Box>

// hiddenFrom：在指定断点及以上隐藏
<Box hiddenFrom="md">移动端内容</Box>
```

### CSS Modules 响应式

```css
/* 使用 postcss-preset-mantine 提供的变量 */
.container {
  padding: var(--mantine-spacing-xs);

  @media (min-width: $mantine-breakpoint-sm) {
    padding: var(--mantine-spacing-md);
  }

  @media (min-width: $mantine-breakpoint-lg) {
    padding: var(--mantine-spacing-xl);
  }
}
```

## 多态组件

使用 `component` prop 改变渲染的 HTML 元素：

```tsx
import { Button, Text } from '@mantine/core';
import { Link } from 'react-router-dom';

// Button 渲染为 <a>
<Button component="a" href="/path">链接按钮</Button>

// Button 渲染为 React Router Link
<Button component={Link} to="/path">路由链接</Button>

// Text 渲染为 <label>
<Text component="label" htmlFor="input-id">标签</Text>
```

使用 `renderRoot` 获得完整类型安全：

```tsx
<Button renderRoot={(props) => <Link to="/path" {...props} />}>
  类型安全的路由链接
</Button>
```
