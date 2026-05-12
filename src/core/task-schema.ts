import { z } from 'zod';

// ============================================================
// TaskDef Schema — 任务定义的 read/write 边界声明
// ============================================================

/**
 * 任务定义 schema，对应 TASKS.md 中每个任务块的结构化字段。
 * `read_files` 为参考边界（允许读取），`write_files` 为修改边界（允许写入）。
 */
export const TaskDefSchema = z.object({
  /** 参考边界：允许 grep/read 的文件路径或 glob 模式 */
  read_files: z.array(z.string()).optional(),
  /** 修改边界：允许 write 的文件路径或 glob 模式 */
  write_files: z.array(z.string()),
});

export type TaskDef = z.infer<typeof TaskDefSchema>;
