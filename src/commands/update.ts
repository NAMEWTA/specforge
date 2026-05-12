import { UpdateService } from '../services/update-service.js';
import { logger } from '../utils/logger.js';
import { resolveProjectRoot } from '../utils/path.js';

export interface UpdateCommandOptions {
  force?: boolean;
}

export class UpdateCommand {
  private force: boolean;

  constructor(options?: UpdateCommandOptions) {
    this.force = options?.force ?? false;
  }

  async execute(targetPath?: string): Promise<void> {
    const projectRoot = resolveProjectRoot(targetPath);
    const updateService = new UpdateService();
    const result = await updateService.execute(projectRoot);

    // 输出警告信息
    for (const warning of result.warnings) {
      logger.warn(warning);
    }

    if (result.updated) {
      logger.success(result.message);
      // 如果有补全的用户资产，额外提示
      if (result.createdUserAssets.length > 0) {
        logger.info(`已补全的用户资产文件：`);
        for (const file of result.createdUserAssets) {
          logger.info(`  + ${file}`);
        }
      }
    } else {
      logger.warn(result.message);
    }
  }
}
