import { describe, it, expect } from 'vitest';
import {
  COMMAND_TYPES,
  SKILL_TYPES,
  isCommandType,
  isSkillType,
  isValidType,
  isValidCommandType,
  isValidSkillType,
} from '../../../src/core/type-values.js';

describe('type-values', () => {
  // -----------------------------------------------------------------------
  // COMMAND_TYPES
  // -----------------------------------------------------------------------

  describe('COMMAND_TYPES', () => {
    it('所有值以 -command 结尾', () => {
      for (const type of COMMAND_TYPES) {
        expect(type.endsWith('-command'), `${type} 应以 -command 结尾`).toBe(true);
      }
    });

    it('包含 workflow-command 和 tool-command', () => {
      expect(COMMAND_TYPES).toContain('workflow-command');
      expect(COMMAND_TYPES).toContain('tool-command');
    });

    it('不包含空字符串', () => {
      for (const type of COMMAND_TYPES) {
        expect(type.length).toBeGreaterThan(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // SKILL_TYPES
  // -----------------------------------------------------------------------

  describe('SKILL_TYPES', () => {
    it('所有值不以 -command 结尾', () => {
      for (const type of SKILL_TYPES) {
        expect(type.endsWith('-command'), `${type} 不应以 -command 结尾`).toBe(false);
      }
    });

    it('包含 domain-rule、code-style 和 workflow-step', () => {
      expect(SKILL_TYPES).toContain('domain-rule');
      expect(SKILL_TYPES).toContain('code-style');
      expect(SKILL_TYPES).toContain('workflow-step');
    });

    it('不包含空字符串', () => {
      for (const type of SKILL_TYPES) {
        expect(type.length).toBeGreaterThan(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // isCommandType
  // -----------------------------------------------------------------------

  describe('isCommandType', () => {
    it('workflow-command 返回 true', () => {
      expect(isCommandType('workflow-command')).toBe(true);
    });

    it('tool-command 返回 true', () => {
      expect(isCommandType('tool-command')).toBe(true);
    });

    it('domain-rule 返回 false', () => {
      expect(isCommandType('domain-rule')).toBe(false);
    });

    it('不以 -command 结尾的任意字符串返回 false', () => {
      expect(isCommandType('random-string')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // isSkillType
  // -----------------------------------------------------------------------

  describe('isSkillType', () => {
    it('domain-rule 返回 true', () => {
      expect(isSkillType('domain-rule')).toBe(true);
    });

    it('code-style 返回 true', () => {
      expect(isSkillType('code-style')).toBe(true);
    });

    it('workflow-command 返回 false', () => {
      expect(isSkillType('workflow-command')).toBe(false);
    });

    it('不以 -command 结尾的任意字符串返回 true', () => {
      expect(isSkillType('unknown-skill')).toBe(true);
    });

    it('custom-blah 返回 true（不以 -command 结尾）', () => {
      expect(isSkillType('custom-blah')).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // isValidType
  // -----------------------------------------------------------------------

  describe('isValidType', () => {
    it('已知命令类型返回 true', () => {
      for (const type of COMMAND_TYPES) {
        expect(isValidType(type), `已知命令类型 ${type} 应有效`).toBe(true);
      }
    });

    it('已知技能类型返回 true', () => {
      for (const type of SKILL_TYPES) {
        expect(isValidType(type), `已知技能类型 ${type} 应有效`).toBe(true);
      }
    });

    it('未知类型返回 false', () => {
      expect(isValidType('unknown-type')).toBe(false);
      expect(isValidType('')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // isValidCommandType
  // -----------------------------------------------------------------------

  describe('isValidCommandType', () => {
    it('所有 COMMAND_TYPES 成员返回 true', () => {
      for (const type of COMMAND_TYPES) {
        expect(isValidCommandType(type), `${type} 应是有效的命令类型`).toBe(true);
      }
    });

    it('技能类型返回 false', () => {
      expect(isValidCommandType('domain-rule')).toBe(false);
    });

    it('仅以 -command 结尾但不在注册表中的值返回 false', () => {
      expect(isValidCommandType('unknown-command')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // isValidSkillType
  // -----------------------------------------------------------------------

  describe('isValidSkillType', () => {
    it('所有 SKILL_TYPES 成员返回 true', () => {
      for (const type of SKILL_TYPES) {
        expect(isValidSkillType(type), `${type} 应是有效的技能类型`).toBe(true);
      }
    });

    it('domain-rule 返回 true（在注册表中）', () => {
      expect(isValidSkillType('domain-rule')).toBe(true);
    });

    it('custom-blah 返回 false（不在注册表中）', () => {
      expect(isValidSkillType('custom-blah')).toBe(false);
    });

    it('命令类型返回 false', () => {
      expect(isValidSkillType('workflow-command')).toBe(false);
    });

    it('未知值返回 false', () => {
      expect(isValidSkillType('unknown-type')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 类型互斥性
  // -----------------------------------------------------------------------

  describe('类型互斥性', () => {
    it('COMMAND_TYPES 和 SKILL_TYPES 无交集', () => {
      const intersection = COMMAND_TYPES.filter((ct) =>
        (SKILL_TYPES as readonly string[]).includes(ct),
      );
      expect(intersection).toHaveLength(0);
    });

    it('所有命令类型以 -command 结尾', () => {
      const violations = COMMAND_TYPES.filter((t) => !t.endsWith('-command'));
      expect(violations).toHaveLength(0);
    });

    it('所有技能类型不以 -command 结尾', () => {
      const violations = SKILL_TYPES.filter((t) => t.endsWith('-command'));
      expect(violations).toHaveLength(0);
    });
  });
});
