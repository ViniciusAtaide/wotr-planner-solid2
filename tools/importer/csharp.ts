// Reading the decompiled C# for module A (guide §4): the fields a class declares, and the fields a method reads. The
// sources are git-ignored (decompiled/, at WrathDecompiled 6ce4a6b), so the A tests that use this run only where they
// are present.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** A class's serialized instance fields, by name, with the C# type each is declared with. */
export type ClassFields = ReadonlyMap<string, string>;

export interface Sources {
  /** The text of a file under `Kingmaker/`, or `undefined` when it is missing. */
  file(path: string): string | undefined;
  /**
   * The serialized fields of a class or struct and of every base class the sources hold, nearest first. A type nested
   * in another is found from that type's files (`near`).
   */
  fields(name: string, near?: string): ClassFields | undefined;
}

/** The decompiled sources under `root` (the `decompiled/` folder), or `undefined` when they aren't there. */
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
  // A directory listing's order differs between runtimes, and some class names live in several folders
  // (CompanionInParty.cs is in both Conditions/ and Evaluators/), so each class's files are read in path order.
  for (const paths of byClass.values()) paths.sort();
  const text = new Map<string, string>();
  const read = (path: string) => {
    let t = text.get(path);
    if (t === undefined) text.set(path, (t = readFileSync(path, 'utf8')));
    return t;
  };
  /** The files a class is declared in, its bases' files after them. */
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

const MEMBER =
  /^(?:(?:public|private|protected|internal|readonly|new)\s+)+(?!static\b|const\b|event\b|abstract\b|override\b|virtual\b)([\w.<>[\], ?]+?)\s+(\w+)\s*(?:=(?!>)[^;]*)?;\s*$/;

/**
 * The fields `name` declares in a file, and the class it derives from. Unity serializes a public field unless it is
 * `[NonSerialized]`, and any other field only with `[SerializeField]`; the dump holds exactly those. The type's own
 * members sit one tab deeper than its declaration, so a nested type's members are skipped.
 */
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
    const f = MEMBER.exec(member);
    const serialized = /\bSerializeField\b/.test(attributes) || /^public\b/.test(member);
    if (f !== null && serialized && !/\bNonSerialized\b/.test(attributes) && !/\breadonly\b/.test(member))
      fields.set(f[2], f[1]);
    attributes = '';
  }
  const base = m[2]?.split('.').pop();
  return { fields, base };
}

/**
 * The bodies of every method or property named `name` in C# `source`, overloads included: a block by brace matching,
 * or an expression-bodied member up to its `;`.
 */
export function body(source: string, name: string): string | undefined {
  const decl = new RegExp(
    String.raw`^[ \t]*(?:public|private|protected|internal)\b[^\n;]*?\b${name}\b[ \t]*(?:\(|=>|$)`,
    'gm',
  );
  const bodies: string[] = [];
  for (const m of source.matchAll(decl)) {
    const open = source.indexOf('{', m.index);
    const end = source.indexOf(';', m.index);
    if (end >= 0 && (open < 0 || end < open)) {
      bodies.push(source.slice(m.index, end));
      continue;
    }
    let depth = 0;
    for (let i = open; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}' && --depth === 0) {
        bodies.push(source.slice(m.index, i + 1));
        break;
      }
    }
  }
  return bodies.length === 0 ? undefined : bodies.join('\n');
}

/** Whether C# `code` reads `field`, directly or through its property (`m_Spellbook` through `Spellbook`). */
export function reads(code: string, field: string): boolean {
  const names = [field, field.replace(/^m_/, '')];
  return names.some((n) => new RegExp(`\\b${n}\\b`).test(code));
}

/** The element type of a field's declared type: `LevelEntry[]` and `List<LevelEntry>` are `LevelEntry`. */
export function elementType(declared: string): string {
  const generic = /^(?:List|ReferenceArrayProxy)<([\w.]+)/.exec(declared);
  const name = generic?.[1] ?? declared.replace(/\[\]|\?/g, '');
  return name.split('.').pop()!;
}
