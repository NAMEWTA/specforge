#!/usr/bin/env node
/**
 * 验证 npm 发布前的 bin 入口产物是否可用。
 *
 * 在 release 流水线中，`pnpm build`（含 shebang 注入）完成后、`npm publish`
 * 之前调用本脚本，对编译产物执行三项检查：
 *
 *   1. `dist/cli/index.js` 文件确实存在
 *   2. 文件首行是 `#!/usr/bin/env node`（确保被 npm 注册为可执行入口）
 *   3. 通过 `node dist/cli/index.js --help` 启动 CLI，退出码为 0
 *
 * 任意一项失败即输出具体原因并以非零退出码终止；全部通过输出 success 日志。
 *
 * 仅依赖 Node.js 标准库（fs / child_process / path），无需额外运行时依赖。
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const TARGET_REL = 'dist/cli/index.js';
const EXPECTED_SHEBANG = '#!/usr/bin/env node';
const HELP_TIMEOUT_MS = 10_000;
const LOG_PREFIX = '[verify-bin]';

/**
 * 输出错误并以非零码退出。
 * @param {string} message
 */
function fail(message) {
  console.error(`${LOG_PREFIX} ❌ ${message}`);
  process.exit(1);
}

const targetPath = path.resolve(process.cwd(), TARGET_REL);

// 1) 文件存在性检查
if (!existsSync(targetPath)) {
  fail(
    `缺少编译产物：${targetPath}\n` +
      `请先运行 \`pnpm build\`（会在编译后自动注入 shebang）。`,
  );
}
console.log(`${LOG_PREFIX} ✓ 产物存在：${TARGET_REL}`);

// 2) Shebang 校验
const content = readFileSync(targetPath, 'utf8');
const firstLine = content.split('\n', 1)[0];
if (firstLine !== EXPECTED_SHEBANG) {
  fail(
    `首行 shebang 不匹配：\n` +
      `  期望：${EXPECTED_SHEBANG}\n` +
      `  实际：${firstLine || '(空行)'}\n` +
      `请确认 \`scripts/inject-shebang.mjs\` 是否在 build 流程中被调用。`,
  );
}
console.log(`${LOG_PREFIX} ✓ shebang 正确：${EXPECTED_SHEBANG}`);

// 3) CLI 启动验证（--help 快路径，应立即返回 0）
const result = spawnSync(process.execPath, [targetPath, '--help'], {
  encoding: 'utf8',
  timeout: HELP_TIMEOUT_MS,
  // 将 stdio 捕获到当前进程缓冲区，避免污染主进程输出
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (result.error) {
  fail(
    `启动 CLI 失败：${result.error.message}\n` +
      `命令：${process.execPath} ${targetPath} --help`,
  );
}

if (typeof result.signal === 'string' && result.signal.length > 0) {
  fail(
    `CLI 被信号终止：${result.signal}（可能是超时 ${HELP_TIMEOUT_MS}ms）\n` +
      `stdout:\n${result.stdout ?? ''}\n` +
      `stderr:\n${result.stderr ?? ''}`,
  );
}

if (result.status !== 0) {
  fail(
    `CLI 退出码非 0：${result.status}\n` +
      `stdout:\n${result.stdout ?? ''}\n` +
      `stderr:\n${result.stderr ?? ''}`,
  );
}

console.log(`${LOG_PREFIX} ✓ CLI 启动成功：node ${TARGET_REL} --help → exit 0`);
console.log(`${LOG_PREFIX} ✅ 所有 bin 入口校验通过`);
