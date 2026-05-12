// ============================================================
// implementation-service — 提交前边界对账服务
// ============================================================

/**
 * 边界检查结果
 */
export interface BoundaryCheckResult {
  /** 是否通过（无越界文件） */
  ok: boolean;
  /** git diff 命中但不在 write_files 声明范围内的文件 */
  violatingFiles: string[];
  /** write_files 中声明的精确路径但 git diff 未触碰的文件（告警，不阻断） */
  missingCoverage: string[];
}

/**
 * 判断一个路径模式是否为 glob 模式（含 `*` 或 `?` 或 `[`）
 */
function isGlobPattern(pattern: string): boolean {
  return /[*?[\]]/.test(pattern);
}

/**
 * 将 glob 模式转换为正则表达式
 *
 * 规则：
 * - `**` 匹配零或多个目录（含分隔符）
 * - `*` 匹配单目录内的任意字符（不跨 `/`）
 * - `?` 匹配单个非 `/` 字符
 * - 其他特殊正则字符被转义
 */
function globToRegex(pattern: string): RegExp {
  let regexStr = '';
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    if (char === '*') {
      if (pattern[i + 1] === '*') {
        // `**` — 匹配零或多个目录
        // 处理 `**/` 或 `/**` 或 `/**/` 的情况
        i += 2;
        if (pattern[i] === '/') {
          // `**/` — 匹配零或多个目录前缀
          regexStr += '(?:.+/)?';
          i++;
        } else {
          // 末尾的 `**` — 匹配任意剩余路径
          regexStr += '.*';
        }
      } else {
        // 单 `*` — 匹配单目录内任意字符（不跨 `/`）
        regexStr += '[^/]*';
        i++;
      }
    } else if (char === '?') {
      // `?` — 匹配单个非 `/` 字符
      regexStr += '[^/]';
      i++;
    } else if ('.+^${}()|[]\\'.includes(char)) {
      // 转义正则特殊字符
      regexStr += '\\' + char;
      i++;
    } else {
      regexStr += char;
      i++;
    }
  }

  return new RegExp('^' + regexStr + '$');
}

/**
 * 判断文件路径是否匹配某个 glob 模式
 */
export function isGlobMatch(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (!isGlobPattern(pattern)) {
      // 精确路径匹配
      if (filePath === pattern) return true;
    } else {
      // glob 模式匹配
      const regex = globToRegex(pattern);
      if (regex.test(filePath)) return true;
    }
  }
  return false;
}

/**
 * 从 write_files 中提取所有非 glob 的精确路径
 */
export function expandGlobs(writeFiles: string[]): string[] {
  return writeFiles.filter((f) => !isGlobPattern(f));
}

/**
 * 提交前边界对账：检查 git diff 产出的文件是否均在任务声明的 write_files 范围内
 *
 * @param taskDef - 任务定义，至少包含 write_files 字段
 * @param gitDiff - `git diff --name-only` 的结果数组
 * @returns BoundaryCheckResult
 *
 * 算法：
 * 1. 对 gitDiff 中每个文件，检查是否匹配 write_files 中的任一条目（精确或 glob）
 * 2. violatingFiles = 不匹配任何 write_files 条目的文件
 * 3. missingCoverage = write_files 中的精确路径（非 glob）且未被 gitDiff 触碰的
 * 4. ok = violatingFiles 为空
 */
export function enforceBoundary(
  taskDef: { write_files: string[] },
  gitDiff: string[],
): BoundaryCheckResult {
  const writeFiles = taskDef.write_files;

  // 找出越界文件：gitDiff 中不匹配任何 write_files 条目的文件
  const violatingFiles = gitDiff.filter((file) => !isGlobMatch(file, writeFiles));

  // 找出未覆盖的精确路径：write_files 中非 glob 的路径且未被 gitDiff 触碰
  const exactPaths = expandGlobs(writeFiles);
  const missingCoverage = exactPaths.filter((p) => !gitDiff.includes(p));

  return {
    ok: violatingFiles.length === 0,
    violatingFiles,
    missingCoverage,
  };
}
