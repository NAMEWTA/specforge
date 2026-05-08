import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { HooksService } from '../../../src/services/hooks-service.js';

describe('HooksService', () => {
  let tmpDir: string;
  let extPath: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-hooks-'));
    fsExtra.ensureDirSync(path.join(tmpDir, '.specforge'));
    extPath = path.join(tmpDir, '.specforge', 'extensions.yaml');
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  it('extensions.yaml 不存在时返回空数组', async () => {
    const service = new HooksService();
    const results = await service.runHooks(tmpDir, 'requirements', 'before');
    expect(results).toEqual([]);
  });

  it('运行成功的 before_<phase> 钩子', async () => {
    fsExtra.writeFileSync(
      extPath,
      [
        'hooks:',
        '  before_requirements:',
        '    - name: hello',
        '      command: echo "hello-from-hook"',
        '      enabled: true',
      ].join('\n'),
    );

    const service = new HooksService();
    const results = await service.runHooks(tmpDir, 'requirements', 'before');
    expect(results).toHaveLength(1);
    expect(results[0].exitCode).toBe(0);
    expect(results[0].stdout).toContain('hello-from-hook');
  });

  it('enabled=false 的钩子被跳过', async () => {
    fsExtra.writeFileSync(
      extPath,
      [
        'hooks:',
        '  before_requirements:',
        '    - name: skipped',
        '      command: echo "should-not-run"',
        '      enabled: false',
      ].join('\n'),
    );

    const service = new HooksService();
    const results = await service.runHooks(tmpDir, 'requirements', 'before');
    expect(results).toHaveLength(0);
  });

  it('必需钩子失败抛错', async () => {
    fsExtra.writeFileSync(
      extPath,
      [
        'hooks:',
        '  before_requirements:',
        '    - name: failing',
        '      command: exit 7',
        '      enabled: true',
        '      optional: false',
      ].join('\n'),
    );

    const service = new HooksService();
    await expect(
      service.runHooks(tmpDir, 'requirements', 'before'),
    ).rejects.toThrow(/failing/);
  });

  it('optional 钩子失败仅返回结果不抛错', async () => {
    fsExtra.writeFileSync(
      extPath,
      [
        'hooks:',
        '  after_release:',
        '    - name: soft-fail',
        '      command: exit 3',
        '      enabled: true',
        '      optional: true',
      ].join('\n'),
    );

    const service = new HooksService();
    const results = await service.runHooks(tmpDir, 'release', 'after');
    expect(results).toHaveLength(1);
    expect(results[0].exitCode).toBe(3);
    expect(results[0].optional).toBe(true);
  });

  it('无效 phase 抛错', async () => {
    const service = new HooksService();
    await expect(
      service.runHooks(tmpDir, 'operations', 'before'),
    ).rejects.toThrow(/无效的 phase/);
  });
});
