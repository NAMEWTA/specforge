import { ScaffoldService } from '../services/scaffold-service.js';
import { validateProjectCompatibility } from '../core/compatibility.js';
import {
  PROFILE_NAMES,
  resolveProfile,
  type ProfileConfig,
  type ProfileName,
} from '../core/profiles.js';
import { logger } from '../utils/logger.js';
import { resolveProjectRoot } from '../utils/path.js';

export interface InitCommandOptions {
  projectName?: string;
  force?: boolean;
  /** profile 名称（minimal | standard | custom） */
  profile?: string;
  /** 当 profile=custom 时使用：逗号分隔的阶段名列表 */
  enabledPhases?: string[];
}

export class InitCommand {
  private projectName?: string;
  private force: boolean;
  private profile?: string;
  private enabledPhases?: string[];

  constructor(options?: InitCommandOptions) {
    this.projectName = options?.projectName;
    this.force = options?.force ?? false;
    this.profile = options?.profile;
    this.enabledPhases = options?.enabledPhases;
  }

  async execute(targetPath?: string): Promise<void> {
    const projectRoot = resolveProjectRoot(targetPath);

    // Validate compatibility
    const { compatible, warnings } = await validateProjectCompatibility(projectRoot);

    if (!compatible) {
      logger.error(warnings[0]);
      process.exit(1);
    }

    for (const warning of warnings) {
      logger.warn(warning);
    }

    // 解析 profile（无显式指定则采用默认 standard）
    const profileConfig = this.buildProfileConfig();

    // Scaffold the project
    const scaffoldService = new ScaffoldService();
    await scaffoldService.execute(projectRoot, {
      projectName: this.projectName,
      profileConfig,
    });

    this.displaySuccessMessage(projectRoot);
  }

  private buildProfileConfig(): ProfileConfig | null {
    if (!this.profile) return null;
    if (!(PROFILE_NAMES as readonly string[]).includes(this.profile)) {
      throw new Error(
        `无效的 profile："${this.profile}"。可选：${PROFILE_NAMES.join(', ')}`,
      );
    }
    const cfg: ProfileConfig = {
      name: this.profile as ProfileName,
      enabledPhases: this.enabledPhases as never,
    };
    // 提前抛错：custom 需要 enabledPhases；阶段名合法
    resolveProfile(cfg);
    return cfg;
  }

  private displaySuccessMessage(projectRoot: string): void {
    console.log();
    logger.success(`SpecForge initialized in ${projectRoot}`);
    console.log();
    console.log('  Created:');
    console.log('    .specforge/        Framework assets (commands, skills, context)');
    console.log('    specforge/         User assets (specs, changes, archive)');
    console.log();
    logger.info('Next: use @.specforge/commands/... to invoke phase commands');
  }
}
