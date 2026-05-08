import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { StatusService } from '../../../src/services/status-service.js';

describe('StatusService', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-status-'));
    // 搭建 change 目录结构
    const changeDir = path.join(tmpDir, 'specforge', 'changes', '2026-05-04-TestChange');
    fsExtra.ensureDirSync(changeDir);
    fsExtra.writeJsonSync(path.join(changeDir, '.specforge.json'), {
      changeId: '2026-05-04-TestChange',
      status: 'draft',
      phase: 'proposal',
      artifacts: { proposal: 'PROPOSAL.md' },
    });
    fsExtra.writeFileSync(path.join(changeDir, 'PROPOSAL.md'), '# Test Proposal');
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  describe('checkPhaseRequires', () => {
    it('design 阶段检测到 PROPOSAL.md 就绪', async () => {
      const service = new StatusService();
      const result = await service.checkPhaseRequires(tmpDir, 'design');
      expect(result.some(r => r.name === 'requirements-clarify' && r.status === 'done')).toBe(true);
    });

    it('requirements 阶段无前置依赖', async () => {
      const service = new StatusService();
      const result = await service.checkPhaseRequires(tmpDir, 'requirements');
      expect(result.every(r => r.status === 'done' || r.status === 'skipped')).toBe(true);
    });

    it('未知阶段返回空', async () => {
      const service = new StatusService();
      const result = await service.checkPhaseRequires(tmpDir, 'unknown');
      expect(result).toEqual([]);
    });
  });

  describe('getStatus', () => {
    it('返回完整的产物状态图', async () => {
      const service = new StatusService();
      const status = await service.getStatus(tmpDir);
      expect(status.currentChange).toBeDefined();
      expect(status.phases).toBeDefined();
      expect(status.phases.map((phase) => phase.phase)).toEqual([
        'foundation',
        'requirements',
        'design',
        'planning',
        'implementation',
        'quality',
        'release',
        'evolution',
      ]);
      expect(status.phases.map((phase) => phase.phase)).not.toContain('operations');
    });

    it('按项目 profile.enabledPhases 过滤阶段状态', async () => {
      fsExtra.ensureDirSync(path.join(tmpDir, 'specforge'));
      fsExtra.writeFileSync(
        path.join(tmpDir, 'specforge', 'config.yaml'),
        [
          'profile:',
          '  name: custom',
          '  enabledPhases:',
          '    - requirements',
          '    - implementation',
          '    - release',
        ].join('\n'),
      );

      const service = new StatusService();
      const status = await service.getStatus(tmpDir);

      expect(status.phases.map((phase) => phase.phase)).toEqual([
        'requirements',
        'implementation',
        'release',
      ]);
    });
  });
});
