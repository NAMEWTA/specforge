import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { ScaffoldService } from '../../src/services/scaffold-service.js';
import { ListingService } from '../../src/services/listing-service.js';
import { StatusService } from '../../src/services/status-service.js';

const WORKFLOW_COMMANDS = [
  'foundation-init',
  'requirements-clarify',
  'design-explore',
  'planning-breakdown',
  'implementation-build',
  'quality-verify',
  'release-deploy',
  'evolution-retrospect',
];

describe('full 8-phase lifecycle integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-lifecycle-'));
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  it('初始化后生成 8 阶段命令、排除 operations-monitor，并可查询 list/status', async () => {
    const scaffold = new ScaffoldService();
    await scaffold.execute(tmpDir, { projectName: 'LifecycleTest' });

    const workflowDir = path.join(tmpDir, '.specforge', 'commands', 'workflow');
    const generated = fsExtra.readdirSync(workflowDir).sort();

    for (const command of WORKFLOW_COMMANDS) {
      expect(generated).toContain(command);
      expect(
        fsExtra.existsSync(path.join(workflowDir, command, `${command}.md`)),
      ).toBe(true);
    }
    expect(generated).not.toContain('operations-monitor');

    const listing = new ListingService();
    const commands = await listing.listCommands(tmpDir, { type: 'workflow-command' });
    const commandNames = commands.map((cmd) => cmd.name);

    for (const command of WORKFLOW_COMMANDS) {
      expect(commandNames).toContain(command);
    }
    expect(commandNames).not.toContain('operations-monitor');

    const status = new StatusService();
    const graph = await status.getArtifactGraphStatus(tmpDir);
    expect(graph.map((entry) => entry.id)).toEqual([
      'proposal',
      'design',
      'tasks',
      'quality-report',
      'archive',
      'retrospective',
    ]);

    const phaseStatus = await status.getStatus(tmpDir);
    expect(phaseStatus.phases.map((phase) => phase.phase)).toEqual([
      'foundation',
      'requirements',
      'design',
      'planning',
      'implementation',
      'quality',
      'release',
      'evolution',
    ]);
  });
});
