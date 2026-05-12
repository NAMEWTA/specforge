import { z } from 'zod';
import path from 'node:path';
import { globby } from 'globby';
import inquirer from 'inquirer';
import { fileExists, readFile } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

// ============================================================
// Schema 定义
// ============================================================

/** 技术栈条目 schema */
const TechStackEntrySchema = z.object({
  ecosystem: z.enum(['node', 'python', 'go', 'rust', 'java', 'other']),
  manifest: z.string(),
  runtime: z.string().optional(),
  packageManager: z.string().optional(),
});

/** 命名约定 schema */
const NamingSchema = z.object({
  filename: z.enum(['kebab-case', 'snake_case', 'camelCase', 'PascalCase', 'mixed']),
  identifier: z.enum(['camelCase', 'snake_case', 'PascalCase', 'SCREAMING_SNAKE']),
  sampleSize: z.number(),
});

/** 既有抽象条目 schema */
const AbstractionSchema = z.object({
  kind: z.enum(['service', 'controller', 'repo', 'util', 'model', 'other']),
  name: z.string(),
  path: z.string(),
});

/** AI 文档条目 schema */
const AiDocSchema = z.object({
  path: z.string(),
  adopted: z.boolean().optional(),
});

/** 项目 inventory 扫描结果 schema */
export const InventoryResultSchema = z.object({
  scannedAt: z.string(),
  rootDir: z.string(),
  signals: z.object({
    techStack: z.array(TechStackEntrySchema),
    naming: NamingSchema,
    existingAbstractions: z.array(AbstractionSchema).max(200),
    forbidden: z.array(z.string()),
    aiDocs: z.array(AiDocSchema),
    directoryLayout: z.array(z.string()),
    testFrameworks: z.array(z.string()),
  }),
});

/** 从 schema 推导的 InventoryResult 类型 */
export type InventoryResult = z.infer<typeof InventoryResultSchema>;

// ============================================================
// AI 文档探测
// ============================================================

/**
 * 探测项目根目录下的 4 类 AI 协作文档
 * - AGENTS.md（根目录）
 * - CLAUDE.md（根目录）
 * - .cursor/rules/*.md（glob）
 * - .windsurf/rules/*.md（glob）
 */
async function detectAiDocs(rootDir: string): Promise<string[]> {
  const docs: string[] = [];

  // 检测根目录下的固定文件
  const rootFiles = ['AGENTS.md', 'CLAUDE.md'];
  for (const file of rootFiles) {
    const filePath = path.join(rootDir, file);
    if (await fileExists(filePath)) {
      docs.push(file);
    }
  }

  // 检测 .cursor/rules/*.md
  const cursorDocs = await globby('.cursor/rules/*.md', {
    cwd: rootDir,
    onlyFiles: true,
  });
  docs.push(...cursorDocs);

  // 检测 .windsurf/rules/*.md
  const windsurfDocs = await globby('.windsurf/rules/*.md', {
    cwd: rootDir,
    onlyFiles: true,
  });
  docs.push(...windsurfDocs);

  return docs;
}

/** AI 文档交互询问选项 */
type AiDocChoice = 'adopt' | 'ignore' | 'view';

/**
 * 交互模式下对单个 AI 文档触发三选一询问
 * - 采纳：返回 true
 * - 忽略：返回 false
 * - 查看：先展示文件内容，再重新询问采纳/忽略
 *
 * 若 stdin 非 TTY（如 CI/测试环境），默认采纳
 */
async function promptAiDocChoice(rootDir: string, docPath: string): Promise<boolean> {
  // 非 TTY 环境下（CI / 测试）无法交互，默认采纳
  if (!process.stdin.isTTY) {
    logger.info(`非 TTY 环境，AI 文档 ${docPath} 默认采纳`);
    return true;
  }

  while (true) {
    const { choice } = await inquirer.prompt<{ choice: AiDocChoice }>([
      {
        type: 'list',
        name: 'choice',
        message: `检测到已有 AI 协作文档：${docPath}`,
        choices: [
          { name: '采纳（merge 要点到 context.md 并引用原文件）', value: 'adopt' },
          { name: '忽略（本次 inventory 不引用）', value: 'ignore' },
          { name: '查看文件后再决定', value: 'view' },
        ],
      },
    ]);

    if (choice === 'adopt') {
      logger.success(`已采纳 AI 文档：${docPath}`);
      return true;
    }

    if (choice === 'ignore') {
      logger.info(`已忽略 AI 文档：${docPath}`);
      return false;
    }

    // choice === 'view'：展示文件内容后重新询问
    const fullPath = path.join(rootDir, docPath);
    const content = await readFile(fullPath);
    logger.info(`\n--- ${docPath} 内容 ---\n${content}\n--- 结束 ---\n`);
  }
}

// ============================================================
// 扫描骨架
// ============================================================

/**
 * 扫描项目生成 inventory 结果（骨架实现）
 * 后续任务会补充完整的探测逻辑
 */
export async function scanProjectInventory(
  rootDir: string,
  opts?: { interactive?: boolean },
): Promise<InventoryResult> {
  logger.info('正在扫描项目 inventory...');

  const result: InventoryResult = {
    scannedAt: new Date().toISOString(),
    rootDir,
    signals: {
      techStack: [],
      naming: {
        filename: 'kebab-case',
        identifier: 'camelCase',
        sampleSize: 0,
      },
      existingAbstractions: [],
      forbidden: [],
      aiDocs: [],
      directoryLayout: [],
      testFrameworks: [],
    },
  };

  // 检测 package.json 作为基础技术栈信号
  const packageJsonPath = path.join(rootDir, 'package.json');
  if (await fileExists(packageJsonPath)) {
    result.signals.techStack.push({
      ecosystem: 'node',
      manifest: 'package.json',
    });
  }

  // 探测 AI 协作文档（AGENTS.md / CLAUDE.md / .cursor/rules/*.md / .windsurf/rules/*.md）
  const aiDocPaths = await detectAiDocs(rootDir);
  const interactive = opts?.interactive ?? false;

  for (const docPath of aiDocPaths) {
    if (interactive) {
      // 交互模式：触发三选一询问（采纳/忽略/查看）
      const adopted = await promptAiDocChoice(rootDir, docPath);
      result.signals.aiDocs.push({ path: docPath, adopted });
    } else {
      // 非交互模式：写入 adopted 为 undefined（未决），不阻塞退出
      logger.warn(`检测到 AI 文档 ${docPath}，非交互模式下标记为未决（adopted: undefined）`);
      result.signals.aiDocs.push({ path: docPath });
    }
  }

  logger.success('inventory 扫描完成');
  return result;
}

// ============================================================
// Brownfield 探测
// ============================================================

/** 主流清单文件列表 */
const MANIFEST_FILES = [
  'package.json',
  'pom.xml',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
] as const;

/**
 * 探测项目是否为 brownfield（既有项目）
 * 判定逻辑：
 * 1. 根目录至少存在一份主流清单文件
 * 2. `src/**` 下匹配源文件数 > 5
 * 满足两条件则判定为 brownfield，否则为 greenfield
 */
export async function detectBrownfield(rootDir: string): Promise<boolean> {
  // 检查是否存在至少一份主流清单文件
  let hasManifest = false;
  for (const manifest of MANIFEST_FILES) {
    const manifestPath = path.join(rootDir, manifest);
    if (await fileExists(manifestPath)) {
      hasManifest = true;
      break;
    }
  }

  if (!hasManifest) {
    return false;
  }

  // 统计 src/ 下的源文件数量
  const sourceFiles = await globby('src/**/*.{ts,js,py,go,java,rs}', {
    cwd: rootDir,
    onlyFiles: true,
  });

  return sourceFiles.length > 5;
}

// ============================================================
// Markdown 渲染
// ============================================================

/**
 * 将 InventoryResult 渲染为 markdown 格式
 */
export function renderInventoryMarkdown(result: InventoryResult): string {
  const lines: string[] = [];

  lines.push('# Project Inventory');
  lines.push('');
  lines.push(`> 扫描时间：${result.scannedAt}`);
  lines.push(`> 根目录：${result.rootDir}`);
  lines.push('');

  // 技术栈
  lines.push('## 技术栈');
  lines.push('');
  if (result.signals.techStack.length === 0) {
    lines.push('_未检测到技术栈信号_');
  } else {
    lines.push('| Ecosystem | Manifest | Runtime | Package Manager |');
    lines.push('|-----------|----------|---------|-----------------|');
    for (const entry of result.signals.techStack) {
      lines.push(
        `| ${entry.ecosystem} | ${entry.manifest} | ${entry.runtime ?? '-'} | ${entry.packageManager ?? '-'} |`,
      );
    }
  }
  lines.push('');

  // 命名约定
  lines.push('## 命名约定');
  lines.push('');
  lines.push(`- 文件名风格：${result.signals.naming.filename}`);
  lines.push(`- 标识符风格：${result.signals.naming.identifier}`);
  lines.push(`- 采样数量：${result.signals.naming.sampleSize}`);
  lines.push('');

  // 既有抽象
  lines.push('## 既有抽象');
  lines.push('');
  if (result.signals.existingAbstractions.length === 0) {
    lines.push('_未检测到既有抽象_');
  } else {
    lines.push('| Kind | Name | Path |');
    lines.push('|------|------|------|');
    for (const abs of result.signals.existingAbstractions) {
      lines.push(`| ${abs.kind} | ${abs.name} | ${abs.path} |`);
    }
  }
  lines.push('');

  // AI 文档
  lines.push('## AI 文档');
  lines.push('');
  if (result.signals.aiDocs.length === 0) {
    lines.push('_未检测到 AI 协作文档_');
  } else {
    // 检查是否存在未决条目，若有则标红提示
    const hasUndecided = result.signals.aiDocs.some((doc) => doc.adopted === undefined);
    if (hasUndecided) {
      lines.push(
        '> 🔴 **警告：以下 AI 文档尚未经用户确认采纳/忽略，请以 interactive 模式重新运行或手动编辑 inventory.md 补充决策。**',
      );
      lines.push('');
    }
    for (const doc of result.signals.aiDocs) {
      const status =
        doc.adopted === true
          ? '✅ 已采纳'
          : doc.adopted === false
            ? '❌ 已忽略'
            : '🔴 **未决（需交互确认）**';
      lines.push(`- \`${doc.path}\` — ${status}`);
    }
  }
  lines.push('');

  // 目录结构
  lines.push('## 目录结构');
  lines.push('');
  if (result.signals.directoryLayout.length === 0) {
    lines.push('_未检测到目录结构_');
  } else {
    for (const dir of result.signals.directoryLayout) {
      lines.push(`- ${dir}`);
    }
  }
  lines.push('');

  // 测试框架
  lines.push('## 测试框架');
  lines.push('');
  if (result.signals.testFrameworks.length === 0) {
    lines.push('_未检测到测试框架_');
  } else {
    for (const fw of result.signals.testFrameworks) {
      lines.push(`- ${fw}`);
    }
  }
  lines.push('');

  // 禁动清单
  lines.push('## 禁动清单');
  lines.push('');
  if (result.signals.forbidden.length === 0) {
    lines.push('_禁动清单为空_');
  } else {
    for (const item of result.signals.forbidden) {
      lines.push(`- ${item}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}
