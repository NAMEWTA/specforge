import { describe, it, expect } from 'vitest';
import {
  HealthReportSchema,
  ProbeResultSchema,
} from '../../../src/services/health-service.js';

// ============================================================
// 辅助：构造最小合法 ProbeResult
// ============================================================
function buildMinimalProbeResult(): Record<string, unknown> {
  return {
    probe: 'jscpd',
    available: true,
    topIssues: [],
  };
}

// ============================================================
// 辅助：构造完整合法 ProbeResult（所有可选字段填满）
// ============================================================
function buildFullProbeResult(): Record<string, unknown> {
  return {
    probe: 'knip',
    available: true,
    fallbackReason: undefined,
    score: 85,
    topIssues: [
      { severity: 'high', file: 'src/unused.ts', message: '未使用的导出' },
      { severity: 'medium', file: 'src/old.ts', message: '死代码分支' },
    ],
    rawOutputExcerpt: 'knip output line 1\nknip output line 2',
  };
}

// ============================================================
// 辅助：构造最小合法 HealthReport
// ============================================================
function buildMinimalHealthReport(): Record<string, unknown> {
  return {
    scannedAt: '2026-05-11T08:00:00Z',
    rootDir: '/home/user/project',
    probes: [buildMinimalProbeResult()],
    unusedDependencies: [],
    overallScore: 75,
    recommendations: [],
  };
}

// ============================================================
// 辅助：构造完整合法 HealthReport（所有字段填满）
// ============================================================
function buildFullHealthReport(): Record<string, unknown> {
  return {
    scannedAt: '2026-05-11T10:30:00Z',
    rootDir: '/workspace/specforge',
    probes: [
      buildFullProbeResult(),
      {
        probe: 'baseline',
        available: true,
        score: 60,
        topIssues: [
          { severity: 'low', file: 'src/legacy.ts', message: '文件过大' },
        ],
      },
    ],
    unusedDependencies: ['lodash', 'moment'],
    overallScore: 72,
    recommendations: ['移除未使用依赖 lodash', '拆分 src/legacy.ts'],
  };
}

// ============================================================
// ProbeResult schema 校验
// ============================================================
describe('HealthService - ProbeResultSchema 校验', () => {
  // ----------------------------------------------------------
  // 合法输入
  // ----------------------------------------------------------
  describe('合法输入', () => {
    it('available=true 且含 score 应通过', () => {
      const data = {
        probe: 'jscpd',
        available: true,
        score: 92,
        topIssues: [
          { severity: 'high', file: 'src/dup.ts', message: '重复代码块' },
        ],
      };
      const result = ProbeResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('available=false 且含 fallbackReason 应通过', () => {
      const data = {
        probe: 'vulture',
        available: false,
        fallbackReason: '本机未安装 vulture',
        topIssues: [],
      };
      const result = ProbeResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('最小合法 ProbeResult（仅必填字段）应通过', () => {
      const data = buildMinimalProbeResult();
      const result = ProbeResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('所有合法 probe 枚举值应通过', () => {
      const probes = ['jscpd', 'knip', 'vulture', 'staticcheck', 'baseline'] as const;
      for (const probe of probes) {
        const data = { ...buildMinimalProbeResult(), probe };
        const result = ProbeResultSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('所有合法 severity 枚举值应通过', () => {
      const severities = ['high', 'medium', 'low'] as const;
      for (const severity of severities) {
        const data = {
          ...buildMinimalProbeResult(),
          topIssues: [{ severity, file: 'test.ts', message: '测试' }],
        };
        const result = ProbeResultSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });
  });

  // ----------------------------------------------------------
  // 非法输入
  // ----------------------------------------------------------
  describe('非法输入', () => {
    it('缺少 probe（name）字段应失败', () => {
      const data = { available: true, topIssues: [] };
      const result = ProbeResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('无效 probe 枚举值应失败', () => {
      const data = { ...buildMinimalProbeResult(), probe: 'invalid-probe' };
      const result = ProbeResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 available 字段应失败', () => {
      const data = { probe: 'jscpd', topIssues: [] };
      const result = ProbeResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 topIssues 字段应失败', () => {
      const data = { probe: 'jscpd', available: true };
      const result = ProbeResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('score 超出 0-100 范围应失败', () => {
      const data = { ...buildMinimalProbeResult(), score: 101 };
      const result = ProbeResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('score 为负数应失败', () => {
      const data = { ...buildMinimalProbeResult(), score: -1 };
      const result = ProbeResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('topIssues 中缺少 severity 应失败', () => {
      const data = {
        ...buildMinimalProbeResult(),
        topIssues: [{ file: 'test.ts', message: '问题' }],
      };
      const result = ProbeResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('topIssues 中无效 severity 枚举值应失败', () => {
      const data = {
        ...buildMinimalProbeResult(),
        topIssues: [{ severity: 'critical', file: 'test.ts', message: '问题' }],
      };
      const result = ProbeResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================
// HealthReport schema 校验
// ============================================================
describe('HealthService - HealthReportSchema 校验', () => {
  // ----------------------------------------------------------
  // 合法输入
  // ----------------------------------------------------------
  describe('合法输入', () => {
    it('所有字段完整的 HealthReport 应通过', () => {
      const data = buildFullHealthReport();
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('可选字段省略（unusedDependencies 为空、recommendations 为空）应通过', () => {
      const data = buildMinimalHealthReport();
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('overallScore 边界值 0 应通过', () => {
      const data = { ...buildMinimalHealthReport(), overallScore: 0 };
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('overallScore 边界值 100 应通过', () => {
      const data = { ...buildMinimalHealthReport(), overallScore: 100 };
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // 非法输入：probes 为空数组
  // ----------------------------------------------------------
  describe('非法输入 - probes 非空约束', () => {
    it('probes 为空数组应失败（probes 必须非空）', () => {
      const data = { ...buildMinimalHealthReport(), probes: [] };
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 非法输入：缺少必填字段
  // ----------------------------------------------------------
  describe('非法输入 - 缺少必填字段', () => {
    it('缺少 scannedAt 应失败', () => {
      const data = buildMinimalHealthReport();
      delete (data as any).scannedAt;
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 rootDir 应失败', () => {
      const data = buildMinimalHealthReport();
      delete (data as any).rootDir;
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 probes 应失败', () => {
      const data = buildMinimalHealthReport();
      delete (data as any).probes;
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 overallScore 应失败', () => {
      const data = buildMinimalHealthReport();
      delete (data as any).overallScore;
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 unusedDependencies 应失败', () => {
      const data = buildMinimalHealthReport();
      delete (data as any).unusedDependencies;
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 recommendations 应失败', () => {
      const data = buildMinimalHealthReport();
      delete (data as any).recommendations;
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 非法输入：unusedDependencies 包含非字符串
  // ----------------------------------------------------------
  describe('非法输入 - unusedDependencies 类型校验', () => {
    it('unusedDependencies 包含非字符串元素应失败', () => {
      const data = { ...buildMinimalHealthReport(), unusedDependencies: [123, true] };
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('unusedDependencies 非数组应失败', () => {
      const data = { ...buildMinimalHealthReport(), unusedDependencies: 'lodash' };
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 非法输入：overallScore 超出范围
  // ----------------------------------------------------------
  describe('非法输入 - overallScore 范围校验', () => {
    it('overallScore 超过 100 应失败', () => {
      const data = { ...buildMinimalHealthReport(), overallScore: 101 };
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('overallScore 为负数应失败', () => {
      const data = { ...buildMinimalHealthReport(), overallScore: -1 };
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('overallScore 非数字应失败', () => {
      const data = { ...buildMinimalHealthReport(), overallScore: 'high' };
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 非法输入：recommendations 类型校验
  // ----------------------------------------------------------
  describe('非法输入 - recommendations 类型校验', () => {
    it('recommendations 包含非字符串元素应失败', () => {
      const data = { ...buildMinimalHealthReport(), recommendations: [42, null] };
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('recommendations 非数组应失败', () => {
      const data = { ...buildMinimalHealthReport(), recommendations: '建议' };
      const result = HealthReportSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================
// 探针可用性检测与回退（Req 10.2, 10.3）
// ============================================================
import { vi, beforeEach, afterEach } from 'vitest';
import * as childProcess from 'node:child_process';
import { runHealthScan } from '../../../src/services/health-service.js';

// mock child_process 模块以控制探针可用性
vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('HealthService - 探针可用性检测与回退', () => {
  const mockedSpawnSync = childProcess.spawnSync as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------
  // 分支 1：探针可用 → 返回 available:true 与 score/topIssues
  // ----------------------------------------------------------
  describe('探针可用（available: true）', () => {
    it('jscpd 存在于 PATH 时，runHealthScan 返回的对应 ProbeResult 应含 available:true 与 score', async () => {
      // 模拟所有探针均可用（--version 返回 status 0）
      mockedSpawnSync.mockImplementation((cmd: string) => {
        if (cmd === 'jscpd' || cmd === 'knip' || cmd === 'vulture' || cmd === 'staticcheck') {
          return { status: 0, stdout: Buffer.from('v1.0.0'), stderr: Buffer.from(''), error: undefined };
        }
        return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from(''), error: undefined };
      });

      const report = await runHealthScan('/tmp/test-project', { probes: ['jscpd'] });

      // 应至少包含 jscpd 探针结果
      const jscpdResult = report.probes.find((p) => p.probe === 'jscpd');
      expect(jscpdResult).toBeDefined();
      expect(jscpdResult!.available).toBe(true);
      // 可用探针应有 score（数值型）
      expect(typeof jscpdResult!.score).toBe('number');
      // 可用探针不应有 fallbackReason
      expect(jscpdResult!.fallbackReason).toBeUndefined();
    });

    it('探针可用时 topIssues 应为数组', async () => {
      mockedSpawnSync.mockImplementation((cmd: string) => {
        if (cmd === 'knip') {
          return { status: 0, stdout: Buffer.from('v1.0.0'), stderr: Buffer.from(''), error: undefined };
        }
        return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from(''), error: undefined };
      });

      const report = await runHealthScan('/tmp/test-project', { probes: ['knip'] });

      const knipResult = report.probes.find((p) => p.probe === 'knip');
      expect(knipResult).toBeDefined();
      expect(knipResult!.available).toBe(true);
      expect(Array.isArray(knipResult!.topIssues)).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // 分支 2：探针不可用 → 返回 available:false 且有 fallbackReason
  // ----------------------------------------------------------
  describe('探针不可用（available: false）', () => {
    it('jscpd 不在 PATH 时，返回 available:false 且 fallbackReason 非空', async () => {
      // 模拟 jscpd 不可用（--version 返回非 0 或抛错）
      mockedSpawnSync.mockImplementation((cmd: string) => {
        if (cmd === 'jscpd') {
          return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from('not found'), error: new Error('ENOENT') };
        }
        // 其余探针也不可用
        return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from(''), error: new Error('ENOENT') };
      });

      const report = await runHealthScan('/tmp/test-project', { probes: ['jscpd'] });

      const jscpdResult = report.probes.find((p) => p.probe === 'jscpd');
      expect(jscpdResult).toBeDefined();
      expect(jscpdResult!.available).toBe(false);
      // 不可用时必须有 fallbackReason 说明原因
      expect(jscpdResult!.fallbackReason).toBeDefined();
      expect(typeof jscpdResult!.fallbackReason).toBe('string');
      expect(jscpdResult!.fallbackReason!.length).toBeGreaterThan(0);
    });

    it('vulture 不可用时，其余探针仍继续执行', async () => {
      // 模拟 vulture 不可用，knip 可用
      mockedSpawnSync.mockImplementation((cmd: string) => {
        if (cmd === 'knip') {
          return { status: 0, stdout: Buffer.from('v1.0.0'), stderr: Buffer.from(''), error: undefined };
        }
        // vulture 及其他探针不可用
        return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from(''), error: new Error('ENOENT') };
      });

      const report = await runHealthScan('/tmp/test-project', { probes: ['vulture', 'knip'] });

      // vulture 应标记为不可用
      const vultureResult = report.probes.find((p) => p.probe === 'vulture');
      expect(vultureResult).toBeDefined();
      expect(vultureResult!.available).toBe(false);
      expect(vultureResult!.fallbackReason).toBeDefined();

      // knip 应正常执行
      const knipResult = report.probes.find((p) => p.probe === 'knip');
      expect(knipResult).toBeDefined();
      expect(knipResult!.available).toBe(true);
    });

    it('探针不可用时 topIssues 应为空数组', async () => {
      mockedSpawnSync.mockImplementation(() => {
        return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from(''), error: new Error('ENOENT') };
      });

      const report = await runHealthScan('/tmp/test-project', { probes: ['staticcheck'] });

      const result = report.probes.find((p) => p.probe === 'staticcheck');
      expect(result).toBeDefined();
      expect(result!.available).toBe(false);
      expect(result!.topIssues).toEqual([]);
    });
  });

  // ----------------------------------------------------------
  // 分支 3：所有外部探针不可用 → baseline 兜底
  // ----------------------------------------------------------
  describe('所有外部探针不可用 → baseline 兜底', () => {
    it('四类外部探针均不可用时，report.probes 仍非空（含 baseline）', async () => {
      // 模拟所有外部探针均不可用
      mockedSpawnSync.mockImplementation(() => {
        return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from(''), error: new Error('ENOENT') };
      });

      const report = await runHealthScan('/tmp/test-project');

      // probes 数组不应为空
      expect(report.probes.length).toBeGreaterThan(0);
      // 应包含 baseline 探针
      const baselineResult = report.probes.find((p) => p.probe === 'baseline');
      expect(baselineResult).toBeDefined();
      expect(baselineResult!.available).toBe(true);
    });

    it('baseline 探针应有 score 且 topIssues 为数组', async () => {
      mockedSpawnSync.mockImplementation(() => {
        return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from(''), error: new Error('ENOENT') };
      });

      const report = await runHealthScan('/tmp/test-project');

      const baselineResult = report.probes.find((p) => p.probe === 'baseline');
      expect(baselineResult).toBeDefined();
      expect(typeof baselineResult!.score).toBe('number');
      expect(Array.isArray(baselineResult!.topIssues)).toBe(true);
    });

    it('所有探针不可用时，report 仍通过 HealthReportSchema 校验', async () => {
      mockedSpawnSync.mockImplementation(() => {
        return { status: 1, stdout: Buffer.from(''), stderr: Buffer.from(''), error: new Error('ENOENT') };
      });

      const report = await runHealthScan('/tmp/test-project');

      // 整个 report 应符合 schema
      const validation = HealthReportSchema.safeParse(report);
      expect(validation.success).toBe(true);
    });
  });
});


// ============================================================
// Health Report 落盘与未用依赖交互（Req 10.4, 10.5, 10.6）
// ============================================================
import fsExtra from 'fs-extra';
import { handleUnusedDependencies } from '../../../src/services/health-service.js';
import type { HealthReport } from '../../../src/services/health-service.js';

// mock inquirer 模块以控制用户交互选择
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// mock fs-extra 模块以控制文件读写
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
    outputFile: vi.fn(),
    ensureDir: vi.fn(),
  },
}));

describe('HealthService - health report 落盘与未用依赖交互', () => {
  // 引入 mocked inquirer
  let mockedInquirer: { prompt: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    // 获取 mocked inquirer 引用
    const inquirerModule = await import('inquirer');
    mockedInquirer = inquirerModule.default as unknown as { prompt: ReturnType<typeof vi.fn> };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 辅助：构造含未用依赖的 HealthReport
  function buildReportWithUnusedDeps(deps: string[]): HealthReport {
    return {
      scannedAt: '2026-05-11T08:00:00Z',
      rootDir: '/tmp/test-project',
      probes: [
        {
          probe: 'baseline',
          available: true,
          score: 80,
          topIssues: [],
        },
      ],
      overallScore: 80,
      unusedDependencies: deps,
      recommendations: ['移除未使用依赖'],
    };
  }

  // ----------------------------------------------------------
  // 分支 1：interactive 模式 + unusedDependencies 非空 → 展示三选一
  // ----------------------------------------------------------
  describe('interactive 模式展示三选一（Req 10.5）', () => {
    it('unusedDependencies 非空且 interactive=true 时，应向用户展示三选一提示', async () => {
      const report = buildReportWithUnusedDeps(['lodash', 'moment']);
      const rootDir = '/tmp/test-project';

      // 模拟用户选择「仅记录」
      mockedInquirer.prompt.mockResolvedValueOnce({ choice: 'log-only' });

      await handleUnusedDependencies(report, rootDir, { interactive: true });

      // 应调用 inquirer.prompt 一次
      expect(mockedInquirer.prompt).toHaveBeenCalledTimes(1);

      // 验证 prompt 参数包含三个选项
      const promptCall = mockedInquirer.prompt.mock.calls[0][0];
      const question = Array.isArray(promptCall) ? promptCall[0] : promptCall;
      expect(question.choices).toHaveLength(3);
    });

    it('unusedDependencies 为空时，不应展示交互提示', async () => {
      const report = buildReportWithUnusedDeps([]);
      const rootDir = '/tmp/test-project';

      await handleUnusedDependencies(report, rootDir, { interactive: true });

      // 不应调用 inquirer.prompt
      expect(mockedInquirer.prompt).not.toHaveBeenCalled();
    });

    it('interactive=false 时，即使有未用依赖也不应展示交互提示', async () => {
      const report = buildReportWithUnusedDeps(['lodash']);
      const rootDir = '/tmp/test-project';

      await handleUnusedDependencies(report, rootDir, { interactive: false });

      // 非交互模式不应调用 inquirer.prompt
      expect(mockedInquirer.prompt).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // 分支 2：选择「写入禁动清单」→ upsert context.md
  // ----------------------------------------------------------
  describe('选择「写入禁动清单」触发 upsert（Req 10.6）', () => {
    it('用户选择写入禁动清单时，应以 upsert 语义追加到 context.md#禁动清单', async () => {
      const report = buildReportWithUnusedDeps(['lodash', 'moment']);
      const rootDir = '/tmp/test-project';

      // 模拟用户选择「写入禁动清单」
      mockedInquirer.prompt.mockResolvedValueOnce({ choice: 'write-blocklist' });

      // 模拟 context.md 已存在且含禁动清单段
      const mockedFsExtra = fsExtra as unknown as {
        pathExists: ReturnType<typeof vi.fn>;
        readFile: ReturnType<typeof vi.fn>;
        outputFile: ReturnType<typeof vi.fn>;
        ensureDir: ReturnType<typeof vi.fn>;
      };
      mockedFsExtra.pathExists.mockResolvedValue(true);
      mockedFsExtra.readFile.mockResolvedValue(
        '# Context\n\n## 禁动清单\n\n- existing-dep\n\n## 其他段\n',
      );
      mockedFsExtra.outputFile.mockResolvedValue(undefined);
      mockedFsExtra.ensureDir.mockResolvedValue(undefined);

      await handleUnusedDependencies(report, rootDir, { interactive: true });

      // 应调用 outputFile 写入 context.md
      expect(mockedFsExtra.outputFile).toHaveBeenCalled();

      // 写入内容应包含新增的未用依赖
      const writeCall = mockedFsExtra.outputFile.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('context.md'),
      );
      expect(writeCall).toBeDefined();
      const writtenContent = writeCall![1] as string;
      // 新增依赖应出现在写入内容中
      expect(writtenContent).toContain('lodash');
      expect(writtenContent).toContain('moment');
      // 既有条目不应被覆盖（upsert 语义）
      expect(writtenContent).toContain('existing-dep');
    });

    it('context.md 不存在时，应创建文件并写入禁动清单', async () => {
      const report = buildReportWithUnusedDeps(['axios']);
      const rootDir = '/tmp/test-project';

      // 模拟用户选择「写入禁动清单」
      mockedInquirer.prompt.mockResolvedValueOnce({ choice: 'write-blocklist' });

      const mockedFsExtra = fsExtra as unknown as {
        pathExists: ReturnType<typeof vi.fn>;
        readFile: ReturnType<typeof vi.fn>;
        outputFile: ReturnType<typeof vi.fn>;
        ensureDir: ReturnType<typeof vi.fn>;
      };
      // context.md 不存在
      mockedFsExtra.pathExists.mockResolvedValue(false);
      mockedFsExtra.outputFile.mockResolvedValue(undefined);
      mockedFsExtra.ensureDir.mockResolvedValue(undefined);

      await handleUnusedDependencies(report, rootDir, { interactive: true });

      // 应调用 outputFile 创建 context.md
      expect(mockedFsExtra.outputFile).toHaveBeenCalled();
      const writeCall = mockedFsExtra.outputFile.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('context.md'),
      );
      expect(writeCall).toBeDefined();
      const writtenContent = writeCall![1] as string;
      expect(writtenContent).toContain('axios');
      expect(writtenContent).toContain('禁动清单');
    });
  });

  // ----------------------------------------------------------
  // 分支 3：选择「仅记录」→ 不修改 context.md
  // ----------------------------------------------------------
  describe('选择「仅记录」不改 context.md（Req 10.5）', () => {
    it('用户选择仅记录时，不应写入 context.md', async () => {
      const report = buildReportWithUnusedDeps(['lodash', 'moment']);
      const rootDir = '/tmp/test-project';

      // 模拟用户选择「仅记录」
      mockedInquirer.prompt.mockResolvedValueOnce({ choice: 'log-only' });

      const mockedFsExtra = fsExtra as unknown as {
        pathExists: ReturnType<typeof vi.fn>;
        readFile: ReturnType<typeof vi.fn>;
        outputFile: ReturnType<typeof vi.fn>;
        ensureDir: ReturnType<typeof vi.fn>;
      };
      mockedFsExtra.pathExists.mockResolvedValue(true);
      mockedFsExtra.outputFile.mockResolvedValue(undefined);
      mockedFsExtra.ensureDir.mockResolvedValue(undefined);

      await handleUnusedDependencies(report, rootDir, { interactive: true });

      // 不应对 context.md 进行写入
      const contextWriteCall = mockedFsExtra.outputFile.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('context.md'),
      );
      expect(contextWriteCall).toBeUndefined();
    });

    it('用户选择忽略时，也不应写入 context.md', async () => {
      const report = buildReportWithUnusedDeps(['lodash']);
      const rootDir = '/tmp/test-project';

      // 模拟用户选择「忽略」
      mockedInquirer.prompt.mockResolvedValueOnce({ choice: 'ignore' });

      const mockedFsExtra = fsExtra as unknown as {
        pathExists: ReturnType<typeof vi.fn>;
        readFile: ReturnType<typeof vi.fn>;
        outputFile: ReturnType<typeof vi.fn>;
        ensureDir: ReturnType<typeof vi.fn>;
      };
      mockedFsExtra.pathExists.mockResolvedValue(true);
      mockedFsExtra.outputFile.mockResolvedValue(undefined);
      mockedFsExtra.ensureDir.mockResolvedValue(undefined);

      await handleUnusedDependencies(report, rootDir, { interactive: true });

      // 不应对 context.md 进行写入
      const contextWriteCall = mockedFsExtra.outputFile.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('context.md'),
      );
      expect(contextWriteCall).toBeUndefined();
    });
  });
});
