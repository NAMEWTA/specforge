import { z } from 'zod';
import fsExtra from 'fs-extra';
import path from 'node:path';

// ============================================================
// § 9 候选条目 Schema
// ============================================================

/**
 * § 9 架构沉淀建议中的单条候选条目
 * 对应 DESIGN § 9 表格中的一行
 */
export const EvolveCandidateSchema = z.object({
  /** change 标识，如 "2026-05-11-flow-kit-integration" */
  changeId: z.string().min(1),
  /** 候选类别（五类之一） */
  category: z.enum([
    'new-abstraction',
    'project-decision',
    'cross-module-contract',
    'dependency-change',
    'forbidden-list-change',
  ]),
  /** 候选条目文本，至少 3 字符（禁止凑数留白） */
  item: z.string().min(3),
  /** 目标文件（context.md 或 architecture.md） */
  targetDoc: z.enum(['context.md', 'architecture.md']),
  /** 原 DESIGN § 9 所在行（可选） */
  rawSource: z.string().optional(),
});

export type EvolveCandidate = z.infer<typeof EvolveCandidateSchema>;

// ============================================================
// .evolve-state.yaml Schema
// ============================================================

/**
 * `.evolve-state.yaml` 的完整 schema
 * 记录已 promote 的条目与 legacy change
 */
export const EvolveStateSchema = z.object({
  /** schema 版本号 */
  schemaVersion: z.number(),
  /** 上次执行 evolve 的时间戳（ISO 8601） */
  last_evolve_at: z.string().optional(),
  /** 已 promote 的变更记录 */
  promoted_changes: z.array(
    z.object({
      changeId: z.string(),
      promotedAt: z.string(),
      items: z.array(z.string()),
    }),
  ),
  /** 缺 § 9 的历史 change（被标记跳过） */
  legacy_changes: z.array(z.string()).optional(),
});

export type EvolveState = z.infer<typeof EvolveStateSchema>;

// ============================================================
// § 9 类别中文 → 英文映射
// ============================================================

/** § 9 表格中文类别到 schema enum 的映射 */
const CATEGORY_MAP: Record<string, EvolveCandidate['category']> = {
  '新增抽象': 'new-abstraction',
  '项目级技术决策': 'project-decision',
  '跨模块契约': 'cross-module-contract',
  '依赖变动': 'dependency-change',
  '禁动清单变动': 'forbidden-list-change',
};

// ============================================================
// parseSection9 解析器
// ============================================================

/**
 * 合法留白措辞列表
 * 当 § 9 章节仅包含这些措辞时，视为合法跳过，返回空数组
 */
const LEGITIMATE_BLANK_PHRASES = [
  '本 change 无架构层面沉淀建议',
  '本change无架构层面沉淀建议',
  '无架构层面沉淀建议',
  '本次无架构层面沉淀建议',
];

/**
 * 从 DESIGN.md 全文中解析 § 9 架构沉淀建议章节
 *
 * @param designContent - DESIGN.md 全文内容
 * @param changeId - 当前 change 标识
 * @returns 候选条目数组；§ 9 不存在或为合法留白时返回空数组
 */
export function parseSection9(
  designContent: string,
  changeId: string,
): EvolveCandidate[] {
  const lines = designContent.split('\n');

  // 1. 定位 § 9 章节（匹配 "## § 9" 或 "## §9" 开头）
  const sectionStartIdx = lines.findIndex((line) =>
    /^##\s+§\s*9\b/.test(line),
  );

  if (sectionStartIdx === -1) {
    return [];
  }

  // 2. 提取 § 9 章节内容（到下一个同级或更高级标题为止）
  const sectionLines: string[] = [];
  for (let i = sectionStartIdx + 1; i < lines.length; i++) {
    // 遇到同级（##）或更高级（#）标题则停止
    if (/^#{1,2}\s/.test(lines[i])) {
      break;
    }
    sectionLines.push(lines[i]);
  }

  const sectionText = sectionLines.join('\n').trim();

  // 3. 检测合法留白措辞
  if (sectionText === '' || LEGITIMATE_BLANK_PHRASES.some((phrase) => sectionText.includes(phrase))) {
    return [];
  }

  // 4. 解析表格行
  const candidates: EvolveCandidate[] = [];

  for (const line of sectionLines) {
    const trimmed = line.trim();
    // 跳过非表格行、表头分隔行
    if (!trimmed.startsWith('|') || /^\|[\s\-:|]+\|$/.test(trimmed)) {
      continue;
    }

    // 拆分表格列
    const cells = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c !== '');

    // 至少需要 3 列：类别 / 条目 / 目标文件
    if (cells.length < 3) {
      continue;
    }

    const [rawCategory, rawItem, rawTargetDoc] = cells;

    // 跳过表头行（检测是否为标题行）
    if (rawCategory === '候选类别' || rawCategory === '类别') {
      continue;
    }

    // 映射类别
    const category = CATEGORY_MAP[rawCategory];
    if (!category) {
      continue;
    }

    // item 少于 3 字符的行跳过（告警但不进入候选）
    if (rawItem.length < 3) {
      continue;
    }

    // 校验 targetDoc
    if (rawTargetDoc !== 'context.md' && rawTargetDoc !== 'architecture.md') {
      continue;
    }

    const candidate: EvolveCandidate = {
      changeId,
      category,
      item: rawItem,
      targetDoc: rawTargetDoc as 'context.md' | 'architecture.md',
      rawSource: trimmed,
    };

    // 用 schema 做最终校验
    const parsed = EvolveCandidateSchema.safeParse(candidate);
    if (parsed.success) {
      candidates.push(parsed.data);
    }
  }

  return candidates;
}

// ============================================================
// scanSection9 扫描结果类型
// ============================================================

/**
 * scanSection9 的返回结果
 * 三分支：候选条目 / 缺 § 9 的历史 change / 已 promoted 跳过
 */
export interface ScanSection9Result {
  /** 含有效 § 9 表格的候选条目 */
  candidates: EvolveCandidate[];
  /** 缺少 § 9 章节的历史 change（标记为 legacy） */
  legacyChanges: string[];
  /** changeId 已在 .evolve-state.yaml 中 promoted，跳过 */
  skippedAlreadyPromoted: string[];
}

// ============================================================
// scanSection9 扫描器
// ============================================================

/**
 * 扫描 archive 与 changes 目录下的 DESIGN.md，提取 § 9 候选条目
 *
 * 扫描路径：
 * - `<rootDir>/specforge/archive/<changeId>/DESIGN.md`
 * - `<rootDir>/specforge/changes/<changeId>/DESIGN.md`
 *
 * 三分支逻辑：
 * 1. changeId 已在 evolveState.promoted_changes → skippedAlreadyPromoted
 * 2. DESIGN.md 缺少 § 9 章节 → legacyChanges
 * 3. DESIGN.md 含有效 § 9 表格 → candidates
 *
 * @param rootDir - 项目根目录
 * @param evolveState - 可选的 .evolve-state.yaml 状态（用于过滤已 promoted）
 * @returns 三分支扫描结果
 */
export async function scanSection9(
  rootDir: string,
  evolveState?: EvolveState,
): Promise<ScanSection9Result> {
  const result: ScanSection9Result = {
    candidates: [],
    legacyChanges: [],
    skippedAlreadyPromoted: [],
  };

  // 收集已 promoted 的 changeId 集合，便于快速查找
  const promotedSet = new Set<string>(
    evolveState?.promoted_changes?.map((p) => p.changeId) ?? [],
  );

  // 扫描两个目录：archive 与 changes
  const scanDirs = [
    path.join(rootDir, 'specforge', 'archive'),
    path.join(rootDir, 'specforge', 'changes'),
  ];

  for (const scanDir of scanDirs) {
    // 目录不存在则跳过
    const dirExists = await fsExtra.pathExists(scanDir);
    if (!dirExists) {
      continue;
    }

    // 读取子目录列表（每个子目录名即为 changeId）
    const entries = await fsExtra.readdir(scanDir, { withFileTypes: true });
    const changeDirs = entries.filter((e) => e.isDirectory());

    for (const changeDir of changeDirs) {
      const changeId = changeDir.name;
      const designPath = path.join(scanDir, changeId, 'DESIGN.md');

      // 检查 DESIGN.md 是否存在
      const designExists = await fsExtra.pathExists(designPath);
      if (!designExists) {
        continue;
      }

      // 检查 changeId 是否已 promoted → 跳过
      if (promotedSet.has(changeId)) {
        result.skippedAlreadyPromoted.push(changeId);
        continue;
      }

      // 读取 DESIGN.md 内容
      const content = await fsExtra.readFile(designPath, 'utf-8');

      // 检测 § 9 章节是否存在（通过正则匹配标题行）
      const hasSection9Header = /^##\s+§\s*9\b/m.test(content);

      // 使用 parseSection9 解析候选条目
      const candidates = parseSection9(content, changeId);

      if (candidates.length > 0) {
        // 有有效候选条目 → 加入 candidates
        result.candidates.push(...candidates);
      } else if (!hasSection9Header) {
        // parseSection9 返回空且无 § 9 标题 → legacy change
        result.legacyChanges.push(changeId);
      }
      // 注：§ 9 存在但为合法留白（parseSection9 返回空但标题存在）→ 不计入任何分支
    }
  }

  return result;
}

// ============================================================
// promoteCandidates 分组 patch
// ============================================================

/**
 * 将用户 accept 的候选条目按 targetDoc 分组追加到对应文件，
 * 并同步更新 evolveState.promoted_changes
 *
 * @param rootDir - 项目根目录
 * @param accepted - 用户确认的候选条目数组
 * @param evolveState - 当前 .evolve-state.yaml 状态
 * @returns 更新后的 EvolveState
 */
export async function promoteCandidates(
  rootDir: string,
  accepted: EvolveCandidate[],
  evolveState: EvolveState,
): Promise<EvolveState> {
  // 空数组直接返回，不修改任何文件
  if (accepted.length === 0) {
    return evolveState;
  }

  // 按 targetDoc 分组
  const grouped = new Map<string, EvolveCandidate[]>();
  for (const candidate of accepted) {
    const group = grouped.get(candidate.targetDoc) ?? [];
    group.push(candidate);
    grouped.set(candidate.targetDoc, group);
  }

  // 对每个 targetDoc 追加内容
  const contextDir = path.join(rootDir, 'specforge', 'context');
  for (const [targetDoc, candidates] of grouped) {
    const filePath = path.join(contextDir, targetDoc);

    // 构造追加内容：按 changeId 分组输出
    const changeGroups = new Map<string, EvolveCandidate[]>();
    for (const c of candidates) {
      const group = changeGroups.get(c.changeId) ?? [];
      group.push(c);
      changeGroups.set(c.changeId, group);
    }

    let appendContent = '';
    for (const [changeId, items] of changeGroups) {
      appendContent += `\n\n<!-- promoted from ${changeId} -->`;
      for (const item of items) {
        appendContent += `\n- ${item.item}`;
      }
    }

    // 读取现有内容并追加
    const existing = await fsExtra.readFile(filePath, 'utf-8');
    await fsExtra.writeFile(filePath, existing + appendContent, 'utf-8');
  }

  // 更新 evolveState.promoted_changes：按 changeId 聚合 items
  const now = new Date().toISOString();
  const changeItemsMap = new Map<string, string[]>();
  for (const candidate of accepted) {
    const items = changeItemsMap.get(candidate.changeId) ?? [];
    items.push(candidate.item);
    changeItemsMap.set(candidate.changeId, items);
  }

  const newPromotedChanges = [...evolveState.promoted_changes];
  for (const [changeId, items] of changeItemsMap) {
    newPromotedChanges.push({
      changeId,
      promotedAt: now,
      items,
    });
  }

  return {
    ...evolveState,
    last_evolve_at: now,
    promoted_changes: newPromotedChanges,
  };
}
