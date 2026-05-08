import { readFile, writeFile } from './fs.js';

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(PLACEHOLDER_RE, (_, key: string) => {
    return variables[key] ?? `{{${key}}}`;
  });
}

export async function renderTemplateFile(
  filePath: string,
  variables: Record<string, string>,
): Promise<string> {
  const template = await readFile(filePath);
  return renderTemplate(template, variables);
}

export async function renderAndWriteFile(
  templatePath: string,
  outputPath: string,
  variables: Record<string, string>,
): Promise<void> {
  const rendered = await renderTemplateFile(templatePath, variables);
  await writeFile(outputPath, rendered);
}
