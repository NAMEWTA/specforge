import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SCRIPT_PATH = path.resolve(process.cwd(), 'scripts/inject-shebang.mjs');
const SHEBANG = '#!/usr/bin/env node';

/**
 * 在独立临时目录中以其为 cwd 运行 inject-shebang.mjs，
 * 脚本通过 process.cwd() 定位 dist/cli/index.js。
 */
function runInjectIn(cwd: string) {
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10_000,
  });
}

describe('inject-shebang.mjs', () => {
  let tempDir: string;
  let targetFile: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'specforge-inject-'));
    targetFile = path.join(tempDir, 'dist/cli/index.js');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('injects shebang when target file lacks it', () => {
    mkdirSync(path.dirname(targetFile), { recursive: true });
    writeFileSync(targetFile, 'console.log("hello");\n', 'utf8');

    const result = runInjectIn(tempDir);

    expect(result.status).toBe(0);
    const content = readFileSync(targetFile, 'utf8');
    expect(content.split('\n')[0]).toBe(SHEBANG);
    expect(content).toContain('console.log("hello");');
  });

  it('is idempotent when shebang already exists', () => {
    mkdirSync(path.dirname(targetFile), { recursive: true });
    const original = `${SHEBANG}\nconsole.log("hi");\n`;
    writeFileSync(targetFile, original, 'utf8');

    const result = runInjectIn(tempDir);

    expect(result.status).toBe(0);
    const content = readFileSync(targetFile, 'utf8');
    expect(content).toBe(original);
    // 首行仍为单一 shebang，未被重复插入
    const firstTwoLines = content.split('\n').slice(0, 2);
    expect(firstTwoLines[0]).toBe(SHEBANG);
    expect(firstTwoLines[1]).not.toBe(SHEBANG);
  });

  it('exits non-zero with clear error when target file does not exist', () => {
    // 不创建 dist/cli/index.js
    expect(existsSync(targetFile)).toBe(false);

    const result = runInjectIn(tempDir);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/找不到目标文件|not found|dist\/cli\/index\.js/);
  });
});
