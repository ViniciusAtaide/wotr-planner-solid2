export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries.map(([k, v]) => [k, sortKeys(v)]));
  }
  return value;
}

export function byName<T>(items: Iterable<T>, nameOf: (item: T) => string | undefined): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const name = nameOf(item);
    if (name === undefined) continue;
    let members = out.get(name);
    if (members === undefined) out.set(name, (members = []));
    members.push(item);
  }
  return out;
}

export function fingerprintOf(value: unknown): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(JSON.stringify(sortKeys(value))))
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, '0');
}
