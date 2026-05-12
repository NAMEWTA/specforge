// ============================================================
// design-explore-service — v0 草稿校验服务
// ============================================================

/**
 * v0 草稿违例类型（5 类）
 */
export type V0DraftViolation =
  | 'body-too-long'
  | 'decisions-out-of-range'
  | 'risks-out-of-range'
  | 'missing-confirm-reject'
  | 'not-independent-message';

/**
 * v0 草稿校验结果
 */
export interface V0DraftCheckResult {
  valid: boolean;
  violations: V0DraftViolation[];
}

/**
 * 计算正文字数（不含 markdown 标题、列表编号前缀、分隔线、confirm/reject 行）
 *
 * 排除规则：
 * - 以 `#` 开头的标题行
 * - 行首的 `\d+\. ` 列表编号前缀（仅去除前缀，保留后续内容）
 * - `---` 分隔线
 * - `- [ ] confirm` / `- [ ] reject` 行
 */
function countBodyChars(raw: string): number {
  const lines = raw.split('\n');
  let totalChars = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过标题行
    if (/^#{1,6}\s/.test(trimmed)) {
      continue;
    }

    // 跳过分隔线
    if (/^---+$/.test(trimmed)) {
      continue;
    }

    // 跳过 confirm/reject 行
    if (/^-\s*\[[\sx]*\]\s*(confirm|reject)/.test(trimmed)) {
      continue;
    }

    // 去除列表编号前缀后计算字符数
    const content = trimmed.replace(/^\d+\.\s+/, '');
    totalChars += content.length;
  }

  return totalChars;
}

/**
 * 提取指定章节中的编号列表项数量
 *
 * 从 `### <sectionTitle>` 开始，到下一个 `###` 或文件末尾结束，
 * 统计以 `\d+.` 开头的行数
 */
function countSectionItems(raw: string, sectionTitle: string): number {
  const lines = raw.split('\n');
  let inSection = false;
  let count = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === `### ${sectionTitle}`) {
      inSection = true;
      continue;
    }

    // 遇到下一个 ### 级别标题则退出当前章节
    if (inSection && /^###\s/.test(trimmed)) {
      break;
    }

    // 遇到 ## 级别标题也退出（更高层级）
    if (inSection && /^##\s/.test(trimmed) && !/^###/.test(trimmed)) {
      break;
    }

    // 统计编号列表项
    if (inSection && /^\d+\.\s/.test(trimmed)) {
      count++;
    }
  }

  return count;
}

/**
 * 检查是否包含 confirm 和 reject 选项
 */
function hasConfirmReject(raw: string): boolean {
  const hasConfirm = /- \[[\sx]*\]\s*confirm/i.test(raw);
  const hasReject = /- \[[\sx]*\]\s*reject/i.test(raw);
  return hasConfirm && hasReject;
}

/**
 * 检查是否包含非独立消息内容（与其他 Step 合并）
 *
 * 检测 confirm/reject 之后是否存在其他 Step 标记
 */
function hasNonIndependentContent(raw: string): boolean {
  // 检测是否包含 `## Step` 或 `## 详细` 等表示合并了其他 Step 的模式
  const patterns = [
    /## Step\s/,
    /## 详细/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(raw)) {
      return true;
    }
  }

  return false;
}

/**
 * 校验 v0 草稿是否符合规范
 *
 * 覆盖 5 类违例：
 * 1. body-too-long：正文超过 500 字
 * 2. decisions-out-of-range：关键决策数量不在 3-5 范围
 * 3. risks-out-of-range：主要风险数量不在 2-3 范围
 * 4. missing-confirm-reject：缺少 confirm/reject 选项
 * 5. not-independent-message：不是独立消息（与其他 Step 合并）
 *
 * Validates: Req 11.6
 */
export function validateV0Draft(raw: string): V0DraftCheckResult {
  const violations: V0DraftViolation[] = [];

  // 1. 正文字数校验（不含标题与列表编号）
  const bodyChars = countBodyChars(raw);
  if (bodyChars > 500) {
    violations.push('body-too-long');
  }

  // 2. 关键决策数量校验（3 ≤ N ≤ 5）
  const decisionsCount = countSectionItems(raw, '关键决策');
  if (decisionsCount < 3 || decisionsCount > 5) {
    violations.push('decisions-out-of-range');
  }

  // 3. 主要风险数量校验（2 ≤ N ≤ 3）
  const risksCount = countSectionItems(raw, '主要风险');
  if (risksCount < 2 || risksCount > 3) {
    violations.push('risks-out-of-range');
  }

  // 4. confirm/reject 选项校验
  if (!hasConfirmReject(raw)) {
    violations.push('missing-confirm-reject');
  }

  // 5. 独立消息校验（不与其他 Step 合并）
  if (hasNonIndependentContent(raw)) {
    violations.push('not-independent-message');
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
