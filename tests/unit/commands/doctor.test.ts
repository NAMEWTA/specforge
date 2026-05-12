import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fsExtra from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { DoctorCommand, checkL3LoadBudget, checkRoutingStatement } from '../../../src/commands/doctor.js';
import type { DisclosureConfig } from '../../../src/core/disclosure-config.js';

describe('DoctorCommand', () => {
  let tmpDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-doctor-'));
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    fsExtra.removeSync(tmpDir);
  });

  describe('checkP9References（P9 引用校验）', () => {
    /**
     * 辅助函数：创建 constitution.md 并设置版本号
     */
    function createConstitution(root: string, version: string): void {
      const constitutionDir = path.join(root, '.specforge');
      fsExtra.ensureDirSync(constitutionDir);
      fsExtra.writeFileSync(
        path.join(constitutionDir, 'constitution.md'),
        `---
name: 'specforge-cli-constitution'
type: 'constitution'
version: '${version}'
author: 'wta'
description: '测试用宪法文件'
---

# SpecForge CLI 宪法（Constitution）

## 版本

- **当前版本**：\`${version}\`

## 原则

### P9 — 反重复与验证前置（antiRepetitionAndEvidence）

- **statement**：对同一根因的重试，AI 代理必须书面回答「本次尝试与第 N 次失败的差异是 X」。
`,
      );
    }

    /**
     * 辅助函数：创建 workflow command 文件
     */
    function createWorkflowCommand(
      root: string,
      phase: string,
      content: string,
    ): void {
      const cmdDir = path.join(root, '.specforge', 'commands', 'workflow', phase);
      fsExtra.ensureDirSync(cmdDir);
      fsExtra.writeFileSync(path.join(cmdDir, `${phase}.md`), content);
    }

    it('constitution ≥ 1.1.0 且所有 workflow command 引用 P9 → 无 warn', async () => {
      // 准备：constitution 1.1.0 + 所有 command 引用 P9
      createConstitution(tmpDir, '1.1.0');

      createWorkflowCommand(tmpDir, 'implementation-build', `---
name: implementation-build
type: workflow-command
description: '实施构建'
version: '1.0.0'
author: 'wta'
---

# implementation-build

当检测到清窗信号时，加载 context-reset-protocol skill 执行协议（P9）。
`);

      createWorkflowCommand(tmpDir, 'quality-verify', `---
name: quality-verify
type: workflow-command
description: '质量验证'
version: '1.0.0'
author: 'wta'
---

# quality-verify

清窗场景下恢复后必读 PROGRESS（Constitution P9）。
`);

      createWorkflowCommand(tmpDir, 'foundation-init', `---
name: foundation-init
type: workflow-command
description: '基础初始化'
version: '1.0.0'
author: 'wta'
---

# foundation-init

告知 AI 代理此协议存在，参见 P9 反重复与验证前置。
`);

      // 确保基本目录结构存在（checkCompat 需要）
      fsExtra.ensureDirSync(path.join(tmpDir, '.specforge', 'commands', 'tools'));
      fsExtra.ensureDirSync(path.join(tmpDir, '.specforge', 'skills'));

      const command = new DoctorCommand({ checkCompat: true });
      await command.execute(tmpDir);

      const output = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      // 不应有 P9 引用缺失的 warn
      expect(output).not.toContain('P9');
      expect(output).not.toContain('引用缺失');
    });

    it('constitution ≥ 1.1.0 且某 workflow command 未引用 P9 → 输出 warn', async () => {
      // 准备：constitution 1.1.0 + implementation-build 未引用 P9
      createConstitution(tmpDir, '1.1.0');

      // 这个 command 没有引用 P9
      createWorkflowCommand(tmpDir, 'implementation-build', `---
name: implementation-build
type: workflow-command
description: '实施构建'
version: '1.0.0'
author: 'wta'
---

# implementation-build

这是一个普通的 workflow command，没有引用任何宪法原则。
`);

      // 这个 command 引用了 P9
      createWorkflowCommand(tmpDir, 'quality-verify', `---
name: quality-verify
type: workflow-command
description: '质量验证'
version: '1.0.0'
author: 'wta'
---

# quality-verify

清窗场景下恢复后必读 PROGRESS（Constitution P9）。
`);

      createWorkflowCommand(tmpDir, 'foundation-init', `---
name: foundation-init
type: workflow-command
description: '基础初始化'
version: '1.0.0'
author: 'wta'
---

# foundation-init

告知 AI 代理此协议存在，参见 P9 反重复与验证前置。
`);

      // 确保基本目录结构存在
      fsExtra.ensureDirSync(path.join(tmpDir, '.specforge', 'commands', 'tools'));
      fsExtra.ensureDirSync(path.join(tmpDir, '.specforge', 'skills'));

      const command = new DoctorCommand({ checkCompat: true });
      await command.execute(tmpDir);

      const output = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      // 应输出 warn 级别提示，包含缺失引用的 command 路径
      expect(output).toContain('P9');
      expect(output).toContain('implementation-build');
    });

    it('constitution < 1.1.0 → 跳过 P9 校验（向后兼容）', async () => {
      // 准备：constitution 1.0.0 + command 未引用 P9
      createConstitution(tmpDir, '1.0.0');

      // 即使 command 没有引用 P9，也不应报 warn
      createWorkflowCommand(tmpDir, 'implementation-build', `---
name: implementation-build
type: workflow-command
description: '实施构建'
version: '1.0.0'
author: 'wta'
---

# implementation-build

这是一个普通的 workflow command，没有引用任何宪法原则。
`);

      // 确保基本目录结构存在
      fsExtra.ensureDirSync(path.join(tmpDir, '.specforge', 'commands', 'tools'));
      fsExtra.ensureDirSync(path.join(tmpDir, '.specforge', 'skills'));

      const command = new DoctorCommand({ checkCompat: true });
      await command.execute(tmpDir);

      const output = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      // 不应有 P9 相关的 warn
      expect(output).not.toContain('P9');
      expect(output).not.toContain('引用缺失');
    });
  });
});

/**
 * doctor --check-disclosure 返回码向后兼容测试
 *
 * Validates: Requirements 9.8
 *
 * 确认 --check-disclosure 的退出行为保持向后兼容：
 * 1. 合规项目 → 正常完成（不抛异常）
 * 2. 有违例项目 → 输出 warn 但仍正常完成（不崩溃、不改变退出码语义）
 * 3. 新增的 L3 预算 + 路由声明六要素检查是追加性的（不破坏既有 disclosure 检查）
 */
describe('doctor --check-disclosure 返回码向后兼容（Req 9.8）', () => {
  let tmpDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-disclosure-compat-'));
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    fsExtra.removeSync(tmpDir);
  });

  /**
   * 辅助函数：创建合规的 workflow command（满足三级渐进披露 + L3 预算 + 路由六要素）
   */
  function createCompliantCommand(root: string, commandName: string): void {
    const cmdDir = path.join(root, '.specforge', 'commands', 'workflow', commandName);
    fsExtra.ensureDirSync(cmdDir);
    const refsDir = path.join(cmdDir, 'references');
    fsExtra.ensureDirSync(refsDir);

    // L2 主体：description ≤ 200 字符，行数 ≤ 500，引用 references/ 文件，包含路由六要素
    const body = `---
name: ${commandName}
type: workflow-command
description: '合规的 workflow command'
version: '1.0.0'
author: 'test'
---

# ${commandName}

请参考 references/guide.md 了解详情。

<!-- route-statement
路由：${commandName}
Change-ID：CHG-001
已加载：
  - context.md (L1-L50)
未加载（后续按需）：
  - lessons.md
第一动作：读取 DESIGN.md
Token 预算估算：约 1500 tokens
-->
`;
    fsExtra.writeFileSync(path.join(cmdDir, `${commandName}.md`), body);

    // L3 文件：行数少于 150（合规）
    const refContent = Array.from({ length: 30 }, (_, i) => `第 ${i + 1} 行参考内容`).join('\n');
    fsExtra.writeFileSync(path.join(refsDir, 'guide.md'), refContent);
  }

  /**
   * 辅助函数：创建违例的 workflow command（description 过长 + L3 未引用 + 缺路由要素）
   */
  function createViolatingCommand(root: string, commandName: string): void {
    const cmdDir = path.join(root, '.specforge', 'commands', 'workflow', commandName);
    fsExtra.ensureDirSync(cmdDir);
    const refsDir = path.join(cmdDir, 'references');
    fsExtra.ensureDirSync(refsDir);

    // L2 主体：description 超长，不引用 references/ 文件，缺路由六要素
    const longDesc = '这是一段超长的描述'.repeat(30); // 远超 200 字符
    const body = `---
name: ${commandName}
type: workflow-command
description: '${longDesc}'
version: '1.0.0'
author: 'test'
---

# ${commandName}

这是一个有违例的 workflow command，没有引用 references 也没有路由声明。
`;
    fsExtra.writeFileSync(path.join(cmdDir, `${commandName}.md`), body);

    // L3 文件存在但未被 L2 引用（孤立文件）
    const refContent = Array.from({ length: 20 }, (_, i) => `第 ${i + 1} 行内容`).join('\n');
    fsExtra.writeFileSync(path.join(refsDir, 'orphan-ref.md'), refContent);
  }

  it('合规项目：--check-disclosure 正常完成不抛异常', async () => {
    // 创建合规的 .specforge 目录结构
    createCompliantCommand(tmpDir, 'design-explore');
    createCompliantCommand(tmpDir, 'implementation-build');

    const command = new DoctorCommand({ checkDisclosure: true });

    // 不应抛出异常 — 向后兼容：正常退出
    await expect(command.execute(tmpDir)).resolves.toBeUndefined();

    // 应输出"全部通过"
    const output = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('全部通过');
  });

  it('有违例项目：--check-disclosure 输出 warn 但不崩溃、不抛异常', async () => {
    // 创建有违例的 .specforge 目录结构
    createViolatingCommand(tmpDir, 'bad-command');

    const command = new DoctorCommand({ checkDisclosure: true });

    // 即使有违例也不应抛出异常 — 向后兼容：退出码语义不变
    await expect(command.execute(tmpDir)).resolves.toBeUndefined();

    // 应输出违例信息（warn 级别）
    const output = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain('违例');
  });

  it('L3 预算 + 路由声明检查是追加性的（不破坏既有 disclosure 检查）', async () => {
    // 创建一个混合场景：既有 disclosure 检查通过，但 L3 预算越界 + 路由要素缺失
    const cmdDir = path.join(tmpDir, '.specforge', 'commands', 'workflow', 'mixed-cmd');
    fsExtra.ensureDirSync(cmdDir);
    const refsDir = path.join(cmdDir, 'references');
    fsExtra.ensureDirSync(refsDir);

    // L2 主体：description 合规（≤200 字符），行数合规（≤500 行），引用了 references
    // 但缺少路由六要素
    const body = `---
name: mixed-cmd
type: workflow-command
description: '混合场景测试命令'
version: '1.0.0'
author: 'test'
---

# mixed-cmd

请参考 references/big-ref.md 了解详情。
另见 references/extra-ref.md 获取补充。
`;
    fsExtra.writeFileSync(path.join(cmdDir, 'mixed-cmd.md'), body);

    // L3 文件总行数 > 150（越预算）
    const bigRef = Array.from({ length: 100 }, (_, i) => `第 ${i + 1} 行大文件内容`).join('\n');
    fsExtra.writeFileSync(path.join(refsDir, 'big-ref.md'), bigRef);
    const extraRef = Array.from({ length: 80 }, (_, i) => `第 ${i + 1} 行额外内容`).join('\n');
    fsExtra.writeFileSync(path.join(refsDir, 'extra-ref.md'), extraRef);

    const command = new DoctorCommand({ checkDisclosure: true });

    // 即使 L3 越预算 + 路由缺失，命令仍正常完成（追加检查不改变退出行为）
    await expect(command.execute(tmpDir)).resolves.toBeUndefined();

    // 既有 disclosure 检查（L1 description / L2 行数 / L3 引用）仍正常执行
    const output = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    // 应能看到 L3 预算越界的 warn（新增检查项）
    expect(output).toContain('预算');
  });
});

/**
 * checkL3LoadBudget 三分支单元测试
 *
 * Validates: Requirements 9.2, 9.3, 9.7
 *
 * 三分支覆盖：
 * 1. 合规（≤150 行）→ ok=true, violations 为空
 * 2. 越预算（>150 行）→ ok=false, violations 包含违例 command
 * 3. L3 文件未被 L2 引用 → unreferencedFiles 包含该文件
 */
describe('checkL3LoadBudget（L3 加载预算校验）', () => {
  let tmpDir: string;

  /** 默认配置：首轮加载上限 150 行，L3 必须从 L2 被引用 */
  const defaultConfig: DisclosureConfig = {
    level3_loadBudget: {
      firstRoundTotalLinesMax: 150,
      mustBeReferencedFromL2: true,
    },
    routingStatement: {
      required: true,
      elements: ['route', 'changeId', 'loaded', 'notLoaded', 'firstAction', 'tokenBudget'],
    },
  };

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-l3-budget-'));
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  /**
   * 辅助函数：创建 workflow command 目录结构
   * 包含 L2 主体文件和 references/ 下的 L3 文件
   */
  function createCommandWithRefs(
    root: string,
    commandName: string,
    bodyContent: string,
    refs: Array<{ name: string; lines: number }>,
  ): string {
    const cmdDir = path.join(root, '.specforge', 'commands', 'workflow', commandName);
    fsExtra.ensureDirSync(cmdDir);
    // 写入 L2 主体文件
    fsExtra.writeFileSync(path.join(cmdDir, `${commandName}.md`), bodyContent);
    // 写入 references/ 下的 L3 文件
    if (refs.length > 0) {
      const refsDir = path.join(cmdDir, 'references');
      fsExtra.ensureDirSync(refsDir);
      for (const ref of refs) {
        // 生成指定行数的内容
        const content = Array.from({ length: ref.lines }, (_, i) => `第 ${i + 1} 行内容`).join('\n');
        fsExtra.writeFileSync(path.join(refsDir, ref.name), content);
      }
    }
    return cmdDir;
  }

  it('合规：所有 references/ 文件总行数 ≤ 150 → ok=true, violations 为空', () => {
    // 创建一个 command，引用两个 L3 文件，总行数 = 50 + 80 = 130 ≤ 150
    const bodyContent = `---
name: design-explore
type: workflow-command
description: '设计探索'
version: '1.0.0'
author: 'test'
---

# design-explore

请参考 references/patterns.md 了解设计模式。
另见 references/examples.md 获取示例。
`;
    createCommandWithRefs(tmpDir, 'design-explore', bodyContent, [
      { name: 'patterns.md', lines: 50 },
      { name: 'examples.md', lines: 80 },
    ]);

    const commandDir = path.join(tmpDir, '.specforge', 'commands', 'workflow');
    const result = checkL3LoadBudget(commandDir, defaultConfig);

    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.totalLines).toBeLessThanOrEqual(150);
  });

  it('越预算：某 command 的 references/ 总行数 > 150 → ok=false, violations 包含该 command', () => {
    // 创建一个 command，引用两个 L3 文件，总行数 = 100 + 80 = 180 > 150
    const bodyContent = `---
name: implementation-build
type: workflow-command
description: '实施构建'
version: '1.0.0'
author: 'test'
---

# implementation-build

请参考 references/guard-rails.md 了解护栏规则。
另见 references/boundary-check.md 获取边界检查逻辑。
`;
    createCommandWithRefs(tmpDir, 'implementation-build', bodyContent, [
      { name: 'guard-rails.md', lines: 100 },
      { name: 'boundary-check.md', lines: 80 },
    ]);

    const commandDir = path.join(tmpDir, '.specforge', 'commands', 'workflow');
    const result = checkL3LoadBudget(commandDir, defaultConfig);

    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    // 违例应包含 implementation-build 相关路径
    const violation = result.violations.find((v) => v.commandPath.includes('implementation-build'));
    expect(violation).toBeDefined();
    expect(violation!.totalLines).toBeGreaterThan(150);
    expect(violation!.files.length).toBeGreaterThanOrEqual(1);
  });

  it('L3 未被 L2 引用：references/ 文件存在但未从 L2 主体引用 → unreferencedFiles 包含该文件', () => {
    // 创建一个 command，L2 主体只引用了 patterns.md，但 references/ 下还有 orphan.md
    const bodyContent = `---
name: quality-verify
type: workflow-command
description: '质量验证'
version: '1.0.0'
author: 'test'
---

# quality-verify

请参考 references/patterns.md 了解测试模式。
`;
    createCommandWithRefs(tmpDir, 'quality-verify', bodyContent, [
      { name: 'patterns.md', lines: 30 },
      { name: 'orphan.md', lines: 20 },
    ]);

    const commandDir = path.join(tmpDir, '.specforge', 'commands', 'workflow');
    const result = checkL3LoadBudget(commandDir, defaultConfig);

    // 应检测到未引用的 L3 文件
    expect(result.unreferencedFiles.length).toBeGreaterThanOrEqual(1);
    const hasOrphan = result.unreferencedFiles.some((f) => f.includes('orphan.md'));
    expect(hasOrphan).toBe(true);
  });
});


/**
 * checkRoutingStatement 六要素失败测试
 *
 * Validates: Requirements 9.4, 9.5, 9.7
 *
 * 6 个分支覆盖「缺 route / changeId / loaded / notLoaded / firstAction / tokenBudget」各一项
 * + 1 个 bonus 分支覆盖「六要素齐全 → ok=true」
 */
describe('checkRoutingStatement（路由声明六要素校验）', () => {
  let tmpDir: string;

  /** 默认配置：六要素全要求 */
  const defaultConfig: DisclosureConfig = {
    level3_loadBudget: {
      firstRoundTotalLinesMax: 150,
      mustBeReferencedFromL2: true,
    },
    routingStatement: {
      required: true,
      elements: ['route', 'changeId', 'loaded', 'notLoaded', 'firstAction', 'tokenBudget'],
    },
  };

  /** 完整的路由声明六要素 preamble（全部包含） */
  const FULL_ROUTING_PREAMBLE = `<!-- route-statement
路由：design-explore
Change-ID：CHG-001
已加载：
  - context.md (L1-L50)
  - architecture.md (总 80 行)
未加载（后续按需）：
  - lessons.md（预算 30 行）
第一动作：读取 DESIGN.md 并生成方案
Token 预算估算：约 2000 tokens
-->`;

  beforeEach(() => {
    tmpDir = fsExtra.mkdtempSync(path.join(os.tmpdir(), 'specforge-routing-'));
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  /**
   * 辅助函数：创建 workflow command 文件（含指定 preamble 内容）
   */
  function createCommandFile(root: string, commandName: string, preamble: string): void {
    const cmdDir = path.join(root, commandName);
    fsExtra.ensureDirSync(cmdDir);
    const content = `---
name: ${commandName}
type: workflow-command
description: '测试用 workflow command'
version: '1.0.0'
author: 'test'
---

# ${commandName}

${preamble}

## 正文内容

这是 workflow command 的正文。
`;
    fsExtra.writeFileSync(path.join(cmdDir, `${commandName}.md`), content);
  }

  /**
   * 辅助函数：生成缺少指定要素的 preamble
   */
  function preambleWithout(elementToRemove: string): string {
    const lines: Record<string, string> = {
      route: '路由：design-explore',
      changeId: 'Change-ID：CHG-001',
      loaded: '已加载：\n  - context.md (L1-L50)',
      notLoaded: '未加载（后续按需）：\n  - lessons.md（预算 30 行）',
      firstAction: '第一动作：读取 DESIGN.md 并生成方案',
      tokenBudget: 'Token 预算估算：约 2000 tokens',
    };

    const parts = Object.entries(lines)
      .filter(([key]) => key !== elementToRemove)
      .map(([, value]) => value);

    return `<!-- route-statement\n${parts.join('\n')}\n-->`;
  }

  it('缺 route（路由）→ missingElements 包含 "route"', () => {
    createCommandFile(tmpDir, 'design-explore', preambleWithout('route'));

    const result = checkRoutingStatement(tmpDir, defaultConfig);

    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    const violation = result.violations.find((v) => v.commandPath.includes('design-explore'));
    expect(violation).toBeDefined();
    expect(violation!.missingElements).toContain('route');
  });

  it('缺 changeId（Change-ID）→ missingElements 包含 "changeId"', () => {
    createCommandFile(tmpDir, 'implementation-build', preambleWithout('changeId'));

    const result = checkRoutingStatement(tmpDir, defaultConfig);

    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    const violation = result.violations.find((v) => v.commandPath.includes('implementation-build'));
    expect(violation).toBeDefined();
    expect(violation!.missingElements).toContain('changeId');
  });

  it('缺 loaded（已加载）→ missingElements 包含 "loaded"', () => {
    createCommandFile(tmpDir, 'quality-verify', preambleWithout('loaded'));

    const result = checkRoutingStatement(tmpDir, defaultConfig);

    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    const violation = result.violations.find((v) => v.commandPath.includes('quality-verify'));
    expect(violation).toBeDefined();
    expect(violation!.missingElements).toContain('loaded');
  });

  it('缺 notLoaded（未加载）→ missingElements 包含 "notLoaded"', () => {
    createCommandFile(tmpDir, 'planning-breakdown', preambleWithout('notLoaded'));

    const result = checkRoutingStatement(tmpDir, defaultConfig);

    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    const violation = result.violations.find((v) => v.commandPath.includes('planning-breakdown'));
    expect(violation).toBeDefined();
    expect(violation!.missingElements).toContain('notLoaded');
  });

  it('缺 firstAction（第一动作）→ missingElements 包含 "firstAction"', () => {
    createCommandFile(tmpDir, 'release-deploy', preambleWithout('firstAction'));

    const result = checkRoutingStatement(tmpDir, defaultConfig);

    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    const violation = result.violations.find((v) => v.commandPath.includes('release-deploy'));
    expect(violation).toBeDefined();
    expect(violation!.missingElements).toContain('firstAction');
  });

  it('缺 tokenBudget（Token 预算）→ missingElements 包含 "tokenBudget"', () => {
    createCommandFile(tmpDir, 'evolution-retrospect', preambleWithout('tokenBudget'));

    const result = checkRoutingStatement(tmpDir, defaultConfig);

    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    const violation = result.violations.find((v) => v.commandPath.includes('evolution-retrospect'));
    expect(violation).toBeDefined();
    expect(violation!.missingElements).toContain('tokenBudget');
  });

  it('六要素齐全 → ok=true, violations 为空', () => {
    createCommandFile(tmpDir, 'foundation-init', FULL_ROUTING_PREAMBLE);

    const result = checkRoutingStatement(tmpDir, defaultConfig);

    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});
