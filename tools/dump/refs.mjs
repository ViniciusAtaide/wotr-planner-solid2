import { backReferences, blueprints } from './reader.mjs';

const path = process.env.DUMP ?? new URL('../../blueprints/blueprints_raw_2.7.0x_0.binz', import.meta.url).pathname;
const wanted = new Set(process.argv.slice(2));
if (wanted.size === 0) {
  console.error('usage: bun tools/dump/refs.mjs <guid|name> [...]');
  process.exit(2);
}

export async function names(dump) {
  const byGuid = new Map();
  for await (const r of blueprints(dump))
    byGuid.set(r.guid, { name: r.name, type: r.type.slice(r.type.lastIndexOf('.') + 1) });
  return byGuid;
}

const byGuid = await names(path);
const targets = [...byGuid].filter(([g, b]) => wanted.has(g) || wanted.has(b.name)).map(([g]) => g);
if (targets.length === 0) {
  console.error(`no blueprint with GUID or name: ${[...wanted].join(', ')}`);
  process.exit(1);
}
const targetSet = new Set(targets);
for await (const { guid, referrers } of backReferences(path)) {
  if (!targetSet.has(guid)) continue;
  const b = byGuid.get(guid);
  const counts = new Map();
  for (const r of referrers) counts.set(r, (counts.get(r) ?? 0) + 1);
  console.log(`# ${b.name} ${guid} ${b.type}: ${counts.size} referrer(s), ${referrers.length} reference(s)`);
  for (const [r, n] of counts) {
    console.log(`${n}× ${byGuid.get(r)?.name ?? '<missing>'} ${r} ${byGuid.get(r)?.type ?? ''}`);
  }
}
