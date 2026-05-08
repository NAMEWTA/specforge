import fsExtra from 'fs-extra';

export async function ensureDirectory(dirPath: string): Promise<void> {
  await fsExtra.ensureDir(dirPath);
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await fsExtra.outputFile(filePath, content, 'utf-8');
}

export async function readFile(filePath: string): Promise<string> {
  return fsExtra.readFile(filePath, 'utf-8');
}

export async function fileExists(filePath: string): Promise<boolean> {
  return fsExtra.pathExists(filePath);
}

export async function copyDir(src: string, dest: string): Promise<void> {
  await fsExtra.copy(src, dest);
}

export async function removeDir(dirPath: string): Promise<void> {
  await fsExtra.remove(dirPath);
}
