import { describe, it, expect } from 'vitest';
import {
  LessonEntrySchema,
  LessonIdSchema,
  grepLessons,
} from '../../../src/services/lessons-service.js';
import type { LessonEntry } from '../../../src/services/lessons-service.js';

// ============================================================
// LessonIdSchema 校验
// ============================================================
describe('LessonIdSchema - id 正则校验', () => {
  it('L-001 格式应通过', () => {
    expect(LessonIdSchema.safeParse('L-001').success).toBe(true);
  });

  it('L-999 格式应通过', () => {
    expect(LessonIdSchema.safeParse('L-999').success).toBe(true);
  });

  it('L-1（不足三位）应失败', () => {
    expect(LessonIdSchema.safeParse('L-1').success).toBe(false);
  });

  it('L-1234（超过三位）应失败', () => {
    expect(LessonIdSchema.safeParse('L-1234').success).toBe(false);
  });

  it('A-001（前缀非 L）应失败', () => {
    expect(LessonIdSchema.safeParse('A-001').success).toBe(false);
  });
});

// ============================================================
// LessonEntrySchema 合法分支（≥ 3）
// ============================================================
describe('LessonEntrySchema - 合法输入', () => {
  // 构造一个完整合法条目的基础数据
  const baseEntry = {
    id: 'L-001',
    title: 'NodeNext ESM .js 后缀问题',
    firstChangeId: '2026-05-11-flow-kit-integration',
    lastReviewedAt: '2026-05-11',
    applicableStack: ['Node.js ≥ 24', 'TypeScript NodeNext ESM'],
    keywords: ['NodeNext', '.js 后缀', 'ESM 解析'],
    problemScenario: '在 NodeNext 模式下 import 不带 .js 后缀会导致运行时报错',
    triedApproaches: ['尝试在 tsconfig 中设置 paths 映射'],
    whyFailed: ['paths 映射在运行时不生效，仅在编译时有效'],
    currentRecommendation: '所有相对导入必须显式带 .js 后缀，包括 .ts 源文件中的导入',
    whenToReevaluate: 'Node.js 原生支持 extensionless ESM 时',
  };

  it('status=active 的完整条目应通过', () => {
    const result = LessonEntrySchema.safeParse({
      ...baseEntry,
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('status=archived 的完整条目应通过', () => {
    const result = LessonEntrySchema.safeParse({
      ...baseEntry,
      id: 'L-002',
      status: 'archived',
    });
    expect(result.success).toBe(true);
  });

  it('status=superseded-by:L-002 的完整条目应通过', () => {
    const result = LessonEntrySchema.safeParse({
      ...baseEntry,
      id: 'L-003',
      status: 'superseded-by:L-002',
    });
    expect(result.success).toBe(true);
  });

  it('status=superseded-by:L-099 的完整条目应通过', () => {
    const result = LessonEntrySchema.safeParse({
      ...baseEntry,
      id: 'L-010',
      status: 'superseded-by:L-099',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// LessonEntrySchema 非法分支（≥ 3）
// ============================================================
describe('LessonEntrySchema - 非法输入', () => {
  const baseEntry = {
    id: 'L-001',
    title: 'NodeNext ESM .js 后缀问题',
    firstChangeId: '2026-05-11-flow-kit-integration',
    lastReviewedAt: '2026-05-11',
    applicableStack: ['Node.js ≥ 24', 'TypeScript NodeNext ESM'],
    status: 'active',
    keywords: ['NodeNext', '.js 后缀', 'ESM 解析'],
    problemScenario: '在 NodeNext 模式下 import 不带 .js 后缀会导致运行时报错',
    triedApproaches: ['尝试在 tsconfig 中设置 paths 映射'],
    whyFailed: ['paths 映射在运行时不生效，仅在编译时有效'],
    currentRecommendation: '所有相对导入必须显式带 .js 后缀，包括 .ts 源文件中的导入',
    whenToReevaluate: 'Node.js 原生支持 extensionless ESM 时',
  };

  // --- id 正则非法 ---
  it('id 格式非法（L-1 不足三位）应失败', () => {
    const result = LessonEntrySchema.safeParse({
      ...baseEntry,
      id: 'L-1',
    });
    expect(result.success).toBe(false);
  });

  it('id 格式非法（L-1234 超过三位）应失败', () => {
    const result = LessonEntrySchema.safeParse({
      ...baseEntry,
      id: 'L-1234',
    });
    expect(result.success).toBe(false);
  });

  it('id 格式非法（A-001 前缀错误）应失败', () => {
    const result = LessonEntrySchema.safeParse({
      ...baseEntry,
      id: 'A-001',
    });
    expect(result.success).toBe(false);
  });

  // --- status 非法 ---
  it('status 为无效值 deleted 应失败', () => {
    const result = LessonEntrySchema.safeParse({
      ...baseEntry,
      status: 'deleted',
    });
    expect(result.success).toBe(false);
  });

  it('status 为 superseded-by:invalid（非 L-NNN 格式）应失败', () => {
    const result = LessonEntrySchema.safeParse({
      ...baseEntry,
      status: 'superseded-by:invalid',
    });
    expect(result.success).toBe(false);
  });

  it('status 为 superseded-by:L-1（不足三位）应失败', () => {
    const result = LessonEntrySchema.safeParse({
      ...baseEntry,
      status: 'superseded-by:L-1',
    });
    expect(result.success).toBe(false);
  });

  // --- 缺少必填字段 ---
  it('缺少 title 应失败', () => {
    const { title, ...noTitle } = baseEntry;
    const result = LessonEntrySchema.safeParse(noTitle);
    expect(result.success).toBe(false);
  });

  it('缺少 keywords（空数组）应失败', () => {
    const result = LessonEntrySchema.safeParse({
      ...baseEntry,
      keywords: [],
    });
    expect(result.success).toBe(false);
  });

  it('缺少 applicableStack（空数组）应失败', () => {
    const result = LessonEntrySchema.safeParse({
      ...baseEntry,
      applicableStack: [],
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// grepLessons — 三分支测试（命中 / 未命中 / superseded·archived 被过滤）
// Validates: Requirements 12.6, 12.8
// ============================================================
describe('grepLessons - 三分支覆盖', () => {
  // 构造测试用 LessonEntry 基础数据
  const activeEntry: LessonEntry = {
    id: 'L-001',
    title: 'NodeNext ESM .js 后缀问题',
    firstChangeId: '2026-05-11-flow-kit-integration',
    lastReviewedAt: '2026-05-11',
    applicableStack: ['Node.js ≥ 24', 'TypeScript NodeNext ESM'],
    status: 'active',
    keywords: ['NodeNext', '.js 后缀', 'ESM 解析'],
    problemScenario: '在 NodeNext 模式下 import 不带 .js 后缀会导致运行时报错',
    triedApproaches: ['尝试在 tsconfig 中设置 paths 映射'],
    whyFailed: ['paths 映射在运行时不生效，仅在编译时有效'],
    currentRecommendation: '所有相对导入必须显式带 .js 后缀',
    whenToReevaluate: 'Node.js 原生支持 extensionless ESM 时',
  };

  const supersededEntry: LessonEntry = {
    id: 'L-002',
    title: 'pnpm workspace 幽灵依赖',
    firstChangeId: '2026-04-20-workspace-fix',
    lastReviewedAt: '2026-04-20',
    applicableStack: ['pnpm', 'monorepo'],
    status: 'superseded-by:L-003',
    keywords: ['pnpm', '幽灵依赖', 'workspace'],
    problemScenario: 'pnpm workspace 下子包引用未声明依赖',
    triedApproaches: ['手动添加 peerDependencies'],
    whyFailed: ['维护成本高且容易遗漏'],
    currentRecommendation: '使用 pnpm dedupe + strict-peer-dependencies',
    whenToReevaluate: 'pnpm 10 发布时',
  };

  const archivedEntry: LessonEntry = {
    id: 'L-003',
    title: 'Vitest 并行测试竞态',
    firstChangeId: '2026-03-15-test-infra',
    lastReviewedAt: '2026-03-15',
    applicableStack: ['Vitest', 'Node.js'],
    status: 'archived',
    keywords: ['Vitest', '并行', '竞态', 'race condition'],
    problemScenario: 'Vitest 并行运行时共享文件系统导致竞态',
    triedApproaches: ['加 mutex 锁'],
    whyFailed: ['性能下降严重'],
    currentRecommendation: '使用 tmpdir 隔离',
    whenToReevaluate: 'Vitest 提供原生隔离 API 时',
  };

  // --- 分支 1：任务上下文包含 active 条目的关键词 → 命中 ---
  it('任务上下文包含 active 条目关键词时应返回命中结果', () => {
    const entries = [activeEntry, supersededEntry, archivedEntry];
    // 任务上下文中包含 "NodeNext" 和 "ESM 解析" 关键词
    const taskContext = '配置 NodeNext 模块解析，确保 ESM 解析正确';

    const hits = grepLessons(entries, taskContext);

    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].entry.id).toBe('L-001');
    expect(hits[0].matchedKeywords.length).toBeGreaterThanOrEqual(1);
    // 至少命中 "NodeNext" 关键词
    expect(hits[0].matchedKeywords).toContain('NodeNext');
  });

  // --- 分支 2：任务上下文不包含任何匹配关键词 → 返回空数组 ---
  it('任务上下文不包含任何匹配关键词时应返回空数组', () => {
    const entries = [activeEntry, supersededEntry, archivedEntry];
    // 任务上下文与所有条目的关键词完全无关
    const taskContext = '实现用户登录功能，添加 JWT 鉴权中间件';

    const hits = grepLessons(entries, taskContext);

    expect(hits).toEqual([]);
  });

  // --- 分支 3：superseded / archived 条目即使关键词匹配也被过滤 ---
  it('superseded 条目即使关键词匹配也不应被返回', () => {
    const entries = [activeEntry, supersededEntry, archivedEntry];
    // 任务上下文包含 supersededEntry 的关键词 "pnpm" 和 "幽灵依赖"
    const taskContext = '修复 pnpm 幽灵依赖问题，清理 workspace 配置';

    const hits = grepLessons(entries, taskContext);

    // 不应命中 superseded 条目 L-002
    const supersededHit = hits.find((h) => h.entry.id === 'L-002');
    expect(supersededHit).toBeUndefined();
  });

  it('archived 条目即使关键词匹配也不应被返回', () => {
    const entries = [activeEntry, supersededEntry, archivedEntry];
    // 任务上下文包含 archivedEntry 的关键词 "Vitest" 和 "竞态"
    const taskContext = '解决 Vitest 并行测试竞态问题，添加隔离机制';

    const hits = grepLessons(entries, taskContext);

    // 不应命中 archived 条目 L-003
    const archivedHit = hits.find((h) => h.entry.id === 'L-003');
    expect(archivedHit).toBeUndefined();
  });
});
