import { describe, it, expect } from 'vitest';
import {
  specforgeDir,
  specforgeUserDir,
  joinPath,
  toPosixPath,
  resolveProjectRoot,
} from '../../../src/utils/path.js';

describe('path utilities', () => {
  it('specforgeDir returns path under .specforge', () => {
    expect(specforgeDir('/fake/project')).toBe('/fake/project/.specforge');
  });

  it('specforgeUserDir returns path under specforge', () => {
    expect(specforgeUserDir('/fake/project')).toBe('/fake/project/specforge');
  });

  it('joinPath joins segments correctly', () => {
    expect(joinPath('/a', 'b', 'c')).toBe('/a/b/c');
  });

  it('toPosixPath replaces backslashes with forward slashes', () => {
    expect(toPosixPath('a\\b\\c')).toBe('a/b/c');
  });

  it('resolveProjectRoot uses process.cwd() when no argument', () => {
    expect(resolveProjectRoot()).toBe(process.cwd());
  });

  it('resolveProjectRoot resolves given path', () => {
    const result = resolveProjectRoot('/some/path');
    expect(result).toBe('/some/path');
  });
});
