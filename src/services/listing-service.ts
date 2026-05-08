import path from 'node:path';
import { SPECFORGE_DIR, COMMANDS_DIR, SKILLS_DIR } from '../core/constants.js';
import { isCommandType } from '../core/type-values.js';
import { fileExists, readFile } from '../utils/fs.js';
import { joinPath } from '../utils/path.js';
import { parseYamlFrontmatter } from '../utils/yaml.js';
import { globby } from 'globby';

export interface CommandInfo {
  name: string;
  type: string;
  description: string;
  version: string;
  author: string;
  path: string;
}

export interface SkillInfo {
  name: string;
  type: string;
  description: string;
  version: string;
  author: string;
  path: string;
}

export interface ListOptions {
  type?: string;
  triggers?: string[];
}

export class ListingService {
  async listCommands(projectRoot: string, options?: ListOptions): Promise<CommandInfo[]> {
    const commandsDir = joinPath(projectRoot, SPECFORGE_DIR, COMMANDS_DIR);
    if (!(await fileExists(commandsDir))) return [];

    const files = await globby('**/*.md', { cwd: commandsDir, onlyFiles: true });
    const results: CommandInfo[] = [];

    for (const file of files) {
      const filePath = path.join(commandsDir, file);
      const content = await readFile(filePath);
      const { metadata } = parseYamlFrontmatter(content);

      if (!isCommandType(String(metadata.type ?? ''))) continue;
      if (options?.type && metadata.type !== options.type) continue;

      results.push({
        name: String(metadata.name ?? ''),
        type: String(metadata.type ?? ''),
        description: String(metadata.description ?? ''),
        version: String(metadata.version ?? '0.0.0'),
        author: String(metadata.author ?? ''),
        path: file,
      });
    }
    return results;
  }

  async listSkills(projectRoot: string, options?: ListOptions): Promise<SkillInfo[]> {
    const skillsDir = joinPath(projectRoot, SPECFORGE_DIR, SKILLS_DIR);
    if (!(await fileExists(skillsDir))) return [];

    const files = await globby('**/SKILL.md', { cwd: skillsDir, onlyFiles: true });
    const results: SkillInfo[] = [];

    for (const file of files) {
      const filePath = path.join(skillsDir, file);
      const content = await readFile(filePath);
      const { metadata } = parseYamlFrontmatter(content);

      if (isCommandType(String(metadata.type ?? ''))) continue;
      if (options?.type && metadata.type !== options.type) continue;

      const description = String(metadata.description ?? '');

      // 触发词匹配：扫描 description 字段
      if (options?.triggers && options.triggers.length > 0) {
        const matched = options.triggers.some(
          (kw) => description.includes(kw),
        );
        if (!matched) continue;
      }

      results.push({
        name: String(metadata.name ?? ''),
        type: String(metadata.type ?? ''),
        description,
        version: String(metadata.version ?? '0.0.0'),
        author: String(metadata.author ?? ''),
        path: file,
      });
    }
    return results;
  }

  async listAll(
    projectRoot: string,
    options?: ListOptions,
  ): Promise<{ commands: CommandInfo[]; skills: SkillInfo[] }> {
    const [commands, skills] = await Promise.all([
      this.listCommands(projectRoot, options),
      this.listSkills(projectRoot, options),
    ]);
    return { commands, skills };
  }
}
