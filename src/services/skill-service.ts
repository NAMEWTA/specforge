import { SPECFORGE_DIR, SKILLS_DIR, SKILL_CATEGORY_DIRS } from '../core/constants.js';
import { isValidSkillType } from '../core/type-values.js';
import { ensureDirectory, writeFile } from '../utils/fs.js';
import { joinPath } from '../utils/path.js';

export type SkillMode = 'directory' | 'single-file';

export interface GenerateSkillOptions {
  type?: string;
  mode?: SkillMode;
  description?: string;
}

function buildSkillFrontmatter(name: string, type: string, description: string): string {
  return `---
name: ${name}
type: ${type}
description: >-
  ${description}
version: "1.0.0"
author: "wta"
---
`;
}

function buildSkillBody(): string {
  return '\n# 技能描述\n\n在此处编写技能的规则、约定和触发条件。\n';
}

export class SkillService {
  async generateSkill(
    projectRoot: string,
    name: string,
    options?: GenerateSkillOptions,
  ): Promise<string> {
    const type = options?.type ?? 'domain-rule';
    if (!isValidSkillType(type)) {
      throw new Error(`无效的技能类型 "${type}"`);
    }

    const mode = options?.mode ?? 'directory';
    const categoryDir = SKILL_CATEGORY_DIRS[type] ?? 'domain-rules';
    const skillsRoot = joinPath(projectRoot, SPECFORGE_DIR, SKILLS_DIR, categoryDir);
    const description = options?.description ?? `${name} — ${type} 技能`;

    if (mode === 'directory') {
      const skillDir = joinPath(skillsRoot, name);
      await ensureDirectory(skillDir);
      const frontmatter = buildSkillFrontmatter(name, type, description);
      await writeFile(joinPath(skillDir, 'SKILL.md'), frontmatter + buildSkillBody());
      return skillDir;
    }

    await ensureDirectory(skillsRoot);
    const frontmatter = buildSkillFrontmatter(name, type, description);
    await writeFile(joinPath(skillsRoot, `${name}.md`), frontmatter + buildSkillBody());
    return joinPath(skillsRoot, `${name}.md`);
  }
}
