import { SPECFORGE_DIR } from '../core/constants.js';
import { SkillService, SkillMode } from '../services/skill-service.js';
import { fileExists } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import { joinPath, resolveProjectRoot } from '../utils/path.js';

export interface AddSkillCommandOptions {
  name: string;
  type?: string;
  mode?: SkillMode;
}

export class AddSkillCommand {
  private name: string;
  private type?: string;
  private mode: SkillMode;

  constructor(options: AddSkillCommandOptions) {
    this.name = options.name;
    this.type = options.type;
    this.mode = options.mode ?? 'directory';
  }

  async execute(projectRoot?: string): Promise<void> {
    const root = resolveProjectRoot(projectRoot);

    await this.validateProject(root);

    const skillService = new SkillService();
    const skillPath = await skillService.generateSkill(root, this.name, {
      type: this.type,
      mode: this.mode,
    });

    logger.success(`技能 "${this.name}" 已创建于 ${skillPath}`);
  }

  private async validateProject(projectRoot: string): Promise<void> {
    const specforgeExists = await fileExists(joinPath(projectRoot, SPECFORGE_DIR));
    if (!specforgeExists) {
      logger.error(`${SPECFORGE_DIR}/ 不存在。请先运行 "specforge init"。`);
      process.exit(1);
    }
  }
}
