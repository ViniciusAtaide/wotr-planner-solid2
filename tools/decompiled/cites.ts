import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSync } from 'oxc-parser';
import { parseCite, type Cites } from '~engine/cite';
import { body, reads, type Sources } from './csharp';

const CODE = /\.(ts|tsx|mjs)$/;
const IDENTIFIER_NODES = new Set(['Identifier', 'JSXIdentifier', 'PrivateIdentifier']);

export function codeNames(path: string, text: string): Set<string> {
  const names = new Set<string>();
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    const fields = node as Record<string, unknown>;
    if (typeof fields.type === 'string' && IDENTIFIER_NODES.has(fields.type) && typeof fields.name === 'string') {
      names.add(fields.name);
    }
    for (const value of Object.values(fields)) visit(value);
  };
  visit(parseSync(path, text).program);
  return names;
}

export function featureNames(dir: string): Set<string> {
  const names = new Set<string>();
  for (const e of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!e.isFile() || !CODE.test(e.name) || e.name === 'cites.ts') continue;
    const path = join(e.parentPath, e.name);
    for (const name of codeNames(path, readFileSync(path, 'utf8'))) names.add(name);
  }
  return names;
}

export function citeFormatProblems(feature: string, cites: Cites, names: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  for (const [key, list] of Object.entries(cites)) {
    const name = key.split('.')[0] ?? key;
    if (!names.has(name)) problems.push(`${feature}: cites key ${key} names nothing in the feature's code`);
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

function declaresType(source: string, name: string): boolean {
  return new RegExp(`\\b(?:class|struct|enum|interface)\\s+${name}\\b`).test(source);
}

function citedCode(source: string, member: string): string | undefined {
  return declaresType(source, member) ? source : body(source, member);
}

export function declares(source: string, member: string): boolean {
  return citedCode(source, member) !== undefined;
}

export function citeSourceProblems(feature: string, cites: Cites, sources: Sources): string[] {
  const problems: string[] = [];
  for (const [key, list] of Object.entries(cites)) {
    for (const cite of list) {
      const { file, method, fields } = parseCite(cite);
      const source = sources.file(file);
      const code = source === undefined ? undefined : citedCode(source, method);
      if (source === undefined) problems.push(`${feature}: ${key}: no file ${file} under Kingmaker/`);
      else if (code === undefined) problems.push(`${feature}: ${key}: ${file} declares no ${method}`);
      else {
        for (const field of fields) {
          if (!reads(code, field)) problems.push(`${feature}: ${key}: ${file} ${method} reads no ${field}`);
        }
      }
    }
  }
  return problems;
}
