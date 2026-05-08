import { HooksService } from '../services/hooks-service.js';
import { HOOK_STAGES, type HookStage } from '../core/hooks.js';
import { logger } from '../utils/logger.js';
import { resolveProjectRoot } from '../utils/path.js';

export interface RunHookOptions {
  phase: string;
  stage: HookStage;
  json?: boolean;
}

export class RunHookCommand {
  private options: RunHookOptions;

  constructor(options: RunHookOptions) {
    this.options = options;
  }

  async execute(targetPath?: string): Promise<void> {
    if (!(HOOK_STAGES as readonly string[]).includes(this.options.stage)) {
      throw new Error(
        `--stage 必须为 ${HOOK_STAGES.join(' | ')}，收到 "${this.options.stage}"`,
      );
    }

    const projectRoot = resolveProjectRoot(targetPath);
    const service = new HooksService();
    const results = await service.runHooks(projectRoot, this.options.phase, this.options.stage);

    if (this.options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      logger.info(`无 ${this.options.stage}_${this.options.phase} 钩子（或未配置 extensions.yaml）`);
      return;
    }

    for (const r of results) {
      const icon = r.exitCode === 0 ? '✓' : r.optional ? '⚠' : '✗';
      const tag = r.optional ? '(optional)' : '(required)';
      console.log(`  ${icon} ${r.name} ${tag}  exit=${r.exitCode}`);
      if (r.stdout) {
        console.log(`    stdout: ${r.stdout.split('\n').slice(0, 3).join(' | ')}`);
      }
      if (r.stderr) {
        console.log(`    stderr: ${r.stderr.split('\n').slice(0, 3).join(' | ')}`);
      }
    }
  }
}
