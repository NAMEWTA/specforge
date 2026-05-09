import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { ScaffoldService } from '../../src/services/scaffold-service.js';

/**
 * 集成测试：验证 specforge init 对 templates/ 新增内容的完整复制与渲染
 *
 * 覆盖范围：
 * - Requirement 5：`.specforge/templates/` 下的 5 个产物模板
 * - Requirement 6：`specforge/spec/` 目录与 `specforge/project.md` 文件及占位符替换
 */
describe('specforge init 对 templates 新增内容的集成验证', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-scaffold-'));
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  it('初始化后 .specforge/templates/ 目录应包含全部 5 个产物模板', async () => {
    const scaffold = new ScaffoldService();
    await scaffold.execute(tmpDir, { projectName: 'ScaffoldTest' });

    const templatesDir = path.join(tmpDir, '.specforge', 'templates');
    expect(fsExtra.existsSync(templatesDir)).toBe(true);

    const expectedTemplates = [
      'PROPOSAL.md',
      'DESIGN.md',
      'TASKS.md',
      'CHECKLIST.md',
      'RETROSPECTIVE.md',
    ];

    for (const filename of expectedTemplates) {
      const filePath = path.join(templatesDir, filename);
      expect(fsExtra.existsSync(filePath)).toBe(true);

      // 每个模板都应是非空文件
      const content = fsExtra.readFileSync(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);

      // 每个模板都应包含 YAML frontmatter（以 --- 开始）
      expect(content.startsWith('---')).toBe(true);
    }
  });

  it('初始化后 specforge/spec/ 目录应存在', async () => {
    const scaffold = new ScaffoldService();
    await scaffold.execute(tmpDir, { projectName: 'ScaffoldTest' });

    const specDir = path.join(tmpDir, 'specforge', 'spec');
    expect(fsExtra.existsSync(specDir)).toBe(true);
    expect(fsExtra.statSync(specDir).isDirectory()).toBe(true);
  });

  it('初始化后 specforge/project.md 应存在且 {{projectName}} 已被替换', async () => {
    const scaffold = new ScaffoldService();
    const projectName = 'MyAwesomeProject';
    await scaffold.execute(tmpDir, { projectName });

    const projectMdPath = path.join(tmpDir, 'specforge', 'project.md');
    expect(fsExtra.existsSync(projectMdPath)).toBe(true);

    const content = fsExtra.readFileSync(projectMdPath, 'utf-8');

    // 占位符应被替换为实际项目名
    expect(content).toContain(projectName);
    // 原始占位符不应残留
    expect(content).not.toContain('{{projectName}}');
  });
});
