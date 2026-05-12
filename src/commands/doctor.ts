import { SPECFORGE_DIR, SPECFORGE_USER_DIR, WORKFLOW_COMMANDS_DIR, TOOL_COMMANDS_DIR, COMMANDS_DIR, SKILLS_DIR, TEMPLATES_DIR, CONTEXT_DIR, BRAINSTORMING_DIR, CHANGES_DIR, ARCHIVE_DIR } from '../core/constants.js';
import { fileExists, readFile } from '../utils/fs.js';
import { parseYamlFrontmatter } from '../utils/yaml.js';
import { logger } from '../utils/logger.js';
import { joinPath, resolveProjectRoot } from '../utils/path.js';
import { globby } from 'globby';
import path from 'node:path';
import fs from 'node:fs';
import type { DisclosureConfig } from '../core/disclosure-config.js';

export interface DoctorCommandOptions {
  checkDeps?: boolean;
  checkNode?: boolean;
  checkCompat?: boolean;
  checkDisclosure?: boolean;
  quiet?: boolean;
}

/** 三级渐进披露阈值（与 config.yaml.rules.global.progressiveDisclosure 对齐） */
const DISCLOSURE_LIMITS = {
  /** description 字符上限（Level 1） */
  descriptionMaxChars: 200,
  /** SKILL.md / command.md 行数上限（Level 2） */
  bodyMaxLines: 500,
} as const;

interface DisclosureIssue {
  file: string;
  rule: string;
  detail: string;
}

export class DoctorCommand {
  private options: DoctorCommandOptions;

  constructor(options?: DoctorCommandOptions) {
    this.options = options ?? {};
  }

  async execute(projectRoot?: string): Promise<void> {
    const root = resolveProjectRoot(projectRoot);

    if (this.options.checkNode) {
      this.checkNodeVersion();
      return;
    }

    if (this.options.checkDeps) {
      await this.checkDeps(root);
      return;
    }

    if (this.options.checkCompat) {
      await this.checkCompat(root);
      return;
    }

    if (this.options.checkDisclosure) {
      await this.checkDisclosure(root);
      return;
    }

    // Default: full diagnostics
    await this.fullDiagnostics(root);
  }

  /**
   * 校验三级渐进披露契约（来自 config.yaml.rules.global.progressiveDisclosure）：
   * - Level 1：description 长度 ≤ DISCLOSURE_LIMITS.descriptionMaxChars
   * - Level 2：command.md / SKILL.md 行数 ≤ DISCLOSURE_LIMITS.bodyMaxLines
   * - Level 3：references/ 中的文件必须从主体被引用（broken-link 检测）
   */
  private async checkDisclosure(root: string): Promise<void> {
    const frameworkDir = joinPath(root, SPECFORGE_DIR);
    if (!(await fileExists(frameworkDir))) {
      logger.warn(`${SPECFORGE_DIR}/ 不存在 — 该项目尚未初始化 SpecForge`);
      return;
    }

    const issues: DisclosureIssue[] = [];

    // 收集所有 command.md / SKILL.md 主体文件
    const commandFiles = await globby(['commands/**/*.md', '!**/references/**'], {
      cwd: frameworkDir,
      onlyFiles: true,
    });
    const skillFiles = await globby(['skills/**/SKILL.md'], {
      cwd: frameworkDir,
      onlyFiles: true,
    });

    const bodyFiles = [...commandFiles, ...skillFiles];

    for (const rel of bodyFiles) {
      const abs = path.join(frameworkDir, rel);
      const content = await readFile(abs);
      const { metadata } = parseYamlFrontmatter(content);

      // Level 1：description 长度
      const description = String(metadata.description ?? '');
      if (description.length > DISCLOSURE_LIMITS.descriptionMaxChars) {
        issues.push({
          file: rel,
          rule: 'L1.description-too-long',
          detail: `description ${description.length} 字符 > 上限 ${DISCLOSURE_LIMITS.descriptionMaxChars}`,
        });
      }

      // Level 2：行数
      const lineCount = content.split('\n').length;
      if (lineCount > DISCLOSURE_LIMITS.bodyMaxLines) {
        issues.push({
          file: rel,
          rule: 'L2.body-too-long',
          detail: `${lineCount} 行 > 上限 ${DISCLOSURE_LIMITS.bodyMaxLines}（应将长内容下沉到 references/）`,
        });
      }

      // Level 3：references 是否被引用（broken-link 检测）
      const dir = path.dirname(abs);
      const refsDir = path.join(dir, 'references');
      if (await fileExists(refsDir)) {
        const refFiles = await globby('**/*', { cwd: refsDir, onlyFiles: true });
        for (const ref of refFiles) {
          const refRel = `references/${ref}`;
          // 接受 ./references/x 与 references/x 两种引用形态
          if (!content.includes(refRel)) {
            issues.push({
              file: rel,
              rule: 'L3.unreferenced-reference',
              detail: `${refRel} 未在主体中被引用（孤立 reference 文件）`,
            });
          }
        }
      }
    }

    if (this.options.quiet) {
      // quiet 模式仅在有问题时简要输出
      if (issues.length > 0) {
        logger.warn(`渐进披露：${issues.length} 处违例（运行 doctor --check-disclosure 查看明细）`);
      }
      return;
    }

    if (issues.length === 0) {
      logger.success('三级渐进披露契约：全部通过 ✓');
    } else {
      logger.warn(`三级渐进披露：发现 ${issues.length} 处违例（参考 errors.E005_contextOverload）：`);
      for (const issue of issues) {
        console.log(`  - [${issue.rule}] ${issue.file}: ${issue.detail}`);
      }
    }

    // L3 加载预算校验：检查 workflow command 的 references/ 总行数是否越预算
    const workflowCommandDir = path.join(frameworkDir, COMMANDS_DIR, WORKFLOW_COMMANDS_DIR);
    if (fs.existsSync(workflowCommandDir)) {
      const defaultConfig: DisclosureConfig = {
        level3_loadBudget: {
          firstRoundTotalLinesMax: 150,
          mustBeReferencedFromL2: true,
        },
        routingStatement: {
          required: true,
          elements: ['route', 'changeId', 'loaded', 'notLoaded', 'firstAction', 'tokenBudget'],
        },
      };
      const budgetResult = checkL3LoadBudget(workflowCommandDir, defaultConfig);
      if (!budgetResult.ok) {
        logger.warn(`L3 加载预算越界（E005_contextOverload）：`);
        for (const violation of budgetResult.violations) {
          console.log(`  - ${violation.commandPath}: ${violation.totalLines} 行 > 上限 150`);
          for (const file of violation.files) {
            console.log(`      ${file.path} (${file.lines} 行)`);
          }
        }
      }
      if (budgetResult.unreferencedFiles.length > 0) {
        logger.warn(`L3 文件未被 L2 引用：`);
        for (const file of budgetResult.unreferencedFiles) {
          console.log(`  - ${file}`);
        }
      }

      // 路由声明六要素校验
      const routingResult = checkRoutingStatement(workflowCommandDir, defaultConfig);
      if (!routingResult.ok) {
        logger.warn(`路由声明六要素缺失（Req 9.4）：`);
        for (const violation of routingResult.violations) {
          console.log(`  - ${violation.commandPath}: 缺失 [${violation.missingElements.join(', ')}]`);
        }
      }
    }
  }

  private checkNodeVersion(): void {
    const minVersion = '24.14.1';
    const current = process.version.slice(1);
    const meets = compareVersions(current, minVersion) >= 0;

    if (meets) {
      if (!this.options.quiet) logger.success(`Node.js ${current} >= ${minVersion} ✓`);
    } else {
      logger.warn(`Node.js ${current} < ${minVersion} — 建议升级`);
    }
  }

  private async checkDeps(root: string): Promise<void> {
    const requiredDirs = [
      [SPECFORGE_DIR],
      [SPECFORGE_DIR, COMMANDS_DIR, WORKFLOW_COMMANDS_DIR],
      [SPECFORGE_DIR, COMMANDS_DIR, TOOL_COMMANDS_DIR],
      [SPECFORGE_DIR, SKILLS_DIR],
      [SPECFORGE_DIR, TEMPLATES_DIR],
      [SPECFORGE_USER_DIR],
      [SPECFORGE_USER_DIR, CONTEXT_DIR],
      [SPECFORGE_USER_DIR, BRAINSTORMING_DIR],
      [SPECFORGE_USER_DIR, CHANGES_DIR],
      [SPECFORGE_USER_DIR, ARCHIVE_DIR],
    ];

    const issues: string[] = [];
    const ok: string[] = [];

    for (const segments of requiredDirs) {
      const dirPath = joinPath(root, ...segments);
      if (await fileExists(dirPath)) {
        ok.push(segments.join('/'));
      } else {
        issues.push(segments.join('/'));
      }
    }

    if (!this.options.quiet) {
      if (issues.length === 0) {
        logger.success('目录结构完整 ✓');
      } else {
        for (const issue of issues) {
          logger.warn(`缺少: ${issue}`);
        }
      }
      for (const item of ok) {
        console.log(`  ${item}`);
      }
    }
  }

  private async checkCompat(root: string): Promise<void> {
    const frameworkDir = joinPath(root, SPECFORGE_DIR);
    const compatIssues: string[] = [];

    if (!(await fileExists(frameworkDir))) {
      if (!this.options.quiet) {
        logger.warn(`${SPECFORGE_DIR}/ 不存在 — 该项目尚未初始化 SpecForge`);
      }
      return;
    }

    // 检查关键目录是否存在
    const keyDirs = [
      [COMMANDS_DIR, WORKFLOW_COMMANDS_DIR],
      [COMMANDS_DIR, TOOL_COMMANDS_DIR],
      [SKILLS_DIR],
    ];

    for (const segments of keyDirs) {
      const dirPath = joinPath(frameworkDir, ...segments);
      if (!(await fileExists(dirPath))) {
        compatIssues.push(segments.join('/'));
      }
    }

    if (!this.options.quiet) {
      if (compatIssues.length === 0) {
        logger.success('项目结构兼容 ✓');
      } else {
        for (const issue of compatIssues) {
          logger.warn(`兼容性警告 — 缺少: ${issue}`);
        }
        logger.info('建议运行 "specforge update" 修复结构问题');
      }
    }

    // P9 引用校验：constitution ≥ 1.1.0 时检查 workflow command 是否引用 P9
    await this.checkP9References(root, frameworkDir);
  }

  /**
   * 校验 P9 引用：当 constitution 版本 ≥ 1.1.0 时，
   * 扫描所有 workflow command 主体文件，检查是否引用了 P9。
   * 未引用则输出 warn 级别提示。
   */
  private async checkP9References(root: string, frameworkDir: string): Promise<void> {
    // 读取 constitution.md 并提取版本号
    const constitutionPath = path.join(frameworkDir, 'constitution.md');
    if (!(await fileExists(constitutionPath))) {
      return;
    }

    const constitutionContent = await readFile(constitutionPath);
    const { metadata } = parseYamlFrontmatter(constitutionContent);
    const version = String(metadata.version ?? '0.0.0');

    // 版本 < 1.1.0 时跳过（向后兼容）
    if (compareVersions(version, '1.1.0') < 0) {
      return;
    }

    // 扫描所有 workflow command 目录
    const workflowDir = path.join(frameworkDir, COMMANDS_DIR, WORKFLOW_COMMANDS_DIR);
    if (!(await fileExists(workflowDir))) {
      return;
    }

    const workflowCommands = await globby(['*/'], {
      cwd: workflowDir,
      onlyDirectories: true,
    });

    // P9 引用关键词匹配模式
    const p9Patterns = ['P9', 'Constitution P9', 'context-reset-protocol'];

    for (const cmdDir of workflowCommands) {
      // 去除尾部斜杠获取 command 名称
      const cmdName = cmdDir.replace(/\/$/, '');
      const cmdFilePath = path.join(workflowDir, cmdName, `${cmdName}.md`);

      if (!(await fileExists(cmdFilePath))) {
        continue;
      }

      const content = await readFile(cmdFilePath);
      const hasP9Reference = p9Patterns.some((pattern) => content.includes(pattern));

      if (!hasP9Reference) {
        console.log(`⚠️ P9 引用缺失：${cmdName} 未引用 Constitution P9（反重复与验证前置）`);
      }
    }
  }

  private async fullDiagnostics(root: string): Promise<void> {
    const issues: string[] = [];
    const ok: string[] = [];

    // Check .specforge/
    const frameworkDir = joinPath(root, SPECFORGE_DIR);
    if (await fileExists(frameworkDir)) {
      ok.push(`${SPECFORGE_DIR}/ 存在`);
    } else {
      issues.push(`${SPECFORGE_DIR}/ 不存在 — 请运行 "specforge init"`);
    }

    // Check specforge/
    const userDir = joinPath(root, SPECFORGE_USER_DIR);
    if (await fileExists(userDir)) {
      ok.push(`${SPECFORGE_USER_DIR}/ 存在`);
    } else {
      issues.push(`${SPECFORGE_USER_DIR}/ 不存在 — 请运行 "specforge init"`);
    }

    console.log();
    if (issues.length === 0) {
      logger.success('SpecForge 项目结构正常');
    } else {
      for (const issue of issues) {
        logger.warn(issue);
      }
      console.log();
    }

    for (const item of ok) {
      console.log(`  ${item}`);
    }
    console.log();
  }
}

/**
 * 路由声明六要素校验结果
 *
 * 对应 design § 路由声明六要素：
 * - ok：所有 workflow command 的 preamble 均包含六要素
 * - violations：缺失要素的 command 列表
 */
export interface RoutingCheckResult {
  ok: boolean;
  violations: Array<{
    commandPath: string;
    missingElements: string[];
  }>;
}

/**
 * 校验路由声明六要素（同步函数）
 *
 * 算法：
 * 1. 扫描 commandDir 下所有子目录（每个是一个 workflow command）
 * 2. 对每个 command 目录：
 *    a. 读取主 .md 文件（L2 主体）
 *    b. 用正则/字符串匹配检查六要素是否存在
 *    c. 收集缺失要素
 *    d. 若有缺失，加入 violations
 * 3. 返回结果（ok = violations 为空）
 *
 * @param commandDir - workflow command 根目录（如 .specforge/commands/workflow/）
 * @param config - 渐进披露配置
 * @returns RoutingCheckResult
 */
export function checkRoutingStatement(commandDir: string, config: DisclosureConfig): RoutingCheckResult {
  const result: RoutingCheckResult = {
    ok: true,
    violations: [],
  };

  // 若未要求路由声明校验，直接返回合规
  if (!config.routingStatement.required) {
    return result;
  }

  // 若目录不存在，直接返回合规
  if (!fs.existsSync(commandDir)) {
    return result;
  }

  // 六要素对应的正则匹配模式
  const elementPatterns: Record<string, RegExp> = {
    route: /路由[：:]/,
    changeId: /Change-ID[：:]/,
    loaded: /已加载[：:]/,
    notLoaded: /未加载/,
    firstAction: /第一动作[：:]/,
    tokenBudget: /Token\s?预算/,
  };

  // 扫描所有子目录（每个是一个 workflow command）
  const entries = fs.readdirSync(commandDir, { withFileTypes: true });
  const commandDirs = entries.filter((e) => e.isDirectory());

  for (const cmdEntry of commandDirs) {
    const cmdName = cmdEntry.name;
    const cmdPath = path.join(commandDir, cmdName);

    // 读取 L2 主体文件（与目录同名的 .md 文件）
    const l2FilePath = path.join(cmdPath, `${cmdName}.md`);
    if (!fs.existsSync(l2FilePath)) {
      continue;
    }

    const content = fs.readFileSync(l2FilePath, 'utf-8');

    // 检查配置中要求的每个要素
    const missingElements: string[] = [];
    for (const element of config.routingStatement.elements) {
      const pattern = elementPatterns[element];
      if (pattern && !pattern.test(content)) {
        missingElements.push(element);
      }
    }

    // 若有缺失要素，加入 violations
    if (missingElements.length > 0) {
      result.ok = false;
      result.violations.push({
        commandPath: cmdPath,
        missingElements,
      });
    }
  }

  return result;
}

/**
 * L3 加载预算校验结果
 *
 * 对应 design-l3-budget.md § 5：
 * - ok：所有 workflow command 的 references/ 首轮加载总行数均 ≤ 预算
 * - violations：越预算的 command 列表
 * - unreferencedFiles：L3 文件未被 L2 主体引用的路径列表
 */
export interface L3BudgetCheckResult {
  ok: boolean;
  totalLines: number;
  violations: Array<{
    commandPath: string;
    totalLines: number;
    files: Array<{ path: string; lines: number }>;
  }>;
  unreferencedFiles: string[];
}

/**
 * 校验 L3 加载预算（同步函数）
 *
 * 算法：
 * 1. 扫描 commandDir 下所有子目录（每个是一个 workflow command）
 * 2. 对每个 command 目录：
 *    a. 读取主 .md 文件（L2 主体）
 *    b. 查找 references/ 子目录下所有文件
 *    c. 累加 references/ 文件总行数
 *    d. 若总行数 > config.level3_loadBudget.firstRoundTotalLinesMax → 加入 violations
 *    e. 若 mustBeReferencedFromL2 为 true，检查每个 references/ 文件是否在 L2 主体中被引用
 * 3. 返回结果
 *
 * @param commandDir - workflow command 根目录（如 .specforge/commands/workflow/）
 * @param config - 渐进披露配置
 * @returns L3BudgetCheckResult
 */
export function checkL3LoadBudget(commandDir: string, config: DisclosureConfig): L3BudgetCheckResult {
  const result: L3BudgetCheckResult = {
    ok: true,
    totalLines: 0,
    violations: [],
    unreferencedFiles: [],
  };

  // 若目录不存在，直接返回合规
  if (!fs.existsSync(commandDir)) {
    return result;
  }

  // 扫描所有子目录（每个是一个 workflow command）
  const entries = fs.readdirSync(commandDir, { withFileTypes: true });
  const commandDirs = entries.filter((e) => e.isDirectory());

  for (const cmdEntry of commandDirs) {
    const cmdName = cmdEntry.name;
    const cmdPath = path.join(commandDir, cmdName);

    // 读取 L2 主体文件（与目录同名的 .md 文件）
    const l2FilePath = path.join(cmdPath, `${cmdName}.md`);
    let l2Content = '';
    if (fs.existsSync(l2FilePath)) {
      l2Content = fs.readFileSync(l2FilePath, 'utf-8');
    }

    // 查找 references/ 子目录
    const refsDir = path.join(cmdPath, 'references');
    if (!fs.existsSync(refsDir)) {
      continue;
    }

    // 读取 references/ 下所有文件并计算行数
    const refEntries = fs.readdirSync(refsDir, { withFileTypes: true });
    const refFiles = refEntries.filter((e) => e.isFile());

    let commandTotalLines = 0;
    const fileDetails: Array<{ path: string; lines: number }> = [];

    for (const refFile of refFiles) {
      const refFilePath = path.join(refsDir, refFile.name);
      const content = fs.readFileSync(refFilePath, 'utf-8');
      const lineCount = content.split('\n').length;
      commandTotalLines += lineCount;
      fileDetails.push({ path: refFilePath, lines: lineCount });

      // 检查 L3 文件是否被 L2 主体引用
      if (config.level3_loadBudget.mustBeReferencedFromL2 && l2Content) {
        const refRelPath = `references/${refFile.name}`;
        // 接受 ./references/x 与 references/x 两种引用形态
        if (!l2Content.includes(refRelPath)) {
          result.unreferencedFiles.push(refFilePath);
        }
      }
    }

    result.totalLines += commandTotalLines;

    // 检查是否越预算
    const budget = config.level3_loadBudget.firstRoundTotalLinesMax;
    if (commandTotalLines > budget) {
      result.ok = false;
      result.violations.push({
        commandPath: cmdPath,
        totalLines: commandTotalLines,
        files: fileDetails,
      });
    }
  }

  return result;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}
