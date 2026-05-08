import { Command } from 'commander';
import { createRequire } from 'module';
import ora from 'ora';
import path from 'node:path';

const program = new Command();
const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

program
  .name('specforge')
  .description('AI-native spec-driven development workflow tool')
  .version(version);

program.option('--no-color', '禁用彩色输出');

program.hook('preAction', async (thisCommand) => {
  const opts = thisCommand.opts();
  if (opts.color === false) process.env.NO_COLOR = '1';
});

// specforge init [path]
program
  .command('init [path]')
  .description('初始化 SpecForge 双目录结构')
  .option('--project-name <name>', '项目名称（默认使用目录名）')
  .option('--force', '跳过确认提示')
  .option('--profile <name>', 'profile 名称（minimal | standard | custom），默认 standard')
  .option('--enabled-phases <list>', '当 profile=custom 时使用，逗号分隔的阶段名')
  .action(
    async (
      targetPath = '.',
      options?: {
        projectName?: string;
        force?: boolean;
        profile?: string;
        enabledPhases?: string;
      },
    ) => {
      try {
        const resolvedPath = path.resolve(targetPath);
        const { InitCommand } = await import('../commands/init.js');
        const cmd = new InitCommand({
          projectName: options?.projectName,
          force: options?.force,
          profile: options?.profile,
          enabledPhases: options?.enabledPhases
            ? options.enabledPhases.split(',').map((s) => s.trim()).filter(Boolean)
            : undefined,
        });
        await cmd.execute(resolvedPath);
      } catch (error) {
        console.log();
        ora().fail(`错误: ${(error as Error).message}`);
        process.exit(1);
      }
    },
  );

// specforge add-command
program
  .command('add-command')
  .description('创建新的命令文件')
  .requiredOption('--type <type>', '命令类型（workflow-command | tool-command）')
  .requiredOption('--name <name>', '命令名称（kebab-case）')
  .action(async (options: { type: string; name: string }) => {
    try {
      const { AddCommandCommand } = await import('../commands/add-command.js');
      const cmd = new AddCommandCommand({ type: options.type, name: options.name });
      await cmd.execute();
    } catch (error) {
      console.log();
      ora().fail(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// specforge add-skill <name>
program
  .command('add-skill <name>')
  .description('创建新的技能文件')
  .option('--type <type>', '技能类型（domain-rule | code-style 等）', 'domain-rule')
  .option('--mode <mode>', 'directory 或 single-file', 'directory')
  .action(async (name: string, options?: { type?: string; mode?: string }) => {
    try {
      const { AddSkillCommand } = await import('../commands/add-skill.js');
      const cmd = new AddSkillCommand({
        name,
        type: options?.type,
        mode: (options?.mode as 'directory' | 'single-file') || 'directory',
      });
      await cmd.execute();
    } catch (error) {
      console.log();
      ora().fail(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// specforge list
program
  .command('list')
  .description('列出命令和技能')
  .option('--commands', '仅列出命令（type 以 -command 结尾）')
  .option('--skills', '仅列出技能（type 不以 -command 结尾）')
  .option('--type <type>', '按 type 值筛选')
  .option('--triggers <keywords>', '按触发词筛选（逗号分隔，扫描 description）')
  .option('--format <format>', '输出格式（xml | json | text，默认 xml）')
  .action(async (options?: {
    commands?: boolean; skills?: boolean; type?: string;
    triggers?: string; format?: string;
  }) => {
    try {
      const { ListCommand } = await import('../commands/list.js');
      const cmd = new ListCommand();
      await cmd.execute('.', {
        format: options?.format as 'xml' | 'json' | 'text' | undefined,
        commands: options?.commands,
        skills: options?.skills,
        type: options?.type,
        triggers: options?.triggers,
      });
    } catch (error) {
      console.log();
      ora().fail(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// specforge status
program
  .command('status')
  .description('查询产物状态（仅对 workflow-command）')
  .option('--phase <name>', '指定阶段')
  .option('--check-requires', '检查前置产物')
  .option('--graph', '输出产物 DAG（BLOCKED / READY / DONE）')
  .option('--json', '机器可读输出')
  .action(
    async (options?: {
      phase?: string;
      checkRequires?: boolean;
      graph?: boolean;
      json?: boolean;
    }) => {
      try {
        const { StatusCommand } = await import('../commands/status.js');
        const cmd = new StatusCommand({
          phase: options?.phase,
          checkRequires: options?.checkRequires,
          graph: options?.graph,
          json: options?.json,
        });
        await cmd.execute('.');
      } catch (error) {
        console.log();
        ora().fail(`错误: ${(error as Error).message}`);
        process.exit(1);
      }
    },
  );

// specforge update [path]
program
  .command('update [path]')
  .description('更新 SpecForge 框架资产（保留用户资产）')
  .option('--force', '强制更新')
  .action(async (targetPath = '.', options?: { force?: boolean }) => {
    try {
      const { UpdateCommand } = await import('../commands/update.js');
      const cmd = new UpdateCommand({ force: options?.force });
      await cmd.execute(path.resolve(targetPath));
    } catch (error) {
      console.log();
      ora().fail(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// specforge run-hook --phase <name> --stage <before|after>
program
  .command('run-hook')
  .description('执行 .specforge/extensions.yaml 中指定阶段的钩子（用于 preamble 串联）')
  .requiredOption('--phase <name>', '生命周期阶段名（foundation | requirements | ... | evolution）')
  .requiredOption('--stage <stage>', '钩子阶段（before | after）')
  .option('--json', '机器可读输出')
  .action(async (options: { phase: string; stage: string; json?: boolean }) => {
    try {
      const { RunHookCommand } = await import('../commands/run-hook.js');
      const cmd = new RunHookCommand({
        phase: options.phase,
        stage: options.stage as 'before' | 'after',
        json: options.json,
      });
      await cmd.execute('.');
    } catch (error) {
      console.log();
      ora().fail(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// specforge profile <show|set>
const profileCmd = program
  .command('profile')
  .description('查看/切换 SpecForge profile（minimal | standard | custom）');

profileCmd
  .command('show')
  .description('显示当前 profile 与启用的阶段')
  .option('--json', '机器可读输出')
  .action(async (options?: { json?: boolean }) => {
    try {
      const { ProfileCommand } = await import('../commands/profile.js');
      const cmd = new ProfileCommand({ subcommand: 'show', json: options?.json });
      await cmd.execute('.');
    } catch (error) {
      console.log();
      ora().fail(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

profileCmd
  .command('set <name>')
  .description('设置 profile（minimal | standard | custom）')
  .option('--enabled-phases <list>', '当 name=custom 时使用，逗号分隔的阶段名')
  .action(async (name: string, options?: { enabledPhases?: string }) => {
    try {
      const { ProfileCommand } = await import('../commands/profile.js');
      const cmd = new ProfileCommand({
        subcommand: 'set',
        name,
        enabledPhases: options?.enabledPhases
          ? options.enabledPhases.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      await cmd.execute('.');
    } catch (error) {
      console.log();
      ora().fail(`错误: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// specforge doctor
program
  .command('doctor')
  .description('诊断 SpecForge 项目结构')
  .option('--check-deps', '检查依赖目录完整性')
  .option('--check-node', '检查 Node 版本')
  .option('--check-compat', '检查项目结构兼容性')
  .option('--check-disclosure', '校验三级渐进披露契约（description/行数/references 引用）')
  .option('--quiet', '精简输出（preamble 使用）')
  .action(
    async (options?: {
      checkDeps?: boolean;
      checkNode?: boolean;
      checkCompat?: boolean;
      checkDisclosure?: boolean;
      quiet?: boolean;
    }) => {
      try {
        const { DoctorCommand } = await import('../commands/doctor.js');
        const cmd = new DoctorCommand({
          checkDeps: options?.checkDeps,
          checkNode: options?.checkNode,
          checkCompat: options?.checkCompat,
          checkDisclosure: options?.checkDisclosure,
          quiet: options?.quiet,
        });
        await cmd.execute('.');
      } catch (error) {
        console.log();
        ora().fail(`错误: ${(error as Error).message}`);
        process.exit(1);
      }
    },
  );

program.parse();
