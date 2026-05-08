import { ListingService } from '../services/listing-service.js';
import { logger } from '../utils/logger.js';
import { resolveProjectRoot } from '../utils/path.js';

export type ListOutputFormat = 'xml' | 'json' | 'text';

export interface ListCommandOptions {
  format?: ListOutputFormat;
  commands?: boolean;
  skills?: boolean;
  type?: string;
  triggers?: string;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\'':
        return '&apos;';
      default:
        return char;
    }
  });
}

function renderXmlItem(tag: string, item: {
  name: string;
  type: string;
  description: string;
  version: string;
  author: string;
  path: string;
}): string {
  return [
    `    <${tag}>`,
    `      <name>${escapeXml(item.name)}</name>`,
    `      <type>${escapeXml(item.type)}</type>`,
    `      <description>${escapeXml(item.description)}</description>`,
    `      <version>${escapeXml(item.version)}</version>`,
    `      <author>${escapeXml(item.author)}</author>`,
    `      <path>${escapeXml(item.path)}</path>`,
    `    </${tag}>`,
  ].join('\n');
}

function renderXmlSection(
  tag: string,
  itemTag: string,
  items: Array<{
    name: string;
    type: string;
    description: string;
    version: string;
    author: string;
    path: string;
  }>,
): string {
  if (items.length === 0) {
    return `  <${tag} count="0" />`;
  }

  const body = items.map((item) => renderXmlItem(itemTag, item)).join('\n');
  return `  <${tag} count="${items.length}">\n${body}\n  </${tag}>`;
}

function renderXmlOutput(
  commands: Array<{
    name: string;
    type: string;
    description: string;
    version: string;
    author: string;
    path: string;
  }>,
  skills: Array<{
    name: string;
    type: string;
    description: string;
    version: string;
    author: string;
    path: string;
  }>,
  showCommands: boolean,
  showSkills: boolean,
): string {
  const sections: string[] = [];

  if (showCommands) {
    sections.push(renderXmlSection('commands', 'command', commands));
  }

  if (showSkills) {
    sections.push(renderXmlSection('skills', 'skill', skills));
  }

  return ['<specforge-list>', ...sections, '</specforge-list>'].join('\n');
}

function renderTextOutput(
  commands: Array<{
    name: string;
    type: string;
    description: string;
  }>,
  skills: Array<{
    name: string;
    type: string;
    description: string;
  }>,
): string {
  const lines: string[] = [];

  if (commands.length > 0) {
    lines.push('命令 (type 以 -command 结尾):');
    for (const cmd of commands) {
      lines.push(`  ${cmd.name}  [${cmd.type}]`);
      if (cmd.description) lines.push(`    ${cmd.description}`);
    }
  }

  if (skills.length > 0) {
    lines.push('技能 (type 不以 -command 结尾):');
    for (const skill of skills) {
      lines.push(`  [${skill.type}] ${skill.name}`);
      if (skill.description) lines.push(`    ${skill.description}`);
    }
  }

  return lines.join('\n');
}

export class ListCommand {
  async execute(projectRoot?: string, options?: ListCommandOptions): Promise<void> {
    const root = resolveProjectRoot(projectRoot);
    const listingService = new ListingService();

    const filterOpts = {
      type: options?.type,
      triggers: options?.triggers ? options.triggers.split(',').map(s => s.trim()) : undefined,
    };

    const showCommands = options?.commands || (!options?.commands && !options?.skills);
    const showSkills = options?.skills || (!options?.commands && !options?.skills);

    const [commands, skills] = await Promise.all([
      showCommands ? listingService.listCommands(root, filterOpts) : Promise.resolve([]),
      showSkills ? listingService.listSkills(root, filterOpts) : Promise.resolve([]),
    ]);

    if (options?.format === 'json') {
      console.log(JSON.stringify({ commands, skills }, null, 2));
      return;
    }

    if ((options?.format ?? 'xml') === 'text') {
      if (commands.length === 0 && skills.length === 0) {
        logger.info('没有找到匹配的命令或技能。运行 "specforge init" 初始化。');
        return;
      }

      const text = renderTextOutput(commands, skills);
      console.log(text);
      return;
    }

    const xml = renderXmlOutput(commands, skills, showCommands, showSkills);
    if (commands.length === 0 && skills.length === 0) {
      console.log(xml);
      return;
    }

    console.log(xml);
  }
}
