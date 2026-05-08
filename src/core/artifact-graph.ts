/**
 * 产物 DAG 状态机（借鉴 OpenSpec OPSX）
 *
 * 状态：
 * - BLOCKED：至少一个 requires 的产物状态不是 DONE
 * - READY  ：所有 requires 已 DONE，但本产物自身未生成
 * - DONE   ：本产物已存在且非空（视为完成）
 *
 * 用法：
 *   const graph = DEFAULT_ARTIFACT_GRAPH; // 8 阶段标准 DAG
 *   const fsState = { proposal: true, design: false, ... };
 *   const status = computeStatus(graph, fsState);
 */

import type { LifecycleType } from './lifecycle-types.js';

export type ArtifactStatus = 'BLOCKED' | 'READY' | 'DONE';

export interface ArtifactNode {
  /** 产物唯一 id */
  id: string;
  /** 关联的生命周期阶段（仅信息性，便于按阶段聚合） */
  phase: LifecycleType;
  /** 产物相对路径模板（仅信息性，由 status-service 用于查找文件） */
  generates: string;
  /** 前置依赖：本产物需要这些 id 都为 DONE 才能 READY */
  requires: string[];
}

/**
 * SpecForge 标准 8 阶段产物图
 *
 * proposal → design → tasks → quality-report → archive → retrospective
 * 同时 tasks 也依赖 proposal（路径冗余以体现 DAG 而非纯线性）
 */
export const DEFAULT_ARTIFACT_GRAPH: ArtifactNode[] = [
  {
    id: 'proposal',
    phase: 'requirements',
    generates: 'PROPOSAL.md',
    requires: [],
  },
  {
    id: 'design',
    phase: 'design',
    generates: 'DESIGN.md',
    requires: ['proposal'],
  },
  {
    id: 'tasks',
    phase: 'planning',
    generates: 'TASKS.md',
    requires: ['proposal', 'design'],
  },
  {
    id: 'quality-report',
    phase: 'quality',
    generates: 'QUALITY-REPORT.md',
    requires: ['tasks'],
  },
  {
    id: 'archive',
    phase: 'release',
    generates: 'archive/',
    requires: ['quality-report'],
  },
  {
    id: 'retrospective',
    phase: 'evolution',
    generates: 'RETROSPECTIVE.md',
    requires: ['archive'],
  },
];

export interface ArtifactStatusEntry {
  id: string;
  phase: LifecycleType;
  generates: string;
  status: ArtifactStatus;
  /** 阻塞原因（BLOCKED 时填充：哪些 requires 未 DONE） */
  blockedBy?: string[];
}

/**
 * 计算产物图状态
 * @param graph 产物节点列表（带 requires）
 * @param fsState 已存在产物的 id → 是否在文件系统中可见
 */
export function computeStatus(
  graph: ArtifactNode[],
  fsState: Record<string, boolean>,
): ArtifactStatusEntry[] {
  // 检测 id 重复
  const ids = new Set<string>();
  for (const node of graph) {
    if (ids.has(node.id)) {
      throw new Error(`产物 id 重复："${node.id}"`);
    }
    ids.add(node.id);
  }

  // 检测未知 require
  for (const node of graph) {
    for (const dep of node.requires) {
      if (!ids.has(dep)) {
        throw new Error(
          `产物 "${node.id}" 的依赖 "${dep}" 不在图中，请先声明该节点`,
        );
      }
    }
  }

  // 检测循环依赖（DFS）
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const node of graph) color.set(node.id, WHITE);
  const byId = new Map(graph.map((n) => [n.id, n]));

  function dfs(id: string, stack: string[]): void {
    if (color.get(id) === GRAY) {
      throw new Error(`检测到循环依赖：${[...stack, id].join(' → ')}`);
    }
    if (color.get(id) === BLACK) return;
    color.set(id, GRAY);
    const node = byId.get(id)!;
    for (const dep of node.requires) dfs(dep, [...stack, id]);
    color.set(id, BLACK);
  }
  for (const node of graph) dfs(node.id, []);

  // 计算状态
  return graph.map((node) => {
    const exists = fsState[node.id] === true;
    if (exists) {
      return { id: node.id, phase: node.phase, generates: node.generates, status: 'DONE' };
    }

    const unfinished = node.requires.filter((dep) => fsState[dep] !== true);
    if (unfinished.length === 0) {
      return { id: node.id, phase: node.phase, generates: node.generates, status: 'READY' };
    }
    return {
      id: node.id,
      phase: node.phase,
      generates: node.generates,
      status: 'BLOCKED',
      blockedBy: unfinished,
    };
  });
}
