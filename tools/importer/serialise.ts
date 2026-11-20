import { sortKeys } from '~engine/data';

export function serialise(value: unknown): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`;
}
