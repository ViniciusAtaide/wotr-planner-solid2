import { parseSync } from 'oxc-parser';
import { STYLE, type SourceFile } from './files';

export interface Comment {
  readonly line: number;
  readonly text: string;
}

export const GENERATED: Readonly<Record<string, string>> = {
  'file-routes.d.ts': 'written by filesystem-routing on every dev and build start',
  'solid-env.d.ts': 'written by @solidjs/vite-plugin from env.ts on every dev and build start',
};

const ALLOWED: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  { pattern: /^\/\/\/\s*<reference\s/, why: 'a triple-slash directive TypeScript reads' },
  { pattern: /^\/\/\s*@vitest-environment\s/, why: 'a pragma vitest reads' },
];

export function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

export function codeComments(file: SourceFile): Comment[] {
  const { comments } = parseSync(file.path, file.text);
  return comments.map((c) => ({ line: lineAt(file.text, c.start), text: file.text.slice(c.start, c.end) }));
}

export function cssComments(text: string): Comment[] {
  const out: Comment[] = [];
  let quote: string | undefined;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote !== undefined) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '/' && text[i + 1] === '*') {
      const close = text.indexOf('*/', i + 2);
      const end = close < 0 ? text.length : close + 2;
      out.push({ line: lineAt(text, i), text: text.slice(i, end) });
      i = end - 1;
    }
  }
  return out;
}

export function commentProblems(files: readonly SourceFile[]): string[] {
  const problems: string[] = [];
  for (const file of files) {
    if (Object.hasOwn(GENERATED, file.path)) continue;
    const comments = STYLE.test(file.path) ? cssComments(file.text) : codeComments(file);
    for (const c of comments) {
      if (ALLOWED.some((a) => a.pattern.test(c.text))) continue;
      const first = (c.text.split('\n')[0] ?? '').slice(0, 80);
      problems.push(
        `${file.path}:${c.line}: [no-comments] move this to the feature's README.md or a better name: ${first}`,
      );
    }
  }
  return problems;
}
