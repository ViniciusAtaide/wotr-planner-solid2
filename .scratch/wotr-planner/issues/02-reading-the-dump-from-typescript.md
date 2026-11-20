# Reading the dump from TypeScript

Type: research
Status: resolved
Parent: [map](../map.md)

## Question

What is the format of BubblePrintsData's `blueprints_raw_2.7.0x_0.binz` (pin and SHA-256 in `~/code/wotr-planner/scripts/game-sources.pins`)? How can a Node/TypeScript tool stream it one blueprint at a time, with low memory use, and index it by GUID and name? What does each record's JSON look like (`$type`, `!bp_` references, field names)?

The dump reader (step 2 of the guide) and the import pipeline wait on this. The Rust planner already reads this file (`~/code/wotr-planner/libs/seeds`, `tools/`), so its reader is the primary local source.

## Answer

The `.binz` is BubblePrints' chunked container. Each chunk has a 16-byte header (u16 id, u16 sub id, u32 decoded
length, u32 stored length, u32 unused) and a payload stored as one raw LZ4 block. The 236,660 blueprints are in 15
chunks with id 33 and sub id 0, at most 16,000 records and 128 MB decoded per chunk. A record is four .NET
`BinaryWriter` strings (varint length, then UTF-8): GUID (32 lowercase hex characters, unique), asset name, full type
name, and indented JSON.

In the JSON, `$type` is `"<type guid>, ShortName"` on the root and on every polymorphic object. References are
`"!bp_<guid>"`, and a missing one is `null`. Enums are strings, and text fields are keys into a separate strings
chunk that the repo should skip.

Node reads it with no dependency: a 20-line LZ4 block decoder, offset reads, and a generator that yields one record at
a time. A full pass takes about 0.9 s on an idle machine, at about 250 MB peak RSS (one decoded chunk). Keeping the
~19k planner kinds parsed costs about 55 MB of heap. Index by GUID. A name maps to a list of GUIDs, because 4,829
names are shared (50 among feature and class kinds). Sub-chunk 33/1 already holds each blueprint's back-references.

Findings: [reading-the-dump.md](../research/reading-the-dump.md)
