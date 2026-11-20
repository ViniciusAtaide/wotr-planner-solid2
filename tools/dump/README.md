# Dump reader

Reading the game's blueprint dump, `blueprints/blueprints_raw_2.7.0x_0.binz` (git-ignored), and three scripts that
print from it. The format is written up in `.scratch/wotr-planner/research/reading-the-dump.md`.

## Usage

Each script reads `blueprints/blueprints_raw_2.7.0x_0.binz`, or the file `DUMP` names.

```sh
bun tools/dump/show.mjs <guid|name> [...]             # or: bun run show -- <guid|name> [...]
bun tools/dump/refs.mjs <guid|name> [...]
bun tools/dump/referrer-tree.mjs <guid|name> [depth]
```

- **`show.mjs`** prints blueprints by GUID or exact name: the JSON (mechanical data), with each reference
  `"!bp_<guid>"` shown as `<name> <guid>`. Text fields hold only localisation keys, never the game's text. It makes two
  passes over the dump: one finds the wanted blueprints, one names what they reference.
- **`refs.mjs`** prints the blueprints that reference a blueprint. It reads the dump's back-reference table (chunk
  33/1), so it needs no scan of the JSON, and prints each referrer once, as `<count>× <name> <guid> <type>`, where the
  count is how many references the table lists from it. `names` maps every blueprint's GUID to its asset name and short
  type.
- **`referrer-tree.mjs`** prints the tree of what refers to a blueprint. It follows the back-reference table upward and
  stops at classes, races and the root, or after `depth` steps (default 4). Each line is one referrer: indentation
  shows the step, then `<name> <guid> <type>`. A reference isn't always a grant (a prerequisite or a check refers too),
  so read each step's blueprint with `show.mjs` to see which field it is. G answers "who grants X?" from the imported
  data.

## Public entry

`index.ts` re-exports `reader.mjs`; `reader.d.mts` types it, so the TypeScript importer streams the dump through the
same reader the scripts use.

- `blueprints(path, { want })` streams `RawRecord`s, one blueprint at a time with one decoded chunk in memory. A record
  holds `chunk` (the index of the Blueprints chunk it came from), `guid`, `name` (the asset name), `type` (the full
  .NET type name, `Namespace.ClassName`), and `json`, the record's JSON as UTF-8 bytes with its `jsonOffset` and
  `jsonLength`. `json` is valid only until the reader moves to the next chunk.
- `strings(path)` reads the localised strings, keyed by localisation key.
- `backReferences(path)` streams every blueprint with the GUIDs of the blueprints that reference it.

## Format

- The file is a sequence of chunks, each with a 16-byte header (id, sub id, length, compressed length, the last 0
  when stored as is). A compressed chunk is one raw LZ4 block (`lz4.mjs`: the block format, no frame, as sequences of token, literals,
  offset and match; the last sequence has literals only). `chunks` yields each wanted chunk's id, sub id and decoded
  payload, which is valid until the next chunk.
- Blueprints live in chunks with id 33, sub id 0. Each record is four varint-prefixed UTF-8 strings: GUID, name, full
  type name, JSON.
- The back-reference table is chunk 33/1: per record, in the order of its 33/0 chunk, an i32 count and that many
  16-byte .NET GUIDs. Each GUID is a .NET `Guid.ToByteArray()`, written out as the dump's 32-hex text with the first
  three groups little-endian (`dotnetGuid`).
- The localised text lives in chunk 34/0 as one JSON object, `{"$id", "strings": {...}}`. Only the importer reads it,
  and only for display names (ADR 0006): no other string may leave the importer.
