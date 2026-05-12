import path from 'node:path';
import { scanProjectInventory, renderInventoryMarkdown } from '../services/inventory-service.js';
import { SPECFORGE_USER_DIR, CONTEXT_DIR } from '../core/constants.js';
import { writeFile, ensureDirectory } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import { resolveProjectRoot } from '../utils/path.js';

export interface ProjectInventoryCommandOptions {
  json?: boolean;
  interactive?: boolean;
}

/**
 * project-inventory 命令实现
 * 扫描项目生成 context/inventory.md（brownfield 入场必做）
 */
export class ProjectInventoryCommand {
  private options: ProjectInventoryCommandOptions;

  constructor(options?: ProjectInventoryCommandOptions) {
    this.options = options ?? {};
  }

  async execute(projectRoot?: string): Promise<void> {
    const root = resolveProjectRoot(projectRoot);

    const result = await scanProjectInventory(root, {
      interactive: this.options.interactive !== false && !this.options.json,
    });

    // --json 模式：直接输出 JSON 到 stdout
    if (this.options.json) {
      process.stdout.write(JSON.stringify(result, null, 2));
      return;
    }

    // 默认模式：渲染 markdown 并写入 specforge/context/inventory.md
    const md = renderInventoryMarkdown(result);
    const contextDir = path.join(root, SPECFORGE_USER_DIR, CONTEXT_DIR);
    await ensureDirectory(contextDir);
    const inventoryPath = path.join(contextDir, 'inventory.md');
    await writeFile(inventoryPath, md);

    logger.success(`inventory.md 已写入：${inventoryPath}`);
  }
}
