import { blueprints } from './reader.mjs';

const path = process.env.DUMP ?? new URL('../../blueprints/blueprints_raw_2.7.0x_0.binz', import.meta.url).pathname;
const wanted = new Set(process.argv.slice(2));
if (wanted.size === 0) {
  console.error('usage: bun tools/dump/show.mjs <guid|name> [...]');
  process.exit(2);
}

const REF = /^!bp_([0-9a-f]{32})$/;
const found = [];
const referenced = new Set();
for await (const r of blueprints(path, { want: (r) => wanted.has(r.guid) || wanted.has(r.name) })) {
  const text = Buffer.from(r.json).toString();
  for (const m of text.matchAll(/"!bp_([0-9a-f]{32})"/g)) referenced.add(m[1]);
  found.push({ guid: r.guid, name: r.name, type: r.type, json: JSON.parse(text) });
}
if (found.length === 0) {
  console.error(`no blueprint with GUID or name: ${[...wanted].join(', ')}`);
  process.exit(1);
}

const names = new Map();
if (referenced.size > 0) {
  for await (const r of blueprints(path, { want: (r) => referenced.has(r.guid) })) names.set(r.guid, r.name);
}
const named = (_key, value) => {
  if (typeof value !== 'string') return value;
  const m = REF.exec(value);
  return m ? `${names.get(m[1]) ?? '<missing>'} ${m[1]}` : value;
};

for (const b of found) {
  console.log(`# ${b.name} ${b.guid} ${b.type}`);
  console.log(JSON.stringify(b.json, named, 2));
}
