export function displayName(field: unknown, strings: ReadonlyMap<string, string>): string | undefined {
  if (field === null || typeof field !== 'object') return undefined;
  const { m_Key, Shared } = field as { m_Key?: unknown; Shared?: { stringkey?: unknown } | null };
  const key = typeof m_Key === 'string' && m_Key !== '' ? m_Key : Shared?.stringkey;
  if (typeof key !== 'string' || key === '') return undefined;
  const text = strings.get(key)?.trim();
  return text === undefined || text === '' ? undefined : text;
}

export function neutralName(name: string): string | undefined {
  if (!name.includes('{')) return undefined;
  const words = name
    .replace(/\{Name\},?\s*/g, '')
    .split(' ')
    .map((word) => {
      const m = /^(.*)\{mf\|([^|}]*)\|([^|}]*)\}(.*)$/.exec(word);
      return m === null ? word : `${m[1]}${m[2]}${m[4]}/${m[1]}${m[3]}${m[4]}`;
    });
  const out = words.join(' ').trim();
  if (out.includes('{')) throw new Error(`a template token the importer doesn't know: ${name}`);
  return out;
}
