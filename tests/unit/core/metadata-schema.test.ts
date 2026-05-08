import { describe, it, expect } from 'vitest';
import {
  unifiedMetadataSchema,
  commandMetadataSchema,
  skillMetadataSchema,
  brainstormMetadataSchema,
  changeMetadataSchema,
} from '../../../src/core/metadata-schema.js';

// ---------------------------------------------------------------------------
// 有效测试数据工厂
// ---------------------------------------------------------------------------

/** 构造符合统一 Schema 的有效数据 */
function validUnifiedData(overrides?: Record<string, unknown>) {
  return {
    name: 'test-artifact',
    type: 'domain-rule',
    description: 'A test artifact for unit tests',
    version: '0.1.0',
    author: 'test-user',
    ...overrides,
  };
}

/** 构造符合命令 Schema 的有效数据 */
function validCommandData(overrides?: Record<string, unknown>) {
  return validUnifiedData({
    type: 'workflow-command',
    ...overrides,
  });
}

/** 构造符合技能 Schema 的有效数据 */
function validSkillData(overrides?: Record<string, unknown>) {
  return validUnifiedData({
    type: 'domain-rule',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// unifiedMetadataSchema
// ---------------------------------------------------------------------------

describe('unifiedMetadataSchema', () => {
  it('验证有效数据（5 字段完整）', () => {
    const result = unifiedMetadataSchema.safeParse(validUnifiedData());
    expect(result.success, `解析失败: ${JSON.stringify(result.error)}`).toBe(true);
  });

  it('name 缺失时失败', () => {
    const result = unifiedMetadataSchema.safeParse(validUnifiedData({ name: undefined }));
    expect(result.success).toBe(false);
  });

  it('type 缺失时失败', () => {
    const result = unifiedMetadataSchema.safeParse(validUnifiedData({ type: undefined }));
    expect(result.success).toBe(false);
  });

  it('description 缺失时失败', () => {
    const result = unifiedMetadataSchema.safeParse(
      validUnifiedData({ description: undefined }),
    );
    expect(result.success).toBe(false);
  });

  it('version 缺失时失败', () => {
    const result = unifiedMetadataSchema.safeParse(validUnifiedData({ version: undefined }));
    expect(result.success).toBe(false);
  });

  it('author 缺失时失败', () => {
    const result = unifiedMetadataSchema.safeParse(validUnifiedData({ author: undefined }));
    expect(result.success).toBe(false);
  });

  it('name 为空字符串时失败', () => {
    const result = unifiedMetadataSchema.safeParse(validUnifiedData({ name: '' }));
    expect(result.success).toBe(false);
  });

  it('type 为空字符串时失败', () => {
    const result = unifiedMetadataSchema.safeParse(validUnifiedData({ type: '' }));
    expect(result.success).toBe(false);
  });

  it('允许空的 description、version、author', () => {
    const result = unifiedMetadataSchema.safeParse(
      validUnifiedData({ description: '', version: '', author: '' }),
    );
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// commandMetadataSchema
// ---------------------------------------------------------------------------

describe('commandMetadataSchema', () => {
  it('type 以 -command 结尾时通过 (workflow-command)', () => {
    const result = commandMetadataSchema.safeParse(
      validCommandData({ type: 'workflow-command' }),
    );
    expect(result.success).toBe(true);
  });

  it('type 以 -command 结尾时通过 (tool-command)', () => {
    const result = commandMetadataSchema.safeParse(
      validCommandData({ type: 'tool-command' }),
    );
    expect(result.success).toBe(true);
  });

  it('type 以 -command 结尾时通过 (devflow-command)', () => {
    const result = commandMetadataSchema.safeParse(
      validCommandData({ type: 'devflow-command' }),
    );
    expect(result.success).toBe(true);
  });

  it('type 以 -command 结尾时通过 (gitflow-command)', () => {
    const result = commandMetadataSchema.safeParse(
      validCommandData({ type: 'gitflow-command' }),
    );
    expect(result.success).toBe(true);
  });

  it('type 为 domain-rule 时失败', () => {
    const result = commandMetadataSchema.safeParse(
      validCommandData({ type: 'domain-rule' }),
    );
    expect(result.success).toBe(false);
  });

  it('type 为 code-style 时失败', () => {
    const result = commandMetadataSchema.safeParse(
      validCommandData({ type: 'code-style' }),
    );
    expect(result.success).toBe(false);
  });

  it('type 为 workflow-step 时失败（不以 -command 结尾）', () => {
    const result = commandMetadataSchema.safeParse(
      validCommandData({ type: 'workflow-step' }),
    );
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// skillMetadataSchema
// ---------------------------------------------------------------------------

describe('skillMetadataSchema', () => {
  it('type 为 domain-rule 时通过', () => {
    const result = skillMetadataSchema.safeParse(
      validSkillData({ type: 'domain-rule' }),
    );
    expect(result.success).toBe(true);
  });

  it('type 为 code-style 时通过', () => {
    const result = skillMetadataSchema.safeParse(
      validSkillData({ type: 'code-style' }),
    );
    expect(result.success).toBe(true);
  });

  it('type 为 architecture-rule 时通过', () => {
    const result = skillMetadataSchema.safeParse(
      validSkillData({ type: 'architecture-rule' }),
    );
    expect(result.success).toBe(true);
  });

  it('type 为 workflow-step 时通过', () => {
    const result = skillMetadataSchema.safeParse(
      validSkillData({ type: 'workflow-step' }),
    );
    expect(result.success).toBe(true);
  });

  it('type 为 workflow-command 时失败', () => {
    const result = skillMetadataSchema.safeParse(
      validSkillData({ type: 'workflow-command' }),
    );
    expect(result.success).toBe(false);
  });

  it('type 为 tool-command 时失败', () => {
    const result = skillMetadataSchema.safeParse(
      validSkillData({ type: 'tool-command' }),
    );
    expect(result.success).toBe(false);
  });

  it('type 为任意以 -command 结尾的字符串时失败', () => {
    const result = skillMetadataSchema.safeParse(
      validSkillData({ type: 'unknown-command' }),
    );
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// brainstormMetadataSchema
// ---------------------------------------------------------------------------

describe('brainstormMetadataSchema', () => {
  function validBrainstormData(overrides?: Record<string, unknown>) {
    return {
      spec_id: 'spec-001',
      title: 'Test Specification',
      date: '2026-05-04',
      status: 'draft' as const,
      owner: 'test-user',
      ...overrides,
    };
  }

  it('验证有效数据（必填字段完整）', () => {
    const result = brainstormMetadataSchema.safeParse(validBrainstormData());
    expect(result.success).toBe(true);
  });

  it('验证有效数据（含 source_command）', () => {
    const result = brainstormMetadataSchema.safeParse(
      validBrainstormData({ source_command: 'requirements-cmd' }),
    );
    expect(result.success).toBe(true);
  });

  it('验证有效数据（含 tags）', () => {
    const result = brainstormMetadataSchema.safeParse(
      validBrainstormData({ tags: ['api', 'v2'] }),
    );
    expect(result.success).toBe(true);
  });

  it('验证有效数据（含 source_command 和 tags）', () => {
    const result = brainstormMetadataSchema.safeParse(
      validBrainstormData({
        source_command: 'requirements-cmd',
        tags: ['api', 'v2'],
      }),
    );
    expect(result.success).toBe(true);
  });

  it('spec_id 缺失时失败', () => {
    const result = brainstormMetadataSchema.safeParse(
      validBrainstormData({ spec_id: undefined }),
    );
    expect(result.success).toBe(false);
  });

  it('status 为 draft 时通过', () => {
    const result = brainstormMetadataSchema.safeParse(
      validBrainstormData({ status: 'draft' }),
    );
    expect(result.success).toBe(true);
  });

  it('status 为 executing 时通过', () => {
    const result = brainstormMetadataSchema.safeParse(
      validBrainstormData({ status: 'executing' }),
    );
    expect(result.success).toBe(true);
  });

  it('status 为 completed 时通过', () => {
    const result = brainstormMetadataSchema.safeParse(
      validBrainstormData({ status: 'completed' }),
    );
    expect(result.success).toBe(true);
  });

  it('status 为非法值时失败', () => {
    const result = brainstormMetadataSchema.safeParse(
      validBrainstormData({ status: 'unknown' }),
    );
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// changeMetadataSchema
// ---------------------------------------------------------------------------

describe('changeMetadataSchema', () => {
  function validChangeData(overrides?: Record<string, unknown>) {
    return {
      changeId: 'change-001',
      status: 'draft' as const,
      phase: 'proposal' as const,
      ...overrides,
    };
  }

  it('验证有效数据（最小字段集）', () => {
    const result = changeMetadataSchema.safeParse(validChangeData());
    expect(result.success).toBe(true);
  });

  it('验证有效数据（含 worktree/artifacts/timestamps）', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({
        worktree: {
          branch: 'feat/change-001',
          rootPath: '/path/to/worktree',
          changePath: '/path/to/worktree/change-001',
        },
        artifacts: {
          proposal: 'proposal.md',
          design: 'design.md',
          tasks: 'tasks.md',
        },
        timestamps: {
          createdAt: '2026-05-04T10:00:00Z',
          updatedAt: '2026-05-04T12:00:00Z',
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it('验证有效数据（artifacts 仅含 proposal）', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({
        artifacts: {
          proposal: 'proposal.md',
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it('验证有效数据（artifacts 含 qualityReport）', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({
        artifacts: {
          proposal: 'PROPOSAL.md',
          design: 'DESIGN.md',
          tasks: 'TASKS.md',
          qualityReport: 'QUALITY-REPORT.md',
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it('验证有效数据（artifacts 仅含 retrospective，opsRunbook 已并入 release.OPS-RUNBOOK.md）', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({
        phase: 'evolution',
        artifacts: {
          retrospective: 'RETROSPECTIVE.md',
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it('phase 取值 proposal 有效', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({ phase: 'proposal' }),
    );
    expect(result.success).toBe(true);
  });

  it('phase 取值 design 有效', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({ phase: 'design' }),
    );
    expect(result.success).toBe(true);
  });

  it('phase 取值 tasks 有效', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({ phase: 'tasks' }),
    );
    expect(result.success).toBe(true);
  });

  it('phase 取值 quality 有效', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({ phase: 'quality' }),
    );
    expect(result.success).toBe(true);
  });

  it('phase 取值 release 有效', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({ phase: 'release' }),
    );
    expect(result.success).toBe(true);
  });

  it('phase 取值 operations 无效（v0.2.0 已合并到 release）', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({ phase: 'operations' }),
    );
    expect(result.success).toBe(false);
  });

  it('phase 取值 evolution 有效', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({ phase: 'evolution' }),
    );
    expect(result.success).toBe(true);
  });

  it('phase 取值 spec 无效（旧值，已移除）', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({ phase: 'spec' }),
    );
    expect(result.success).toBe(false);
  });

  it('status 取值 draft 有效', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({ status: 'draft' }),
    );
    expect(result.success).toBe(true);
  });

  it('status 取值 executing 有效', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({ status: 'executing' }),
    );
    expect(result.success).toBe(true);
  });

  it('status 取值 completed 有效', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({ status: 'completed' }),
    );
    expect(result.success).toBe(true);
  });

  it('changeId 缺失时失败', () => {
    const result = changeMetadataSchema.safeParse(
      validChangeData({ changeId: undefined }),
    );
    expect(result.success).toBe(false);
  });
});
