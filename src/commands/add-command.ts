import { SPECFORGE_DIR } from '../core/constants.js';
import { CommandService } from '../services/command-service.js';
import { fileExists } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import { joinPath, resolveProjectRoot } from '../utils/path.js';

export interface AddCommandOptions {
  type: string;
  name: string;
}

export class AddCommandCommand {
  private options: AddCommandOptions;

  constructor(options: AddCommandOptions) {
    this.options = options;
  }

  async execute(projectRoot?: string): Promise<void> {
    const root = resolveProjectRoot(projectRoot);

    const specforgeExists = await fileExists(joinPath(root, SPECFORGE_DIR));
    if (!specforgeExists) {
      logger.error(`${SPECFORGE_DIR}/ 不存在。请先运行 "specforge init"。`);
      process.exit(1);
    }

    const commandService = new CommandService();
    const cmdPath = await commandService.generateCommand(root, {
      type: this.options.type,
      name: this.options.name,
    });

    logger.success(`命令 "${this.options.name}" [${this.options.type}] 已创建于 ${cmdPath}`);
  }
}
