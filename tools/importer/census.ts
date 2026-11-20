import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadData } from '~engine/load';
import { readDataDir } from '~engine/data-dir';
import { references, type Guid } from '~engine/data';
import { buildGrantIndex, reachableFromGear, reachableFromRoot } from '~engine/grants';
import { shortType } from './spec';
import { blueprints } from '../dump';

interface Reference {
  readonly to: Guid;
  readonly comp: string;
  readonly field: string;
}

type Group = 'A' | 'B' | 'C' | 'D';

function referencesIn(json: Record<string, unknown>): Reference[] {
  const components = Array.isArray(json.Components) ? (json.Components as unknown[]) : [];
  const out: Reference[] = [];
  for (const { guid, path } of references(json)) {
    if (path === 'PrototypeLink') continue;
    const inComponent = /^Components\[(\d+)\]\.?/.exec(path);
    const comp = inComponent
      ? shortType((components[Number(inComponent[1])] as { $type?: unknown } | null)?.$type)
      : '(header)';
    const rest = inComponent ? path.slice(inComponent[0].length) : path;
    out.push({ to: guid, comp, field: rest.replace(/\[\d+\]/g, '') });
  }
  return out;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list === undefined) map.set(key, [value]);
  else list.push(value);
}

function tally(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function top(map: Map<string, number>, n: number): string[] {
  return [...map]
    .sort((x, y) => y[1] - x[1])
    .slice(0, n)
    .map(([k, v]) => `  ${v}\t${k}`);
}

export async function main(args: readonly string[]): Promise<number> {
  const root = fileURLToPath(new URL('../../data', import.meta.url));
  const dump =
    process.env.DUMP ?? fileURLToPath(new URL('../../blueprints/blueprints_raw_2.7.0x_0.binz', import.meta.url));

  const { files, overrides } = readDataDir(root);
  const data = loadData(files, overrides);
  const G = buildGrantIndex(data);
  const reach = new Set([...reachableFromRoot(data, G), ...reachableFromGear(data, G)]);
  const held = data.blueprints;
  const leftovers = [...held.keys()].filter((g) => !reach.has(g));
  const leftover = new Set(leftovers);

  const types = new Map<Guid, string>();
  const outRefs = new Map<Guid, Reference[]>();
  const refsTo = new Map<Guid, { from: Guid; comp: string; field: string }[]>();
  const decoder = new TextDecoder();
  for await (const r of blueprints(dump)) {
    types.set(r.guid, r.type.slice(r.type.lastIndexOf('.') + 1));
    const text = decoder.decode(r.json);
    if (!text.includes('!bp_')) continue;
    const out = referencesIn(JSON.parse(text) as Record<string, unknown>);
    outRefs.set(r.guid, out);
    for (const e of out) if (leftover.has(e.to)) push(refsTo, e.to, { from: r.guid, comp: e.comp, field: e.field });
  }

  const unwrittenNamedByReach = new Map<Guid, { from: Guid; comp: string }[]>();
  for (const g of reach) {
    for (const e of outRefs.get(g) ?? [])
      if (!held.has(e.to)) push(unwrittenNamedByReach, e.to, { from: g, comp: e.comp });
  }

  const a = new Map<string, number>();
  const b = new Map<string, number>();
  const d = new Map<string, number>();
  const groupOf = new Map<Guid, Group>();
  for (const g of leftovers) {
    const rs = refsTo.get(g) ?? [];
    const direct = rs.filter((x) => reach.has(x.from));
    const oneHop = rs.filter((x) => !held.has(x.from) && unwrittenNamedByReach.has(x.from));
    if (direct.length > 0) {
      groupOf.set(g, 'A');
      for (const x of direct) tally(a, `${x.comp} ${x.field}`);
    } else if (oneHop.length > 0) {
      groupOf.set(g, 'B');
      for (const x of oneHop) {
        const via = unwrittenNamedByReach.get(x.from)?.[0];
        if (via === undefined) continue;
        tally(b, `${via.comp} -> ${types.get(x.from)} . ${x.comp} ${x.field}`);
      }
    } else if (rs.length > 0 && rs.every((x) => held.has(x.from))) {
      groupOf.set(g, 'C');
    } else {
      groupOf.set(g, 'D');
      tally(d, [...new Set(rs.map((x) => types.get(x.from)))].sort().join('+') || '(no referrer)');
    }
  }

  const count = (group: Group) => [...groupOf.values()].filter((x) => x === group).length;
  console.log(
    [
      `held ${held.size}, reachable ${reach.size}, leftovers ${leftovers.length}: ` +
        `A (named by a reachable blueprint) ${count('A')}, B (one hop through an unwritten blueprint) ${count('B')}, ` +
        `C (named only by leftovers) ${count('C')}, D (other) ${count('D')}`,
      'A: the reachable referrer’s component and field',
      ...top(a, 40),
      'B: the reachable component -> the unwritten blueprint’s type . its component and field',
      ...top(b, 30),
      'D: the types that name it',
      ...top(d, 30),
    ].join('\n'),
  );

  const [tsv] = args;
  if (tsv !== undefined) {
    const lines = leftovers.map((g) => [groupOf.get(g), held.get(g)!.$type, held.get(g)!.assetName, g].join('\t'));
    writeFileSync(tsv, `${lines.join('\n')}\n`);
    console.log(`wrote ${leftovers.length} leftovers to ${tsv}`);
  }
  return 0;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
