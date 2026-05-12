import { z } from 'zod';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fsExtra from 'fs-extra';
import inquirer from 'inquirer';
import { logger } from '../utils/logger.js';
import { SPECFORGE_USER_DIR, CONTEXT_DIR } from '../core/constants.js';

// ============================================================
// Schema 定义
// ============================================================

/** 问题严重度枚举 */
const SeveritySchema = z.enum(['high', 'medium', 'low']);

/** 单条问题 schema */
const IssueSchema = z.object({
  severity: SeveritySchema,
  file: z.string(),
  message: z.string(),
});

/** 探针名称枚举 */
const ProbeNameSchema = z.enum(['jscpd', 'knip', 'vulture', 'staticcheck', 'baseline']);

/** 单个探针结果 schema */
export const ProbeResultSchema = z.object({
  probe: ProbeNameSchema,
  available: z.boolean(),
  fallbackReason: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  topIssues: z.array(IssueSchema),
  rawOutputExcerpt: z.string().optional(),
});

/** 从 schema 推导的 ProbeResult 类型 */
export type ProbeResult = z.infer<typeof ProbeResultSchema>;

/** 健康报告 schema */
export const HealthReportSchema = z.object({
  scannedAt: z.string(),
  rootDir: z.string(),
  probes: z.array(ProbeResultSchema).min(1),
  overallScore: z.number().min(0).max(100),
  unusedDependencies: z.array(z.string()),
  recommendations: z.array(z.string()),
});

/** 从 schema 推导的 HealthReport 类型 */
export type HealthReport = z.infer<typeof HealthReportSchema>;

// ============================================================
// 四类外部探针名称
// ============================================================

/** 外部探针列表（按优先级排列） */
const EXTERNAL_PROBES = ['jscpd', 'knip', 'vulture', 'staticcheck'] as const;

// ============================================================
// 探针可用性检测
// ============================================================

/**
 * 检测指定探针是否可用（通过 spawnSync 调用 --version）
 * @param probeName 探针二进制名称
 * @returns 是否可执行
 */
export function detectProbe(probeName: string): boolean {
  try {
    const result = spawnSync(probeName, ['--version'], { stdio: 'ignore' });
    return result.status === 0;
  } catch {
    return false;
  }
}

// ============================================================
// 探针执行与回退
// ============================================================

/**
 * 运行探针或返回回退结果
 * 若探针可用则执行并返回结果；否则返回 available:false 与回退原因
 * @param probeName 探针名称
 * @param rootDir 项目根目录
 * @returns 探针结果
 */
export function runProbeOrFallback(probeName: string, rootDir: string): ProbeResult {
  const probeNameTyped = probeName as ProbeResult['probe'];

  if (!detectProbe(probeName)) {
    return {
      probe: probeNameTyped,
      available: false,
      fallbackReason: `本机未安装 ${probeName}`,
      topIssues: [],
    };
  }

  // 探针可用，执行并解析输出
  return runExternalProbe(probeName, rootDir);
}

/**
 * 执行外部探针并解析输出
 * @param probeName 探针名称
 * @param rootDir 项目根目录
 * @returns 探针结果
 */
function runExternalProbe(probeName: string, rootDir: string): ProbeResult {
  const probeNameTyped = probeName as ProbeResult['probe'];

  try {
    const result = spawnSync(probeName, getProbeArgs(probeName), {
      cwd: rootDir,
      encoding: 'utf-8',
      timeout: 60_000,
    });

    const rawOutput = (result.stdout || '').toString();
    // 截断原始输出至 40 行
    const rawLines = rawOutput.split('\n');
    const rawOutputExcerpt = rawLines.slice(0, 40).join('\n') || undefined;

    return {
      probe: probeNameTyped,
      available: true,
      score: 80, // 默认基础分数（可用即给 80 分基线）
      topIssues: [],
      rawOutputExcerpt,
    };
  } catch {
    // 执行出错但探针存在，仍标记为可用但给低分
    return {
      probe: probeNameTyped,
      available: true,
      score: 50,
      topIssues: [],
    };
  }
}

/**
 * 获取探针执行参数
 */
function getProbeArgs(probeName: string): string[] {
  switch (probeName) {
    case 'jscpd':
      return ['.', '--reporters', 'json'];
    case 'knip':
      return ['--reporter', 'json'];
    case 'vulture':
      return ['.'];
    case 'staticcheck':
      return ['./...'];
    default:
      return [];
  }
}

// ============================================================
// Baseline 探针（内置，不依赖外部工具）
// ============================================================

/**
 * 运行 baseline 探针：检测目录大小 / 文件数 / 测试覆盖存在
 * baseline 始终可用，不依赖外部工具
 * @param rootDir 项目根目录
 * @returns baseline 探针结果
 */
function runBaselineProbe(rootDir: string): ProbeResult {
  const topIssues: ProbeResult['topIssues'] = [];
  let score = 100;

  // 检测 1：目录大小（通过文件数估算）
  try {
    const result = spawnSync('find', [rootDir, '-type', 'f', '-not', '-path', '*/node_modules/*', '-not', '-path', '*/.git/*'], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    const fileCount = (result.stdout || '').split('\n').filter(Boolean).length;
    if (fileCount > 1000) {
      score -= 10;
      topIssues.push({
        severity: 'low',
        file: rootDir,
        message: `项目文件数较多（${fileCount} 个），建议关注模块拆分`,
      });
    }
  } catch {
    // 忽略 find 命令失败
  }

  // 检测 2：测试覆盖是否存在
  try {
    const result = spawnSync('find', [rootDir, '-type', 'f', '-name', '*.test.*', '-not', '-path', '*/node_modules/*'], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    const testFiles = (result.stdout || '').split('\n').filter(Boolean);
    if (testFiles.length === 0) {
      score -= 20;
      topIssues.push({
        severity: 'medium',
        file: rootDir,
        message: '未检测到测试文件，建议添加测试覆盖',
      });
    }
  } catch {
    // 忽略 find 命令失败
  }

  return {
    probe: 'baseline',
    available: true,
    score: Math.max(0, score),
    topIssues,
  };
}

// ============================================================
// 健康扫描主入口
// ============================================================

/**
 * 运行健康扫描
 * 依次尝试外部探针（jscpd / knip / vulture / staticcheck），
 * 不可用时返回回退结果；最后始终运行 baseline 探针确保 probes 非空
 * @param rootDir 项目根目录
 * @param opts 选项（probes: 限定探针列表；interactive: 是否交互）
 * @returns 健康报告
 */
export async function runHealthScan(
  rootDir: string,
  opts?: { probes?: string[]; interactive?: boolean },
): Promise<HealthReport> {
  logger.info('正在运行健康扫描...');

  const requestedProbes = opts?.probes ?? [...EXTERNAL_PROBES];
  const probeResults: ProbeResult[] = [];

  // 依次运行请求的外部探针
  for (const probeName of requestedProbes) {
    // baseline 单独处理，不走外部探针逻辑
    if (probeName === 'baseline') continue;
    const result = runProbeOrFallback(probeName, rootDir);
    probeResults.push(result);
  }

  // 始终运行 baseline 探针（确保 probes 非空）
  const baselineResult = runBaselineProbe(rootDir);
  probeResults.push(baselineResult);

  // 计算 overallScore：所有可用探针 score 的平均值
  const availableProbes = probeResults.filter((p) => p.available && p.score !== undefined);
  const overallScore = availableProbes.length > 0
    ? Math.round(availableProbes.reduce((sum, p) => sum + (p.score ?? 0), 0) / availableProbes.length)
    : 0;

  const report: HealthReport = {
    scannedAt: new Date().toISOString(),
    rootDir,
    probes: probeResults,
    overallScore,
    unusedDependencies: [],
    recommendations: [],
  };

  logger.success('健康扫描完成');
  return report;
}

// ============================================================
// Markdown 渲染
// ============================================================

/**
 * 将 HealthReport 渲染为 markdown 格式
 */
export function renderHealthMarkdown(report: HealthReport): string {
  const lines: string[] = [];

  lines.push('# Codebase Health Report');
  lines.push('');
  lines.push(`> 扫描时间：${report.scannedAt}`);
  lines.push(`> 根目录：${report.rootDir}`);
  lines.push(`> 综合评分：${report.overallScore}/100`);
  lines.push('');

  // 探针结果
  lines.push('## 探针结果');
  lines.push('');
  for (const probe of report.probes) {
    const status = probe.available ? '✅ 可用' : '❌ 不可用';
    const scoreText = probe.score !== undefined ? ` (${probe.score}/100)` : '';
    lines.push(`### ${probe.probe}${scoreText}`);
    lines.push('');
    lines.push(`- 状态：${status}`);
    if (probe.fallbackReason) {
      lines.push(`- 回退原因：${probe.fallbackReason}`);
    }
    if (probe.topIssues.length > 0) {
      lines.push('- 主要问题：');
      for (const issue of probe.topIssues) {
        lines.push(`  - [${issue.severity}] \`${issue.file}\`：${issue.message}`);
      }
    }
    if (probe.rawOutputExcerpt) {
      lines.push('- 原始输出摘要：');
      lines.push('  ```');
      lines.push(`  ${probe.rawOutputExcerpt}`);
      lines.push('  ```');
    }
    lines.push('');
  }

  // 未用依赖
  lines.push('## 未用依赖');
  lines.push('');
  if (report.unusedDependencies.length === 0) {
    lines.push('_未发现未用依赖_');
  } else {
    for (const dep of report.unusedDependencies) {
      lines.push(`- ${dep}`);
    }
  }
  lines.push('');

  // 建议
  lines.push('## 建议');
  lines.push('');
  if (report.recommendations.length === 0) {
    lines.push('_暂无建议_');
  } else {
    for (const rec of report.recommendations) {
      lines.push(`- ${rec}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

// ============================================================
// 未用依赖交互处理
// ============================================================

/** 未用依赖交互选项 */
type UnusedDepChoice = 'write-blocklist' | 'log-only' | 'ignore';

/**
 * 处理未用依赖的交互逻辑
 * - 若 unusedDependencies 为空或非 interactive 模式 → 直接返回
 * - interactive 模式展示三选一：写入禁动清单 / 仅记录 / 忽略
 * - 选择「写入禁动清单」时 upsert 追加到 context.md#禁动清单
 */
export async function handleUnusedDependencies(
  report: HealthReport,
  rootDir: string,
  opts: { interactive: boolean },
): Promise<void> {
  // 无未用依赖或非交互模式 → 直接返回
  if (report.unusedDependencies.length === 0 || !opts.interactive) {
    return;
  }

  // 展示三选一提示
  const { choice } = await inquirer.prompt<{ choice: UnusedDepChoice }>([
    {
      type: 'list',
      name: 'choice',
      message: `检测到 ${report.unusedDependencies.length} 个未使用依赖：${report.unusedDependencies.join(', ')}`,
      choices: [
        { name: '写入 context.md 禁动清单', value: 'write-blocklist' },
        { name: '仅记录在报告中', value: 'log-only' },
        { name: '忽略', value: 'ignore' },
      ],
    },
  ]);

  // 仅「写入禁动清单」需要操作 context.md
  if (choice !== 'write-blocklist') {
    return;
  }

  // upsert 追加到 context.md#禁动清单
  await upsertBlocklist(rootDir, report.unusedDependencies);
}

/**
 * 以 upsert 语义将未用依赖追加到 context.md 的「禁动清单」段
 * - 若 context.md 不存在 → 创建含禁动清单段的新文件
 * - 若已存在 → 找到「## 禁动清单」段并追加（不重复已有条目）
 */
async function upsertBlocklist(rootDir: string, deps: string[]): Promise<void> {
  const contextPath = path.join(rootDir, SPECFORGE_USER_DIR, CONTEXT_DIR, 'context.md');
  const contextDirPath = path.join(rootDir, SPECFORGE_USER_DIR, CONTEXT_DIR);

  // 确保目录存在
  await fsExtra.ensureDir(contextDirPath);

  const exists = await fsExtra.pathExists(contextPath);

  if (!exists) {
    // context.md 不存在 → 创建新文件
    const content = buildNewContextWithBlocklist(deps);
    await fsExtra.outputFile(contextPath, content);
    logger.success(`已创建 context.md 并写入禁动清单（${deps.length} 条）`);
    return;
  }

  // context.md 已存在 → 读取并 upsert
  const existing = await fsExtra.readFile(contextPath, 'utf-8');
  const updated = insertDepsIntoBlocklist(existing, deps);
  await fsExtra.outputFile(contextPath, updated);
  logger.success(`已更新 context.md 禁动清单（新增 ${deps.length} 条）`);
}

/**
 * 构建含禁动清单段的新 context.md 内容
 */
function buildNewContextWithBlocklist(deps: string[]): string {
  const lines: string[] = [];
  lines.push('# Context');
  lines.push('');
  lines.push('## 禁动清单');
  lines.push('');
  for (const dep of deps) {
    lines.push(`- ${dep}`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * 在已有 context.md 内容中找到「## 禁动清单」段并追加新依赖（upsert 语义：不重复）
 * 若不存在该段则在文件末尾追加
 */
function insertDepsIntoBlocklist(content: string, deps: string[]): string {
  const blocklistHeader = '## 禁动清单';
  const headerIndex = content.indexOf(blocklistHeader);

  if (headerIndex === -1) {
    // 未找到禁动清单段 → 在文件末尾追加
    const appendLines: string[] = ['', blocklistHeader, ''];
    for (const dep of deps) {
      appendLines.push(`- ${dep}`);
    }
    appendLines.push('');
    return content.trimEnd() + '\n' + appendLines.join('\n');
  }

  // 找到禁动清单段 → 解析已有条目，追加不重复的新条目
  const afterHeader = content.slice(headerIndex + blocklistHeader.length);
  const lines = afterHeader.split('\n');

  // 收集已有条目（以 `- ` 开头的行）
  const existingDeps = new Set<string>();
  let sectionEndIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // 遇到下一个 ## 标题则停止
    if (line.startsWith('## ') && i > 0) {
      sectionEndIndex = i;
      break;
    }
    // 收集列表项
    if (line.startsWith('- ')) {
      existingDeps.add(line.slice(2).trim());
    }
  }

  // 过滤出需要新增的依赖
  const newDeps = deps.filter((d) => !existingDeps.has(d));

  if (newDeps.length === 0) {
    return content;
  }

  // 在段落末尾（下一个 ## 之前）插入新条目
  const beforeSection = content.slice(0, headerIndex + blocklistHeader.length);
  const sectionLines = sectionEndIndex === -1 ? lines : lines.slice(0, sectionEndIndex);
  const afterSection = sectionEndIndex === -1 ? '' : lines.slice(sectionEndIndex).join('\n');

  // 重建段落内容
  const sectionContent = sectionLines.join('\n').trimEnd();
  const newEntries = newDeps.map((d) => `- ${d}`).join('\n');

  if (afterSection) {
    return beforeSection + sectionContent + '\n' + newEntries + '\n\n' + afterSection;
  }

  return beforeSection + sectionContent + '\n' + newEntries + '\n';
}
