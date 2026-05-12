import { describe, it, expect } from 'vitest';
import { enforceBoundary } from '../../../src/services/implementation-service.js';
import type { BoundaryCheckResult } from '../../../src/services/implementation-service.js';

describe('enforceBoundary - 三分支覆盖', () => {
  // ============================================================
  // 分支一：未越界 ok=true
  // ============================================================
  describe('未越界（ok=true）', () => {
    it('所有 gitDiff 文件均在 write_files 精确路径中 → ok=true, violatingFiles 为空', () => {
      const result: BoundaryCheckResult = enforceBoundary(
        { write_files: ['src/services/foo.ts', 'src/services/bar.ts'] },
        ['src/services/foo.ts'],
      );

      expect(result.ok).toBe(true);
      expect(result.violatingFiles).toEqual([]);
    });

    it('gitDiff 为空 → ok=true, violatingFiles 为空', () => {
      const result: BoundaryCheckResult = enforceBoundary(
        { write_files: ['src/services/foo.ts'] },
        [],
      );

      expect(result.ok).toBe(true);
      expect(result.violatingFiles).toEqual([]);
    });

    it('未触碰的 write_files 应出现在 missingCoverage 中', () => {
      const result: BoundaryCheckResult = enforceBoundary(
        { write_files: ['src/services/foo.ts', 'src/services/bar.ts'] },
        ['src/services/foo.ts'],
      );

      expect(result.ok).toBe(true);
      expect(result.missingCoverage).toContain('src/services/bar.ts');
    });
  });

  // ============================================================
  // 分支二：越界 violating 非空（ok=false）
  // ============================================================
  describe('越界（ok=false）', () => {
    it('gitDiff 包含 write_files 未声明的文件 → ok=false, violatingFiles 含越界路径', () => {
      const result: BoundaryCheckResult = enforceBoundary(
        { write_files: ['src/services/foo.ts'] },
        ['src/services/foo.ts', 'src/utils/secret.ts'],
      );

      expect(result.ok).toBe(false);
      expect(result.violatingFiles).toContain('src/utils/secret.ts');
    });

    it('多个越界文件均被报告', () => {
      const result: BoundaryCheckResult = enforceBoundary(
        { write_files: ['src/services/foo.ts'] },
        ['src/services/foo.ts', 'src/utils/a.ts', 'src/core/b.ts'],
      );

      expect(result.ok).toBe(false);
      expect(result.violatingFiles).toHaveLength(2);
      expect(result.violatingFiles).toContain('src/utils/a.ts');
      expect(result.violatingFiles).toContain('src/core/b.ts');
    });

    it('write_files 为空但 gitDiff 非空 → 全部越界', () => {
      const result: BoundaryCheckResult = enforceBoundary(
        { write_files: [] },
        ['src/services/foo.ts'],
      );

      expect(result.ok).toBe(false);
      expect(result.violatingFiles).toContain('src/services/foo.ts');
    });
  });

  // ============================================================
  // 分支三：glob 展开匹配
  // ============================================================
  describe('glob 展开', () => {
    it('write_files 含 glob 模式 src/services/*.ts，gitDiff 含匹配文件 → ok=true', () => {
      const result: BoundaryCheckResult = enforceBoundary(
        { write_files: ['src/services/*.ts'] },
        ['src/services/foo.ts', 'src/services/bar.ts'],
      );

      expect(result.ok).toBe(true);
      expect(result.violatingFiles).toEqual([]);
    });

    it('glob 模式不匹配深层路径（单星号不跨目录）', () => {
      const result: BoundaryCheckResult = enforceBoundary(
        { write_files: ['src/services/*.ts'] },
        ['src/services/nested/deep.ts'],
      );

      expect(result.ok).toBe(false);
      expect(result.violatingFiles).toContain('src/services/nested/deep.ts');
    });

    it('双星号 glob 匹配深层路径 → ok=true', () => {
      const result: BoundaryCheckResult = enforceBoundary(
        { write_files: ['src/**/*.ts'] },
        ['src/services/nested/deep.ts', 'src/core/foo.ts'],
      );

      expect(result.ok).toBe(true);
      expect(result.violatingFiles).toEqual([]);
    });

    it('混合精确路径与 glob 模式', () => {
      const result: BoundaryCheckResult = enforceBoundary(
        { write_files: ['src/services/*.ts', 'tests/unit/services/foo.test.ts'] },
        ['src/services/bar.ts', 'tests/unit/services/foo.test.ts'],
      );

      expect(result.ok).toBe(true);
      expect(result.violatingFiles).toEqual([]);
    });
  });

  // ============================================================
  // 分支四：扩边界后覆盖一致
  // ============================================================
  describe('扩边界后重新检查', () => {
    it('越界文件加入 write_files 后再次检查 → ok=true', () => {
      // 第一次检查：越界
      const firstCheck: BoundaryCheckResult = enforceBoundary(
        { write_files: ['src/services/foo.ts'] },
        ['src/services/foo.ts', 'src/utils/helper.ts'],
      );
      expect(firstCheck.ok).toBe(false);
      expect(firstCheck.violatingFiles).toContain('src/utils/helper.ts');

      // 扩边界：将越界文件加入 write_files
      const expandedWriteFiles = ['src/services/foo.ts', 'src/utils/helper.ts'];
      const secondCheck: BoundaryCheckResult = enforceBoundary(
        { write_files: expandedWriteFiles },
        ['src/services/foo.ts', 'src/utils/helper.ts'],
      );

      expect(secondCheck.ok).toBe(true);
      expect(secondCheck.violatingFiles).toEqual([]);
      expect(secondCheck.missingCoverage).toEqual([]);
    });

    it('越界文件通过 glob 扩边界后覆盖 → ok=true', () => {
      // 第一次检查：越界
      const firstCheck: BoundaryCheckResult = enforceBoundary(
        { write_files: ['src/services/foo.ts'] },
        ['src/services/foo.ts', 'src/utils/helper.ts', 'src/utils/path.ts'],
      );
      expect(firstCheck.ok).toBe(false);

      // 扩边界：用 glob 覆盖整个 utils 目录
      const secondCheck: BoundaryCheckResult = enforceBoundary(
        { write_files: ['src/services/foo.ts', 'src/utils/*.ts'] },
        ['src/services/foo.ts', 'src/utils/helper.ts', 'src/utils/path.ts'],
      );

      expect(secondCheck.ok).toBe(true);
      expect(secondCheck.violatingFiles).toEqual([]);
    });
  });
});
