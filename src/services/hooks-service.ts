import { execSync } from 'node:child_process';
import yaml from 'js-yaml';
import { SPECFORGE_DIR } from '../core/constants.js';
import {
  isValidHookPhase,
  parseExtensionsConfig,
  selectHooks,
  type ExtensionsConfig,
  type HookEntry,
  type HookStage,
} from '../core/hooks.js';
import { fileExists, readFile } from '../utils/fs.js';
import { joinPath } from '../utils/path.js';

const EXTENSIONS_FILE = 'extensions.yaml';

export interface HookExecutionResult {
  name: string;
  command: string;
  optional: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class HooksService {
  /**
   * 加载项目级 extensions.yaml；若不存在返回空配置
   */
  async loadExtensions(projectRoot: string): Promise<ExtensionsConfig> {
    const cfgPath = joinPath(projectRoot, SPECFORGE_DIR, EXTENSIONS_FILE);
    if (!(await fileExists(cfgPath))) return {};
    try {
      const raw = await readFile(cfgPath);
      return parseExtensionsConfig(yaml.load(raw));
    } catch {
      return {};
    }
  }

  /**
   * 执行某阶段某 stage 的所有钩子；按声明顺序串行
   * - 必需钩子失败 → 抛错（外层会以非零退出）
   * - optional 钩子失败 → 仅返回结果，不抛错
   */
  async runHooks(
    projectRoot: string,
    phase: string,
    stage: HookStage,
  ): Promise<HookExecutionResult[]> {
    if (!isValidHookPhase(phase)) {
      throw new Error(`无效的 phase："${phase}"`);
    }

    const cfg = await this.loadExtensions(projectRoot);
    const hooks = selectHooks(cfg, phase, stage);
    const results: HookExecutionResult[] = [];

    for (const hook of hooks) {
      const result = this.runHook(hook, projectRoot);
      results.push(result);

      if (result.exitCode !== 0 && !hook.optional) {
        // 必需钩子失败：立即停止并抛错
        const reason = result.stderr.trim() || result.stdout.trim() || '<no output>';
        throw new Error(
          `钩子 "${hook.name}" 失败（exit ${result.exitCode}）：${reason}`,
        );
      }
    }

    return results;
  }

  private runHook(hook: HookEntry, cwd: string): HookExecutionResult {
    try {
      const stdout = execSync(hook.command, {
        cwd,
        encoding: 'utf-8',
        timeout: hook.timeoutMs ?? 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return {
        name: hook.name,
        command: hook.command,
        optional: hook.optional ?? false,
        exitCode: 0,
        stdout: stdout.trim(),
        stderr: '',
      };
    } catch (error: unknown) {
      const execErr = error as {
        stdout?: Buffer | string;
        stderr?: Buffer | string;
        status?: number;
        message?: string;
      };
      return {
        name: hook.name,
        command: hook.command,
        optional: hook.optional ?? false,
        exitCode: execErr.status ?? 1,
        stdout: execErr.stdout ? String(execErr.stdout).trim() : '',
        stderr: execErr.stderr
          ? String(execErr.stderr).trim()
          : execErr.message ?? 'unknown error',
      };
    }
  }
}
