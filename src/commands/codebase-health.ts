import path from 'node:path';
import { runHealthScan, renderHealthMarkdown, handleUnusedDependencies } from '../services/health-service.js';
import { SPECFORGE_USER_DIR, CONTEXT_DIR } from '../core/constants.js';
import { writeFile, ensureDirectory } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import { resolveProjectRoot } from '../utils/path.js';

export interface CodebaseHealthCommandOptions {
  json?: boolean;
  probes?: string;
  interactive?: boolean;
}

/**
 * codebase-health 命令实现
 * 运行健康扫描并生成报告（tool-command 类型）
 */
export class CodebaseHealthCommand {
  private options: CodebaseHealthCommandOptions;

  constructor(options?: CodebaseHealthCommandOptions) {
    this.options = options ?? {};
  }

  async execute(projectRoot?: string): Promise<void> {
    const root = resolveProjectRoot(projectRoot);

    // 解析 --probes 逗号分隔列表
    const probeList = this.options.probes
      ? this.options.probes.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const report = await runHealthScan(root, {
      probes: probeList,
      interactive: this.options.interactive !== false && !this.options.json,
    });

    // --json 模式：直接输出 JSON 到 stdout
    if (this.options.json) {
      process.stdout.write(JSON.stringify(report, null, 2));
      return;
    }

    // 默认模式：渲染 markdown 并写入 specforge/context/health/<YYYY-MM-DD>-report.md
    const md = renderHealthMarkdown(report);
    const healthDir = path.join(root, SPECFORGE_USER_DIR, CONTEXT_DIR, 'health');
    await ensureDirectory(healthDir);
    const dateStr = new Date().toISOString().slice(0, 10);
    const reportPath = path.join(healthDir, `${dateStr}-report.md`);
    await writeFile(reportPath, md);

    logger.success(`健康报告已写入：${reportPath}`);

    // 未用依赖交互处理（仅 interactive 模式）
    const interactive = this.options.interactive !== false;
    await handleUnusedDependencies(report, root, { interactive });
  }
}
