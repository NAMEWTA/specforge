export const LIFECYCLE_TYPES = [
  'foundation',
  'requirements',
  'design',
  'planning',
  'implementation',
  'quality',
  'release',
  'evolution',
] as const;

export type LifecycleType = (typeof LIFECYCLE_TYPES)[number];

export interface LifecycleTypeMeta {
  type: LifecycleType;
  label: string;
  description: string;
}

export const LIFECYCLE_TYPE_META: Record<LifecycleType, LifecycleTypeMeta> = {
  foundation: {
    type: 'foundation',
    label: 'Foundation',
    description: '从 0 到 1 的初始化与可行性，建立项目基线与边界',
  },
  requirements: {
    type: 'requirements',
    label: 'Requirements',
    description: '需求澄清与结构化，输出可执行需求',
  },
  design: {
    type: 'design',
    label: 'Design',
    description: '方案与架构设计，输出系统与技术设计',
  },
  planning: {
    type: 'planning',
    label: 'Planning',
    description: '任务拆解与依赖编排，输出任务计划与并行策略',
  },
  implementation: {
    type: 'implementation',
    label: 'Implementation',
    description: '开发实现与代码交付，输出代码与阶段总结',
  },
  quality: {
    type: 'quality',
    label: 'Quality',
    description: '测试、审查、修复闭环，输出验证报告与修复记录',
  },
  release: {
    type: 'release',
    label: 'Release',
    description: '部署、发布与上线，输出发布、回滚与运维移交方案',
  },
  evolution: {
    type: 'evolution',
    label: 'Evolution',
    description: '复盘、沉淀、归档，输出经验资产与归档',
  },
};

export function isValidLifecycleType(value: string): value is LifecycleType {
  return (LIFECYCLE_TYPES as readonly string[]).includes(value);
}
