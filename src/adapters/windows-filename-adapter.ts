const FORBIDDEN_CHARS = /[<>:"/\\|?*]/g;

export function sanitizeFilename(name: string): string {
  return name.replace(FORBIDDEN_CHARS, '-').replace(/\.+$/, '');
}

export function isWindowsSafeFilename(name: string): boolean {
  return !FORBIDDEN_CHARS.test(name);
}
