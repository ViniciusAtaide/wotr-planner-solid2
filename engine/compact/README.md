# The compact data document

What travels to the browser (build ticket 05c). `data/` keeps the game's own shape (ADR 0005); this feature only changes how that shape is written for the trip. The browser decodes it back to exactly the files `readDataDir` gives, key order included, and loads them as before. The document stays one content-hashed static asset (ADR 0004, map 13), built by `vite/data-document` and fetched by `src/planner`.

## Public entry

- `encodeDocument(files, overrides, fieldDefaults)`: the compact document for the files and overrides `readDataDir` reads.
- `decodeDocument(doc)`: the files and overrides back, exactly.
- `FIELD_DEFAULTS`: each blueprint and component type's field defaults, generated from the importer's allowlist specs.
- `CompactDocument`, `FieldDefaults`, `Json`, `CompactError` and `COMPACT_VERSION`.

## The format

The document is JSON: `{ version, guids, shapes, defaults, folders, blueprints, overrides }`.

- **GUIDs once.** `guids` concatenates every GUID the blueprints hold, 32 hex characters each, in the order they first appear. A reference `"!bp_<guid>"` travels as `"#<index>"`, and a bare GUID (a blueprint's `guid`) as `"$<index>"`. Indexes are base 36. A string that really starts with `#`, `$` or `\` gets a leading `\`.
- **Shapes instead of field names.** An object travels as an array: a shape number, then its values. `shapes[n - 1]` is the object's `$type` (or `""` when it has none), then its field names in their original order. A list travels as an array whose first element is `0`.
- **Defaults dropped.** A field whose value equals its type's default is left out of the values. Its name stays in the shape with a leading `?`, so the decoder puts it back at the same position. `defaults` carries just the defaults the document uses.
- **No file wrappers.** Each blueprint travels as `[folder index, encoded value]`. Its path is rebuilt as `<folder>/<assetName>.<guid>.json`, and the encoder refuses any file not named that way.
- **Overrides** travel as they are: they're few, and each one's path is its own.

## Where the defaults come from

A field is dropped only where the importer's allowlist gives its spec a default (`zero` in `tools/importer/spec.ts`): `false` for a boolean, `0` for a number, `[]` for a list, `null` for a nullable, `"None"` for an enum that has it, or an `orDefault` value. Nothing is inferred from the data, so a new import can't quietly change what a missing field means. A defaulted field that holds any other value travels as it is, and the round trip would catch a difference.

`field-defaults.ts` is generated: run `bun tools/importer/field-defaults.ts` after changing the allowlist. `tools/importer/field-defaults.test.ts` fails while the committed table differs from the specs.

## Tests

`compact.test.ts`:
- round-trips the whole of `data/` and compares the JSON text, then compares `loadData` on both;
- covers dropped and kept defaults, absent fields, tag-like strings, and refusing a misnamed file.
