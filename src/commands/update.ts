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

    for (const warning of result.warnings) {
      logger.warn(warning);
    }

    if (result.updated) {
      logger.success(result.message);
    } else {
      logger.warn(result.message);
    }
  }
}
