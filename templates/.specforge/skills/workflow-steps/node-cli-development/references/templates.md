# 项目脚手架与生产级模板

## 目录

1. [项目脚手架](#1-项目脚手架)
2. [生产级 CLI 组合模板](#2-生产级-cli-组合模板)
3. [package.json 参考配置](#3-packagejson-参考配置)

## 1. 项目脚手架

### 1.1 安装

```bash
# 最新稳定版
pnpm install citty@0.2.2 @clack/prompts@1.4.0

# 开发依赖
pnpm install -D typescript@^5.5 @types/node@^22 tsx
```

### 1.2 推荐目录结构

```
my-cli/
├── src/
│   ├── index.ts              # 入口：runMain()
│   ├── commands/
│   │   ├── init.ts           # 子命令 init（含 clack 交互）
│   │   ├── deploy.ts
│   │   └── config/
│   │       ├── index.ts      # config 子命令组
│   │       ├── get.ts
│   │       └── set.ts
│   └── utils/
│       ├── cancel.ts         # 统一取消处理
│       └── logger.ts         # 封装 log.*
├── package.json              # "type": "module"
└── tsconfig.json
```

### 1.3 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

## 2. 生产级 CLI 组合模板

### 2.1 src/index.ts — 入口

```typescript
#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: {
    name: 'my-cli',
    version: '1.0.0',
    description: '项目脚手架工具',
  },
  subCommands: {
    init:   () => import('./commands/init.js').then(m => m.default),
    deploy: () => import('./commands/deploy.js').then(m => m.default),
    config: () => import('./commands/config/index.js').then(m => m.default),
  },
});

runMain(main);
```

### 2.2 src/utils/cancel.ts

```typescript
import { isCancel, cancel } from '@clack/prompts';

export function assertOk<T>(value: T | symbol, msg = '操作已取消'): T {
  if (isCancel(value)) {
    cancel(msg);
    process.exit(0);
  }
  return value as T;
}
```

### 2.3 src/commands/init.ts — 交互式 init 子命令

```typescript
import { defineCommand } from 'citty';
import * as p from '@clack/prompts';
import { assertOk } from '../utils/cancel.js';

export default defineCommand({
  meta: { name: 'init', description: '创建新项目' },
  args: {
    name: {
      type: 'positional',
      required: false,
      description: '项目名（省略则交互询问）',
    },
    template: {
      type: 'enum',
      options: ['react', 'vue', 'vanilla'] as const,
      alias: ['t'],
      description: '项目模板',
    },
    yes: {
      type: 'boolean',
      alias: ['y'],
      description: '非交互模式，全部使用默认值',
    },
  },

  async run({ args }) {
    p.intro('🚀 创建新项目');

    // 若 CLI 参数已提供则跳过 prompt
    const projectName = args.name
      ?? assertOk(await p.text({
           message: '项目名称？',
           placeholder: 'my-app',
           validate: (v) => !v ? '必填' : !/^[a-z0-9-]+$/.test(v) ? '格式非法' : undefined,
         }));

    const template = args.template
      ?? assertOk(await p.select({
           message: '选择模板：',
           options: [
             { value: 'react',   label: 'React + Vite', hint: '推荐' },
             { value: 'vue',     label: 'Vue 3 + Vite' },
             { value: 'vanilla', label: 'Vanilla TS' },
           ],
           initialValue: 'react',
         }));

    const extras = args.yes
      ? ['eslint', 'prettier']
      : assertOk(await p.multiselect({
          message: '附加工具？',
          options: [
            { value: 'eslint',   label: 'ESLint',   hint: '推荐' },
            { value: 'prettier', label: 'Prettier' },
            { value: 'vitest',   label: 'Vitest' },
          ],
          required: false,
        }));

    const confirmed = args.yes || assertOk(await p.confirm({
      message: `确认创建项目 ${projectName}（模板：${template}）？`,
      initialValue: true,
    }));

    if (!confirmed) {
      p.cancel('已取消');
      process.exit(0);
    }

    // 多任务执行
    await p.tasks([
      {
        title: '复制模板文件',
        task: async () => {
          await copyTemplate(template, projectName);
          return '模板就绪';
        },
      },
      {
        title: '初始化 Git 仓库',
        task: async () => {
          await execGitInit(projectName);
          return 'Git 初始化完成';
        },
      },
      {
        title: '安装依赖',
        task: async (msg) => {
          msg('解析依赖树...');
          await installDeps(projectName);
          return '依赖安装完成';
        },
      },
    ]);

    p.note(`cd ${projectName}\npnpm run dev`, '下一步');
    p.outro('✅ 项目创建成功！');
  },
});

// ── 实现占位（替换为真实逻辑）──────────────────────────────
async function copyTemplate(_tmpl: string, _dir: string) { /* ... */ }
async function execGitInit(_dir: string) { /* ... */ }
async function installDeps(_dir: string) { /* ... */ }
```

## 3. package.json 参考配置

```json
{
  "name": "my-cli",
  "version": "1.0.0",
  "type": "module",
  "description": "我的 CLI 工具",
  "bin": {
    "my-cli": "./dist/index.js"
  },
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "dev":   "tsx src/index.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node dist/index.js",
    "prepublishOnly": "pnpm run build"
  },
  "dependencies": {
    "@clack/prompts": "^1.4.0",
    "citty": "^0.2.2"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20.12"
  },
  "files": [
    "dist",
    "README.md"
  ]
}
```

**bin 入口 shebang**（`src/index.ts` 第一行）：

```typescript
#!/usr/bin/env node
```

编译产物 `dist/index.js` 需有可执行权限：

```bash
chmod +x dist/index.js
# 或在 build 脚本中：
# "build": "tsc && chmod +x dist/index.js"
```
