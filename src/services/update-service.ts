import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  COMMANDS_DIR,
  SPECFORGE_DIR,
  WORKFLOW_COMMANDS_DIR,
} from '../core/constants.js';
import { fileExists, copyDir } from '../utils/fs.js';
import { joinPath } from '../utils/path.js';

export interface UpdateOptions {
  force?: boolean;
}

export interface UpdateResult {
  updated: boolean;
  message: string;
  updatedFiles: string[];
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
    const warnings: string[] = [];

    if (!(await fileExists(frameworkDir))) {
      return {
        updated: false,
        message: `${SPECFORGE_DIR}/ 不存在。请先运行 "specforge init"。`,
        updatedFiles: [],
        warnings: [],
      };
    }

    const legacyOperationsDir = joinPath(
      frameworkDir,
      COMMANDS_DIR,
      WORKFLOW_COMMANDS_DIR,
      'operations-monitor',
    );
    if (await fileExists(legacyOperationsDir)) {
      warnings.push(
        '检测到已废弃的 operations-monitor 命令。SpecForge v0.2.0 起移除 operations 阶段；请将监控、回滚、运行手册语义迁移到 release-deploy，并删除 .specforge/commands/workflow/operations-monitor/。',
      );
    }

    // 从包模板中复制最新的框架文件到项目 .specforge/
    const templatesDir = resolvePackageTemplatesDir();
    const sourceFrameworkDir = joinPath(templatesDir, SPECFORGE_DIR);

    if (await fileExists(sourceFrameworkDir)) {
      try {
        // 复制框架资产到项目（覆盖框架文件，不影响 specforge/ 用户资产）
        await copyDir(sourceFrameworkDir, frameworkDir);
        updatedFiles.push(`${SPECFORGE_DIR}/`);

        const message =
          `框架资产已更新。${SPECFORGE_DIR}/ 下的命令、技能和模板已刷新。` +
          `用户资产 specforge/ 未受影响。`;

        return {
          updated: true,
          message,
          updatedFiles,
          warnings,
        };
      } catch (error) {
        return {
          updated: false,
          message: `更新失败: ${error instanceof Error ? error.message : String(error)}`,
          updatedFiles: [],
          warnings,
        };
      }
    }

    return {
      updated: false,
      message: '未找到模板源目录，无法更新。请确保 SpecForge 包完整。',
      updatedFiles: [],
      warnings,
    };
  }
}
