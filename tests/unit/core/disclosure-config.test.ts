import { describe, it, expect } from 'vitest';
import { loadDisclosureConfig } from '../../../src/core/disclosure-config.js';

/**
 * DisclosureConfig loader 单元测试
 *
 * 覆盖 Req 9.6：老版本 config.yaml 缺 level3_loadBudget 或 routingStatement 时，
 * 按默认值（150 / 六要素全要求）校验并输出 warn，不因缺节而崩溃。
 *
 * Validates: Requirements 9.6
 */

// 默认值常量，方便断言
const DEFAULT_LEVEL3_LOAD_BUDGET = {
  firstRoundTotalLinesMax: 150,
  mustBeReferencedFromL2: true,
};

const DEFAULT_ROUTING_STATEMENT = {
  required: true,
  elements: ['route', 'changeId', 'loaded', 'notLoaded', 'firstAction', 'tokenBudget'],
};

describe('loadDisclosureConfig', () => {
  describe('完整配置（两节都存在）', () => {
    it('返回解析后的自定义值', () => {
      const configContent = {
        level3_loadBudget: {
          firstRoundTotalLinesMax: 200,
          mustBeReferencedFromL2: false,
        },
        routingStatement: {
          required: false,
          elements: ['route', 'changeId'],
        },
      };

      const result = loadDisclosureConfig(configContent);

      expect(result.level3_loadBudget.firstRoundTotalLinesMax).toBe(200);
      expect(result.level3_loadBudget.mustBeReferencedFromL2).toBe(false);
      expect(result.routingStatement.required).toBe(false);
      expect(result.routingStatement.elements).toEqual(['route', 'changeId']);
    });
  });

  describe('缺 level3_loadBudget → 回退默认 150', () => {
    it('缺 level3_loadBudget 时返回默认值（firstRoundTotalLinesMax: 150, mustBeReferencedFromL2: true）', () => {
      const configContent = {
        routingStatement: {
          required: true,
          elements: ['route', 'changeId', 'loaded', 'notLoaded', 'firstAction', 'tokenBudget'],
        },
      };

      const result = loadDisclosureConfig(configContent);

      expect(result.level3_loadBudget).toEqual(DEFAULT_LEVEL3_LOAD_BUDGET);
    });
  });

  describe('缺 routingStatement → 回退六要素全要求', () => {
    it('缺 routingStatement 时返回默认值（required: true, elements 包含六要素）', () => {
      const configContent = {
        level3_loadBudget: {
          firstRoundTotalLinesMax: 100,
          mustBeReferencedFromL2: true,
        },
      };

      const result = loadDisclosureConfig(configContent);

      expect(result.routingStatement).toEqual(DEFAULT_ROUTING_STATEMENT);
    });
  });

  describe('两节都缺 → 全部回退默认', () => {
    it('空对象时返回所有默认值', () => {
      const configContent = {};

      const result = loadDisclosureConfig(configContent);

      expect(result.level3_loadBudget).toEqual(DEFAULT_LEVEL3_LOAD_BUDGET);
      expect(result.routingStatement).toEqual(DEFAULT_ROUTING_STATEMENT);
    });
  });

  describe('部分字段缺失 → 填充缺失字段的默认值', () => {
    it('level3_loadBudget 缺 mustBeReferencedFromL2 时填充默认 true', () => {
      const configContent = {
        level3_loadBudget: {
          firstRoundTotalLinesMax: 120,
          // 缺 mustBeReferencedFromL2
        },
        routingStatement: {
          required: true,
          elements: ['route', 'changeId', 'loaded', 'notLoaded', 'firstAction', 'tokenBudget'],
        },
      };

      const result = loadDisclosureConfig(configContent);

      expect(result.level3_loadBudget.firstRoundTotalLinesMax).toBe(120);
      expect(result.level3_loadBudget.mustBeReferencedFromL2).toBe(true);
    });

    it('level3_loadBudget 缺 firstRoundTotalLinesMax 时填充默认 150', () => {
      const configContent = {
        level3_loadBudget: {
          mustBeReferencedFromL2: false,
          // 缺 firstRoundTotalLinesMax
        },
        routingStatement: {
          required: true,
          elements: ['route', 'changeId', 'loaded', 'notLoaded', 'firstAction', 'tokenBudget'],
        },
      };

      const result = loadDisclosureConfig(configContent);

      expect(result.level3_loadBudget.firstRoundTotalLinesMax).toBe(150);
      expect(result.level3_loadBudget.mustBeReferencedFromL2).toBe(false);
    });
  });
});
