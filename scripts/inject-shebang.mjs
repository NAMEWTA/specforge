#!/usr/bin/env node
/**
 * 向 `dist/cli/index.js` 注入 `#!/usr/bin/env node` shebang。
 *
 * 职责：
 * - tsc 不会保留或生成 shebang，npm 发布后 CLI 入口需要 shebang 才能可执行
 * - 幂等：若首行已存在 shebang 则跳过
 * - 在 Unix 上将文件权限设置为 0o755，确保可直接执行
 * - 找不到目标文件时以非零退出码终止，输出清晰错误信息
 *
 * 仅依赖 Node.js 标准库（fs / path / url），无需额外运行时依赖。
 */

import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SHEBANG = '#!/usr/bin/env node';
const TARGET_REL = 'dist/cli/index.js';

const targetPath = path.resolve(process.cwd(), TARGET_REL);

if (!existsSync(targetPath)) {
  console.error(
    `[inject-shebang] 找不到目标文件：${targetPath}\n` +
      `请先运行 \`pnpm build\`（或 \`tsc -p tsconfig.json\`）生成 dist 产物。`,
  );
  process.exit(1);
}

const original = readFileSync(targetPath, 'utf8');
const firstLine = original.split('\n', 1)[0];

if (firstLine === SHEBANG) {
  console.log(`[inject-shebang] 已存在 shebang，跳过注入：${TARGET_REL}`);
} else {
  const next = `${SHEBANG}\n${original}`;
  writeFileSync(targetPath, next, 'utf8');
  console.log(`[inject-shebang] 已注入 shebang：${TARGET_REL}`);
}

// chmod 仅在 Unix 生效；Windows 平台会忽略/无副作用
try {
  chmodSync(targetPath, 0o755);
} catch (err) {
  // 非致命：某些文件系统可能不支持 chmod，记录但不终止
  console.warn(
    `[inject-shebang] 设置可执行权限失败（可忽略，Windows 常见）：${(err instanceof Error ? err.message : String(err))}`,
  );
}
