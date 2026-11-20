# A compact data document

Status: done
Session: ticket-03c-walk-fixes
Blocked by: 05b (both change how the document is served)
Plan: [plan](../plan.md)

## Goal

The browser gets the compact encoding guide §3.10 plans for, while `data/` stays as readable as it is (user, 2026-11-20). Today the document is the committed files as they are, each wrapped in `{ path, value }`: 11,717 blueprints, 7.3 MB raw, 1.02 MB gzipped, 0.55 MB brotli. The Rust planner's data is 0.43 MB gzipped. The gap comes from keeping the game's shape: its field names, `"!bp_<guid>"` references, and every field of a component. ADR 0005 keeps that shape in `data/` and in the engine. This ticket changes only what travels.

## Scope

The rearchitecture (`baf59949`, ADR 0008) moved files into feature folders after this ticket was written: the data-document plugin is under `vite/data-document/`; keep to the declared import edges, and put the encoding's notes in that feature's README, not in comments.


- **Encode at build time** in `vite/data-document.ts`, from the same checked data (`loadData` on `data/`):
  - **defaults dropped:** a field holding its type's default (`false`, `0`, `[]`, `null`, `"None"`) is left out. The defaults are listed once, per type, from the allowlist's specs.
  - **short type ids:** each `$type` and field name becomes a small number, from tables written once in the document.
  - **GUIDs once:** each GUID is listed once and referred to by its index, references included.
  - **No file wrappers:** blueprints and overrides travel as lists, not `{ path, value }`.
- **Decode in the browser** to exactly the blueprints `loadData` gives today, then load as now. A test round-trips the whole committed `data/` (encode, decode, then `toEqual` against `loadData` on the files), so nothing the engine reads can change.
- The document stays one content-hashed static asset, preloaded by 05b's `<link>`, with no server function (ADR 0004, map 13).
- If the encoding's gain over plain gzip or brotli turns out small, stop and report the numbers to the coordinator before going further.

## Done when

- The round-trip test passes on the whole of `data/`.
- The Outcome measures the document's raw, gzip and brotli sizes, and its decode-plus-load time in the browser, before and after. The goal is under 0.5 MB gzipped.
- Both gold builds walk the same in the browser on the compact document (the walk's gains and failures are identical).
- `bun run check` passes, and the work is one commit by path through the hook. Don't push.
- `Status: done` and an `## Outcome`.

## Outcome (2026-11-20)

The coordinator chose the full encoding after the stop-rule report (gzip is what GitHub Pages serves), on three conditions: the decoder in its own feature, the round trip over all of `data/`, and defaults only from the allowlist's specs. All three hold.

**The encoding.** `engine/compact` holds `encodeDocument` and `decodeDocument`, and its README describes the format:
- shape tables carry `$type` and field names;
- each GUID is listed once and referred to by a base-36 index;
- fields holding their spec's default are dropped, leaving a `?name` marker in the shape so key order survives;
- blueprints travel as `[folder, value]` with their paths rebuilt; overrides travel as they are.

**The plugin and the planner.** `vite/data-document` emits the encoded document, and `src/planner/engine.ts` decodes it before `loadData`.

**Defaults.** These come only from the allowlist's specs.
- `tools/importer/spec.ts` gives each spec a `zero`: `false` for a boolean, `0` for an int or number, `[]` for a list, `null` for a nullable, `"None"` for an enum that has it, or the `orDefault` value.
- `tools/importer/field-defaults.ts` generates `engine/compact/field-defaults.ts` from them. It covers 101 `$type`s, plus 9 structs keyed by their field names, and throws if two specs disagree.
- `field-defaults.test.ts` fails while the committed table differs from the specs.
- Nothing is inferred from the data. A defaulted field holding another value travels as it is.

**Round trip.** `compact.test.ts` encodes and decodes the whole of `data/` (11,716 blueprints and 247 overrides):
- the files' JSON text is identical, key order included;
- `loadData` on the decoded files `toEqual`s `loadData` on the originals;
- unit cases cover dropped and kept defaults, absent fields, tag-like strings and a misnamed file.

**Sizes** (gzip at level 6 is the likely level for a host that compresses on the fly; the build's own `.gz` is level 9):

| document | raw | gzip -6 | gzip -9 | brotli q11 |
|---|---|---|---|---|
| before, `{files, overrides}` | 7.30 MB | 1.020 MB | 0.998 MB | 0.550 MB |
| after, compact | 2.08 MB | 0.4998 MB (499,843 B) | 0.4936 MB | 0.3933 MB |

That's 51% less with gzip and 28% less with brotli. It meets the goal of under 0.5 MB gzipped, but only by 157 bytes at level 6, so data growth will push it over.

**Decode plus load** (in the browser under dev, median of 7 runs, from the same text in memory):

| | parse | decode | load | total |
|---|---|---|---|---|
| before | 14 ms | — | 39 ms | 53 ms |
| after | 48 ms (parse and decode) | | 35 ms | 83 ms |

So +30 ms of CPU, against about 520 KB less to download with gzip.

**Gold builds.** Both walk the same in the browser on the compact document as in Bun on the files:
- Enforcer: 153 facts, 0 failures;
- Jack in the Green: 165 facts, its 1 known failure.

The summaries' SHA-256 matched: `0b83d253608a6eec` and `aef18f9472e69c5b`.

**Other changes.**
- `tools/repo-checks/features.ts` declares `engine/compact` (needing data, data-dir and load), plus edges to it from `tools/importer`, `vite/data-document` and `src/planner`.
- Tried and dropped: ordering GUIDs by use. Its shorter indexes compressed worse than first-appearance order (507,922 B at gzip -6).

