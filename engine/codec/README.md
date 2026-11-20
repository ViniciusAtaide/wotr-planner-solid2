# Build code (C)

C answers one question: how a whole Build travels as text (guide §4; map ticket 07 and its amendment; build ticket 04). The code is the Build in the URL fragment, `/#b=<code>`, and the MCP's Build handle. It ports the Rust planner's version-1 mechanics (`~/code/wotr-planner/libs/rules/src/codec.rs`) onto this planner's game-shaped Build, as this planner's own version 1. Nothing here judges a Build's legality beyond the fixed rules below; which slot or Gear place takes what is the walk's to judge.

## Public entry

- `encodeBuild(data, build)`: the Build code for a Build, in the current format version. `data` gives each key its kind.
- `decodeBuild(data, code)`: reads a Build code made by any format version so far, or throws a `DecodeError`.
- `openBuild(data, code, takes)`: decodes a code, then moves each pick whose GUID is an old one that several alias overrides name to the heir its slot takes (the Rust planner's `Engine::open_link` and `heirs`). `takes` judges a pick in its slot; the caller passes the walk.
- `CODEC_VERSION`: the format version new codes are written in.
- `keyHash(key)`: FNV-1a 32-bit over a key's UTF-8 bytes, cut to `KEY_HASH_BYTES`.
- `DecodeError`: why a code couldn't be read; `reason` is `empty`, `base64`, `version`, `decompress`, `format` or `unknownKey`, with an optional detail in the message.
- `linkKeys(data)`: the GUIDs a code can name, by kind and hash, to read a code's hashes back: every blueprint under its own kind, and each alias override's old GUID under its target's kind. Cached per `CheckedData`. Its `LinkKeys` has `collisions`; `get(kind, hash)`, the GUID of a kind with that hash (undefined when none or several have it); and `heirs(kind, old)`, the live GUIDs an old GUID's alias overrides name.
- `KeyCollision`: two GUIDs of one kind with the same hash; a code naming either can't say which.

## The format

`code` is base64url with no padding over one format-version byte and the version's body. The version byte stays outside the compression, so a later version can change everything after it.

**Version 1.** The body is raw DEFLATE (any stream inflates, and a code may inflate to at most `MAX_INFLATED_BYTES`, 256 KiB; a 40-level Build is well under a kilobyte). Inflated, it is the hashes of the GUIDs the Build names, then the Build's structure:

```
body      = varint count, count × hash, structure
structure = opt(key(races)), ability [race stat], alignment, opt(6 × u8 [point buy, Str to Cha]),
            varint levels, levels × (key(classes), ability [increase], varint skills,
                                     skills × (u8 skill, u8 ranks)),
            varint ranks, ranks × (key(classes), u8 Rank level),
            varint class choices, choices × (key(classes), varint archetypes, archetypes × key(archetypes)),
            varint picks, picks × (place, kindKey [selection], varint index, kindKey [feature], parameter),
            varint gear, gear × (u8 place, key(items)),
            flag [the Gear opt-in],
            varint aspects, aspects × key(activatables)
place     = 0, varint level | 1, varint rank
parameter = 0 [none] | 1, u8 weapon category | 2, u8 school | 3, u8 skill | 4, kindKey [a blueprint]
ability   = 0 [none] | 1 + its index in Str, Dex, Con, Int, Wis, Cha
alignment = 0 [none] | 1 + its index in LG, NG, CG, LN, TN, CN, LE, NE, CE
kindKey   = u8 kind [its index in KINDS], key(that kind)
```

`varint` is unsigned LEB128 in the fewest bytes; `opt(x)` is 0, or 1 then x; `flag` is 0 or 1. `key(kind)` writes nothing in the structure: it takes the next hash from the list, a GUID of that kind (the data's own `kindOf`). A `kindKey` is a key whose kind the structure doesn't fix: the kind's index in `KINDS` (the data kinds, by index), then the key. Skills, schools, weapon categories and Gear places are written as their index in `SKILLS`, `SCHOOLS`, `WEAPON_CATEGORIES` and `PLACES`.

Picks are written in slot order (`slotOrder`): levels before ranks, then by the level or rank's number, the selection's GUID and the index. Class choices are written in GUID order, skills and Gear in their table's order.

**Hashes.** A GUID is written as FNV-1a 32-bit over its text (offset basis `0x811c9dc5`, prime `0x01000193`), all 32 bits (`KEY_HASH_BYTES` = 4), least significant byte first; one per key the structure names, in order. The Rust planner keeps 24 bits, which collide within this planner's larger kinds (6,031 features), so this planner's version 1 keeps all 32, by the Rust codec's own rule that a collision widens the hash. A hash is looked up only among the data's GUIDs of the key's kind, so two kinds may share one; two GUIDs of one kind may not, and a test fails if the data ever makes two collide.

**Aliases and twins.** An alias override names an old GUID the game replaced: its hash counts in the collision test, and it reads as the one GUID naming it, or, when several do, as itself, and `openBuild` moves the pick to the heir its slot takes. Inside `linkKeys`, each hash of a kind holds a `Hashed` entry: the first GUID `named` with that hash, whether it is `live` (a blueprint of the data), the `heirs` alias overrides name for it, and whether a second GUID `shared` the hash. A twin item (map ticket 29) reads as the item offered in its place.

**Exact.** A Build reads back unchanged from its code, picks in slot order, and has only one body. Decoding refuses anything the encoder never writes: an unknown tag or index, a varint longer than needed, picks, class choices, skills or Gear out of order or named twice, a hash listed but not named, a count larger than the bytes and hashes left could hold (`Reader.count`: each counted thing takes at least a byte or a hash), or bytes left over. It also refuses a Build no planner makes whatever the data (`keepsFixedRules`): a point buy that doesn't fit (a score below 7 or above 18, or more than the point buy allows), an increase off every fourth level, a skill's ranks above the character level, a Rank level of 0, or more than one archetype for a class (`toArchetypes`, build ticket 05d).

## Design notes

- `Writer.build` destructures every field of Build, in order, so a new field can't be left out unnoticed.
- `streamOf` makes the bytes a stream through a `Response` body, which browsers, Node, Bun and the jsdom tests all have (jsdom's `Blob` has no stream).
- Changing the layout or the hash breaks every code already shared: map ticket 07 says to add a version 2 instead, and `decodeBuild` keeps reading version 1.

## Tests

`codec.test.ts` runs on the committed data and on hand-built aliases (build ticket 04; map ticket 07 and its amendment):

- `keyHash` matches the FNV reference vectors: FNV-1a 32-bit of "a" is `0xe40c292c`, and of "" its offset basis.
- A frozen version-1 code, written by this version, still reads: changing the layout or the hash breaks it.
- No two GUIDs of one kind share a hash in the committed data.
- Both gold builds round-trip unchanged (`inSlotOrder`: a Build as its code holds it, picks in slot order).
- The decoder refuses what the encoder never writes: an empty code, bad base64, a version-2 byte (`bytesOf` reads a code's bytes so a test can hand-edit one), a stream that doesn't inflate, a Build no planner makes (a point buy past 25 points), and a GUID the data doesn't hold (Dodge, in data without it).
- Aliases, hand-built since no real one exists yet: an old GUID reads as the one GUID its alias names; an old GUID several aliases name stays itself until `openBuild` moves it to the heir its slot takes, and it counts in the collision test.
- A twin item opens as the one offered in its place (map ticket 29). The code names items by GUID; which Gear place holds one is the walk's to judge, not the code's.
