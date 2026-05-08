import { z } from 'zod';
import { isCommandType } from './type-values.js';

// ---------------------------------------------------------------------------
// 统一 5 字段基础 Schema
//
// 所有产物（命令、技能、头脑风暴、变更）的 frontmatter 都以此为基础。
// 这 5 个字段确保元数据具备最小可发现性：名称、分类、描述、版本、作者。
// ---------------------------------------------------------------------------

export const unifiedMetadataSchema = z.object({
  /** 产物名称 */
  name: z.string().min(1),
  /** 产物类型 */
  type: z.string().min(1),
  /** 简要描述 */
  description: z.string(),
  /** 语义化版本 */
  version: z.string(),
  /** 作者标识 */
  author: z.string(),
});

// ---------------------------------------------------------------------------
// 命令元数据 Schema
//
// 基于统一 Schema，通过 .refine() 约束 type 必须以 -command 结尾。
// 使用 isCommandType() 做结构性判断（基于命名约定，不要求在注册表中）。
// ---------------------------------------------------------------------------

export const commandMetadataSchema = unifiedMetadataSchema.refine(
  (data) => isCommandType(data.type),
  { message: '命令的 type 必须以 -command 结尾' },
);

// ---------------------------------------------------------------------------
// 技能元数据 Schema
//
// 基于统一 Schema，通过 .refine() 约束 type 不能以 -command 结尾。
// ---------------------------------------------------------------------------

export const skillMetadataSchema = unifiedMetadataSchema.refine(
  (data) => !isCommandType(data.type),
  { message: '技能的 type 不能以 -command 结尾' },
);

// ---------------------------------------------------------------------------
// 头脑风暴元数据 Schema（替换原 specMetadataSchema）
//
// 用于描述头脑风暴产物（如 spec 文档），包含状态、归属和时间信息。
// ---------------------------------------------------------------------------

export const brainstormMetadataSchema = z.object({
  /** 规格唯一标识 */
  spec_id: z.string(),
  /** 标题 */
  title: z.string(),
  /** 规划日期 (YYYY-MM-DD) */
  date: z.string(),
  /** 规格状态 */
  status: z.enum(['draft', 'executing', 'completed']),
  /** 负责人 */
  owner: z.string(),
  /** 来源命令 ID（可选） */
  source_command: z.string().optional(),
  /** 标签（可选） */
  tags: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// 变更元数据 Schema
//
// 描述变更提案的元数据，包含阶段、工作树、产物和审计时间戳。
// ---------------------------------------------------------------------------

export const changeMetadataSchema = z.object({
  /** 变更唯一标识 */
  changeId: z.string(),
  /** 变更状态 */
  status: z.enum(['draft', 'executing', 'completed']),
  /** 变更阶段 */
  phase: z.enum([
    'proposal',
    'design',
    'tasks',
    'quality',
    'release',
    'evolution',
  ]),
  /** 关联的 git worktree 信息 */
  worktree: z
    .object({
      branch: z.string(),
      rootPath: z.string(),
      changePath: z.string(),
    })
    .optional(),
  /** 产物路径 */
  artifacts: z
    .object({
      proposal: z.string().optional(),
      design: z.string().optional(),
      tasks: z.string().optional(),
      qualityReport: z.string().optional(),
      retrospective: z.string().optional(),
    })
    .optional(),
  /** 审计时间戳 */
  timestamps: z
    .object({
      createdAt: z.string(),
      updatedAt: z.string(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// TypeScript 类型导出
// ---------------------------------------------------------------------------

export type UnifiedMetadata = z.infer<typeof unifiedMetadataSchema>;
export type CommandMetadata = z.infer<typeof commandMetadataSchema>;
export type SkillMetadata = z.infer<typeof skillMetadataSchema>;
export type BrainstormMetadata = z.infer<typeof brainstormMetadataSchema>;
export type ChangeMetadata = z.infer<typeof changeMetadataSchema>;
