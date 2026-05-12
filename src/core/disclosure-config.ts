/**
 * 渐进披露配置类型与加载函数
 *
 * 对应 design-l3-budget.md § 6.2：
 * - level3_loadBudget：L3 首轮加载预算（默认 150 行）
 * - routingStatement：路由声明六要素配置
 *
 * 向后兼容：老版本 config.yaml 缺 level3_loadBudget 或 routingStatement 时，
 * 按默认值校验并输出 warn，不因缺节而崩溃（Req 9.6）。
 */

import { logger } from '../utils/logger.js';

/**
 * L3 加载预算配置
 */
export interface Level3LoadBudget {
  /** 首轮加载 references/ 总行数上限，默认 150 */
  firstRoundTotalLinesMax: number;
  /** L3 必须从 L2 被引用，默认 true */
  mustBeReferencedFromL2: boolean;
}

/**
 * 路由声明六要素配置
 */
export interface RoutingStatement {
  /** 是否强制要求路由声明，默认 true */
  required: boolean;
  /** 六要素列表 */
  elements: string[];
}

/**
 * 渐进披露配置（L3 预算 + 路由声明）
 */
export interface DisclosureConfig {
  level3_loadBudget: Level3LoadBudget;
  routingStatement: RoutingStatement;
}

/** L3 加载预算默认值 */
const DEFAULT_LEVEL3_LOAD_BUDGET: Level3LoadBudget = {
  firstRoundTotalLinesMax: 150,
  mustBeReferencedFromL2: true,
};

/** 路由声明六要素默认值 */
const DEFAULT_ROUTING_STATEMENT: RoutingStatement = {
  required: true,
  elements: ['route', 'changeId', 'loaded', 'notLoaded', 'firstAction', 'tokenBudget'],
};

/**
 * 从 config 内容加载渐进披露配置
 *
 * 向后兼容逻辑：
 * 1. 若 configContent.level3_loadBudget 存在，使用其值（缺失子字段用默认值填充）
 * 2. 若 configContent.level3_loadBudget 缺失，使用全部默认值并输出 warn
 * 3. routingStatement 同理
 *
 * @param configContent - 已解析的配置对象（通常来自 config.yaml 的 progressiveDisclosure 节）
 * @returns 完整的 DisclosureConfig（保证所有字段都有值）
 */
export function loadDisclosureConfig(configContent: Record<string, unknown>): DisclosureConfig {
  // 解析 level3_loadBudget
  let level3_loadBudget: Level3LoadBudget;

  if (configContent.level3_loadBudget != null && typeof configContent.level3_loadBudget === 'object') {
    const raw = configContent.level3_loadBudget as Record<string, unknown>;
    level3_loadBudget = {
      firstRoundTotalLinesMax:
        typeof raw.firstRoundTotalLinesMax === 'number'
          ? raw.firstRoundTotalLinesMax
          : DEFAULT_LEVEL3_LOAD_BUDGET.firstRoundTotalLinesMax,
      mustBeReferencedFromL2:
        typeof raw.mustBeReferencedFromL2 === 'boolean'
          ? raw.mustBeReferencedFromL2
          : DEFAULT_LEVEL3_LOAD_BUDGET.mustBeReferencedFromL2,
    };
  } else {
    logger.warn('config.yaml 缺少 level3_loadBudget 配置，使用默认值（firstRoundTotalLinesMax: 150）');
    level3_loadBudget = { ...DEFAULT_LEVEL3_LOAD_BUDGET };
  }

  // 解析 routingStatement
  let routingStatement: RoutingStatement;

  if (configContent.routingStatement != null && typeof configContent.routingStatement === 'object') {
    const raw = configContent.routingStatement as Record<string, unknown>;
    routingStatement = {
      required:
        typeof raw.required === 'boolean'
          ? raw.required
          : DEFAULT_ROUTING_STATEMENT.required,
      elements:
        Array.isArray(raw.elements)
          ? (raw.elements as string[])
          : DEFAULT_ROUTING_STATEMENT.elements,
    };
  } else {
    logger.warn('config.yaml 缺少 routingStatement 配置，使用默认值（六要素全要求）');
    routingStatement = { ...DEFAULT_ROUTING_STATEMENT, elements: [...DEFAULT_ROUTING_STATEMENT.elements] };
  }

  return {
    level3_loadBudget,
    routingStatement,
  };
}
