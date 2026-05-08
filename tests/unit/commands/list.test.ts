import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { ListCommand } from '../../../src/commands/list.js';

describe('ListCommand', () => {
  let tmpDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-list-cmd-'));
    const cmdDir = path.join(tmpDir, '.specforge', 'commands', 'workflow', 'design-explore');
    fsExtra.ensureDirSync(cmdDir);
    fsExtra.writeFileSync(
      path.join(cmdDir, 'design-explore.md'),
      `---
name: design-explore
type: workflow-command
description: >-
  架构与技术设计，支持 <xml> & special characters.
version: "1.0.0"
author: "wta"
---

# design-explore
`,
    );

    const skillDir = path.join(tmpDir, '.specforge', 'skills', 'architecture', 'api-contract');
    fsExtra.ensureDirSync(skillDir);
    fsExtra.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      `---
name: api-contract
type: architecture-rule
description: >-
  API 接口契约设计规范，包含 &、<、> 等特殊字符。
version: "1.0.0"
author: "wta"
---

# api-contract
`,
    );

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fsExtra.removeSync(tmpDir);
  });

  it('默认以 XML 输出命令和技能', async () => {
    const command = new ListCommand();
    await command.execute(tmpDir);

    const output = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('<specforge-list>');
    expect(output).toContain('<commands count="1">');
    expect(output).toContain('<skills count="1">');
    expect(output).toContain('&lt;xml&gt; &amp; special characters.');
    expect(output).toContain('&amp;、&lt;、&gt;');
  });

  it('支持 text 格式兼容旧输出', async () => {
    const command = new ListCommand();
    await command.execute(tmpDir, { format: 'text' });

    const output = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('命令 (type 以 -command 结尾):');
    expect(output).toContain('技能 (type 不以 -command 结尾):');
  });
});
