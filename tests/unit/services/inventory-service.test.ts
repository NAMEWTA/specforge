import { describe, it, expect } from 'vitest';
import { InventoryResultSchema } from '../../../src/services/inventory-service.js';

// ============================================================
// 辅助：构造最小合法 InventoryResult
// ============================================================
function buildMinimalValid() {
  return {
    scannedAt: '2026-05-11T08:00:00Z',
    rootDir: '/home/user/project',
    signals: {
      techStack: [
        {
          ecosystem: 'node' as const,
          manifest: 'package.json',
        },
      ],
      naming: {
        filename: 'kebab-case' as const,
        identifier: 'camelCase' as const,
        sampleSize: 50,
      },
      existingAbstractions: [
        {
          kind: 'service' as const,
          name: 'UserService',
          path: 'src/services/user-service.ts',
        },
      ],
      aiDocs: [],
      directoryLayout: ['src/', 'tests/'],
      testFrameworks: ['vitest'],
      forbidden: [],
    },
  };
}

// ============================================================
// 辅助：构造完整合法 InventoryResult（所有可选字段填满）
// ============================================================
function buildFullValid() {
  return {
    scannedAt: '2026-05-11T10:30:00Z',
    rootDir: '/workspace/specforge',
    signals: {
      techStack: [
        {
          ecosystem: 'node' as const,
          manifest: 'package.json',
          runtime: 'Node >= 24',
          packageManager: 'pnpm',
        },
        {
          ecosystem: 'python' as const,
          manifest: 'pyproject.toml',
          runtime: 'Python 3.12',
          packageManager: 'pip',
        },
      ],
      naming: {
        filename: 'kebab-case' as const,
        identifier: 'camelCase' as const,
        sampleSize: 120,
      },
      existingAbstractions: [
        {
          kind: 'service' as const,
          name: 'ScaffoldService',
          path: 'src/services/scaffold-service.ts',
        },
        {
          kind: 'controller' as const,
          name: 'InitCommand',
          path: 'src/commands/init.ts',
        },
        {
          kind: 'util' as const,
          name: 'logger',
          path: 'src/utils/logger.ts',
        },
      ],
      aiDocs: [
        { path: 'AGENTS.md', adopted: true },
        { path: '.cursor/rules/main.md', adopted: false },
      ],
      directoryLayout: ['src/', 'tests/', 'templates/', 'scripts/', 'bin/'],
      testFrameworks: ['vitest', 'jest'],
      forbidden: ['lodash', 'legacy-helper'],
    },
  };
}

describe('InventoryService - InventoryResultSchema 校验', () => {
  // ============================================================
  // 1. techStack 信号
  // ============================================================
  describe('techStack - 合法输入', () => {
    it('最小合法：仅 ecosystem + manifest 应通过', () => {
      const data = buildMinimalValid();
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('完整合法：含 runtime + packageManager 应通过', () => {
      const data = buildFullValid();
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('所有合法 ecosystem 枚举值应通过', () => {
      const ecosystems = ['node', 'python', 'go', 'rust', 'java', 'other'] as const;
      for (const eco of ecosystems) {
        const data = buildMinimalValid();
        data.signals.techStack = [{ ecosystem: eco, manifest: 'some-manifest' }];
        const result = InventoryResultSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('techStack - 非法输入', () => {
    it('无效 ecosystem 枚举值应失败', () => {
      const data = buildMinimalValid();
      (data.signals.techStack as any) = [{ ecosystem: 'invalid-eco', manifest: 'package.json' }];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 manifest 字段应失败', () => {
      const data = buildMinimalValid();
      (data.signals.techStack as any) = [{ ecosystem: 'node' }];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('techStack 非数组应失败', () => {
      const data = buildMinimalValid();
      (data.signals as any).techStack = 'not-an-array';
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 2. naming 信号
  // ============================================================
  describe('naming - 合法输入', () => {
    it('所有合法 filename 枚举值应通过', () => {
      const filenames = ['kebab-case', 'snake_case', 'camelCase', 'PascalCase', 'mixed'] as const;
      for (const fn of filenames) {
        const data = buildMinimalValid();
        data.signals.naming.filename = fn;
        const result = InventoryResultSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('sampleSize 为 0（边界值）应通过', () => {
      const data = buildMinimalValid();
      data.signals.naming.sampleSize = 0;
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('sampleSize 为大数值应通过', () => {
      const data = buildMinimalValid();
      data.signals.naming.sampleSize = 99999;
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('naming - 非法输入', () => {
    it('无效 filename 枚举值应失败', () => {
      const data = buildMinimalValid();
      (data.signals.naming as any).filename = 'SCREAMING_CASE';
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('无效 identifier 枚举值应失败', () => {
      const data = buildMinimalValid();
      (data.signals.naming as any).identifier = 'kebab-case';
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('sampleSize 非数字应失败', () => {
      const data = buildMinimalValid();
      (data.signals.naming as any).sampleSize = 'many';
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 sampleSize 字段应失败', () => {
      const data = buildMinimalValid();
      delete (data.signals.naming as any).sampleSize;
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 3. existingAbstractions 信号
  // ============================================================
  describe('existingAbstractions - 合法输入', () => {
    it('空数组应通过', () => {
      const data = buildMinimalValid();
      data.signals.existingAbstractions = [];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('恰好 200 条（上限边界值）应通过', () => {
      const data = buildMinimalValid();
      data.signals.existingAbstractions = Array.from({ length: 200 }, (_, i) => ({
        kind: 'service' as const,
        name: `Service${i}`,
        path: `src/services/service-${i}.ts`,
      }));
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('所有合法 kind 枚举值应通过', () => {
      const kinds = ['service', 'controller', 'repo', 'util', 'model', 'other'] as const;
      const data = buildMinimalValid();
      data.signals.existingAbstractions = kinds.map((kind) => ({
        kind,
        name: `${kind}Example`,
        path: `src/${kind}/example.ts`,
      }));
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('existingAbstractions - 非法输入', () => {
    it('超过 200 条（超出上限）应失败', () => {
      const data = buildMinimalValid();
      data.signals.existingAbstractions = Array.from({ length: 201 }, (_, i) => ({
        kind: 'service' as const,
        name: `Service${i}`,
        path: `src/services/service-${i}.ts`,
      }));
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('无效 kind 枚举值应失败', () => {
      const data = buildMinimalValid();
      (data.signals.existingAbstractions as any) = [
        { kind: 'invalid-kind', name: 'Foo', path: 'src/foo.ts' },
      ];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 name 字段应失败', () => {
      const data = buildMinimalValid();
      (data.signals.existingAbstractions as any) = [
        { kind: 'service', path: 'src/services/foo.ts' },
      ];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 path 字段应失败', () => {
      const data = buildMinimalValid();
      (data.signals.existingAbstractions as any) = [{ kind: 'service', name: 'FooService' }];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 4. forbidden 信号
  // ============================================================
  describe('forbidden - 合法输入', () => {
    it('空数组应通过', () => {
      const data = buildMinimalValid();
      data.signals.forbidden = [];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('含多条禁动项应通过', () => {
      const data = buildMinimalValid();
      data.signals.forbidden = ['lodash', 'moment', 'legacy-helper'];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('forbidden - 非法输入', () => {
    it('非数组应失败', () => {
      const data = buildMinimalValid();
      (data.signals as any).forbidden = 'not-an-array';
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('数组元素非字符串应失败', () => {
      const data = buildMinimalValid();
      (data.signals as any).forbidden = [123, true];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 5. aiDocs 信号
  // ============================================================
  describe('aiDocs - 合法输入', () => {
    it('空数组应通过', () => {
      const data = buildMinimalValid();
      data.signals.aiDocs = [];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('含 adopted=true / adopted=false / adopted 缺省 三种形态应通过', () => {
      const data = buildMinimalValid();
      data.signals.aiDocs = [
        { path: 'AGENTS.md', adopted: true },
        { path: 'CLAUDE.md', adopted: false },
        { path: '.cursor/rules/main.md' },
      ];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('aiDocs - 非法输入', () => {
    it('缺少 path 字段应失败', () => {
      const data = buildMinimalValid();
      (data.signals.aiDocs as any) = [{ adopted: true }];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('adopted 非布尔值应失败', () => {
      const data = buildMinimalValid();
      (data.signals.aiDocs as any) = [{ path: 'AGENTS.md', adopted: 'yes' }];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('非数组应失败', () => {
      const data = buildMinimalValid();
      (data.signals as any).aiDocs = { path: 'AGENTS.md' };
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 6. directoryLayout 信号
  // ============================================================
  describe('directoryLayout - 合法输入', () => {
    it('空数组应通过', () => {
      const data = buildMinimalValid();
      data.signals.directoryLayout = [];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('含多个目录路径应通过', () => {
      const data = buildMinimalValid();
      data.signals.directoryLayout = ['src/', 'tests/', 'docs/', 'scripts/', 'bin/'];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('directoryLayout - 非法输入', () => {
    it('非数组应失败', () => {
      const data = buildMinimalValid();
      (data.signals as any).directoryLayout = 'src/';
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('数组元素非字符串应失败', () => {
      const data = buildMinimalValid();
      (data.signals as any).directoryLayout = [42, null];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 7. testFrameworks 信号
  // ============================================================
  describe('testFrameworks - 合法输入', () => {
    it('空数组应通过', () => {
      const data = buildMinimalValid();
      data.signals.testFrameworks = [];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('含多个测试框架名应通过', () => {
      const data = buildMinimalValid();
      data.signals.testFrameworks = ['vitest', 'jest', 'mocha'];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('testFrameworks - 非法输入', () => {
    it('非数组应失败', () => {
      const data = buildMinimalValid();
      (data.signals as any).testFrameworks = 'vitest';
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('数组元素非字符串应失败', () => {
      const data = buildMinimalValid();
      (data.signals as any).testFrameworks = [true, 123];
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 顶层字段校验
  // ============================================================
  describe('顶层字段 - 合法输入', () => {
    it('完整对象（所有可选字段填满）应通过', () => {
      const data = buildFullValid();
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('最小合法对象应通过', () => {
      const data = buildMinimalValid();
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('顶层字段 - 非法输入', () => {
    it('缺少 scannedAt 应失败', () => {
      const data = buildMinimalValid();
      delete (data as any).scannedAt;
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 rootDir 应失败', () => {
      const data = buildMinimalValid();
      delete (data as any).rootDir;
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('缺少 signals 应失败', () => {
      const data = buildMinimalValid();
      delete (data as any).signals;
      const result = InventoryResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('signals 缺少任一必填信号类别应失败', () => {
      const requiredSignals = [
        'techStack',
        'naming',
        'existingAbstractions',
        'aiDocs',
        'directoryLayout',
        'testFrameworks',
        'forbidden',
      ];
      for (const signal of requiredSignals) {
        const data = buildMinimalValid();
        delete (data.signals as any)[signal];
        const result = InventoryResultSchema.safeParse(data);
        expect(result.success).toBe(false);
      }
    });
  });
});

// ============================================================
// AI 文档交互询问测试（Req 4.4, 4.5）
// ============================================================
import { detectBrownfield, scanProjectInventory } from '../../../src/services/inventory-service.js';
import fsExtra from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach } from 'vitest';

describe('InventoryService - AI 文档交互询问', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-aidocs-'));
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  // ============================================================
  // 分支 1：--no-interactive 模式下检测到 AI 文档，adopted 写 undefined
  // ============================================================
  describe('非交互模式（interactive: false）', () => {
    it('检测到 AGENTS.md 时应在 aiDocs 中包含该条目且 adopted 为 undefined', async () => {
      // 创建 AGENTS.md
      fsExtra.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# AI Agent Guide\n');

      const result = await scanProjectInventory(tmpDir, { interactive: false });

      // 应检测到 AGENTS.md
      const agentsDoc = result.signals.aiDocs.find((d) => d.path === 'AGENTS.md');
      expect(agentsDoc).toBeDefined();
      // --no-interactive 模式下 adopted 应为 undefined（未决）
      expect(agentsDoc!.adopted).toBeUndefined();
    });

    it('检测到 CLAUDE.md 时应在 aiDocs 中包含该条目且 adopted 为 undefined', async () => {
      // 创建 CLAUDE.md
      fsExtra.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Claude Rules\n');

      const result = await scanProjectInventory(tmpDir, { interactive: false });

      // 应检测到 CLAUDE.md
      const claudeDoc = result.signals.aiDocs.find((d) => d.path === 'CLAUDE.md');
      expect(claudeDoc).toBeDefined();
      expect(claudeDoc!.adopted).toBeUndefined();
    });

    it('同时存在多个 AI 文档时应全部检测且 adopted 均为 undefined', async () => {
      // 创建多个 AI 文档
      fsExtra.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# Agents\n');
      fsExtra.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Claude\n');
      fsExtra.ensureDirSync(path.join(tmpDir, '.cursor', 'rules'));
      fsExtra.writeFileSync(path.join(tmpDir, '.cursor', 'rules', 'main.md'), '# Cursor Rules\n');

      const result = await scanProjectInventory(tmpDir, { interactive: false });

      // 应检测到所有 AI 文档
      expect(result.signals.aiDocs.length).toBeGreaterThanOrEqual(3);
      // 所有条目的 adopted 均应为 undefined
      for (const doc of result.signals.aiDocs) {
        expect(doc.adopted).toBeUndefined();
      }
    });

    it('不存在任何 AI 文档时 aiDocs 应为空数组', async () => {
      // 不创建任何 AI 文档
      const result = await scanProjectInventory(tmpDir, { interactive: false });
      expect(result.signals.aiDocs).toEqual([]);
    });
  });

  // ============================================================
  // 分支 2：interactive 模式下检测到 AI 文档，adopted 应为布尔值
  // ============================================================
  describe('交互模式（interactive: true）', () => {
    it('检测到 AGENTS.md 时 aiDocs 应包含该条目且 adopted 为布尔值', async () => {
      // 创建 AGENTS.md
      fsExtra.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# AI Agent Guide\n');

      // 注意：interactive 模式下实际会触发三选一询问（采纳/忽略/查看）
      // 在单测中我们验证检测行为——adopted 应为布尔值（true 或 false）
      const result = await scanProjectInventory(tmpDir, { interactive: true });

      const agentsDoc = result.signals.aiDocs.find((d) => d.path === 'AGENTS.md');
      expect(agentsDoc).toBeDefined();
      // interactive 模式下 adopted 应为布尔值（经过用户选择后确定）
      expect(typeof agentsDoc!.adopted).toBe('boolean');
    });
  });
});

describe('InventoryService - detectBrownfield 探测', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-brownfield-'));
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  // ============================================================
  // 分支 1：有 manifest + 源文件 > 5 → brownfield（返回 true）
  // ============================================================
  it('有 manifest 且源文件 > 5 应判定为 brownfield', async () => {
    // 创建 package.json（主流清单文件之一）
    fsExtra.writeFileSync(path.join(tmpDir, 'package.json'), '{}');

    // 创建 src/ 目录并放入 6 个源文件（> 5）
    const srcDir = path.join(tmpDir, 'src');
    fsExtra.ensureDirSync(srcDir);
    for (let i = 1; i <= 6; i++) {
      fsExtra.writeFileSync(path.join(srcDir, `file-${i}.ts`), `// file ${i}`);
    }

    const result = await detectBrownfield(tmpDir);
    expect(result).toBe(true);
  });

  // ============================================================
  // 分支 2：无 manifest → greenfield（返回 false）
  // ============================================================
  it('无 manifest 文件应判定为 greenfield', async () => {
    // 不创建任何清单文件，仅放入源文件
    const srcDir = path.join(tmpDir, 'src');
    fsExtra.ensureDirSync(srcDir);
    for (let i = 1; i <= 10; i++) {
      fsExtra.writeFileSync(path.join(srcDir, `file-${i}.ts`), `// file ${i}`);
    }

    const result = await detectBrownfield(tmpDir);
    expect(result).toBe(false);
  });

  // ============================================================
  // 分支 3：有 manifest 但源文件 ≤ 5 → greenfield（返回 false）
  // ============================================================
  it('有 manifest 但源文件 ≤ 5 应判定为 greenfield', async () => {
    // 创建 pyproject.toml（主流清单文件之一）
    fsExtra.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "test"');

    // 创建 src/ 目录并放入 5 个源文件（恰好 ≤ 5）
    const srcDir = path.join(tmpDir, 'src');
    fsExtra.ensureDirSync(srcDir);
    for (let i = 1; i <= 5; i++) {
      fsExtra.writeFileSync(path.join(srcDir, `module-${i}.py`), `# module ${i}`);
    }

    const result = await detectBrownfield(tmpDir);
    expect(result).toBe(false);
  });
});
