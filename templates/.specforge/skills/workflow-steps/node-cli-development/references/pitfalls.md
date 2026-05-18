# 已知陷阱与迁移注意事项

本文按库分组，标注严重级别。提交前对照自查，可避免 80% 的运行时事故。

**严重级别**：

- ⚠️ **破坏性**：升级版本会编译失败或运行时报错，必须修改代码
- ℹ️ **注意**：行为差异，不修改也能跑但容易踩坑
- ✅ **建议**：最佳实践，建议遵守但非强制

## 1. citty

| 级别 | 描述 |
|---|---|
| ⚠️ 破坏性 | **0.2.x 纯 ESM**：`require('citty')` 会报错。项目必须设置 `"type":"module"` 或使用 `.mjs` 扩展名。Node 20+ CJS 项目可用 `import()` 动态导入 |
| ⚠️ 破坏性 | **可选参数类型变化**：0.1.x 中无 `required`/`default` 的参数类型为 `T`，0.2.x 正确推断为 `T \| undefined`，升级后需在代码中加非空断言或判断 |
| ⚠️ 破坏性 | **`--no-` 条件输出**：0.2.x 仅在设置 `negativeDescription` 时才在 help 中打印 `--no-<flag>`；0.1.x 对所有 boolean 参数均打印 |
| ⚠️ 破坏性 | **解析器换用 `node:util.parseArgs`**：部分边缘 case 行为与 0.1.x 有差异，重复标志、`--` 分隔符等场景需回归测试 |
| ℹ️ 注意 | **positional + subCommands 冲突**：父命令同时有 positional 参数和子命令时，同名字符串会路由到子命令而非 positional。避免在有子命令的父命令上定义 positional 参数 |
| ℹ️ 注意 | **`--version` 必须单独使用**：citty 检测 `rawArgs.length === 1 && rawArgs[0] === '--version'`，组合用法如 `--version --verbose` 不触发 |
| ℹ️ 注意 | **`runMain` vs `runCommand`**：`runMain` 出错时调用 `process.exit(1)`；`runCommand` 不会，错误会向上抛，适合测试和编程式调用 |
| ✅ 建议 | 所有子命令使用懒加载 `() => import(...).then(m => m.default)`，避免启动时加载全部子命令 |
| ✅ 建议 | 仅在根命令设置 `meta.version`，子命令无需单独设置 |

## 2. @clack/prompts

| 级别 | 描述 |
|---|---|
| ⚠️ 破坏性 | **1.x 纯 ESM**：`require('@clack/prompts')` 不再有效。Node ≥ 20.12 的 CJS 项目可用 `require(ESM)` 语法 |
| ⚠️ 破坏性 | **`spinner.stop(msg, code)` 已废弃**：1.0.0 改为独立方法：`stop()`（成功）· `cancel()`（取消）· `error()`（错误） |
| ⚠️ 破坏性 | **`picocolors` 已移除**：1.1.0 改用 Node.js 内置 `styleText`；无需单独安装颜色库，但旧代码中 `import color from 'picocolors'` 需更新 |
| ⚠️ 破坏性 | **Node.js 最低版本 ≥ 20.12**：`styleText` 在该版本稳定，低版本会报错 |
| ℹ️ 注意 | **每个 prompt 都必须检查 `isCancel`**：Ctrl+C 返回 `symbol`，未检查时后续代码收到 symbol 造成类型错误或逻辑异常 |
| ℹ️ 注意 | **spinner 运行中不要调用 `console.log`**：会与旋转动画冲突造成输出错乱，改用 `s.message()` 更新文字 |
| ℹ️ 注意 | **tasks 中的 throw 不中断后续 task**：需在 tasks 外部捕获整体结果或在 task 内显式返回错误状态 |
| ℹ️ 注意 | **TypeScript 类型断言**：`await text(...)` 返回 `string \| symbol`，`isCancel` 校验后须用 `as string` 断言或使用 `assertOk` 工具函数 |
| ✅ 建议 | CI 环境统一传入 `--yes` 跳过所有 prompts，避免无 TTY 时挂起 |
| ✅ 建议 | 使用 `updateSettings({ withGuide: false })` 关闭引导线，使管道/脚本输出更干净 |
| ✅ 建议 | 用 `group()` + `onCancel` 统一处理多步骤向导的取消逻辑，避免每步重复写 isCancel 判断 |

## 3. 提交前自查清单

把下面 12 条当成 PR checklist：

```
□ package.json 含 "type": "module"
□ 所有内部 import 路径以 .js 结尾（NodeNext ESM 要求）
□ 所有 await prompt 调用都用 assertOk 或 isCancel 检查
□ 所有 spinner 错误路径用 s.error()，未用废弃的 stop(msg, 2)
□ 所有可选参数（无 required/default）都判空再用
□ 命令树用懒加载 () => import(...).then(m => m.default)
□ 父命令未同时定义 positional 与 subCommands（除非真的不冲突）
□ CI 路径有 --yes 标志可跳过 prompts
□ Node.js engines 字段设为 ">=20.12"
□ bin 入口首行有 #!/usr/bin/env node
□ build 脚本对 dist/index.js 加可执行权限
□ 测试代码用 runCommand 而非 runMain
```
