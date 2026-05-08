export const SPECFORGE_DIR = '.specforge';
export const SPECFORGE_USER_DIR = 'specforge';

// 框架资产子目录
export const COMMANDS_DIR = 'commands';
export const WORKFLOW_COMMANDS_DIR = 'workflow';
export const TOOL_COMMANDS_DIR = 'tools';
export const SKILLS_DIR = 'skills';
export const TEMPLATES_DIR = 'templates';
export const CONSTITUTION_FILE = 'constitution.md';

// 用户资产子目录
export const CONTEXT_DIR = 'context';
export const BRAINSTORMING_DIR = 'brainstorming';
export const CHANGES_DIR = 'changes';
export const ARCHIVE_DIR = 'archive';

// 文件
export const PROJECT_MD_FILE = 'project.md';
export const CONFIG_YAML_FILE = 'config.yaml';
export const GITKEEP_FILE = '.gitkeep';
export const SPECFORGE_JSON_FILE = '.specforge.json';

// 技能类别目录名（按 type 值分组）
export const SKILL_CATEGORY_DIRS: Record<string, string> = {
  'domain-rule': 'domain-rules',
  'code-style': 'code-styles',
  'architecture-rule': 'architecture',
  'testing-rule': 'testing',
  'security-rule': 'security',
  'ui-ux-rule': 'ui-ux',
  'workflow-step': 'workflow-steps',
};

export const DEFAULT_SKILL_CATEGORIES = Object.values(SKILL_CATEGORY_DIRS);
