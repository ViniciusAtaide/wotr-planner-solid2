# Reading the dump from TypeScript

Research for [ticket 02](../issues/02-reading-the-dump-from-typescript.md), 2026-11-19.

**Short answer.** `blueprints_raw_2.7.0x_0.binz` is BubblePrints' own chunked container, not a zip or a gzip. It is a
run of chunks, each a 16-byte header and a payload that is usually one raw **LZ4 block**. The 236,660 blueprints sit
in 15 "Blueprints" chunks of at most 16,000 records each. A record is four .NET `BinaryWriter` strings: GUID, asset
name, full type name, and the blueprint's indented JSON. Node can read it with no dependency: a 20-line LZ4 block
decoder, `fs/promises` reads at offsets, and a generator that yields one record at a time. A full pass takes about
0.9 s on an idle machine (2.7-3.7 s under heavy load), with about 250 MB peak RSS. That peak comes from holding one
decoded chunk, up to 95 MB. Index by GUID (unique, 32 lowercase hex characters). A name is not a key: it maps to a
list of GUIDs, because 4,829 names belong to more than one blueprint, 50 of them among the feature and class kinds.

## Sources

- **BubblePrints** (the format's owner), [factubsio/BubblePrints](https://github.com/factubsio/BubblePrints) at
  `7a8511b` (2026-07-04):
  - `BubbleprintEngine/BPFile.cs`: `ChunkTypes`, `ChunkSubTypes`, `Chunk`, `BPWriter.Write`, `Reader`.
  - `BubbleprintEngine/BlueprintDB.cs`: the load method that reads the header, bundles, type names, strings, defaults
    and search index.
  - `BinzFactory/DefaultBinzImporter.cs`: the writer, including `MAX_BATCH_COUNT` and the per-record writes.
  - `BubbleprintEngine/BlueprintHandle.cs`: `ParseType`, `ParseTypeString`, `ParseReference`.
- **The Rust planner's reader**, `~/code/wotr-planner`:
  - `tools/game-check/src/binz.rs`: `scan`, `read_records`, `read_bytes`, `pinned_bytes`.
  - `tools/game-check/src/dump.rs`: `Dump::insert`, `keeps_json`, `reference`, `component_kind`, `level_entries`.
  - `tools/game-check/src/lookup.rs`: `TEXT_FIELDS`, `TEXT_KEYS`, `without_text`, the `by_name` index.
  - `scripts/game-sources.pins` and `scripts/game-sources.sh`: the pin, size and SHA-256 check.
  - `libs/seeds` does not read the dump.
- **Measurements on the pinned file**, SHA-256 `03ba6e29…9c6a`, 136,905,792 bytes, run with Node v24.19.0. The scripts
  live in this session's scratchpad (`dump/lz4.mjs`, `reader.mjs`, `bench.mjs`, `shape*.mjs`, `keep.mjs`,
  `backrefs.mjs`), outside the repo.

## The container

Each chunk has a 16-byte little-endian header (`BPFile.BPWriter.Write`; `binz.rs` module doc):

| offset | type | field                                                                     |
| ------ | ---- | ------------------------------------------------------------------------- |
| 0      | u16  | chunk id (`ChunkTypes`)                                                   |
| 2      | u16  | sub id                                                                    |
| 4      | u32  | decoded length                                                            |
| 8      | u32  | stored length, an LZ4 **block** (no frame); 0 means stored raw            |
| 12     | u32  | `Hash`, always written as 0                                               |

The writer compresses every payload over 1,024 bytes with K4os LZ4 at `L10_OPT`. That is the plain LZ4 block format,
so any block decoder reads it. Chunks of the same id are grouped by the reader: a new sub id 0 starts a new group,
which BubblePrints calls a `CompositeChunk`.

The chunks in the pinned file, in order of first appearance:

| id/sub    | `ChunkTypes`               | count | decoded total | contents                                                                                                                                                                                  |
| --------- | -------------------------- | ----- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 32/0      | `Header`                   | 1     | 18 B          | i32 major, minor, patch (2, 7, 0); a string suffix (`x`); i32 blueprint count (236,660)                                                                                                    |
| 33/0      | `Blueprints`, main         | 15    | 542 MB        | the records (below)                                                                                                                                                                       |
| 33/1      | `Blueprints`, `References` | 15    | 15 MB         | per record, in order: i32 n, then n 16-byte .NET GUIDs of the blueprints that **reference** this one (back-references)                                                                     |
| 33/2      | `Blueprints`, `Components` | 15    | 2 MB          | per record: i32 n, then n u16 indices into the type-name table (the component types it uses)                                                                                              |
| 34/0      | `Strings`                  | 1     | 22 MB         | one JSON object `{"$id", "strings": {<key>: <text>}}`. This is the localized text: **never read into the repo**                                                                           |
| 35/0      | `TypeNames`                | 1     | 0.3 MB        | i32 n (2,913), then n pairs (type GUID as 32 hex characters, full type name)                                                                                                             |
| 37/0      | `Defaults`                 | 1     | 4 B           | i32 0 (empty)                                                                                                                                                                             |
| 38/0      | `SearchIndex`              | 1     | 84 MB         | BubblePrints' word index for its search box; not useful here                                                                                                                              |

There is no 36/0 (`ComponentNames`) and no 33/3 (`Paths`) in this file. Chunk boundaries line up exactly with the file
end, and every LZ4 block decodes to its stated length.

**Strings.** Every string is a .NET `BinaryWriter.Write(string)`: a 7-bit varint byte length, then UTF-8 bytes. This
is `read_bytes` in `binz.rs`.

**Batching.** `DefaultBinzImporter` starts a new Blueprints chunk after 16,000 records, or when fewer than 32,000 bytes
would remain of `BPFile.BUFFER_SIZE` (128,000,000). So a decoded main chunk is never larger than 128 MB. In this file
the largest is 94.8 MB and the smallest 16.1 MB. A reader must be ready to hold one such chunk, because an LZ4 block
can only be decoded whole.

**A .NET GUID's bytes.** In 33/1 the GUIDs come from `Guid.ToByteArray()`. The first three groups (4, 2 and 2 bytes)
are little-endian, and the last 8 bytes are in order. Reversing those three groups gives the 32-hex text form. I
checked this on chunk 1. Of its 139,170 back-references, 65,611 come from a referrer in the same chunk, and every one
of those referrers' JSON holds `!bp_<guid>` of the referenced blueprint. So 33/1 is a ready-made "who references X"
index. Today the Rust planner rebuilds that index by scanning the JSON (`lookup.rs`, the `referrers` field).

## A record

A record in a 33/0 chunk is four strings (`BlueprintDB` load: `GuidText`, `Name`, `Type`, `_Raw`):

| field     | form in the pinned file                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| GUID      | always 32 lowercase hex characters with no dashes; all 236,660 are unique                                                                 |
| name      | the asset name, an identifier rather than display text. Never empty. 92,437 distinct names; 4,829 shared by 2 or more GUIDs (one by 3,556) |
| type      | always the full .NET name, `Namespace.Type`; the short name is the part after the last `.` (`ParseType`, `Dump::insert`)                  |
| JSON      | an object, indented with CRLF line endings; 517.8 MB in total; the largest is a `BlueprintCreditsGroup` of 5 MB                           |

Most of the shared names are on story and area kinds (`BlueprintEtude`, `BlueprintCue`, `BlueprintAnswer`,
`Cutscene`, `BlueprintLoot`, `BlueprintArea`). Only 50 shared names touch the feature, progression, class, archetype
or race kinds. Ticket 311 of the Rust planner records the trap this sets: a research agent once took the wrong one of
two `BardTalentSelection`s (`lookup.rs` module doc). So the name index is `Map<string, string[]>`, and code refers to
blueprints by GUID.

### The JSON

These shapes come from a full pass over all records and from the `BlueprintFeature` `PowerAttackFeature`
(`9972f33f977fc724c838e59641b2fca5`), `BlueprintCharacterClass` `FighterClass`
(`48ac8db94d5de7645906c7d0ad3bcfbd`), `BlueprintProgression` `FighterProgression`
(`b50e94b57be32f74892f381ae2a8905a`) and `BlueprintFeatureSelection` `BasicFeatSelection`
(`247a4068296e8be42890143f451b4b45`).

- **`$type`** is the only `$`-key anywhere in the JSON: 699,194 occurrences, with no `$id` or `$ref`. Its form is
  always `"<32-hex type GUID>, <ShortTypeName>"`. It appears on the root object and on every polymorphic nested object:
  components, actions, conditions and so on. The short name is the part after `", "` (`component_kind` in
  `dump.rs`; `NewTypeStr` in BubblePrints). The type GUID is a key into the 35/0 type-name table.
- **References** are strings of the form `"!bp_<32 lowercase hex>"`. A full pass found 889,331 of them, all in that
  form, and no empty `"!bp_"`. A missing reference is JSON `null` (for example `m_Spellbook` on a non-caster class).
  BubblePrints' `ParseReference` also accepts a `Blueprint:<guid>:<name>` form, but it never appears in this dump.
  Reference fields usually start with `m_`: `m_AllFeatures`, `m_Features`, `m_Progression`, `m_Archetypes`,
  `m_Class`, `m_BaseAttackBonus`, `m_Facts`, `IsPrerequisiteFor`.
- **Root fields of a blueprint fact** (`BlueprintFeature` and its relatives): `$type`, `PrototypeLink`,
  `m_Overrides`, `Components`, `Comment`, `m_AllowNonContextActions`, the three text fields, `m_Icon`, `HideInUI`,
  `HideInCharacterSheetAndLevelUp`, `HideNotAvailibleInUI` (the game's own spelling), `DlcType` (on some), `Groups`,
  `Ranks`, `ReapplyOnLevelUp`, `IsClassFeature`, `IsPrerequisiteFor`. Subtypes add their own fields after these:
  - a selection adds `Mode`, `Group`, `Group2`, `m_Features`, `m_AllFeatures`, and more;
  - a progression adds `m_Classes[{m_Class, AdditionalLevel}]`, `LevelEntries[{Level, m_Features}]`, `UIGroups`, and
    more.
- **Components** is an array of objects with `$type`, `name`, `PrototypeLink`, `m_Overrides`, then the component's
  own fields. Examples are `AddFacts.m_Facts`, and `PrerequisiteStatValue.Stat` and `.Value`.
- **Value forms.** Enums are strings holding the member name (`"D10"`, `"Strength"`, `"Feat"`). Numbers are JSON
  numbers. Flags are booleans. An asset link such as `m_Icon` is an object `{guid, fileid}` or `null`.
- **Localized text** is never inline. A text field (`m_DisplayName`, `m_Description`, `m_DescriptionShort`,
  `m_Flavor`, `LocalizedName`, and others) holds an object `{m_Key, m_OwnerString, m_OwnerPropertyPath, m_JsonPath,
  Shared}`. Either `m_Key` is a 36-character dashed key, or `Shared` is `{assetguid, stringkey}` pointing at a shared
  string. Both resolve through the 34/0 strings object. Since the repo never holds the game's text, a reader for the
  repo's tools should simply skip chunk 34. `lookup.rs` (`TEXT_FIELDS`, `TEXT_KEYS`, `without_text`) shows how to
  scrub text-shaped values when printing a blueprint.

## Streaming it from Node/TypeScript

This shape is proven by the scratchpad's `reader.mjs`. It is plain ESM that type-strips cleanly, and Node 24 runs the
same code as `.ts`:

```ts
type Raw = { guid: string; name: string; type: string; chunk: number; json: Uint8Array }; // json valid until the next chunk
async function* blueprints(path: string, want?: (r: Raw) => boolean): AsyncGenerator<Raw>;
```

1. Open the file with `fs/promises` and walk the 16-byte headers with `fh.read(buf, 0, 16, pos)`. Skip every chunk
   that is not 33/0 by seeking past its stored length. Never `readFile` all 137 MB.
2. For a 33/0 chunk, read its stored bytes (at most 10.3 MB here) into a reused buffer. Decode the LZ4 block into a
   second reused buffer that grows to the largest decoded length (at most 128 MB, 94.8 MB here).
3. Walk the records with the varint reader. Decode the GUID, name and type with `TextDecoder` (they are tiny), and
   yield the JSON as a `subarray` view. The consumer decides whether to `JSON.parse` it, which is the costly step.
   This mirrors `keeps_json`: the planner needs about 19,300 blueprints (features, progressions, classes, archetypes,
   races, stat progressions, items, enchantments), 63 MB of the 518 MB.
4. **LZ4.** The block decoder is about 20 lines. It reads a token, the literal length plus 255-runs, the literals, a
   2-byte offset, and the match length plus 4, and copies the match byte by byte when the match overlaps. It checked
   out on all 15 chunks: each decoded to exactly its stated length, all 236,660 records parsed, and the count matches
   the header. Node's `zlib` has gzip, brotli and zstd but not LZ4, so the choice is this hand-rolled decoder or an npm
   package (`lz4js` is pure JS, `lz4-napi` is native). The hand-rolled decoder avoids a dependency, and its speed is
   not the bottleneck.
5. **Pin check before reading**, as `binz::pinned_bytes` does: compare the size, then stream a SHA-256 with
   `createReadStream` into `crypto.createHash`. That took 92 ms.

### Measured

Single runs, one process each, peak RSS sampled every 20 ms. The idle column is from the first runs. The loaded column
is from reruns while other agents held the load average near 40 on 8 cores; treat those as upper bounds.

| pass                                                                         | time (idle) | time (loaded) | peak RSS     |
| ---------------------------------------------------------------------------- | ----------- | ------------- | ------------ |
| SHA-256 of the file                                                          | 0.09 s      | n/a           | 75 MB        |
| scan every record (decode only)                                              | 0.9 s       | 2.7-3.7 s     | 248 MB       |
| plus a GUID index (chunk and offset) and a name-to-GUIDs index               | 1.0 s       | n/a           | 456 MB       |
| plus `JSON.parse` of every record                                            | 2.1 s       | 6-8 s         | 370-470 MB   |
| keep the ~19,300 planner kinds parsed in memory                              | n/a         | 3.6-7.7 s     | 307-433 MB   |
| decode one main chunk alone (random access)                                  | n/a         | 0.06-1.1 s    | chunk size   |

For the planner kinds kept parsed, the heap after GC is 55 MB. As raw text it is 70 MB, and minified 44.6 MB.

**What this means for the design.**

- One streaming pass is cheap enough to run at build time, or at server start for dev. The live memory is set by the
  largest decoded chunk, not by the file.
- Random access by GUID means decoding the record's whole chunk, about 0.1-0.4 s each. So a long-lived index should
  not point back into the `.binz`. Instead, the import pipeline should stream the dump once and keep, or write out,
  what it needs. That could be the parsed planner kinds (about 55 MB of heap), or a derived per-kind cache that stays
  git-ignored like the dump.
- Index by GUID. Keep the name index as `Map<name, guid[]>` and refuse an ambiguous name, as `lookup.rs` does with its
  shared-name banner.
- If the pipeline needs "what references X" (granted-by chains), it can read the 33/1 back-references instead of
  scanning the JSON. This needs the .NET GUID byte-order swap described above.

## Not checked

- The 33/2 component-index table was not cross-checked against `Components[].$type`. BubblePrints'
  `FlatIndexToTypeName` says that is what it indexes.
- The `lz4js` and `lz4-napi` packages were not benchmarked.
- Streaming within a chunk (an LZ4 decoder with a sliding window, to cut the ~95 MB peak) was not tried. It is
  possible because LZ4 matches reach back at most 64 KB, but it is probably not worth it.
