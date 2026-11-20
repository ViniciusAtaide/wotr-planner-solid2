// Deterministic JSON for data/ (guide §3 point 7): keys sorted at every depth, two-space indent, LF line endings,
// one trailing newline, no timestamps. The same value always writes the same bytes, so a rerun on the same dump
// writes nothing and a diff of two data versions shows only real changes. Array order is the game's and is kept.
import { sortKeys } from '~engine/util';

export function serialise(value: unknown): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}
