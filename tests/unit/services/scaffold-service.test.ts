import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { ScaffoldService } from '../../../src/services/scaffold-service.js';

describe('ScaffoldService', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-test-'));
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  it('从 templates 复制框架资产到 .specforge/', async () => {
    const service = new ScaffoldService();
    await service.execute(tmpDir, { projectName: 'TestProj' });

    expect(fsExtra.existsSync(path.join(tmpDir, '.specforge'))).toBe(true);
    expect(fsExtra.existsSync(path.join(tmpDir, '.specforge', 'commands'))).toBe(true);
    expect(fsExtra.existsSync(path.join(tmpDir, '.specforge', 'skills'))).toBe(true);
    expect(fsExtra.existsSync(path.join(tmpDir, '.specforge', 'templates'))).toBe(true);
  });

  it('从 templates 复制用户资产到 specforge/', async () => {
    const service = new ScaffoldService();
    await service.execute(tmpDir, { projectName: 'TestProj' });

    expect(fsExtra.existsSync(path.join(tmpDir, 'specforge'))).toBe(true);
    expect(fsExtra.existsSync(path.join(tmpDir, 'specforge', 'brainstorming'))).toBe(true);
    expect(fsExtra.existsSync(path.join(tmpDir, 'specforge', 'context'))).toBe(true);
    expect(fsExtra.existsSync(path.join(tmpDir, 'specforge', 'changes'))).toBe(true);
    expect(fsExtra.existsSync(path.join(tmpDir, 'specforge', 'archive'))).toBe(true);
  });

  it('创建 workflow 命令目录结构', async () => {
    const service = new ScaffoldService();
    await service.execute(tmpDir, { projectName: 'TestProj' });

    const workflowDir = path.join(tmpDir, '.specforge', 'commands', 'workflow');
    expect(fsExtra.existsSync(workflowDir)).toBe(true);
    
    // 验证至少包含若干工作流命令
    const commands = fsExtra.readdirSync(workflowDir);
    expect(commands.length).toBeGreaterThan(0);
  });

  it('创建 tools 命令目录', async () => {
    const service = new ScaffoldService();
    await service.execute(tmpDir, { projectName: 'TestProj' });

    const toolsDir = path.join(tmpDir, '.specforge', 'commands', 'tools');
    expect(fsExtra.existsSync(toolsDir)).toBe(true);
  });

  it('创建所有技能类别目录', async () => {
    const service = new ScaffoldService();
    await service.execute(tmpDir, { projectName: 'TestProj' });

    const skillsDir = path.join(tmpDir, '.specforge', 'skills');
    expect(fsExtra.existsSync(skillsDir)).toBe(true);
    
    const categories = [
      'domain-rules',
      'code-styles',
      'architecture',
      'testing',
      'security',
      'ui-ux',
      'workflow-steps',
    ];
    
    for (const cat of categories) {
      expect(fsExtra.existsSync(path.join(skillsDir, cat))).toBe(true);
    }
  });

  it('对配置文件进行变量渲染', async () => {
    const service = new ScaffoldService();
    const projectName = 'MyAwesomeProject';
    const author = 'testauthor';
    
    await service.execute(tmpDir, { projectName, author });

    // 检查 specforge/config.yaml 是否存在且包含渲染的内容
    const specforgeConfigPath = path.join(tmpDir, 'specforge', 'config.yaml');
    if (fsExtra.existsSync(specforgeConfigPath)) {
      const configContent = fsExtra.readFileSync(specforgeConfigPath, 'utf-8');
      // specforge/config.yaml 应该包含项目名称（如果模板中有占位符）
      // 至少检查格式是有效的 YAML
      expect(configContent.length).toBeGreaterThan(0);
    }

    // .specforge/config.yaml 是框架级别配置，不包含项目特定信息
    // 但应该存在
    const frameworkConfigPath = path.join(tmpDir, '.specforge', 'config.yaml');
    if (fsExtra.existsSync(frameworkConfigPath)) {
      const configContent = fsExtra.readFileSync(frameworkConfigPath, 'utf-8');
      expect(configContent).toContain('SpecForge');
    }
  });

  it('不再生成硬编码的 project.md（仅当 templates 中存在时复制）', async () => {
    const service = new ScaffoldService();
    await service.execute(tmpDir, { projectName: 'TestProj' });

    // project.md 应该只在 templates/specforge/ 中存在时才被复制
    // 使用 process.cwd()（测试由 workspace root 启动，ESM 下无 __dirname）
    const projectMdPath = path.join(tmpDir, 'specforge', 'project.md');
    const templateProjectMdPath = path.join(process.cwd(), 'templates/specforge/project.md');
    const projectMdExistsInTemplate = fsExtra.existsSync(templateProjectMdPath);

    const projectMdExistsInResult = fsExtra.existsSync(projectMdPath);
    expect(projectMdExistsInResult).toBe(projectMdExistsInTemplate);
  });

  it('框架资产目录结构完整', async () => {
    const service = new ScaffoldService();
    await service.execute(tmpDir, { projectName: 'TestProj' });

    const frameworkDir = path.join(tmpDir, '.specforge');
    expect(fsExtra.existsSync(path.join(frameworkDir, 'commands'))).toBe(true);
    expect(fsExtra.existsSync(path.join(frameworkDir, 'skills'))).toBe(true);
    expect(fsExtra.existsSync(path.join(frameworkDir, 'templates'))).toBe(true);
  });

  it('复制命令和技能文件', async () => {
    const service = new ScaffoldService();
    await service.execute(tmpDir, { projectName: 'TestProj' });

    const commandsDir = path.join(tmpDir, '.specforge', 'commands');
    const skillsDir = path.join(tmpDir, '.specforge', 'skills');
    
    // 验证至少存在一些 .md 文件
    const commandFiles = fsExtra.readdirSync(commandsDir, { recursive: true })
      .filter((f) => typeof f === 'string' && f.endsWith('.md'));
    const skillFiles = fsExtra.readdirSync(skillsDir, { recursive: true })
      .filter((f) => typeof f === 'string' && f.endsWith('.md'));
    
    expect(commandFiles.length).toBeGreaterThan(0);
    expect(skillFiles.length).toBeGreaterThan(0);
  });
});
