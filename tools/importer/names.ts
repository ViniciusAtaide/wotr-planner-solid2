const SHARED_KEY = /"assetguid"\s*:\s*"([0-9a-f]{32})"\s*,\s*"stringkey"\s*:\s*"([^"]+)"/g;

export interface SharedKeyCollector {
  readonly add: (json: string) => void;
  readonly keys: () => ReadonlyMap<string, string>;
}

export function sharedKeyCollector(): SharedKeyCollector {
  const byAsset = new Map<string, Set<string>>();
  return {
    add: (json) => {
      for (const [, asset, key] of json.matchAll(SHARED_KEY)) {
        if (asset === undefined || key === undefined) continue;
        const keys = byAsset.get(asset) ?? new Set<string>();
        keys.add(key);
        byAsset.set(asset, keys);
      }
    },
    keys: () => {
      const agreed = new Map<string, string>();
      for (const [asset, keys] of byAsset) if (keys.size === 1) agreed.set(asset, [...keys][0]!);
      return agreed;
    },
  };
}

export function displayName(
  field: unknown,
  strings: ReadonlyMap<string, string>,
  sharedKeys: ReadonlyMap<string, string> = new Map(),
): string | undefined {
  if (field === null || typeof field !== 'object') return undefined;
  const { m_Key, Shared } = field as {
    m_Key?: unknown;
    Shared?: { assetguid?: unknown; stringkey?: unknown } | null;
  };
  const sharedKey =
    typeof Shared?.stringkey === 'string' && Shared.stringkey !== ''
      ? Shared.stringkey
      : typeof Shared?.assetguid === 'string'
        ? sharedKeys.get(Shared.assetguid)
        : undefined;
  const key = typeof m_Key === 'string' && m_Key !== '' ? m_Key : sharedKey;
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
