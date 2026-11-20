// Generic helpers the engine and the importer share, with no game rule in them.

/** A value with its object keys sorted at every depth, so equal values have one JSON text. */
export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries.map(([k, v]) => [k, sortKeys(v)]));
  }
  return value;
}

/** The items by the name `nameOf` gives them, in first-seen order, leaving out those it gives none. */
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
