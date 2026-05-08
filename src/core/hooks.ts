/**
 * SpecForge 扩展钩子系统（spec-kit 风格）
 *
 * 模型：在 `.specforge/extensions.yaml` 声明 before/after_<phase> 钩子，
 *      由 `specforge run-hook --phase <name> --stage before|after` 在命令体内的 preamble 中触发。
 */

import { z } from 'zod';
import { LIFECYCLE_TYPES } from './lifecycle-types.js';

export const HOOK_STAGES = ['before', 'after'] as const;
export type HookStage = (typeof HOOK_STAGES)[number];

const hookEntrySchema = z.object({
  name: z.string().min(1).describe('钩子可读名称'),
  command: z.string().min(1).describe('要执行的 shell 命令'),
  enabled: z.boolean().default(true),
  /** 失败是否阻断（false=失败仅 warn，不影响整体退出码） */
  optional: z.boolean().default(false),
  /** 钩子超时时间（毫秒），缺省 30s */
  timeoutMs: z.number().int().positive().optional(),
});

export type HookEntry = z.infer<typeof hookEntrySchema>;

/** hooks schema：键名形如 before_requirements / after_release */
function buildHooksKey(stage: HookStage, phase: string): string {
  return `${stage}_${phase}`;
}

/**
 * 完整 extensions.yaml schema
 *
 * 仅声明 hooks 段；后续可扩展更多扩展类型。
 */
export const extensionsSchema = z.object({
  hooks: z.record(z.string(), z.array(hookEntrySchema)).optional(),
});

export type ExtensionsConfig = z.infer<typeof extensionsSchema>;

/**
 * 从 yaml 解析后的对象提取扩展配置（容错）
 */
export function parseExtensionsConfig(rawConfig: unknown): ExtensionsConfig {
  if (!rawConfig || typeof rawConfig !== 'object') return {};
  const parsed = extensionsSchema.safeParse(rawConfig);
  if (!parsed.success) return {};
  return parsed.data;
}

/**
 * 取出某阶段某 stage 的钩子（仅 enabled=true）
 */
export function selectHooks(
  cfg: ExtensionsConfig,
  phase: string,
  stage: HookStage,
): HookEntry[] {
  if (!cfg.hooks) return [];
  const key = buildHooksKey(stage, phase);
  const list = cfg.hooks[key];
  if (!Array.isArray(list)) return [];
  return list.filter((h) => h.enabled !== false);
}

/**
 * 校验 phase 是否有效（沿用 LIFECYCLE_TYPES）
 */
export function isValidHookPhase(phase: string): boolean {
  return (LIFECYCLE_TYPES as readonly string[]).includes(phase);
}
