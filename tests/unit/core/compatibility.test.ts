import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  validateProjectCompatibility,
  warnIfDestructiveChanges,
  detectOldSpecForgeStructure,
} from '../../../src/core/compatibility.js';

describe('compatibility', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(
      path.join(os.tmpdir(), 'specforge-compat-'),
    );
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  describe('validateProjectCompatibility', () => {
    it('无 .specforge/ 目录时返回兼容', async () => {
      const result = await validateProjectCompatibility(tmpDir);
      expect(result.compatible).toBe(true);
    });

    it('.specforge/ 已存在时返回不兼容', async () => {
      fsExtra.ensureDirSync(path.join(tmpDir, '.specforge'));
      const result = await validateProjectCompatibility(tmpDir);
      expect(result.compatible).toBe(false);
    });
  });

  describe('warnIfDestructiveChanges', () => {
    it('specforge/ 不存在时无警告', async () => {
      const result = await warnIfDestructiveChanges(tmpDir);
      expect(result).toEqual([]);
    });

    it('specforge/ 已存在时返回警告', async () => {
      fsExtra.ensureDirSync(path.join(tmpDir, 'specforge'));
      const result = await warnIfDestructiveChanges(tmpDir);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('detectOldSpecForgeStructure', () => {
    it('无 .specforge/ 目录时返回 false', async () => {
      const result = await detectOldSpecForgeStructure(tmpDir);
      expect(result).toBe(false);
    });

    it('.specforge/commands/ 存在时返回 true', async () => {
      fsExtra.ensureDirSync(path.join(tmpDir, '.specforge', 'commands'));
      const result = await detectOldSpecForgeStructure(tmpDir);
      expect(result).toBe(true);
    });
  });
});
