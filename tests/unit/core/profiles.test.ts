import { describe, it, expect } from 'vitest';
import {
  BUILTIN_PROFILES,
  DEFAULT_PROFILE_NAME,
  isPhaseEnabled,
  parseProfileFromConfig,
  resolveProfile,
} from '../../../src/core/profiles.js';

describe('profiles', () => {
  describe('内置 profile', () => {
    it('minimal 包含 5 阶段（不含 design / planning / evolution）', () => {
      const minimal = BUILTIN_PROFILES.minimal;
      expect(minimal.enabledPhases).toEqual([
        'foundation',
        'requirements',
        'implementation',
        'quality',
        'release',
      ]);
    });

    it('standard 包含完整 8 阶段', () => {
      const std = BUILTIN_PROFILES.standard;
      expect(std.enabledPhases.length).toBe(8);
      expect(std.enabledPhases).toContain('design');
      expect(std.enabledPhases).toContain('evolution');
      expect((std.enabledPhases as readonly string[])).not.toContain('operations');
    });

    it('默认 profile 为 standard', () => {
      expect(DEFAULT_PROFILE_NAME).toBe('standard');
    });
  });

  describe('resolveProfile', () => {
    it('未提供配置时返回 standard', () => {
      const profile = resolveProfile(null);
      expect(profile.name).toBe('standard');
      expect(profile.enabledPhases.length).toBe(8);
    });

    it('解析 minimal', () => {
      const profile = resolveProfile({ name: 'minimal' });
      expect(profile.name).toBe('minimal');
      expect(profile.enabledPhases).toContain('release');
      expect(profile.enabledPhases).not.toContain('design');
    });

    it('解析 custom 时必须提供 enabledPhases', () => {
      expect(() => resolveProfile({ name: 'custom' })).toThrow(/enabledPhases/);
      expect(() => resolveProfile({ name: 'custom', enabledPhases: [] })).toThrow(
        /enabledPhases/,
      );
    });

    it('解析 custom 成功', () => {
      const profile = resolveProfile({
        name: 'custom',
        enabledPhases: ['foundation', 'release'],
      });
      expect(profile.name).toBe('custom');
      expect(profile.enabledPhases).toEqual(['foundation', 'release']);
    });
  });

  describe('parseProfileFromConfig', () => {
    it('从 yaml 对象提取 profile', () => {
      const cfg = parseProfileFromConfig({ profile: { name: 'minimal' } });
      expect(cfg).toEqual({ name: 'minimal' });
    });

    it('缺失 profile 字段返回 null', () => {
      expect(parseProfileFromConfig({})).toBeNull();
      expect(parseProfileFromConfig(null)).toBeNull();
    });

    it('非法 profile 形状返回 null（容错）', () => {
      expect(parseProfileFromConfig({ profile: { name: 'unknown' } })).toBeNull();
      expect(parseProfileFromConfig({ profile: 'standard' })).toBeNull();
    });

    it('custom + 合法阶段列表', () => {
      const cfg = parseProfileFromConfig({
        profile: { name: 'custom', enabledPhases: ['foundation', 'evolution'] },
      });
      expect(cfg).toEqual({
        name: 'custom',
        enabledPhases: ['foundation', 'evolution'],
      });
    });
  });

  describe('isPhaseEnabled', () => {
    it('minimal 不启用 design', () => {
      expect(isPhaseEnabled(BUILTIN_PROFILES.minimal, 'design')).toBe(false);
    });

    it('standard 启用 design', () => {
      expect(isPhaseEnabled(BUILTIN_PROFILES.standard, 'design')).toBe(true);
    });
  });
});
