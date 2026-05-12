import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  EvolveCandidateSchema,
  EvolveStateSchema,
  scanSection9,
} from '../../../src/services/evolve-service.js';
import type { EvolveState } from '../../../src/services/evolve-service.js';

describe('EvolveService - Schema 校验', () => {
  // ============================================================
  // EvolveCandidateSchema 合法分支
  // ============================================================
  describe('EvolveCandidateSchema - 合法输入', () => {
    it('所有字段齐备（含 rawSource）应通过', () => {
      const result = EvolveCandidateSchema.safeParse({
        changeId: '2026-05-11-flow-kit-integration',
        category: 'new-abstraction',
        item: 'upsertUserAsset 作为用户资产统一入口',
        targetDoc: 'architecture.md',
        rawSource: '| 新增抽象 | upsertUserAsset 作为用户资产统一入口 | architecture.md | |',
      });
      expect(result.success).toBe(true);
    });

    it('category 为 project-decision 应通过', () => {
      const result = EvolveCandidateSchema.safeParse({
        changeId: '2026-03-01-some-change',
        category: 'project-decision',
        item: '选用 zod 做 schema 校验（ADR-003）',
        targetDoc: 'architecture.md',
        rawSource: '| 项目级技术决策 | 选用 zod 做 schema 校验 | architecture.md | ADR-003 |',
      });
      expect(result.success).toBe(true);
    });

    it('item 恰好 3 字符（最小合法长度）应通过', () => {
      const result = EvolveCandidateSchema.safeParse({
        changeId: '2026-01-01-minimal',
        category: 'dependency-change',
        item: 'abc',
        targetDoc: 'context.md',
        rawSource: '| 依赖变动 | abc | context.md | |',
      });
      expect(result.success).toBe(true);
    });

    it('category 为 forbidden-list-change + targetDoc 为 context.md 应通过', () => {
      const result = EvolveCandidateSchema.safeParse({
        changeId: '2026-02-15-cleanup',
        category: 'forbidden-list-change',
        item: '禁止直接 console.log',
        targetDoc: 'context.md',
        rawSource: '| 禁动清单变动 | 禁止直接 console.log | context.md | |',
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================
  // EvolveCandidateSchema 非法分支
  // ============================================================
  describe('EvolveCandidateSchema - 非法输入', () => {
    it('缺少 changeId 应失败', () => {
      const result = EvolveCandidateSchema.safeParse({
        category: 'new-abstraction',
        item: '某个候选条目',
        targetDoc: 'architecture.md',
        rawSource: '| 新增抽象 | 某个候选条目 | architecture.md | |',
      });
      expect(result.success).toBe(false);
    });

    it('item 少于 3 字符应失败', () => {
      const result = EvolveCandidateSchema.safeParse({
        changeId: '2026-05-11-flow-kit-integration',
        category: 'new-abstraction',
        item: 'ab',
        targetDoc: 'architecture.md',
        rawSource: '| 新增抽象 | ab | architecture.md | |',
      });
      expect(result.success).toBe(false);
    });

    it('无效 category 应失败', () => {
      const result = EvolveCandidateSchema.safeParse({
        changeId: '2026-05-11-flow-kit-integration',
        category: 'invalid-category',
        item: '某个候选条目文本',
        targetDoc: 'architecture.md',
        rawSource: '| 无效类别 | 某个候选条目文本 | architecture.md | |',
      });
      expect(result.success).toBe(false);
    });

    it('无效 targetDoc 应失败', () => {
      const result = EvolveCandidateSchema.safeParse({
        changeId: '2026-05-11-flow-kit-integration',
        category: 'cross-module-contract',
        item: '某个跨模块契约条目',
        targetDoc: 'invalid.md',
        rawSource: '| 跨模块契约 | 某个跨模块契约条目 | invalid.md | |',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // EvolveStateSchema 合法分支
  // ============================================================
  describe('EvolveStateSchema - 合法输入', () => {
    it('完整状态（含 promoted_changes 与 legacy_changes）应通过', () => {
      const result = EvolveStateSchema.safeParse({
        schemaVersion: 1,
        last_evolve_at: '2026-05-11T08:12:00Z',
        promoted_changes: [
          {
            changeId: '2026-05-11-flow-kit-integration',
            promotedAt: '2026-05-11T08:12:00Z',
            items: ['§9-item-1', '§9-item-3'],
          },
        ],
        legacy_changes: ['2025-11-02-some-old-change'],
      });
      expect(result.success).toBe(true);
    });

    it('promoted_changes 为空数组应通过', () => {
      const result = EvolveStateSchema.safeParse({
        schemaVersion: 1,
        promoted_changes: [],
      });
      expect(result.success).toBe(true);
    });

    it('含 last_evolve_at 但无 legacy_changes 应通过', () => {
      const result = EvolveStateSchema.safeParse({
        schemaVersion: 1,
        last_evolve_at: '2026-01-01T00:00:00Z',
        promoted_changes: [
          {
            changeId: '2026-01-01-init',
            promotedAt: '2026-01-01T00:00:00Z',
            items: ['§9-item-1'],
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('多条 promoted_changes 记录应通过', () => {
      const result = EvolveStateSchema.safeParse({
        schemaVersion: 1,
        last_evolve_at: '2026-06-01T10:00:00Z',
        promoted_changes: [
          {
            changeId: '2026-03-01-first-change',
            promotedAt: '2026-03-01T10:00:00Z',
            items: ['§9-item-1'],
          },
          {
            changeId: '2026-06-01-second-change',
            promotedAt: '2026-06-01T10:00:00Z',
            items: ['§9-item-2', '§9-item-4'],
          },
        ],
        legacy_changes: [],
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================================
  // EvolveStateSchema 非法分支
  // ============================================================
  describe('EvolveStateSchema - 非法输入', () => {
    it('缺少 schemaVersion 应失败', () => {
      const result = EvolveStateSchema.safeParse({
        promoted_changes: [],
      });
      expect(result.success).toBe(false);
    });

    it('promoted_changes 结构缺少 changeId 应失败', () => {
      const result = EvolveStateSchema.safeParse({
        schemaVersion: 1,
        promoted_changes: [
          {
            promotedAt: '2026-05-11T08:12:00Z',
            items: ['§9-item-1'],
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('promoted_changes 结构缺少 items 应失败', () => {
      const result = EvolveStateSchema.safeParse({
        schemaVersion: 1,
        promoted_changes: [
          {
            changeId: '2026-05-11-flow-kit-integration',
            promotedAt: '2026-05-11T08:12:00Z',
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('promoted_changes 非数组应失败', () => {
      const result = EvolveStateSchema.safeParse({
        schemaVersion: 1,
        promoted_changes: 'not-an-array',
      });
      expect(result.success).toBe(false);
    });
  });
});


// ============================================================
// scanSection9 三分支测试（TDD 红阶段 — 函数尚未实现）
// ============================================================
describe('EvolveService - scanSection9 三分支', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-evolve-scan-'));
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  // ============================================================
  // candidates 分支：DESIGN.md 含有效 § 9 表格 → 返回候选条目
  // ============================================================
  it('含有效 § 9 表格的 DESIGN.md 应返回 candidates', async () => {
    // 构造 specforge/archive/<changeId>/DESIGN.md，含有效 § 9 表格
    const changeId = '2026-05-11-flow-kit-integration';
    const designDir = path.join(tmpDir, 'specforge', 'archive', changeId);
    fsExtra.ensureDirSync(designDir);
    fsExtra.writeFileSync(
      path.join(designDir, 'DESIGN.md'),
      [
        '# DESIGN：flow-kit-integration',
        '',
        '## § 9 架构沉淀建议（软约束）',
        '',
        '| 候选类别 | 候选条目 | 目标文件 | 备注 |',
        '|---|---|---|---|',
        '| 新增抽象 | upsertUserAsset 作为用户资产统一入口 | architecture.md | |',
        '| 项目级技术决策 | 选用 zod 做 schema 校验（ADR-003） | architecture.md | ADR-003 |',
      ].join('\n'),
    );

    const result = await scanSection9(tmpDir);

    // 应返回 candidates 非空
    expect(result.candidates.length).toBeGreaterThanOrEqual(2);
    expect(result.candidates[0].changeId).toBe(changeId);
    expect(result.candidates[0].category).toBe('new-abstraction');
    expect(result.candidates[0].targetDoc).toBe('architecture.md');
    // legacyChanges 与 skippedAlreadyPromoted 应为空
    expect(result.legacyChanges).toEqual([]);
    expect(result.skippedAlreadyPromoted).toEqual([]);
  });

  // ============================================================
  // legacyChanges 分支：DESIGN.md 缺少 § 9 → 返回 changeId 到 legacyChanges
  // ============================================================
  it('缺少 § 9 章节的 DESIGN.md 应返回 changeId 到 legacyChanges', async () => {
    // 构造 specforge/changes/<changeId>/DESIGN.md，不含 § 9 章节
    const changeId = '2025-11-02-some-old-change';
    const designDir = path.join(tmpDir, 'specforge', 'changes', changeId);
    fsExtra.ensureDirSync(designDir);
    fsExtra.writeFileSync(
      path.join(designDir, 'DESIGN.md'),
      [
        '# DESIGN：some-old-change',
        '',
        '## 1. 概要',
        '',
        '这是一个没有 § 9 章节的旧 DESIGN 文件。',
        '',
        '## 2. 实现',
        '',
        '省略...',
      ].join('\n'),
    );

    const result = await scanSection9(tmpDir);

    // 应返回 legacyChanges 包含该 changeId
    expect(result.legacyChanges).toContain(changeId);
    // candidates 与 skippedAlreadyPromoted 应为空
    expect(result.candidates).toEqual([]);
    expect(result.skippedAlreadyPromoted).toEqual([]);
  });

  // ============================================================
  // skippedAlreadyPromoted 分支：DESIGN.md 含 § 9 但 changeId 已在 .evolve-state.yaml → 跳过
  // ============================================================
  it('已在 evolveState 中 promoted 的 changeId 应返回到 skippedAlreadyPromoted', async () => {
    // 构造 specforge/archive/<changeId>/DESIGN.md，含有效 § 9 表格
    const changeId = '2026-03-01-already-promoted';
    const designDir = path.join(tmpDir, 'specforge', 'archive', changeId);
    fsExtra.ensureDirSync(designDir);
    fsExtra.writeFileSync(
      path.join(designDir, 'DESIGN.md'),
      [
        '# DESIGN：already-promoted',
        '',
        '## § 9 架构沉淀建议（软约束）',
        '',
        '| 候选类别 | 候选条目 | 目标文件 | 备注 |',
        '|---|---|---|---|',
        '| 跨模块契约 | A 与 B 的 xxx 契约 | architecture.md | |',
      ].join('\n'),
    );

    // 构造 evolveState，标记该 changeId 已 promoted
    const evolveState: EvolveState = {
      schemaVersion: 1,
      last_evolve_at: '2026-03-01T10:00:00Z',
      promoted_changes: [
        {
          changeId,
          promotedAt: '2026-03-01T10:00:00Z',
          items: ['§9-item-1'],
        },
      ],
      legacy_changes: [],
    };

    const result = await scanSection9(tmpDir, evolveState);

    // 应返回 skippedAlreadyPromoted 包含该 changeId
    expect(result.skippedAlreadyPromoted).toContain(changeId);
    // candidates 与 legacyChanges 应为空
    expect(result.candidates).toEqual([]);
    expect(result.legacyChanges).toEqual([]);
  });
});


// ============================================================
// promoteCandidates 分组 patch 测试（TDD 红阶段 — 函数尚未实现）
// ============================================================
describe('EvolveService - promoteCandidates 分组 patch', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-evolve-promote-'));
    // 构造 specforge/context/ 目录与初始文件
    const contextDir = path.join(tmpDir, 'specforge', 'context');
    fsExtra.ensureDirSync(contextDir);
    fsExtra.writeFileSync(
      path.join(contextDir, 'context.md'),
      [
        '# Context（Rules 层）',
        '',
        '## 技术栈',
        '',
        '- TypeScript + Node.js',
        '',
        '## 禁动清单',
        '',
        '- 禁止直接 console.log',
        '',
      ].join('\n'),
    );
    fsExtra.writeFileSync(
      path.join(contextDir, 'architecture.md'),
      [
        '# Architecture（Structure 层）',
        '',
        '## 模块图',
        '',
        '- src/services/ → 业务服务层',
        '',
        '## 跨模块契约',
        '',
        '- scaffold-service 与 init 命令的 upsert 契约',
        '',
      ].join('\n'),
    );
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  // ============================================================
  // accept → patch context.md：候选 targetDoc 为 context.md 时追加到 context.md
  // ============================================================
  it('accept 候选 targetDoc=context.md 应追加内容到 context.md', async () => {
    const { promoteCandidates } = await import('../../../src/services/evolve-service.js');

    const accepted: import('../../../src/services/evolve-service.js').EvolveCandidate[] = [
      {
        changeId: '2026-05-11-flow-kit-integration',
        category: 'forbidden-list-change',
        item: '禁止在 service 层直接操作 DOM',
        targetDoc: 'context.md',
      },
    ];

    const evolveState: EvolveState = {
      schemaVersion: 1,
      promoted_changes: [],
    };

    const updatedState = await promoteCandidates(tmpDir, accepted, evolveState);

    // 验证 context.md 被追加了候选条目内容
    const contextContent = fsExtra.readFileSync(
      path.join(tmpDir, 'specforge', 'context', 'context.md'),
      'utf-8',
    );
    expect(contextContent).toContain('禁止在 service 层直接操作 DOM');

    // 验证 architecture.md 未被修改
    const archContent = fsExtra.readFileSync(
      path.join(tmpDir, 'specforge', 'context', 'architecture.md'),
      'utf-8',
    );
    expect(archContent).not.toContain('禁止在 service 层直接操作 DOM');

    // 验证 evolveState 被更新：promoted_changes 包含该 changeId
    expect(updatedState.promoted_changes.length).toBe(1);
    expect(updatedState.promoted_changes[0].changeId).toBe('2026-05-11-flow-kit-integration');
    expect(updatedState.promoted_changes[0].items).toContain('禁止在 service 层直接操作 DOM');
  });

  // ============================================================
  // accept → patch architecture.md：候选 targetDoc 为 architecture.md 时追加到 architecture.md
  // ============================================================
  it('accept 候选 targetDoc=architecture.md 应追加内容到 architecture.md', async () => {
    const { promoteCandidates } = await import('../../../src/services/evolve-service.js');

    const accepted: import('../../../src/services/evolve-service.js').EvolveCandidate[] = [
      {
        changeId: '2026-05-11-flow-kit-integration',
        category: 'new-abstraction',
        item: 'upsertUserAsset 作为用户资产统一入口',
        targetDoc: 'architecture.md',
      },
    ];

    const evolveState: EvolveState = {
      schemaVersion: 1,
      promoted_changes: [],
    };

    const updatedState = await promoteCandidates(tmpDir, accepted, evolveState);

    // 验证 architecture.md 被追加了候选条目内容
    const archContent = fsExtra.readFileSync(
      path.join(tmpDir, 'specforge', 'context', 'architecture.md'),
      'utf-8',
    );
    expect(archContent).toContain('upsertUserAsset 作为用户资产统一入口');

    // 验证 context.md 未被修改（不含该条目）
    const contextContent = fsExtra.readFileSync(
      path.join(tmpDir, 'specforge', 'context', 'context.md'),
      'utf-8',
    );
    expect(contextContent).not.toContain('upsertUserAsset 作为用户资产统一入口');

    // 验证 evolveState 被更新
    expect(updatedState.promoted_changes.length).toBe(1);
    expect(updatedState.promoted_changes[0].changeId).toBe('2026-05-11-flow-kit-integration');
    expect(updatedState.promoted_changes[0].items).toContain('upsertUserAsset 作为用户资产统一入口');
  });

  // ============================================================
  // skip → 不写：空 accepted 数组 → 文件不变、evolveState 不变
  // ============================================================
  it('空 accepted 数组应不修改任何文件且 evolveState 不变', async () => {
    const { promoteCandidates } = await import('../../../src/services/evolve-service.js');

    const accepted: import('../../../src/services/evolve-service.js').EvolveCandidate[] = [];

    const evolveState: EvolveState = {
      schemaVersion: 1,
      last_evolve_at: '2026-05-01T00:00:00Z',
      promoted_changes: [
        {
          changeId: '2026-04-01-previous-change',
          promotedAt: '2026-04-01T10:00:00Z',
          items: ['旧条目'],
        },
      ],
    };

    // 记录文件修改前的内容
    const contextBefore = fsExtra.readFileSync(
      path.join(tmpDir, 'specforge', 'context', 'context.md'),
      'utf-8',
    );
    const archBefore = fsExtra.readFileSync(
      path.join(tmpDir, 'specforge', 'context', 'architecture.md'),
      'utf-8',
    );

    const updatedState = await promoteCandidates(tmpDir, accepted, evolveState);

    // 验证文件内容未变
    const contextAfter = fsExtra.readFileSync(
      path.join(tmpDir, 'specforge', 'context', 'context.md'),
      'utf-8',
    );
    const archAfter = fsExtra.readFileSync(
      path.join(tmpDir, 'specforge', 'context', 'architecture.md'),
      'utf-8',
    );
    expect(contextAfter).toBe(contextBefore);
    expect(archAfter).toBe(archBefore);

    // 验证 evolveState 未变（promoted_changes 长度不变）
    expect(updatedState.promoted_changes.length).toBe(evolveState.promoted_changes.length);
    expect(updatedState.promoted_changes[0].changeId).toBe('2026-04-01-previous-change');
  });
});
