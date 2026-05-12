import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  COMMANDS_DIR,
  SPECFORGE_DIR,
  SPECFORGE_USER_DIR,
  WORKFLOW_COMMANDS_DIR,
  TOOL_COMMANDS_DIR,
  SKILLS_DIR,
  TEMPLATES_DIR,
  CONTEXT_DIR,
  CONFIG_YAML_FILE,
} from '../core/constants.js';
import { fileExists, copyDir } from '../utils/fs.js';
import { joinPath } from '../utils/path.js';
import { logger } from '../utils/logger.js';
import { upsertUserAsset, type UpsertResult } from './scaffold-service.js';

/**
 * 三份 context 模板文件名（与 scaffold-service 保持一致）
 */
const CONTEXT_TEMPLATE_FILES = ['context.md', 'architecture.md', 'lessons.md'] as const;

/**
 * 框架资产必须存在的关键文件（相对 .specforge/）
 */
const REQUIRED_FRAMEWORK_FILES = [
  CONFIG_YAML_FILE,
  'constitution.md',
  'extensions.yaml',
] as const;

/**
 * 框架资产必须存在的关键目录（相对 .specforge/）
 */
const REQUIRED_FRAMEWORK_DIRS = [
  `${COMMANDS_DIR}/${WORKFLOW_COMMANDS_DIR}`,
  `${COMMANDS_DIR}/${TOOL_COMMANDS_DIR}`,
  SKILLS_DIR,
  TEMPLATES_DIR,
] as const;

export interface UpdateOptions {
  force?: boolean;
}

export interface UpdateResult {
  updated: boolean;
  message: string;
  updatedFiles: string[];
  /** update 过程中通过 upsert 补全的用户资产文件 */
  createdUserAssets: string[];
  warnings: string[];
}

/**
 * 获取 SpecForge 包的模板目录路径
 */
function resolvePackageTemplatesDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageRoot = path.resolve(__dirname, '..', '..');
  return path.join(packageRoot, 'templates');
}

export class UpdateService {
  async execute(
    projectRoot: string,
  ): Promise<UpdateResult> {
    const frameworkDir = joinPath(projectRoot, SPECFORGE_DIR);
    const updatedFiles: string[] = [];
    const createdUserAssets: string[] = [];
    const warnings: string[] = [];

    if (!(await fileExists(frameworkDir))) {
      return {
        updated: false,
        message: `${SPECFORGE_DIR}/ 不存在。请先运行 "specforge init"。`,
        updatedFiles: [],
        createdUserAssets: [],
        warnings: [],
      };
    }

    // 检测已废弃的 operations-monitor 命令
    const legacyOperationsDir = joinPath(
      frameworkDir,
      COMMANDS_DIR,
      WORKFLOW_COMMANDS_DIR,
      'operations-monitor',
    );
    if (await fileExists(legacyOperationsDir)) {
      warnings.push(
        '检测到已废弃的 operations-monitor 命令。SpecForge v0.2.0 起移除 operations 阶段；' +
        '请将监控、回滚、运行手册语义迁移到 release-deploy，并删除 ' +
        '.specforge/commands/workflow/operations-monitor/。',
      );
    }

    // 从包模板中复制最新的框架文件到项目 .specforge/
    const templatesDir = resolvePackageTemplatesDir();
    const sourceFrameworkDir = joinPath(templatesDir, SPECFORGE_DIR);

    if (!(await fileExists(sourceFrameworkDir))) {
      return {
        updated: false,
        message: '未找到模板源目录，无法更新。请确保 SpecForge 包完整。',
        updatedFiles: [],
        createdUserAssets: [],
        warnings,
      };
    }

    try {
      // 1. 复制框架资产到项目（覆盖框架文件）
      await copyDir(sourceFrameworkDir, frameworkDir);
      updatedFiles.push(`${SPECFORGE_DIR}/`);

      // 2. 补全用户资产中缺失的 context 文件（upsert 语义：不覆盖已有内容）
      const upsertResults = await this.upsertMissingContextFiles(projectRoot, templatesDir);
      for (const [fileName, result] of upsertResults) {
        if (result === 'created') {
          createdUserAssets.push(`${SPECFORGE_USER_DIR}/${CONTEXT_DIR}/${fileName}`);
          logger.success(`补全缺失的用户资产：${CONTEXT_DIR}/${fileName}`);
        } else if (result === 'upgraded-gitkeep') {
          createdUserAssets.push(`${SPECFORGE_USER_DIR}/${CONTEXT_DIR}/${fileName}`);
          logger.success(`升级 .gitkeep 为模板内容：${CONTEXT_DIR}/${fileName}`);
        }
      }

      // 3. 校验更新后的完整性
      const integrityWarnings = await this.validateCompleteness(projectRoot);
      warnings.push(...integrityWarnings);

      // 构建结果消息
      const parts: string[] = [];
      parts.push(`框架资产已更新。${SPECFORGE_DIR}/ 下的命令、技能和模板已刷新。`);
      if (createdUserAssets.length > 0) {
        parts.push(`补全了 ${createdUserAssets.length} 个缺失的用户资产文件。`);
      }

      return {
        updated: true,
        message: parts.join(''),
        updatedFiles,
        createdUserAssets,
        warnings,
      };
    } catch (error) {
      return {
        updated: false,
        message: `更新失败: ${error instanceof Error ? error.message : String(error)}`,
        updatedFiles: [],
        createdUserAssets: [],
        warnings,
      };
    }
  }

  /**
   * 补全用户资产中缺失的 context 文件
   * 使用 upsertUserAsset 三分支语义：不覆盖已有内容
   */
  private async upsertMissingContextFiles(
    projectRoot: string,
    templatesDir: string,
  ): Promise<Array<[string, UpsertResult]>> {
    const templateContextDir = joinPath(templatesDir, SPECFORGE_USER_DIR, CONTEXT_DIR);
    const targetContextDir = joinPath(projectRoot, SPECFORGE_USER_DIR, CONTEXT_DIR);
    const results: Array<[string, UpsertResult]> = [];

    // 如果模板源中没有 context 文件，跳过
    if (!(await fileExists(templateContextDir))) {
      return results;
    }

    // 获取项目名称（从 project.md 或目录名推断）
    const projectName = path.basename(projectRoot);

    for (const fileName of CONTEXT_TEMPLATE_FILES) {
      const templatePath = joinPath(templateContextDir, fileName);
      const targetPath = joinPath(targetContextDir, fileName);

      // 模板文件不存在则跳过
      if (!(await fileExists(templatePath))) {
        continue;
      }

      const result = await upsertUserAsset(targetPath, templatePath, { projectName });
      results.push([fileName, result]);
    }

    return results;
  }

  /**
   * 校验更新后的目录完整性
   * 返回缺失项的警告列表
   */
  private async validateCompleteness(projectRoot: string): Promise<string[]> {
    const warnings: string[] = [];
    const frameworkDir = joinPath(projectRoot, SPECFORGE_DIR);

    // 检查框架资产关键文件
    for (const file of REQUIRED_FRAMEWORK_FILES) {
      const filePath = joinPath(frameworkDir, file);
      if (!(await fileExists(filePath))) {
        warnings.push(`框架资产缺失关键文件：${SPECFORGE_DIR}/${file}`);
      }
    }

    // 检查框架资产关键目录
    for (const dir of REQUIRED_FRAMEWORK_DIRS) {
      const dirPath = joinPath(frameworkDir, dir);
      if (!(await fileExists(dirPath))) {
        warnings.push(`框架资产缺失关键目录：${SPECFORGE_DIR}/${dir}`);
      }
    }

    // 检查用户资产 context 文件
    const contextDir = joinPath(projectRoot, SPECFORGE_USER_DIR, CONTEXT_DIR);
    if (await fileExists(contextDir)) {
      for (const fileName of CONTEXT_TEMPLATE_FILES) {
        const filePath = joinPath(contextDir, fileName);
        if (!(await fileExists(filePath))) {
          warnings.push(
            `用户资产缺失 context 文件：${SPECFORGE_USER_DIR}/${CONTEXT_DIR}/${fileName}`,
          );
        }
      }
    }

    return warnings;
  }
}
