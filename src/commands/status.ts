import { StatusService } from '../services/status-service.js';
import { resolveProjectRoot } from '../utils/path.js';

export interface StatusCommandOptions {
  phase?: string;
  checkRequires?: boolean;
  json?: boolean;
  /** 输出产物 DAG（BLOCKED/READY/DONE） */
  graph?: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  foundation: '项目初始化与宪法基线',
  requirements: '需求澄清 + 方案探索',
  design: '架构与技术设计',
  planning: '任务拆解与依赖编排',
  implementation: '子代理驱动开发',
  quality: '测试、审查、验证闭环',
  release: '发布、部署与归档（含运维移交）',
  evolution: '复盘、沉淀、归档',
};

export class StatusCommand {
  private options: StatusCommandOptions;

  constructor(options: StatusCommandOptions) {
    this.options = options;
  }

  async execute(targetPath?: string): Promise<void> {
    const root = resolveProjectRoot(targetPath);
    const service = new StatusService();

    if (this.options.graph) {
      const graph = await service.getArtifactGraphStatus(root);
      if (this.options.json) {
        console.log(JSON.stringify(graph, null, 2));
        return;
      }
      console.log('\n  产物 DAG 状态（BLOCKED / READY / DONE）：');
      for (const node of graph) {
        const icon = node.status === 'DONE' ? '✓' : node.status === 'READY' ? '◐' : '○';
        let line = `  ${icon} ${node.id.padEnd(16)} [${node.status.padEnd(7)}] phase=${node.phase} → ${node.generates}`;
        if (node.blockedBy && node.blockedBy.length > 0) {
          line += `  blockedBy=${node.blockedBy.join(',')}`;
        }
        console.log(line);
      }
      console.log();
      return;
    }

    if (this.options.checkRequires && this.options.phase) {
      const requires = await service.checkPhaseRequires(root, this.options.phase);
      this.displayRequires(requires);
      return;
    }

    const status = await service.getStatus(root);
    this.displayStatus(status);
  }

  private displayRequires(requires: Array<{ name: string; status: string; artifact: string }>): void {
    if (this.options.json) {
      console.log(JSON.stringify(requires, null, 2));
      return;
    }

    console.log(`\n  阶段: ${this.options.phase} (${PHASE_LABELS[this.options.phase ?? ''] ?? '未知'})\n`);
    console.log('  前置产物:');
    for (const r of requires) {
      const icon = r.status === 'done' ? '✓' : r.status === 'skipped' ? '⚠' : '○';
      const note = r.status === 'skipped' ? ' (可跳过)' : r.status === 'done' ? ' (done)' : ' — 未生成';
      console.log(`  ${icon} ${r.name} → ${r.artifact}${note}`);
    }

    const allReady = requires.every(r => r.status === 'done' || r.status === 'skipped');
    console.log(
      allReady
        ? '\n  建议: 前置产物就绪，可以执行命令\n'
        : '\n  建议: 请先完成前置阶段\n',
    );
  }

  private displayStatus(status: {
    currentChange: string | null;
    currentPhase: string | null;
    phases: Array<{
      phase: string;
      commandName: string;
      artifact: string;
      status: string;
    }>;
  }): void {
    if (this.options.json) {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    console.log(
      `\n  当前 Change: ${status.currentChange ?? '无'}`,
    );
    if (status.currentPhase) {
      console.log(`  当前阶段: ${status.currentPhase}\n`);
    } else {
      console.log();
    }
    console.log('  阶段状态:');
    for (const p of status.phases) {
      const icon =
        p.status === 'done'
          ? '✓'
          : p.status === 'in_progress'
            ? '▶'
            : '○';
      const label = PHASE_LABELS[p.phase] ?? p.phase;
      console.log(
        `  ${icon} ${p.phase} — ${label} (${p.commandName} → ${p.artifact})`,
      );
    }
    console.log();
  }
}
