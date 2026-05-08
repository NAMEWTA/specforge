import { execSync } from 'node:child_process';

/**
 * 从 markdown 内容中解析 <!-- preamble:bash ... --> 注释块内的 bash 命令
 * 返回命令字符串数组，过滤掉空行和注释行
 */
export function parsePreamble(content: string): string[] {
  const match = content.match(
    /<!--\s*preamble:bash\s*([\s\S]*?)-->/,
  );
  if (!match || !match[1]) return [];

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

/**
 * preamble 命令执行结果
 */
export interface PreambleResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * 执行 preamble 中的 bash 命令
 * 返回每条命令的执行结果
 */
export function executePreamble(
  commands: string[],
  options?: { cwd?: string; timeout?: number },
): PreambleResult[] {
  const results: PreambleResult[] = [];

  for (const command of commands) {
    try {
      const stdout = execSync(command, {
        cwd: options?.cwd ?? process.cwd(),
        timeout: options?.timeout ?? 30000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      results.push({
        command,
        stdout: stdout.trim(),
        stderr: '',
        exitCode: 0,
      });
    } catch (error: unknown) {
      const execError = error as {
        stdout?: Buffer | string;
        stderr?: Buffer | string;
        status?: number;
        message?: string;
      };
      results.push({
        command,
        stdout: execError.stdout
          ? String(execError.stdout).trim()
          : '',
        stderr: execError.stderr
          ? String(execError.stderr).trim()
          : execError.message ?? '',
        exitCode: execError.status ?? 1,
      });
    }
  }

  return results;
}

/**
 * 解析并执行 markdown 内容中的 preamble bash 命令
 * 便捷函数，组合 parsePreamble + executePreamble
 */
export function parseAndExecutePreamble(
  content: string,
  options?: { cwd?: string; timeout?: number },
): PreambleResult[] {
  const commands = parsePreamble(content);
  if (commands.length === 0) return [];
  return executePreamble(commands, options);
}
