import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type ClassFields = ReadonlyMap<string, string>;

export interface Sources {
  file(path: string): string | undefined;
  fields(name: string, near?: string): ClassFields | undefined;
}

export function readSources(root: string): Sources | undefined {
  const kingmaker = join(root, 'Assembly-CSharp', 'Kingmaker');
  if (!existsSync(kingmaker)) return undefined;
  const byClass = new Map<string, string[]>();
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.cs')) continue;
    const name = entry.name.slice(0, -3);
    let paths = byClass.get(name);
    if (paths === undefined) byClass.set(name, (paths = []));
    paths.push(join(entry.parentPath, entry.name));
  }
  for (const paths of byClass.values()) paths.sort();
  const text = new Map<string, string>();
  const read = (path: string) => {
    let t = text.get(path);
    if (t === undefined) text.set(path, (t = readFileSync(path, 'utf8')));
    return t;
  };
  const filesOf = (name: string): string[] => byClass.get(name) ?? [];
  const cache = new Map<string, ClassFields | undefined>();
  const fields = (name: string, near?: string): ClassFields | undefined => {
    const key = `${near ?? ''}/${name}`;
    if (cache.has(key)) return cache.get(key);
    cache.set(key, undefined);
    let found: ClassFields | undefined;
    for (const path of [...filesOf(name), ...(near === undefined ? [] : filesOf(near))]) {
      const own = declaredFields(read(path), name);
      if (own === undefined) continue;
      const base = own.base === undefined ? undefined : fields(own.base, near);
      found = new Map([...own.fields, ...(base ?? [])]);
      break;
    }
    cache.set(key, found);
    return found;
  };
  return {
    file: (path) => {
      const full = join(kingmaker, path);
      return existsSync(full) ? read(full) : undefined;
    },
    fields,
  };
}

const SERIALIZABLE_FIELD_LINE =
  /^(?:(?:public|private|protected|internal|readonly|new)\s+)+(?!static\b|const\b|event\b|abstract\b|override\b|virtual\b)([\w.<>[\], ?]+?)\s+(\w+)\s*(?:=(?!>)[^;]*)?;\s*$/;

function declaredFields(source: string, name: string): { fields: Map<string, string>; base?: string } | undefined {
  const decl = new RegExp(
    String.raw`^(\t*)(?:\[[^\n]*\]\s*)*(?:\w+\s+)*(?:class|struct)\s+${name}\b(?:<[^>]*>)?\s*(?::\s*([\w.]+))?`,
    'm',
  );
  const m = decl.exec(source);
  if (m === null) return undefined;
  const open = source.indexOf('{', m.index + m[0].length);
  let close = open;
  for (let depth = 0, i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) {
      close = i;
      break;
    }
  }
  const indent = `${m[1]}\t`;
  const fields = new Map<string, string>();
  let attributes = '';
  for (const line of source.slice(open + 1, close).split('\n')) {
    if (!line.startsWith(indent) || line[indent.length] === '\t') continue;
    const member = line.slice(indent.length);
    if (member.startsWith('[')) {
      attributes += member;
      continue;
    }
    const f = SERIALIZABLE_FIELD_LINE.exec(member);
    const serialized = /\bSerializeField\b/.test(attributes) || /^public\b/.test(member);
    const [, type, name] = f ?? [];
    if (
      type !== undefined &&
      name !== undefined &&
      serialized &&
      !/\bNonSerialized\b/.test(attributes) &&
      !/\breadonly\b/.test(member)
    )
      fields.set(name, type);
    attributes = '';
  }
  const base = m[2]?.split('.').pop();
  return base === undefined ? { fields } : { fields, base };
}

export interface Span {
  readonly start: number;
  readonly end: number;
}

export function memberSpans(source: string, name: string): Span[] {
  const decl = new RegExp(
    String.raw`^[ \t]*(?:public|private|protected|internal)\b[^\n;]*?\b${name}\b[ \t]*(?:\(|=>|$)`,
    'gm',
  );
  const spans: Span[] = [];
  for (const m of source.matchAll(decl)) {
    const open = source.indexOf('{', m.index);
    const end = source.indexOf(';', m.index);
    if (end >= 0 && (open < 0 || end < open)) {
      spans.push({ start: m.index, end });
      continue;
    }
    let depth = 0;
    for (let i = open; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}' && --depth === 0) {
        spans.push({ start: m.index, end: i + 1 });
        break;
      }
    }
  }
  return spans;
}

export function body(source: string, name: string): string | undefined {
  const spans = memberSpans(source, name);
  return spans.length === 0 ? undefined : spans.map((s) => source.slice(s.start, s.end)).join('\n');
}

export function typeSpan(source: string, name: string): Span | undefined {
  const decl = new RegExp(String.raw`^[ \t]*(?:\w+\s+)*(?:class|struct|enum|interface)\s+${name}\b`, 'm');
  const m = decl.exec(source);
  if (m === null) return undefined;
  const open = source.indexOf('{', m.index);
  if (open < 0) return undefined;
  for (let depth = 0, i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return { start: m.index, end: i + 1 };
  }
  return undefined;
}

export function reads(code: string, field: string): boolean {
  const names = [field, field.replace(/^m_/, '')];
  return names.some((n) => new RegExp(`\\b${n}\\b`).test(code));
}

export function elementType(declared: string): string {
  const generic = /^(?:List|ReferenceArrayProxy)<([\w.]+)/.exec(declared);
  const name = generic?.[1] ?? declared.replace(/\[\]|\?/g, '');
  return name.split('.').pop()!;
}
