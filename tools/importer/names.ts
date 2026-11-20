// Display names (ADR 0006, map ticket 19): the importer resolves each kept blueprint's English display name from the
// dump's strings and writes it as `name`. It is the only game text data/ holds; descriptions are never read here.

/**
 * The English text of a localised-string field, or `undefined` when the blueprint has none. A field holds either its
 * own key (`m_Key`) or a shared string's key (`Shared.stringkey`).
 */
export function displayName(field: unknown, strings: ReadonlyMap<string, string>): string | undefined {
  if (field === null || typeof field !== 'object') return undefined;
  const { m_Key, Shared } = field as { m_Key?: unknown; Shared?: { stringkey?: unknown } | null };
  const key = typeof m_Key === 'string' && m_Key !== '' ? m_Key : Shared?.stringkey;
  if (typeof key !== 'string' || key === '') return undefined;
  const text = strings.get(key)?.trim();
  return text === undefined || text === '' ? undefined : text;
}

/**
 * A display name with the game's runtime template tokens put in a neutral form (ADR 0006): `{Name}` (the character's
 * name) and the comma after it go, and a word holding `{mf|<male>|<female>}` is written both ways
 * (`L{mf|ord|ady}` → `Lord/Lady`). Returns `undefined` for a name with no token; throws on a token it doesn't know.
 */
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
