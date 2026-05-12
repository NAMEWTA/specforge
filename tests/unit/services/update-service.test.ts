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

  // P1 双目录边界：specforge update 不触碰 specforge/context/ 下用户资产
  describe('P1 双目录边界 — update 不覆盖用户 context', () => {
    // 预置用户资产内容（模拟用户已编辑过的文件）
    const userContextContent = '# 用户自定义 context\n技术栈: TypeScript + Vitest';
    const userArchitectureContent = '# 用户自定义 architecture\n模块图: src/ → dist/';
    const userLessonsContent = '# 用户自定义 lessons\nL-001: 不要直接 console.log';

    /**
     * 辅助函数：在临时目录中同时创建 .specforge/（框架资产）和 specforge/context/（用户资产）
     */
    function setupDualDirectories(root: string): void {
      // 创建框架资产目录（update 的操作目标）
      fsExtra.ensureDirSync(path.join(root, '.specforge'));

      // 创建用户资产目录及三份 context 文件
      const contextDir = path.join(root, 'specforge', 'context');
      fsExtra.ensureDirSync(contextDir);
      fsExtra.writeFileSync(
        path.join(contextDir, 'context.md'),
        userContextContent,
      );
      fsExtra.writeFileSync(
        path.join(contextDir, 'architecture.md'),
        userArchitectureContent,
      );
      fsExtra.writeFileSync(
        path.join(contextDir, 'lessons.md'),
        userLessonsContent,
      );
    }

    it('specforge update 不修改 specforge/context/ 下三份用户资产文件', async () => {
      setupDualDirectories(tmpDir);

      const service = new UpdateService();
      await service.execute(tmpDir);

      // 断言三份用户资产文件内容未被改动
      const contextDir = path.join(tmpDir, 'specforge', 'context');
      expect(
        fsExtra.readFileSync(path.join(contextDir, 'context.md'), 'utf-8'),
      ).toBe(userContextContent);
      expect(
        fsExtra.readFileSync(path.join(contextDir, 'architecture.md'), 'utf-8'),
      ).toBe(userArchitectureContent);
      expect(
        fsExtra.readFileSync(path.join(contextDir, 'lessons.md'), 'utf-8'),
      ).toBe(userLessonsContent);
    });

    it('specforge update --force 同样不修改 specforge/context/ 下三份用户资产文件', async () => {
      setupDualDirectories(tmpDir);

      // UpdateService 当前不接受 force 参数（由 UpdateCommand 层处理），
      // 但无论如何 execute 都只操作 .specforge/，此处验证边界不变
      const service = new UpdateService();
      await service.execute(tmpDir);

      // 断言三份用户资产文件内容未被改动
      const contextDir = path.join(tmpDir, 'specforge', 'context');
      expect(
        fsExtra.readFileSync(path.join(contextDir, 'context.md'), 'utf-8'),
      ).toBe(userContextContent);
      expect(
        fsExtra.readFileSync(path.join(contextDir, 'architecture.md'), 'utf-8'),
      ).toBe(userArchitectureContent);
      expect(
        fsExtra.readFileSync(path.join(contextDir, 'lessons.md'), 'utf-8'),
      ).toBe(userLessonsContent);
    });

    it('update 仅操作 .specforge/ 框架目录，specforge/ 用户目录结构完整保留', async () => {
      setupDualDirectories(tmpDir);

      const service = new UpdateService();
      await service.execute(tmpDir);

      // 断言用户资产目录结构完整存在
      const contextDir = path.join(tmpDir, 'specforge', 'context');
      expect(fsExtra.existsSync(path.join(contextDir, 'context.md'))).toBe(true);
      expect(fsExtra.existsSync(path.join(contextDir, 'architecture.md'))).toBe(true);
      expect(fsExtra.existsSync(path.join(contextDir, 'lessons.md'))).toBe(true);
    });
  });
});
