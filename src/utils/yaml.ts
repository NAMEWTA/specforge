import yaml from 'js-yaml';

export function parseYaml<T>(content: string): T {
  try {
    const result = yaml.load(content);
    return result as T;
  } catch (error) {
    throw new Error(`Failed to parse YAML: ${(error as Error).message}`);
  }
}

export function parseYamlFrontmatter(content: string): {
  metadata: Record<string, unknown>;
  body: string;
} {
  const lines = content.split('\n');
  if (lines[0]?.trim() !== '---') {
    return { metadata: {}, body: content };
  }

  const endIndex = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (endIndex === -1) {
    return { metadata: {}, body: content };
  }

  const yamlBlock = lines.slice(1, endIndex).join('\n');
  const body = lines.slice(endIndex + 1).join('\n');
  const metadata = parseYaml<Record<string, unknown>>(yamlBlock) ?? {};

  return { metadata, body };
}

export function serializeYaml(data: unknown): string {
  return yaml.dump(data, {
    lineWidth: -1,
    noCompatMode: true,
  });
}

export async function writeYamlFile(
  filePath: string,
  data: unknown,
  writeFn: (path: string, content: string) => Promise<void>,
): Promise<void> {
  const content = serializeYaml(data);
  await writeFn(filePath, content);
}
