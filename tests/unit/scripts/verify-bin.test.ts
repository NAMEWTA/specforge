import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SCRIPT_PATH = path.resolve(process.cwd(), 'scripts/verify-bin.mjs');
const SHEBANG = '#!/usr/bin/env node';

function runVerifyIn(cwd: string) {
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 15_000,
  });
}

describe('verify-bin.mjs', () => {
  let tempDir: string;
  let targetFile: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'specforge-verify-'));
    targetFile = path.join(tempDir, 'dist/cli/index.js');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('passes when file exists, has shebang, and CLI responds to --help', () => {
    mkdirSync(path.dirname(targetFile), { recursive: true });
    // 模拟一个最小可用的 CLI：--help 时退出 0
    const fakeCli = `${SHEBANG}
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: specforge [options]');
  process.exit(0);
}
process.exit(1);
`;
    writeFileSync(targetFile, fakeCli, 'utf8');

    const result = runVerifyIn(tempDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/所有 bin 入口校验通过|all/i);
  });

  it('fails when target file does not exist', () => {
    const result = runVerifyIn(tempDir);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/缺少编译产物|dist\/cli\/index\.js/);
  });

  it('fails when shebang is missing', () => {
    mkdirSync(path.dirname(targetFile), { recursive: true });
    writeFileSync(targetFile, 'console.log("no shebang");\n', 'utf8');

    const result = runVerifyIn(tempDir);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/shebang/i);
  });

  it('fails when CLI exits non-zero on --help', () => {
    mkdirSync(path.dirname(targetFile), { recursive: true });
    // 有 shebang 但 CLI 启动即异常退出
    const brokenCli = `${SHEBANG}
process.exit(2);
`;
    writeFileSync(targetFile, brokenCli, 'utf8');

    const result = runVerifyIn(tempDir);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/退出码非 0|exit/i);
  });
});
