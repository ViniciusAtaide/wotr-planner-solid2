# Build code format

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

What does a Build's code look like? It is the URL fragment, and also the MCP's Build handle. Decide:
- how picks are identified: GUIDs, short stable ids, or slugs;
- how the format is versioned;
- how a code naming an entry that later changes stays decodable (aliases);
- whether the size and readability matter more for links or for agents;
- whether a Gear-counting opt-in and Gear itself are part of it.

The guide's module C sets the requirements: every choice, stable identifiers, a version, and aliases.

## Answer

User, 2026-11-19: use the Rust planner's strategy (`~/code/wotr-planner/libs/rules/src/codec.rs`, version 1), which embeds the whole Build in the link.

- **Share link:** `/#b=<Build code>`. The **Build code** is base64url with no padding: one format-version byte, then a body compressed with raw DEFLATE. The version byte sits outside the compression, so a later version can change everything after it.
- **Body:** a list of key hashes, then the Build's structure (start, levels, class choices, path, switch, picks with their parameters, gear, rank levels) as bytes and varints. Each pick says its kind, and the kind decides which catalogue its hash is looked up in.
- **Identifiers:** each entry's key is written as a 24-bit FNV-1a hash (3 bytes). A hash only has to be unique within its kind. Here the key is the blueprint GUID, so a hash survives every data change that keeps the blueprint. A test fails if two entries of one kind ever share a hash; then the hash gets wider, which is a new format version.
- **Aliases:** an entry the game replaces keeps the old key as an alias, and an opened link migrates such a pick to the entry that now holds it.
- **Also encoded:** Gear, the opt-in to counting Gear toward stat prerequisites (ADR 0002) and each rank's Rank level (ADR 0003). The MCP passes the same Build code around, with structured JSON beside it for agents.

## Amendment: this planner's version 1 (build ticket 04)

Coordinator, 2026-11-20, on ticket 04's question and the user's standing instruction. A byte-compatible port of the Rust body is impossible: its body is shaped around the Rust Build's slot and key kinds, while ours is game-shaped. No link from this planner has shipped yet. So this planner gets its own **version 1**, which keeps every Rust mechanic, the strategy the user chose:
- **Format:** the version byte outside the compression, raw DEFLATE, base64url with no padding, minimal LEB128 varints, optional fields, and the hash list before the structure. Decoding is exact, as in Rust.
- **Hashes:** 24-bit FNV-1a over each GUID's text, unique within a kind. The kind is the data's own kind (`kindOf`). A test fails on a collision.
- **Structure:** our Build's fields in order: race, race stat, alignment, scores, levels (class, increase, skills), ranks (class, Rank level), class choices, and picks sorted by slot, each with its parameter tagged weapon, school, stat or blueprint. Then Gear by place, the Gear opt-in and the aspects kept on. There are no trailing tagged sections, since no older links exist.
- **Aliases:** an override kind `{ change: 'alias', target: <live GUID>, from: <old GUID>, reason }` in `data/overrides/`, like any correction (ADR 0005). Its hash counts in the collision test, and an opened code moves an old GUID to its heir, as Rust's `heirs` does. It is tested on a hand-built alias, since no real one exists yet.
- **Hash width: 32 bits** (coordinator, 2026-11-20, on ticket 04's collision test). At 24 bits, the data has 4 collisions within a kind: 2 among the 6,031 features and 2 among the items. At 32 bits it has none. The answer above says a collision makes the hash wider. No code has shipped, so this planner's version 1 uses the full 32-bit FNV-1a (4 bytes). The collision test stays.
