import { SPECFORGE_DIR, SPECFORGE_USER_DIR, WORKFLOW_COMMANDS_DIR, TOOL_COMMANDS_DIR, COMMANDS_DIR, SKILLS_DIR, TEMPLATES_DIR, CONTEXT_DIR, BRAINSTORMING_DIR, CHANGES_DIR, ARCHIVE_DIR } from '../core/constants.js';
import { fileExists, readFile } from '../utils/fs.js';
import { parseYamlFrontmatter } from '../utils/yaml.js';
import { logger } from '../utils/logger.js';
import { joinPath, resolveProjectRoot } from '../utils/path.js';
import { globby } from 'globby';
import path from 'node:path';

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
      return;
    }

    logger.warn(`三级渐进披露：发现 ${issues.length} 处违例（参考 errors.E005_contextOverload）：`);
    for (const issue of issues) {
      console.log(`  - [${issue.rule}] ${issue.file}: ${issue.detail}`);
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

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}
