import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');
const TOKENS = 'design/tokens.css';

const COLOR_LITERAL = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|\b(?:rgba?|hsla?|oklch)\(/gi;

export function colorLiterals(text: string): string[] {
  return text.match(COLOR_LITERAL) ?? [];
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

describe('colors come only from the tokens', () => {
  it('finds no color literal in src/ outside tokens.css', () => {
    const found = filesUnder(SRC)
      .filter((path) => relative(SRC, path) !== TOKENS && !path.endsWith('colors.test.tsx'))
      .flatMap((path) => colorLiterals(readFileSync(path, 'utf8')).map((c) => `${relative(SRC, path)}: ${c}`));
    expect(found).toEqual([]);
  });

  it('catches a planted literal of each kind', () => {
    expect(
      colorLiterals('color: #cda55a; border: 1px solid #fff; fill: rgb(1 2 3); a: hsl(1 2% 3%); b: oklch(0.5 0.1 30)'),
    ).toEqual(['#cda55a', '#fff', 'rgb(', 'hsl(', 'oklch(']);
    expect(colorLiterals('https://planner.example/#b=AQx3kLm9vQ2TzP8rY4cHf1W0aJd7sN')).toEqual([]);
  });

  it('holds the tokens themselves', () => {
    expect(colorLiterals(readFileSync(join(SRC, TOKENS), 'utf8')).length).toBeGreaterThan(15);
  });
});
