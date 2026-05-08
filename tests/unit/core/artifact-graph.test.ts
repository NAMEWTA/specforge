import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ARTIFACT_GRAPH,
  computeStatus,
  type ArtifactNode,
} from '../../../src/core/artifact-graph.js';

describe('artifact-graph', () => {
  describe('DEFAULT_ARTIFACT_GRAPH', () => {
    it('包含 6 个节点（proposal / design / tasks / quality-report / archive / retrospective）', () => {
      expect(DEFAULT_ARTIFACT_GRAPH.length).toBe(6);
      const ids = DEFAULT_ARTIFACT_GRAPH.map((n) => n.id);
      expect(ids).toEqual([
        'proposal',
        'design',
        'tasks',
        'quality-report',
        'archive',
        'retrospective',
      ]);
    });

    it('proposal 无依赖；其它节点至少有一个依赖', () => {
      const proposal = DEFAULT_ARTIFACT_GRAPH.find((n) => n.id === 'proposal');
      expect(proposal?.requires).toEqual([]);
      for (const node of DEFAULT_ARTIFACT_GRAPH) {
        if (node.id !== 'proposal') {
          expect(node.requires.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('computeStatus', () => {
    it('全空 fsState：proposal=READY，其它=BLOCKED', () => {
      const status = computeStatus(DEFAULT_ARTIFACT_GRAPH, {});
      expect(status.find((s) => s.id === 'proposal')?.status).toBe('READY');
      expect(status.find((s) => s.id === 'design')?.status).toBe('BLOCKED');
      expect(status.find((s) => s.id === 'design')?.blockedBy).toEqual(['proposal']);
    });

    it('proposal 完成：design=READY，tasks 仍 BLOCKED（缺 design）', () => {
      const status = computeStatus(DEFAULT_ARTIFACT_GRAPH, { proposal: true });
      expect(status.find((s) => s.id === 'proposal')?.status).toBe('DONE');
      expect(status.find((s) => s.id === 'design')?.status).toBe('READY');
      expect(status.find((s) => s.id === 'tasks')?.status).toBe('BLOCKED');
      expect(status.find((s) => s.id === 'tasks')?.blockedBy).toContain('design');
    });

    it('全部完成：所有节点 DONE', () => {
      const fs = {
        proposal: true,
        design: true,
        tasks: true,
        'quality-report': true,
        archive: true,
        retrospective: true,
      };
      const status = computeStatus(DEFAULT_ARTIFACT_GRAPH, fs);
      expect(status.every((s) => s.status === 'DONE')).toBe(true);
    });

    it('存在但前置缺失：仍按 fsState 判 DONE（产物文件即是事实来源）', () => {
      // 即使依赖未 DONE，如果该产物文件已存在，视为 DONE（用户绕过流程的容错）
      const status = computeStatus(DEFAULT_ARTIFACT_GRAPH, { tasks: true });
      expect(status.find((s) => s.id === 'tasks')?.status).toBe('DONE');
    });
  });

  describe('error handling', () => {
    it('id 重复抛错', () => {
      const graph: ArtifactNode[] = [
        { id: 'a', phase: 'requirements', generates: 'a.md', requires: [] },
        { id: 'a', phase: 'design', generates: 'a2.md', requires: [] },
      ];
      expect(() => computeStatus(graph, {})).toThrow(/重复/);
    });

    it('未知依赖抛错', () => {
      const graph: ArtifactNode[] = [
        { id: 'b', phase: 'design', generates: 'b.md', requires: ['unknown'] },
      ];
      expect(() => computeStatus(graph, {})).toThrow(/不在图中/);
    });

    it('循环依赖抛错', () => {
      const graph: ArtifactNode[] = [
        { id: 'a', phase: 'requirements', generates: 'a.md', requires: ['b'] },
        { id: 'b', phase: 'design', generates: 'b.md', requires: ['a'] },
      ];
      expect(() => computeStatus(graph, {})).toThrow(/循环依赖/);
    });
  });
});
