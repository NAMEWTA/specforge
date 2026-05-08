import yaml from 'js-yaml';
import { fileExists, readFile } from '../utils/fs.js';
import { joinPath } from '../utils/path.js';
import {
  CHANGES_DIR,
  CONFIG_YAML_FILE,
  SPECFORGE_DIR,
  SPECFORGE_USER_DIR,
  SPECFORGE_JSON_FILE,
} from '../core/constants.js';
import { parseProfileFromConfig, resolveProfile } from '../core/profiles.js';
import {
  DEFAULT_ARTIFACT_GRAPH,
  computeStatus,
  type ArtifactStatusEntry,
} from '../core/artifact-graph.js';
import { globby } from 'globby';
import path from 'node:path';
import fsExtra from 'fs-extra';

interface PhaseDependency {
  phase: string;
  commandName: string;
  artifact: string;
  required: boolean;
}

const PHASE_DEPENDENCIES: Record<string, PhaseDependency[]> = {
  foundation: [],
  requirements: [
    { phase: 'foundation', commandName: 'foundation-init', artifact: '.specforge/commands/', required: false },
  ],
  design: [
    { phase: 'requirements', commandName: 'requirements-clarify', artifact: 'PROPOSAL.md', required: true },
  ],
  planning: [
    { phase: 'design', commandName: 'design-explore', artifact: 'DESIGN.md', required: true },
  ],
  implementation: [
    { phase: 'planning', commandName: 'planning-breakdown', artifact: 'TASKS.md', required: true },
  ],
  quality: [
    { phase: 'implementation', commandName: 'implementation-build', artifact: 'code changes', required: false },
  ],
  release: [
    { phase: 'quality', commandName: 'quality-verify', artifact: 'QUALITY-REPORT.md', required: true },
  ],
  evolution: [
    { phase: 'release', commandName: 'release-deploy', artifact: 'archive/', required: false },
  ],
};

export interface RequireStatus {
  name: string;
  status: 'done' | 'not_found' | 'skipped';
  artifact: string;
}

export interface PhaseStatus {
  phase: string;
  commandName: string;
  artifact: string;
  status: 'not_started' | 'in_progress' | 'done';
}

export interface StatusResult {
  currentChange: string | null;
  currentPhase: string | null;
  phases: PhaseStatus[];
}

// 各阶段产物文件映射
const PHASE_ARTIFACTS: Record<string, string> = {
  foundation: '.specforge/',
  requirements: 'PROPOSAL.md',
  design: 'DESIGN.md',
  planning: 'TASKS.md',
  quality: 'QUALITY-REPORT.md',
  release: '',  // 通过检查 archive/ 目录判断
  evolution: 'RETROSPECTIVE.md',
};

// 各阶段对应的命令名
const PHASE_COMMANDS: Record<string, string> = {
  foundation: 'foundation-init',
  requirements: 'requirements-clarify',
  design: 'design-explore',
  planning: 'planning-breakdown',
  implementation: 'implementation-build',
  quality: 'quality-verify',
  release: 'release-deploy',
  evolution: 'evolution-retrospect',
};

export class StatusService {
  private async loadEnabledPhases(projectRoot: string): Promise<readonly string[]> {
    const configPaths = [
      joinPath(projectRoot, SPECFORGE_USER_DIR, CONFIG_YAML_FILE),
      joinPath(projectRoot, SPECFORGE_DIR, CONFIG_YAML_FILE),
    ];

    for (const configPath of configPaths) {
      if (!(await fileExists(configPath))) continue;
      try {
        const raw = await readFile(configPath);
        const profileConfig = parseProfileFromConfig(yaml.load(raw));
        if (profileConfig) return resolveProfile(profileConfig).enabledPhases;
      } catch {
        continue;
      }
    }

    return resolveProfile(null).enabledPhases;
  }

  /**
   * 计算产物 DAG 状态（BLOCKED/READY/DONE）
   * - 基于最新 change 目录扫描已生成的产物
   * - DONE 判定：对应文件存在；archive 节点判定：specforge/archive/<change>/ 存在
   */
  async getArtifactGraphStatus(projectRoot: string): Promise<ArtifactStatusEntry[]> {
    const changes = await this.findChanges(projectRoot);
    const latestChange = changes[0];

    const fsState: Record<string, boolean> = {
      proposal: false,
      design: false,
      tasks: false,
      'quality-report': false,
      archive: false,
      retrospective: false,
    };

    if (latestChange) {
      const changeDir = joinPath(projectRoot, SPECFORGE_USER_DIR, CHANGES_DIR, latestChange);
      fsState.proposal = fsExtra.existsSync(joinPath(changeDir, 'PROPOSAL.md'));
      fsState.design = fsExtra.existsSync(joinPath(changeDir, 'DESIGN.md'));
      fsState.tasks = fsExtra.existsSync(joinPath(changeDir, 'TASKS.md'));
      fsState['quality-report'] = fsExtra.existsSync(joinPath(changeDir, 'QUALITY-REPORT.md'));
      fsState.retrospective = fsExtra.existsSync(joinPath(changeDir, 'RETROSPECTIVE.md'));

      const archiveDir = joinPath(projectRoot, SPECFORGE_USER_DIR, 'archive', latestChange);
      fsState.archive = fsExtra.existsSync(archiveDir);
    }

    return computeStatus(DEFAULT_ARTIFACT_GRAPH, fsState);
  }

  async checkPhaseRequires(
    projectRoot: string,
    phase: string,
  ): Promise<RequireStatus[]> {
    const deps = PHASE_DEPENDENCIES[phase];
    if (!deps || deps.length === 0) return [];

    const userDir = joinPath(projectRoot, SPECFORGE_USER_DIR);
    const changes = await this.findChanges(projectRoot);
    const latestChange = changes[0];

    return deps.map((dep) => {
      if (!dep.required) {
        return {
          name: dep.commandName,
          status: 'skipped' as const,
          artifact: dep.artifact,
        };
      }

      if (latestChange) {
        const artifactPath = joinPath(
          userDir,
          CHANGES_DIR,
          latestChange,
          dep.artifact,
        );
        const found = fsExtra.existsSync(artifactPath);
        return {
          name: dep.commandName,
          status: found ? ('done' as const) : ('not_found' as const),
          artifact: dep.artifact,
        };
      }

      return {
        name: dep.commandName,
        status: 'not_found' as const,
        artifact: dep.artifact,
      };
    });
  }

  async getStatus(projectRoot: string): Promise<StatusResult> {
    const changes = await this.findChanges(projectRoot);
    const currentChange = changes[0] ?? null;

    let currentPhase: string | null = null;

    // 从 .specforge.json 读取当前阶段
    if (currentChange) {
      const changeDir = joinPath(
        projectRoot,
        SPECFORGE_USER_DIR,
        CHANGES_DIR,
        currentChange,
      );
      const metaPath = joinPath(changeDir, SPECFORGE_JSON_FILE);
      if (await fileExists(metaPath)) {
        try {
          const raw = await readFile(metaPath);
          const meta = JSON.parse(raw);
          currentPhase = meta.phase ?? null;
        } catch {
          // JSON 解析失败，忽略
        }
      }
    }

    // 扫描实际文件系统状态
    const phases: PhaseStatus[] = [];
    const phaseOrder = await this.loadEnabledPhases(projectRoot);

    for (const phase of phaseOrder) {
      const commandName =
        PHASE_COMMANDS[phase] ?? phase;
      const artifactFile = PHASE_ARTIFACTS[phase];
      let status: 'not_started' | 'in_progress' | 'done' = 'not_started';

      if (currentChange) {
        const changeDir = joinPath(
          projectRoot,
          SPECFORGE_USER_DIR,
          CHANGES_DIR,
          currentChange,
        );

        if (phase === 'foundation') {
          const frameworkDir = joinPath(projectRoot, SPECFORGE_DIR);
          if (await fileExists(frameworkDir)) {
            status = 'done';
          } else if (currentPhase === 'foundation') {
            status = 'in_progress';
          }
        } else if (artifactFile) {
          // 有产物文件的阶段：检查文件是否存在
          const artifactPath = joinPath(changeDir, artifactFile);
          if (fsExtra.existsSync(artifactPath)) {
            status = 'done';
          } else if (currentPhase === phase) {
            status = 'in_progress';
          }
        } else if (phase === 'release') {
          // release 阶段：检查 archive 目录
          const archiveDir = joinPath(
            projectRoot,
            SPECFORGE_USER_DIR,
            'archive',
            currentChange,
          );
          if (fsExtra.existsSync(archiveDir)) {
            status = 'done';
          } else if (currentPhase === 'release') {
            status = 'in_progress';
          }
        } else if (phase === 'implementation') {
          // implementation 阶段：检查 TASKS.md 完成情况
          const tasksPath = joinPath(changeDir, 'TASKS.md');
          if (await fileExists(tasksPath)) {
            // 检查 TASKS.md 中是否所有任务都标记为 [x]
            try {
              const tasksContent = await readFile(tasksPath);
              const uncheckedCount = (
                tasksContent.match(/\[ \]/g) ?? []
              ).length;
              const checkedCount = (
                tasksContent.match(/\[x\]/g) ?? []
              ).length;
              if (checkedCount > 0 && uncheckedCount === 0) {
                status = 'done';
              } else if (checkedCount > 0) {
                status = 'in_progress';
              }
            } catch {
              status = 'not_started';
            }
          }
        }
      }

      phases.push({
        phase,
        commandName,
        artifact: artifactFile || 'archive/',
        status,
      });
    }

    return { currentChange, currentPhase, phases };
  }

  private async findChanges(projectRoot: string): Promise<string[]> {
    const changesDir = joinPath(
      projectRoot,
      SPECFORGE_USER_DIR,
      CHANGES_DIR,
    );
    if (!(await fileExists(changesDir))) return [];

    const specForgeFiles = await globby('*/.specforge.json', {
      cwd: changesDir,
      onlyFiles: true,
    });
    return specForgeFiles.map((f) => path.dirname(f)).reverse();
  }
}
