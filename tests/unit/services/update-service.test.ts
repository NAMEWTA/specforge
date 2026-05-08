import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { UpdateService } from '../../../src/services/update-service.js';


describe('UpdateService', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-update-'));
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  it('未初始化项目时返回提示且没有迁移警告', async () => {
    const service = new UpdateService();
    const result = await service.execute(tmpDir);

    expect(result.updated).toBe(false);
    expect(result.message).toContain('.specforge/ 不存在');
    expect(result.warnings).toEqual([]);
  });

  it('检测旧 operations-monitor 命令并返回迁移提示', async () => {
    const legacyDir = path.join(
      tmpDir,
      '.specforge',
      'commands',
      'workflow',
      'operations-monitor',
    );
    fsExtra.ensureDirSync(legacyDir);
    fsExtra.writeFileSync(
      path.join(legacyDir, 'operations-monitor.md'),
      '# Legacy operations monitor',
    );

    const service = new UpdateService();
    const result = await service.execute(tmpDir);

    expect(result.updated).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('operations-monitor');
    expect(result.warnings[0]).toContain('release-deploy');
  });
});
