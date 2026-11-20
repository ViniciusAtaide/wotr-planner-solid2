# Engine layout and where the imported data lives

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

How does the engine sit in this Solid 2 repo, and where does the imported game data live? Decide:

- **Imported data:** does the importer write committed data files (the guide's section 3: one file per blueprint, keyed by GUID, mechanical fields only), or does the server read the git-ignored dump at start-up and keep what it needs in memory? The first makes data diffs reviewable and the server free of the 131 MB dump. The second avoids a data folder in the repo. Committing facts and GUIDs is fine under the copyright boundary; the game's text never is.
- **Module layout:**
  - how the guide's modules (loader and check, P, G, W, S, R, E, C, importer) map to folders or workspace packages;
  - which of them are plain TypeScript with no Solid inside, so the UI, the MCP and the tests share them;
  - which stay server-only.
- **What the browser receives:** the whole checked data as one hashed JSON document (as the Rust planner does), or the walk running on the server behind `query()` and server functions. This decides how fast the picker feels.

Already settled:
- the dump reader ([Reading the dump from TypeScript](02-reading-the-dump-from-typescript.md));
- the Build code ([Build code format](07-build-code-format.md));
- a stateless MCP on the same server ([MCP tool surface](08-mcp-tool-surface.md)).

## Answer

User, 2026-11-19 (ADR 0004).

- **Imported data is committed.**
  - `tools/importer/`, Node only, reads the git-ignored dump and writes `data/`: one file per blueprint, keyed by GUID with a readable name, mechanical fields only, as the guide's section 3 describes. A second run on the same dump writes nothing.
  - The server, the tests (gold builds included) and CI read `data/` and never need the dump.
  - The game's text never enters `data/`.
- **The walk runs in the browser.**
  - The server loads and checks `data/` once at start-up and serves it as one JSON document at a content-hash URL, cached indefinitely.
  - Pickers, picks and cascades run locally. Server functions serve only the MCP, which runs the same engine on the server.
  - Measure the compressed size of that document once the importer exists. If it's too large, revisit this choice then.
- **Code layout:** one package.
  - `engine/` (moved from `src/engine/` by the amendment below): plain TypeScript with no Solid imports, enforced by a lint rule. It holds the loader and check, P, G, W, S, R, E and C.
  - `src/routes/`: the UI and the `/mcp` endpoint.
  - `tools/importer/`: Node-only importing.
  - `data/`: the committed data.
  - No workspace packages until a second app needs the engine.

## Amendment: how the importer works

User, 2026-11-19.

- **Game-shaped, not area by area.** The importer doesn't reshape data area by area, as the Rust planner's guide-shaped model had to (`~/code/wotr-planner/.scratch/wotr-planner/research/importer-design-2026-11-16.md`). It's one generic filter:
  - walk the blueprints reachable from `ProgressionRoot` by following references;
  - keep only allowlisted fields and components;
  - write them unchanged, with the game's own field names and structure.
  - The engine reads those shapes directly, and each rule ports its C# method.
- **The allowlist** (`tools/importer/allowlist.ts`) names each `$type` the engine reads and the fields it needs. Each entry carries a citation (decompiled file and class) and a hand-written TypeScript type. It is expected to stay under about 100 types: the guide's section 3 header fields, the prerequisite, grant and selection components, and the ~50 summary-labelled component types.
- **No C# parser or type generator.** The dump already shows every field that occurs on each `$type`, enum values by name, and each reference's real target. A generator would type hundreds of classes the engine never reads. Revisit only if the allowlist grows past a couple of hundred types.
- **The check against the dump:**
  - every allowlisted field occurs on its type;
  - every value matches its declared type;
  - every reference resolves to a blueprint of the expected kind;
  - a report lists every component type on reachable blueprints that isn't allowlisted, so a missed prerequisite or grant type can't pass silently.
- **Deterministic:**
  - output has sorted keys, fixed formatting and no timestamps;
  - a test asserts that a second run writes nothing.

## Amendment: the engine sits at the root

User, 2026-11-19: the engine lives in `engine/` at the repo root, not `src/engine/`. The layout itself says it's not part of the UI. It's still one package: the app imports it through a path alias such as `~engine/*`. A lint rule (`no-restricted-imports` for `solid-js`, `@solidjs/*` and the app's `src/`) scoped to `engine/` keeps Solid and UI code out. There's no separate `tsconfig` for it.
