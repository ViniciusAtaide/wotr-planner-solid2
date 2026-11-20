# A compact data document

Status: open
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
