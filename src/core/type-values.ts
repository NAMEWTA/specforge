/**
 * SpecForge 统一类型值常量
 *
 * 定义所有命令类型和技能类型的字面值、派生类型及判断函数。
 * 命令类型以 -command 结尾，技能类型不以 -command 结尾。
 */

// ---------------------------------------------------------------------------
// 命令类型常量 — 所有命令类型以 -command 结尾
// ---------------------------------------------------------------------------

export const COMMAND_TYPES = [
  'workflow-command', // 生命周期阶段命令
  'tool-command', // 独立工具命令
  'devflow-command', // 预留：开发流程命令
  'gitflow-command', // 预留：Git 流程命令
] as const;

// ---------------------------------------------------------------------------
// 技能类型常量 — 所有技能类型不以 -command 结尾
// ---------------------------------------------------------------------------

export const SKILL_TYPES = [
  'domain-rule', // 领域规则
  'code-style', // 编码风格
  'architecture-rule', // 架构决策
  'testing-rule', // 测试策略
  'security-rule', // 安全规范
  'ui-ux-rule', // 界面体验
  'workflow-step', // 工作流步骤
] as const;

// ---------------------------------------------------------------------------
// 派生类型
// ---------------------------------------------------------------------------

/** 命令类型联合 */
export type CommandType = (typeof COMMAND_TYPES)[number];

/** 技能类型联合 */
export type SkillType = (typeof SKILL_TYPES)[number];

/** SpecForge 中所有已知类型值 */
export type SpecForgeType = CommandType | SkillType;

// ---------------------------------------------------------------------------
// 结构性判断（基于命名约定）
// ---------------------------------------------------------------------------

/**
 * 判断值是否命令类型（以 -command 结尾）
 * 这是基于命名约定的结构性检查，不验证值是否在 COMMAND_TYPES 中
 */
export function isCommandType(value: string): boolean {
  return value.endsWith('-command');
}

/**
 * 判断值是否技能类型（不以 -command 结尾）
 * 这是基于命名约定的结构性检查，与 isCommandType 对称
 */
export function isSkillType(value: string): boolean {
  return !value.endsWith('-command');
}

// ---------------------------------------------------------------------------
// 有效性验证（基于已知类型注册表）
// ---------------------------------------------------------------------------

/** 判断值是否已知的有效类型（命令或技能） */
export function isValidType(value: string): value is SpecForgeType {
  return isValidCommandType(value) || isValidSkillType(value);
}

/** 判断值是否有效的命令类型值（在 COMMAND_TYPES 注册表中） */
export function isValidCommandType(value: string): value is CommandType {
  return (COMMAND_TYPES as readonly string[]).includes(value);
}

/** 判断值是否有效的技能类型值（在 SKILL_TYPES 注册表中） */
export function isValidSkillType(value: string): value is SkillType {
  return (SKILL_TYPES as readonly string[]).includes(value);
}
