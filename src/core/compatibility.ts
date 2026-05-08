import { fileExists } from '../utils/fs.js';
import { joinPath } from '../utils/path.js';
import { SPECFORGE_DIR, SPECFORGE_USER_DIR } from './constants.js';

export interface CompatibilityCheckResult {
  compatible: boolean;
  warnings: string[];
}

export async function detectOldSpecForgeStructure(projectRoot: string): Promise<boolean> {
  const oldCommandsDir = joinPath(projectRoot, SPECFORGE_DIR, 'commands');
  return fileExists(oldCommandsDir);
}

export async function warnIfDestructiveChanges(projectRoot: string): Promise<string[]> {
  const warnings: string[] = [];

  const specforgeUserExists = await fileExists(joinPath(projectRoot, SPECFORGE_USER_DIR));
  if (specforgeUserExists) {
    warnings.push(
      `Directory "${SPECFORGE_USER_DIR}/" already exists. User assets will be preserved.`,
    );
  }

  return warnings;
}

export async function validateProjectCompatibility(
  projectRoot: string,
): Promise<CompatibilityCheckResult> {
  const alreadyInit = await fileExists(joinPath(projectRoot, SPECFORGE_DIR));
  if (alreadyInit) {
    return {
      compatible: false,
      warnings: [
        `.specforge/ already exists in "${projectRoot}". Use "specforge update" to refresh framework assets.`,
      ],
    };
  }

  const warnings = await warnIfDestructiveChanges(projectRoot);
  return { compatible: true, warnings };
}
