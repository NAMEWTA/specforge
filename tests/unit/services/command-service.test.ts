import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { CommandService } from '../../../src/services/command-service.js';

describe('CommandService', () => {
  let tmpDir: string;
  let specforgeDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(
      path.join(os.tmpdir(), 'specforge-cmd-test-'),
    );
    specforgeDir = path.join(tmpDir, '.specforge');
    fsExtra.ensureDirSync(path.join(specforgeDir, 'commands', 'workflow'));
    fsExtra.ensureDirSync(path.join(specforgeDir, 'commands', 'tools'));
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  it('创建 workflow-command 命令文件', async () => {
    const service = new CommandService();
    const cmdDir = await service.generateCommand(tmpDir, {
      type: 'workflow-command',
      name: 'test-command',
    });

    expect(fsExtra.existsSync(cmdDir)).toBe(true);
    const mdPath = path.join(cmdDir, 'test-command.md');
    expect(fsExtra.existsSync(mdPath)).toBe(true);

    const content = fsExtra.readFileSync(mdPath, 'utf-8');
    expect(content).toContain('name: test-command');
    expect(content).toContain('type: workflow-command');
    expect(content).toContain('preamble:bash');
    expect(content).toContain('specforge list --skills');
  });

  it('创建 tool-command 命令文件', async () => {
    const service = new CommandService();
    const cmdDir = await service.generateCommand(tmpDir, {
      type: 'tool-command',
      name: 'my-tool',
    });

    const mdPath = path.join(cmdDir, 'my-tool.md');
    expect(fsExtra.existsSync(mdPath)).toBe(true);

    const content = fsExtra.readFileSync(mdPath, 'utf-8');
    expect(content).toContain('type: tool-command');
  });

  it('workflow-command 生成到 commands/workflow/ 下', async () => {
    const service = new CommandService();
    const cmdDir = await service.generateCommand(tmpDir, {
      type: 'workflow-command',
      name: 'workflow-test',
    });

    expect(cmdDir).toContain('workflow');
    expect(cmdDir).toContain('workflow-test');
  });

  it('tool-command 生成到 commands/tools/ 下', async () => {
    const service = new CommandService();
    const cmdDir = await service.generateCommand(tmpDir, {
      type: 'tool-command',
      name: 'tool-test',
    });

    expect(cmdDir).toContain('tools');
    expect(cmdDir).toContain('tool-test');
  });

  it('无效命令类型抛出错误', async () => {
    const service = new CommandService();
    await expect(
      service.generateCommand(tmpDir, {
        type: 'invalid-type',
        name: 'test-cmd',
      }),
    ).rejects.toThrow('无效的命令类型');
  });

  it('无效命令名（非 kebab-case）抛出错误', async () => {
    const service = new CommandService();
    await expect(
      service.generateCommand(tmpDir, {
        type: 'workflow-command',
        name: 'InvalidName',
      }),
    ).rejects.toThrow('无效的命令名');
  });

  it('已知 workflow 命令名使用匹配的 preamble 触发词', async () => {
    const service = new CommandService();
    const cmdDir = await service.generateCommand(tmpDir, {
      type: 'workflow-command',
      name: 'requirements-clarify',
    });

    const mdPath = path.join(cmdDir, 'requirements-clarify.md');
    const content = fsExtra.readFileSync(mdPath, 'utf-8');
    // requirements-clarify 应使用 clarify,specify,brainstorm,requirements 作为触发词
    expect(content).toContain('triggers=clarify,specify,brainstorm,requirements');
    expect(content).toContain('status --phase=requirements');
  });

  it('已知 tool 命令名使用匹配的 preamble 触发词', async () => {
    const service = new CommandService();
    const cmdDir = await service.generateCommand(tmpDir, {
      type: 'tool-command',
      name: 'debugging',
    });

    const mdPath = path.join(cmdDir, 'debugging.md');
    const content = fsExtra.readFileSync(mdPath, 'utf-8');
    // debugging 应使用 debug,bug,fix,排查,调试 作为触发词
    expect(content).toContain('triggers=debug,bug,fix');
  });

  it('release-deploy 命令包含合并后的 runbook/monitor 触发词（v0.2.0 operations 合并）', async () => {
    const service = new CommandService();
    const cmdDir = await service.generateCommand(tmpDir, {
      type: 'workflow-command',
      name: 'release-deploy',
    });

    const mdPath = path.join(cmdDir, 'release-deploy.md');
    const content = fsExtra.readFileSync(mdPath, 'utf-8');
    expect(content).toContain('triggers=release,deploy,ship,publish,runbook,monitor');
    expect(content).toContain('status --phase=release');
  });

  it('未注册的 workflow 命令名走 fallback 触发词', async () => {
    const service = new CommandService();
    const cmdDir = await service.generateCommand(tmpDir, {
      type: 'workflow-command',
      name: 'custom-phase-action',
    });

    const mdPath = path.join(cmdDir, 'custom-phase-action.md');
    const content = fsExtra.readFileSync(mdPath, 'utf-8');
    // fallback：triggers=workflow, phase=requirements
    expect(content).toContain('triggers=workflow');
    expect(content).toContain('status --phase=requirements');
  });
});

