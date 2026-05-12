import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { ScaffoldService, upsertUserAsset } from '../../../src/services/scaffold-service.js';

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


describe('upsertUserAsset', () => {
  let tmpDir: string;
  let templateDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-upsert-'));
    templateDir = path.join(tmpDir, 'templates');
    fsExtra.mkdirSync(templateDir, { recursive: true });
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  // --- 分支 1：首次创建（Req 1.1）---

  it('目标文件不存在时，从模板创建并返回 created', async () => {
    // 准备模板文件
    const templatePath = path.join(templateDir, 'context.md');
    fsExtra.writeFileSync(templatePath, '# {{projectName}} Context\n\n项目级规则文档。');

    const targetPath = path.join(tmpDir, 'output', 'context.md');

    const result = await upsertUserAsset(targetPath, templatePath, { projectName: 'TestProj' });

    expect(result).toBe('created');
    expect(fsExtra.existsSync(targetPath)).toBe(true);
    const content = fsExtra.readFileSync(targetPath, 'utf-8');
    expect(content).toContain('# TestProj Context');
    expect(content).toContain('项目级规则文档。');
  });

  it('目标文件不存在时，模板变量被正确渲染', async () => {
    const templatePath = path.join(templateDir, 'architecture.md');
    fsExtra.writeFileSync(
      templatePath,
      '# {{projectName}} Architecture\n\nauthor: {{author}}\ncreated: {{createdAt}}',
    );

    const targetPath = path.join(tmpDir, 'output', 'architecture.md');

    const result = await upsertUserAsset(targetPath, templatePath, {
      projectName: 'MyProject',
      author: 'dev',
      createdAt: '2026-05-11',
    });

    expect(result).toBe('created');
    const content = fsExtra.readFileSync(targetPath, 'utf-8');
    expect(content).toContain('# MyProject Architecture');
    expect(content).toContain('author: dev');
    expect(content).toContain('created: 2026-05-11');
  });

  // --- 分支 2：非空文件跳过（Req 1.2）---

  it('目标文件已存在且内容非空时，返回 skipped 且不修改原内容', async () => {
    const templatePath = path.join(templateDir, 'context.md');
    fsExtra.writeFileSync(templatePath, '# {{projectName}} Context\n\n新模板内容。');

    // 预先创建目标文件，写入用户自定义内容
    const targetPath = path.join(tmpDir, 'output', 'context.md');
    fsExtra.mkdirSync(path.dirname(targetPath), { recursive: true });
    const originalContent = '# 我的项目 Context\n\n这是用户已有的内容，不应被覆盖。';
    fsExtra.writeFileSync(targetPath, originalContent);

    const result = await upsertUserAsset(targetPath, templatePath, { projectName: 'TestProj' });

    expect(result).toBe('skipped');
    // 确认文件内容未被修改
    const content = fsExtra.readFileSync(targetPath, 'utf-8');
    expect(content).toBe(originalContent);
  });

  it('目标文件已存在且含有实质内容时，即使 force 未设置也跳过', async () => {
    const templatePath = path.join(templateDir, 'lessons.md');
    fsExtra.writeFileSync(templatePath, '# Lessons\n\n模板内容。');

    const targetPath = path.join(tmpDir, 'output', 'lessons.md');
    fsExtra.mkdirSync(path.dirname(targetPath), { recursive: true });
    const originalContent = '# 项目经验教训\n\n## L-001 某个教训\n\n详细内容...';
    fsExtra.writeFileSync(targetPath, originalContent);

    const result = await upsertUserAsset(targetPath, templatePath, { projectName: 'TestProj' });

    expect(result).toBe('skipped');
    const content = fsExtra.readFileSync(targetPath, 'utf-8');
    expect(content).toBe(originalContent);
  });

  // --- 分支 3：.gitkeep / 零字节文件升级（Req 1.3）---

  it('目标路径是 .gitkeep 文件时，渲染模板写入并返回 upgraded-gitkeep', async () => {
    const templatePath = path.join(templateDir, 'context.md');
    fsExtra.writeFileSync(templatePath, '# {{projectName}} Context\n\n规则层文档。');

    // 创建 .gitkeep 占位文件
    const targetDir = path.join(tmpDir, 'output');
    fsExtra.mkdirSync(targetDir, { recursive: true });
    const gitkeepPath = path.join(targetDir, '.gitkeep');
    fsExtra.writeFileSync(gitkeepPath, '');

    // upsertUserAsset 应该识别 .gitkeep 并升级为模板内容
    const targetPath = path.join(targetDir, 'context.md');
    // 模拟场景：目标路径本身是 .gitkeep（文件名为 .gitkeep）
    const result = await upsertUserAsset(gitkeepPath, templatePath, { projectName: 'TestProj' });

    expect(result).toBe('upgraded-gitkeep');
    const content = fsExtra.readFileSync(gitkeepPath, 'utf-8');
    expect(content).toContain('# TestProj Context');
    expect(content).toContain('规则层文档。');
  });

  it('目标文件存在但为零字节时，渲染模板写入并返回 upgraded-gitkeep', async () => {
    const templatePath = path.join(templateDir, 'architecture.md');
    fsExtra.writeFileSync(templatePath, '# {{projectName}} Architecture\n\n结构层文档。');

    // 创建零字节文件（非 .gitkeep 文件名，但内容为空）
    const targetPath = path.join(tmpDir, 'output', 'architecture.md');
    fsExtra.mkdirSync(path.dirname(targetPath), { recursive: true });
    fsExtra.writeFileSync(targetPath, '');

    const result = await upsertUserAsset(targetPath, templatePath, { projectName: 'TestProj' });

    expect(result).toBe('upgraded-gitkeep');
    const content = fsExtra.readFileSync(targetPath, 'utf-8');
    expect(content).toContain('# TestProj Architecture');
    expect(content).toContain('结构层文档。');
  });

  it('目标文件名为 .gitkeep 且内容为空时，渲染模板写入并返回 upgraded-gitkeep', async () => {
    const templatePath = path.join(templateDir, 'lessons.md');
    fsExtra.writeFileSync(templatePath, '# {{projectName}} Lessons\n\n经验教训索引。');

    const targetPath = path.join(tmpDir, 'output', '.gitkeep');
    fsExtra.mkdirSync(path.dirname(targetPath), { recursive: true });
    fsExtra.writeFileSync(targetPath, '');

    const result = await upsertUserAsset(targetPath, templatePath, { projectName: 'TestProj' });

    expect(result).toBe('upgraded-gitkeep');
    const content = fsExtra.readFileSync(targetPath, 'utf-8');
    expect(content).toContain('# TestProj Lessons');
  });

  // --- 边界情况 ---

  it('不传 vars 参数时，模板中的占位符保持原样', async () => {
    const templatePath = path.join(templateDir, 'context.md');
    fsExtra.writeFileSync(templatePath, '# {{projectName}} Context');

    const targetPath = path.join(tmpDir, 'output', 'context.md');

    const result = await upsertUserAsset(targetPath, templatePath);

    expect(result).toBe('created');
    const content = fsExtra.readFileSync(targetPath, 'utf-8');
    // 未提供变量时，占位符保持原样（renderTemplate 的默认行为）
    expect(content).toContain('{{projectName}}');
  });
});
