import {
  COMMANDS_DIR,
  SPECFORGE_DIR,
  WORKFLOW_COMMANDS_DIR,
  TOOL_COMMANDS_DIR,
} from '../core/constants.js';
import { isValidCommandType } from '../core/type-values.js';
import { ensureDirectory, writeFile } from '../utils/fs.js';
import { joinPath } from '../utils/path.js';

// ---------------------------------------------------------------------------
// 命令触发词与阶段映射
// 根据命令名称动态生成匹配的 preamble
// ---------------------------------------------------------------------------

interface CommandPreambleConfig {
  triggers: string;
  phase?: string;
}

const WORKFLOW_TRIGGER_MAP: Record<string, CommandPreambleConfig> = {
  'foundation-init': {
    triggers: 'init,foundation,project,setup',
  },
  'requirements-clarify': {
    triggers: 'clarify,specify,brainstorm,requirements',
    phase: 'requirements',
  },
  'design-explore': {
    triggers: 'architecture,design,interface,contract',
    phase: 'design',
  },
  'planning-breakdown': {
    triggers: 'tasks,breakdown,planning,complexity',
    phase: 'planning',
  },
  'implementation-build': {
    triggers: 'implement,subagent,tdd,build',
    phase: 'implementation',
  },
  'quality-verify': {
    triggers: 'verify,test,review,checklist,qa',
    phase: 'quality',
  },
  'release-deploy': {
    triggers: 'release,deploy,ship,publish,runbook,monitor',
    phase: 'release',
  },
  'evolution-retrospect': {
    triggers: 'retrospective,learn,improve,evolve,tune',
    phase: 'evolution',
  },
};

const TOOL_TRIGGER_MAP: Record<string, CommandPreambleConfig> = {
  debugging: {
    triggers: 'debug,bug,fix,排查,调试',
  },
  documentation: {
    triggers: '文档,规范,documentation,写作',
  },
};

function getPreambleConfig(
  type: string,
  name: string,
): CommandPreambleConfig {
  if (type === 'workflow-command') {
    return (
      WORKFLOW_TRIGGER_MAP[name] ?? {
        triggers: 'workflow',
        phase: 'requirements',
      }
    );
  }
  if (type === 'tool-command') {
    return (
      TOOL_TRIGGER_MAP[name] ?? {
        triggers: 'tool',
      }
    );
  }
  return { triggers: 'general' };
}

function buildFrontmatter(
  name: string,
  type: string,
  description: string,
): string {
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

function buildPreambleBlock(config: CommandPreambleConfig): string {
  const lines: string[] = [];
  lines.push('<!-- preamble:bash');
  lines.push(
    `specforge list --skills --triggers=${config.triggers} --format=json`,
  );
  if (config.phase) {
    lines.push(
      `specforge status --phase=${config.phase} --check-requires`,
    );
  }
  lines.push('specforge doctor --check-deps --quiet');
  lines.push('-->');
  return lines.join('\n');
}

function buildBody(config: CommandPreambleConfig, commandName: string): string {
  const preamble = buildPreambleBlock(config);
  return `
${preamble}

# ${commandName}

## Step 1: 准备上下文

- [ ] 确认项目 \`specforge/project.md\` 存在
- [ ] 收集现有 \`specforge/context/\` 下的上下文资料
- [ ] 加载相关技能文件

## Step 2: 执行步骤

- [ ] 按本命令的阶段要求执行具体操作
- [ ] 如需交互确认，使用 AskUserQuestion

## Step 3: 生成产物

- [ ] 创建或更新阶段产物文档
- [ ] 更新 \`.specforge.json\` 中的 phase 和 artifacts

## Step 4: 完成衔接

- [ ] 标记当前阶段完成
- [ ] 提示下一阶段命令
`;
}

export interface GenerateCommandOptions {
  type: string;
  name: string;
  description?: string;
}

export class CommandService {
  async generateCommand(
    projectRoot: string,
    options: GenerateCommandOptions,
  ): Promise<string> {
    if (!isValidCommandType(options.type)) {
      throw new Error(
        `无效的命令类型 "${options.type}"。有效值: workflow-command, tool-command`,
      );
    }

    if (!/^[a-z][a-z0-9-]*$/.test(options.name)) {
      throw new Error(
        `无效的命令名 "${options.name}"。使用 kebab-case: 小写字母、数字、连字符`,
      );
    }

    const commandsDir = joinPath(projectRoot, SPECFORGE_DIR, COMMANDS_DIR);
    let subDir: string;

    if (options.type === 'workflow-command') {
      subDir = WORKFLOW_COMMANDS_DIR;
    } else if (options.type === 'tool-command') {
      subDir = TOOL_COMMANDS_DIR;
    } else {
      subDir = WORKFLOW_COMMANDS_DIR;
    }

    const cmdDir = joinPath(commandsDir, subDir, options.name);
    await ensureDirectory(cmdDir);

    const description =
      options.description ?? `${options.name} — SpecForge 命令`;
    const frontmatter = buildFrontmatter(
      options.name,
      options.type,
      description,
    );
    const config = getPreambleConfig(options.type, options.name);
    const body = buildBody(config, options.name);
    const mdPath = joinPath(cmdDir, `${options.name}.md`);
    await writeFile(mdPath, frontmatter + body);

    return cmdDir;
  }
}
