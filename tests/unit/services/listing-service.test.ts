import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { ListingService } from '../../../src/services/listing-service.js';

describe('ListingService', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-list-'));
    // 搭建测试用的 .specforge/ 结构
    const cmdDir = path.join(tmpDir, '.specforge', 'commands', 'workflow', 'design-explore');
    fsExtra.ensureDirSync(cmdDir);
    fsExtra.writeFileSync(
      path.join(cmdDir, 'design-explore.md'),
      `---
name: design-explore
type: workflow-command
description: >-
  基于已批准方案进行严格的架构与技术设计。设计、架构、对比。
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
  API 接口契约设计规范——定义 RESTful 接口标准。
version: "1.0.0"
author: "wta"
---

# api-contract
`,
    );

    fsExtra.ensureDirSync(path.join(skillDir, 'references'));
    fsExtra.writeFileSync(
      path.join(skillDir, 'references', 'frontmatter-spec.md'),
      '# reference doc\n',
    );
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  describe('listCommands', () => {
    it('返回以 -command 结尾的 type', async () => {
      const service = new ListingService();
      const commands = await service.listCommands(tmpDir);
      expect(commands.length).toBeGreaterThanOrEqual(1);
      expect(commands[0].type.endsWith('-command')).toBe(true);
    });

    it('可按 --type 筛选', async () => {
      const service = new ListingService();
      const commands = await service.listCommands(tmpDir, { type: 'workflow-command' });
      expect(commands.every(c => c.type === 'workflow-command')).toBe(true);
    });
  });

  describe('listSkills', () => {
    it('返回不以 -command 结尾的 type', async () => {
      const service = new ListingService();
      const skills = await service.listSkills(tmpDir);
      expect(skills.length).toBeGreaterThanOrEqual(1);
      expect(skills[0].type.endsWith('-command')).toBe(false);
      expect(skills.every((skill) => skill.path.endsWith('SKILL.md'))).toBe(true);
    });

    it('忽略 references 下的其他 md 文件', async () => {
      const service = new ListingService();
      const skills = await service.listSkills(tmpDir);
      expect(skills).toHaveLength(1);
    });

    it('可按 --triggers 关键词匹配 description', async () => {
      const service = new ListingService();
      const skills = await service.listSkills(tmpDir, {
        triggers: ['接口', '契约'],
      });
      expect(skills.length).toBeGreaterThanOrEqual(1);
    });

    it('不匹配的触发词返回空', async () => {
      const service = new ListingService();
      const skills = await service.listSkills(tmpDir, {
        triggers: ['nonexistent-xyz'],
      });
      expect(skills.length).toBe(0);
    });
  });
});
