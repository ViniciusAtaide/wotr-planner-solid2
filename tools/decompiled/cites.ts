import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCite, type Cites } from '~engine/cite';
import { body, type Sources } from './csharp';

const CODE = /\.(ts|tsx|mjs)$/;

export function featureText(dir: string): string {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && CODE.test(e.name) && e.name !== 'cites.ts')
    .map((e) => readFileSync(join(e.parentPath, e.name), 'utf8'))
    .join('\n');
}

export function citeFormatProblems(feature: string, cites: Cites, text: string): string[] {
  const problems: string[] = [];
  for (const [key, list] of Object.entries(cites)) {
    const name = key.split('.')[0];
    if (!new RegExp(`\\b${name.replace(/[$]/g, '\\$')}\\b`).test(text)) {
      problems.push(`${feature}: cites key ${key} names nothing in the feature`);
    }
    if (list.length === 0) problems.push(`${feature}: cites key ${key} has no citation`);
    for (const cite of list) {
      try {
        parseCite(cite);
      } catch {
        problems.push(`${feature}: ${key}: not "Path/File.cs Method (Field, …)": ${cite}`);
      }
    }
  }
  return problems;
}

export function declares(source: string, member: string): boolean {
  return (
    body(source, member) !== undefined || new RegExp(`\\b(?:class|struct|enum|interface)\\s+${member}\\b`).test(source)
  );
}

export function citeSourceProblems(feature: string, cites: Cites, sources: Sources): string[] {
  const problems: string[] = [];
  for (const [key, list] of Object.entries(cites)) {
    for (const cite of list) {
      const { file, method } = parseCite(cite);
      const source = sources.file(file);
      if (source === undefined) problems.push(`${feature}: ${key}: no file ${file} under Kingmaker/`);
      else if (!declares(source, method)) problems.push(`${feature}: ${key}: ${file} declares no ${method}`);
    }
  }
  return problems;
}
