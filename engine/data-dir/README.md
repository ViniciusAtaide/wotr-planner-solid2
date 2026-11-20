# Data dir

Node only: `readDataDir(root)` reads a data root (`data/`, or a fixture) into the `DataFile`s `loadData` takes: the blueprint files and the override files under `root` (everything under `overrides/`), each with its path relative to the root, `/`-separated, and its parsed JSON, in sorted path order.

## Design notes

- The browser gets the same data as one document instead (ADR 0004). This feature is kept apart from `engine/load` so the browser bundle never imports `node:fs`: nothing the browser bundle imports may import it.
- Its runtime imports carry the `.ts` extension (`./read-dir.ts`, `../data/index.ts`). `vite.config.ts` imports it through `vite/data-document`, and Vite's native config loader needs explicit extensions there. Keep them.

## Tests

None of its own: `engine/load`, `engine/prerequisites` and `engine/grants` read their data and fixtures through it.
