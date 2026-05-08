/**
 * SpecForge Profile 系统（借鉴 OpenSpec Core/Custom Profile）
 *
 * Profile 决定 init 时生成哪些 workflow command 目录、status 时按什么顺序展示阶段。
 * 三个内置 profile：
 * - minimal：最小可用集合（适合快速原型 / POC）
 * - standard：8 阶段全启（默认）
 * - custom：从项目 config.yaml 的 profile.enabledPhases 字段读取
 */

import { z } from 'zod';
import { LIFECYCLE_TYPES, type LifecycleType } from './lifecycle-types.js';

export const PROFILE_NAMES = ['minimal', 'standard', 'custom'] as const;
export type ProfileName = (typeof PROFILE_NAMES)[number];

export interface Profile {
  name: ProfileName;
  description: string;
  enabledPhases: readonly LifecycleType[];
}

/** 内置 profile 定义 */
export const BUILTIN_PROFILES: Record<Exclude<ProfileName, 'custom'>, Profile> = {
  minimal: {
    name: 'minimal',
    description: '最小可用集合：仅核心 5 阶段，适合快速原型 / POC',
    enabledPhases: ['foundation', 'requirements', 'implementation', 'quality', 'release'],
  },
  standard: {
    name: 'standard',
    description: '默认完整 8 阶段：foundation→requirements→design→planning→implementation→quality→release→evolution',
    enabledPhases: LIFECYCLE_TYPES,
  },
};

/** 默认 profile（必须是内置 profile，不可为 custom） */
export const DEFAULT_PROFILE_NAME: Exclude<ProfileName, 'custom'> = 'standard';

/** profile 配置 schema（用于 config.yaml 解析） */
export const profileConfigSchema = z.object({
  name: z.enum(PROFILE_NAMES),
  enabledPhases: z
    .array(z.enum(LIFECYCLE_TYPES))
    .optional()
    .describe('仅当 name=custom 时使用'),
});

export type ProfileConfig = z.infer<typeof profileConfigSchema>;

/**
 * 解析项目 profile：
 * - 给定 profileConfig（来自 config.yaml）则按其解析；
 * - 否则返回默认 standard。
 */
export function resolveProfile(profileConfig?: ProfileConfig | null): Profile {
  if (!profileConfig) {
    return BUILTIN_PROFILES[DEFAULT_PROFILE_NAME];
  }

  if (profileConfig.name === 'custom') {
    if (!profileConfig.enabledPhases || profileConfig.enabledPhases.length === 0) {
      throw new Error(
        'profile.name=custom 时必须显式声明 profile.enabledPhases（非空数组）',
      );
    }
    return {
      name: 'custom',
      description: '自定义 profile（按 config.yaml 声明）',
      enabledPhases: profileConfig.enabledPhases,
    };
  }

  // profileConfig.name 已收窄为 'minimal' | 'standard'
  const builtinName = profileConfig.name as Exclude<ProfileName, 'custom'>;
  return BUILTIN_PROFILES[builtinName];
}

/**
 * 从 config.yaml 解析的原始对象中提取 profile（容错：缺失/格式错误时回退默认）。
 * 调用方负责传入已 yaml.parse() 的对象，本函数只做形状校验。
 */
export function parseProfileFromConfig(rawConfig: unknown): ProfileConfig | null {
  if (!rawConfig || typeof rawConfig !== 'object') return null;
  const profile = (rawConfig as Record<string, unknown>).profile;
  if (!profile) return null;

  const parsed = profileConfigSchema.safeParse(profile);
  if (!parsed.success) return null;
  return parsed.data;
}

/** 判断给定阶段是否在 profile 中启用 */
export function isPhaseEnabled(profile: Profile, phase: LifecycleType): boolean {
  return profile.enabledPhases.includes(phase);
}
