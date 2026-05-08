import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fsExtra from 'fs-extra';
import {
  COMMANDS_DIR,
  WORKFLOW_COMMANDS_DIR,
  TOOL_COMMANDS_DIR,
  CONTEXT_DIR,
  BRAINSTORMING_DIR,
  DEFAULT_SKILL_CATEGORIES,
  GITKEEP_FILE,
  SKILLS_DIR,
  SPECFORGE_DIR,
  SPECFORGE_USER_DIR,
  CHANGES_DIR,
  ARCHIVE_DIR,
  TEMPLATES_DIR,
} from '../core/constants.js';
import { resolveProfile, type Profile, type ProfileConfig } from '../core/profiles.js';
import type { LifecycleType } from '../core/lifecycle-types.js';
import { ensureDirectory, writeFile, fileExists, readFile } from '../utils/fs.js';
import { joinPath } from '../utils/path.js';
import { renderTemplate } from '../utils/template-renderer.js';

/**
 * 阶段 → workflow command 目录名 的映射（与 templates/.specforge/commands/workflow/ 子目录一致）
 */
const PHASE_TO_WORKFLOW_DIR: Record<LifecycleType, string> = {
  foundation: 'foundation-init',
  requirements: 'requirements-clarify',
  design: 'design-explore',
  planning: 'planning-breakdown',
  implementation: 'implementation-build',
  quality: 'quality-verify',
  release: 'release-deploy',
  evolution: 'evolution-retrospect',
};

/**
 * 获取 SpecForge 包的模板目录路径
 */
function resolvePackageTemplatesDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageRoot = path.resolve(__dirname, '..', '..');
  return path.join(packageRoot, 'templates');
}

/**
 * 递归处理模板渲染和复制
 * - 如果是文件，且后缀为 .yaml/.md/.json，进行变量渲染
 * - 否则原样复制
 * - 可选 skipDirs：跳过指定的子目录（按相对模板根的相对路径匹配）
 */
async function copyDirWithRendering(
  src: string,
  dest: string,
  variables: Record<string, string>,
  options?: { skipDirs?: Set<string>; relativeBase?: string },
): Promise<void> {
  const skipDirs = options?.skipDirs;
  const relativeBase = options?.relativeBase ?? '';

  await ensureDirectory(dest);

  const entries = await fsExtra.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const entryRel = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
    if (entry.isDirectory() && skipDirs?.has(entryRel)) {
      continue;
    }

    const srcPath = joinPath(src, entry.name);
    const destPath = joinPath(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirWithRendering(srcPath, destPath, variables, {
        skipDirs,
        relativeBase: entryRel,
      });
    } else if (entry.isFile()) {
      // 对特定文件类型进行渲染
      if (['.yaml', '.yml', '.md', '.json'].some((ext) => entry.name.endsWith(ext))) {
        const content = await readFile(srcPath);
        const rendered = renderTemplate(content, variables);
        await writeFile(destPath, rendered);
      } else {
        // 其他文件原样复制
        const content = await readFile(srcPath);
        await writeFile(destPath, content);
      }
    }
  }
}

/**
 * 根据 profile 计算需要跳过的 workflow command 子目录（相对 templates/.specforge/）
 */
function computeProfileSkipDirs(profile: Profile): Set<string> {
  const enabled = new Set<string>(profile.enabledPhases.map((p) => PHASE_TO_WORKFLOW_DIR[p]));
  const skip = new Set<string>();
  for (const [, dirName] of Object.entries(PHASE_TO_WORKFLOW_DIR)) {
    if (!enabled.has(dirName)) {
      skip.add(`commands/workflow/${dirName}`);
    }
  }
  return skip;
}

export interface ScaffoldResult {
  frameworkDir: string;
  userDir: string;
  created: string[];
}

export class ScaffoldService {
  /**
   * 执行初始化：按 templates/ 结构初始化项目
   * 采用严格的模板驱动策略
   */
  async execute(
    projectRoot: string,
    options?: {
      projectName?: string;
      author?: string;
      profileConfig?: ProfileConfig | null;
    },
  ): Promise<ScaffoldResult> {
    const projectName = options?.projectName ?? path.basename(projectRoot);
    const author = options?.author ?? 'unknown';
    const createdAt = new Date().toISOString().split('T')[0];
    const profile = resolveProfile(options?.profileConfig ?? null);

    // 标准化的变量映射
    const variables: Record<string, string> = {
      projectName,
      author,
      createdAt,
      version: '0.1.0',
    };

    // 初始化框架资产（按 profile 过滤未启用阶段的命令目录）
    await this.initializeFramework(projectRoot, variables, profile);

    // 初始化用户资产
    await this.initializeUserAssets(projectRoot, variables);

    return {
      frameworkDir: joinPath(projectRoot, SPECFORGE_DIR),
      userDir: joinPath(projectRoot, SPECFORGE_USER_DIR),
      created: [],
    };
  }

  /**
   * 初始化框架资产：从 templates/.specforge/ 复制到 .specforge/
   */
  private async initializeFramework(
    projectRoot: string,
    variables: Record<string, string>,
    profile: Profile,
  ): Promise<void> {
    const templatesDir = resolvePackageTemplatesDir();
    const sourceFrameworkDir = joinPath(templatesDir, SPECFORGE_DIR);
    const targetFrameworkDir = joinPath(projectRoot, SPECFORGE_DIR);

    if (await fileExists(sourceFrameworkDir)) {
      // 模板存在：按 profile 过滤后完整复制并渲染
      const skipDirs = computeProfileSkipDirs(profile);
      await copyDirWithRendering(sourceFrameworkDir, targetFrameworkDir, variables, {
        skipDirs,
      });
    } else {
      // 模板不存在：创建最小骨架
      await this.createFrameworkFallback(targetFrameworkDir);
    }
  }

  /**
   * 初始化用户资产：从 templates/specforge/ 复制到 specforge/
   */
  private async initializeUserAssets(
    projectRoot: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const templatesDir = resolvePackageTemplatesDir();
    const sourceUserDir = joinPath(templatesDir, SPECFORGE_USER_DIR);
    const targetUserDir = joinPath(projectRoot, SPECFORGE_USER_DIR);

    if (await fileExists(sourceUserDir)) {
      // 模板存在：完整复制并渲染
      await copyDirWithRendering(sourceUserDir, targetUserDir, variables);
    } else {
      // 模板不存在：创建最小骨架
      await this.createUserAssetsFallback(targetUserDir);
    }
  }

  /**
   * 框架资产回退：创建最小必需骨架
   */
  private async createFrameworkFallback(targetDir: string): Promise<void> {
    await ensureDirectory(targetDir);

    // commands/
    const workflowDir = joinPath(targetDir, COMMANDS_DIR, WORKFLOW_COMMANDS_DIR);
    await ensureDirectory(workflowDir);
    await writeFile(joinPath(workflowDir, GITKEEP_FILE), '');

    const toolsDir = joinPath(targetDir, COMMANDS_DIR, TOOL_COMMANDS_DIR);
    await ensureDirectory(toolsDir);
    await writeFile(joinPath(toolsDir, GITKEEP_FILE), '');

    // skills/
    const skillsRoot = joinPath(targetDir, SKILLS_DIR);
    for (const category of DEFAULT_SKILL_CATEGORIES) {
      const categoryDir = joinPath(skillsRoot, category);
      await ensureDirectory(categoryDir);
      await writeFile(joinPath(categoryDir, GITKEEP_FILE), '');
    }

    // templates/
    const templatesDir = joinPath(targetDir, TEMPLATES_DIR);
    await ensureDirectory(templatesDir);
    await writeFile(joinPath(templatesDir, GITKEEP_FILE), '');
  }

  /**
   * 用户资产回退：创建最小必需骨架
   */
  private async createUserAssetsFallback(targetDir: string): Promise<void> {
    await ensureDirectory(targetDir);

    const dirs = [BRAINSTORMING_DIR, CONTEXT_DIR, CHANGES_DIR, ARCHIVE_DIR];
    for (const dirName of dirs) {
      const subDir = joinPath(targetDir, dirName);
      await ensureDirectory(subDir);
      await writeFile(joinPath(subDir, GITKEEP_FILE), '');
    }
  }
}
