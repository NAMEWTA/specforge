import path from 'node:path';

export function resolveProjectRoot(cwd?: string): string {
  return cwd ? path.resolve(cwd) : process.cwd();
}

export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

export function toPosixPath(p: string): string {
  return p.replace(/\\/g, '/');
}

export function specforgeDir(projectRoot: string): string {
  return path.join(projectRoot, '.specforge');
}

export function specforgeUserDir(projectRoot: string): string {
  return path.join(projectRoot, 'specforge');
}
