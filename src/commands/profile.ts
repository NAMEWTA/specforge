import path from 'node:path';
import yaml from 'js-yaml';
import { CONFIG_YAML_FILE, SPECFORGE_DIR, SPECFORGE_USER_DIR } from '../core/constants.js';
import {
  BUILTIN_PROFILES,
  DEFAULT_PROFILE_NAME,
  PROFILE_NAMES,
  parseProfileFromConfig,
  resolveProfile,
  type ProfileName,
} from '../core/profiles.js';
import { fileExists, readFile, writeFile } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import { joinPath, resolveProjectRoot } from '../utils/path.js';

export type ProfileSubcommand = 'show' | 'set';

export interface ProfileCommandOptions {
  subcommand: ProfileSubcommand;
  /** 仅 set 用 */
  name?: string;
  /** 仅 set + custom 用 */
  enabledPhases?: string[];
  /** show 输出 JSON */
  json?: boolean;
}

/**
 * 读取项目 profile（用户优先，框架兜底，再回退默认）
 */
async function loadProjectProfile(projectRoot: string) {
  const userConfigPath = joinPath(projectRoot, SPECFORGE_USER_DIR, CONFIG_YAML_FILE);
  const fwConfigPath = joinPath(projectRoot, SPECFORGE_DIR, CONFIG_YAML_FILE);

  for (const cfgPath of [userConfigPath, fwConfigPath]) {
    if (await fileExists(cfgPath)) {
      try {
        const raw = await readFile(cfgPath);
        const parsed = yaml.load(raw);
        const profileConfig = parseProfileFromConfig(parsed);
        if (profileConfig) {
          return { profile: resolveProfile(profileConfig), source: cfgPath };
        }
      } catch {
        // 继续尝试下一个文件
      }
    }
  }

  return { profile: resolveProfile(null), source: '<default>' };
}

/**
 * 将 profile 写入用户级 config.yaml（保留其它字段）
 */
async function writeProjectProfile(
  projectRoot: string,
  name: ProfileName,
  enabledPhases?: string[],
): Promise<string> {
  const userConfigPath = joinPath(projectRoot, SPECFORGE_USER_DIR, CONFIG_YAML_FILE);

  let parsed: Record<string, unknown> = {};
  if (await fileExists(userConfigPath)) {
    try {
      const raw = await readFile(userConfigPath);
      const loaded = yaml.load(raw);
      if (loaded && typeof loaded === 'object') {
        parsed = loaded as Record<string, unknown>;
      }
    } catch {
      // 解析失败：覆盖前提示，但仍以新对象写入
      logger.warn(`既有 ${userConfigPath} 解析失败，将以新结构写入。`);
    }
  }

  parsed.profile =
    name === 'custom'
      ? { name, enabledPhases: enabledPhases ?? [] }
      : { name };

  const out = yaml.dump(parsed, { lineWidth: 120, noRefs: true });
  await writeFile(userConfigPath, out);
  return userConfigPath;
}

export class ProfileCommand {
  private options: ProfileCommandOptions;

  constructor(options: ProfileCommandOptions) {
    this.options = options;
  }

  async execute(targetPath?: string): Promise<void> {
    const projectRoot = resolveProjectRoot(targetPath);

    if (this.options.subcommand === 'show') {
      await this.show(projectRoot);
      return;
    }

    if (this.options.subcommand === 'set') {
      await this.set(projectRoot);
      return;
    }

    throw new Error(`未知 profile 子命令：${this.options.subcommand}`);
  }

  private async show(projectRoot: string): Promise<void> {
    const { profile, source } = await loadProjectProfile(projectRoot);

    if (this.options.json) {
      console.log(
        JSON.stringify(
          {
            name: profile.name,
            description: profile.description,
            enabledPhases: profile.enabledPhases,
            source,
          },
          null,
          2,
        ),
      );
      return;
    }

    console.log();
    console.log(`  Profile: ${profile.name}`);
    console.log(`  Source : ${source === '<default>' ? '默认（standard）' : path.relative(projectRoot, source)}`);
    console.log(`  说明   : ${profile.description}`);
    console.log(`  启用阶段（${profile.enabledPhases.length}）:`);
    for (const phase of profile.enabledPhases) {
      console.log(`    ✓ ${phase}`);
    }
    console.log();
  }

  private async set(projectRoot: string): Promise<void> {
    const name = this.options.name as ProfileName;
    if (!name || !(PROFILE_NAMES as readonly string[]).includes(name)) {
      throw new Error(
        `无效的 profile 名称："${name}"。可选：${PROFILE_NAMES.join(', ')}`,
      );
    }

    if (name === 'custom') {
      if (!this.options.enabledPhases || this.options.enabledPhases.length === 0) {
        throw new Error(
          'profile=custom 必须通过 --enabled-phases 提供至少一个阶段（逗号分隔）',
        );
      }
      // 让 zod 验证阶段值合法
      const profile = resolveProfile({
        name: 'custom',
        enabledPhases: this.options.enabledPhases as never,
      });
      const written = await writeProjectProfile(
        projectRoot,
        name,
        profile.enabledPhases as string[],
      );
      logger.success(
        `profile 已设置为 custom（${profile.enabledPhases.join(', ')}），写入 ${path.relative(
          projectRoot,
          written,
        )}`,
      );
      return;
    }

    const builtin = BUILTIN_PROFILES[name as Exclude<ProfileName, 'custom'>];
    const written = await writeProjectProfile(projectRoot, name);
    logger.success(
      `profile 已设置为 ${name}（${builtin.enabledPhases.join(', ')}），写入 ${path.relative(
        projectRoot,
        written,
      )}`,
    );
  }
}

export { DEFAULT_PROFILE_NAME };
