import { z } from 'zod';
import fsExtra from 'fs-extra';

// ============================================================
// L-NNN 编号 Schema
// ============================================================

/**
 * Lesson 编号格式：L-NNN（三位数字补零）
 */
export const LessonIdSchema = z.string().regex(/^L-\d{3}$/);

// ============================================================
// LessonEntry Schema（12 字段）
// ============================================================

/**
 * 单条 Lesson 条目的完整 schema
 * 对应 design-lessons-nomination.md § 3.1 的 12 字段定义
 */
export const LessonEntrySchema = z.object({
  /** 编号，匹配 /^L-\d{3}$/ */
  id: LessonIdSchema,
  /** 关键词 / 问题标签 */
  title: z.string().min(1),
  /** 首发 change 标识 */
  firstChangeId: z.string().min(1),
  /** 上次复核日期（YYYY-MM-DD） */
  lastReviewedAt: z.string().min(1),
  /** 适用栈（至少 1 项） */
  applicableStack: z.array(z.string()).min(1),
  /** 状态：active / archived / superseded-by:L-NNN */
  status: z.union([
    z.literal('active'),
    z.literal('archived'),
    z.string().regex(/^superseded-by:L-\d{3}$/),
  ]),
  /** 关键词列表（至少 1 项） */
  keywords: z.array(z.string()).min(1),
  /** 问题场景描述 */
  problemScenario: z.string().min(1),
  /** 当时尝试的方案 */
  triedApproaches: z.array(z.string()).min(1),
  /** 为什么不行 */
  whyFailed: z.array(z.string()).min(1),
  /** 当前推荐做法 */
  currentRecommendation: z.string().min(1),
  /** 何时重新评估 */
  whenToReevaluate: z.string().min(1),
});

export type LessonEntry = z.infer<typeof LessonEntrySchema>;

// ============================================================
// parseLessons — 从 lessons.md 内容解析条目数组
// ============================================================

/**
 * 从 lessons.md 文本内容中解析出所有 LessonEntry
 *
 * 解析策略：按 `## L-NNN` 或 `### L-NNN` 标题行分割，
 * 然后从每个块中提取结构化字段。
 *
 * @param content - lessons.md 文件的全文内容
 * @returns 解析出的条目数组（仅返回通过 schema 校验的条目）
 */
export function parseLessons(content: string): LessonEntry[] {
  const lines = content.split('\n');
  const entries: LessonEntry[] = [];

  // 定位所有 L-NNN 标题行（## 或 ### 开头）
  const headerIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^#{2,3}\s+L-\d{3}\b/.test(lines[i])) {
      headerIndices.push(i);
    }
  }

  for (let idx = 0; idx < headerIndices.length; idx++) {
    const startLine = headerIndices[idx];
    const endLine = idx + 1 < headerIndices.length ? headerIndices[idx + 1] : lines.length;
    const block = lines.slice(startLine, endLine);

    // 从标题行提取 id 和 title
    const headerMatch = block[0].match(/^#{2,3}\s+(L-\d{3})\s*[·-]?\s*(.*)/);
    if (!headerMatch) continue;

    const id = headerMatch[1];
    const title = headerMatch[2].trim();

    // 从块内容中提取字段
    const entry = parseBlock(id, title, block.slice(1));
    if (entry) {
      const result = LessonEntrySchema.safeParse(entry);
      if (result.success) {
        entries.push(result.data);
      }
    }
  }

  return entries;
}

/**
 * 从单个条目块中提取字段值
 */
function parseBlock(
  id: string,
  title: string,
  blockLines: string[],
): Record<string, unknown> | null {
  const fieldMap: Record<string, string> = {};
  const sections: Record<string, string[]> = {};

  let currentSection: string | null = null;

  for (const line of blockLines) {
    const trimmed = line.trim();

    // 检测子章节标题（### 或 ####）
    const sectionMatch = trimmed.match(/^#{3,4}\s+(.+)/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      sections[currentSection] = [];
      continue;
    }

    // 检测 `- **字段名**：值` 格式
    const fieldMatch = trimmed.match(/^-\s+\*\*(.+?)\*\*[：:]\s*(.*)/);
    if (fieldMatch) {
      fieldMap[fieldMatch[1].trim()] = fieldMatch[2].trim();
      currentSection = null;
      continue;
    }

    // 如果在子章节内，收集列表项
    if (currentSection && trimmed.startsWith('-')) {
      sections[currentSection].push(trimmed.replace(/^-\s*/, '').trim());
    } else if (currentSection && trimmed.startsWith('*')) {
      sections[currentSection].push(trimmed.replace(/^\*\s*/, '').trim());
    } else if (currentSection && /^\d+\./.test(trimmed)) {
      sections[currentSection].push(trimmed.replace(/^\d+\.\s*/, '').trim());
    } else if (currentSection && trimmed !== '') {
      // 非空行作为段落内容
      if (sections[currentSection].length === 0) {
        sections[currentSection].push(trimmed);
      } else {
        // 追加到最后一项
        const last = sections[currentSection].length - 1;
        sections[currentSection][last] += ' ' + trimmed;
      }
    }
  }

  // 映射字段名到 schema 属性
  const firstChangeId = fieldMap['首发 change'] ?? fieldMap['首发change'] ?? fieldMap['firstChangeId'] ?? '';
  const lastReviewedAt = fieldMap['上次复核日期'] ?? fieldMap['lastReviewedAt'] ?? '';
  const applicableStackRaw = fieldMap['适用栈'] ?? fieldMap['applicableStack'] ?? '';
  const status = fieldMap['状态'] ?? fieldMap['status'] ?? '';
  const keywordsRaw = fieldMap['关键词'] ?? fieldMap['keywords'] ?? '';

  // 解析逗号分隔的数组字段
  const applicableStack = applicableStackRaw
    ? applicableStackRaw.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    : [];
  const keywords = keywordsRaw
    ? keywordsRaw.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    : [];

  // 从子章节提取列表字段
  const problemScenario =
    sections['问题场景']?.join(' ') ?? sections['problemScenario']?.join(' ') ?? '';
  const triedApproaches =
    sections['当时尝试的方案'] ?? sections['triedApproaches'] ?? [];
  const whyFailed =
    sections['为什么不行'] ?? sections['whyFailed'] ?? [];
  const currentRecommendation =
    sections['当前推荐做法']?.join(' ') ?? sections['currentRecommendation']?.join(' ') ?? '';
  const whenToReevaluate =
    sections['何时重新评估']?.join(' ') ?? sections['whenToReevaluate']?.join(' ') ?? '';

  return {
    id,
    title,
    firstChangeId,
    lastReviewedAt,
    applicableStack,
    status: status.replace(/^`|`$/g, ''), // 去除可能的反引号包裹
    keywords,
    problemScenario,
    triedApproaches,
    whyFailed,
    currentRecommendation,
    whenToReevaluate,
  };
}

// ============================================================
// appendLesson — 追加条目到 lessons.md
// ============================================================

/**
 * 将一条新的 LessonEntry 追加到指定的 lessons.md 文件末尾
 *
 * @param filePath - lessons.md 文件的完整路径
 * @param entry - 通过 LessonEntrySchema 校验的条目
 */
export async function appendLesson(filePath: string, entry: LessonEntry): Promise<void> {
  // 先校验条目合法性
  LessonEntrySchema.parse(entry);

  const existing = await fsExtra.readFile(filePath, 'utf-8');

  // 构造 markdown 格式的条目内容
  const entryContent = formatLessonEntry(entry);

  // 追加到文件末尾
  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  await fsExtra.writeFile(filePath, existing + separator + entryContent, 'utf-8');
}

/**
 * 将 LessonEntry 格式化为 markdown 文本
 */
function formatLessonEntry(entry: LessonEntry): string {
  const lines: string[] = [
    `## ${entry.id} · ${entry.title}`,
    '',
    `- **首发 change**：${entry.firstChangeId}`,
    `- **上次复核日期**：${entry.lastReviewedAt}`,
    `- **适用栈**：${entry.applicableStack.join(', ')}`,
    `- **状态**：\`${entry.status}\``,
    `- **关键词**：${entry.keywords.join(', ')}`,
    '',
    '### 问题场景',
    entry.problemScenario,
    '',
    '### 当时尝试的方案',
    ...entry.triedApproaches.map((a, i) => `${i + 1}. ${a}`),
    '',
    '### 为什么不行',
    ...entry.whyFailed.map((w) => `- ${w}`),
    '',
    '### 当前推荐做法',
    entry.currentRecommendation,
    '',
    '### 何时重新评估',
    entry.whenToReevaluate,
    '',
  ];

  return lines.join('\n');
}

// ============================================================
// LessonsHit — grepLessons 命中结果
// ============================================================

export interface LessonsHit {
  entry: LessonEntry;
  matchedKeywords: string[];
}

// ============================================================
// grepLessons — 按关键词匹配 active 条目
// ============================================================

/**
 * 在任务上下文中搜索匹配的 active lessons 条目
 *
 * 匹配逻辑：
 * 1. 仅对 status === 'active' 的条目生效（排除 archived 和 superseded-by:*）
 * 2. 对每个 active 条目，检查其 keywords 是否出现在 taskContext 中
 * 3. 匹配为 case-insensitive
 * 4. 返回所有命中的条目及其匹配到的关键词列表
 *
 * @param entries - 所有 LessonEntry 条目
 * @param taskContext - 当前任务上下文文本
 * @returns 命中结果数组
 */
export function grepLessons(entries: LessonEntry[], taskContext: string): LessonsHit[] {
  // 将任务上下文转为小写，用于 case-insensitive 匹配
  const contextLower = taskContext.toLowerCase();

  const hits: LessonsHit[] = [];

  for (const entry of entries) {
    // 仅对 status === 'active' 的条目生效
    if (entry.status !== 'active') {
      continue;
    }

    // 检查每个关键词是否出现在任务上下文中
    const matchedKeywords: string[] = [];
    for (const keyword of entry.keywords) {
      if (contextLower.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    // 如果有匹配的关键词，加入命中结果
    if (matchedKeywords.length > 0) {
      hits.push({ entry, matchedKeywords });
    }
  }

  return hits;
}

// ============================================================
// getNextLessonId — 生成下一个 L-NNN 编号
// ============================================================

/**
 * 根据现有条目数组计算下一个可用的 L-NNN 编号
 * 取全局最大 NNN + 1，跨 change 共享编号空间
 *
 * @param entries - 当前所有条目数组
 * @returns 下一个编号字符串，如 "L-004"
 */
export function getNextLessonId(entries: LessonEntry[]): string {
  if (entries.length === 0) {
    return 'L-001';
  }

  let maxNum = 0;
  for (const entry of entries) {
    const match = entry.id.match(/^L-(\d{3})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `L-${String(nextNum).padStart(3, '0')}`;
}
