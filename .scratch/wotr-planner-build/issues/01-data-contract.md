# Data contract: setup, allowlist, loader and P

Status: done
Blocked by: none
Plan: [plan](../plan.md)

## Goal

A committed repo whose engine boundary is enforced, plus the data contract every later module reads through: what is kept of each blueprint, how the committed data loads and is checked, and how a prerequisite list is read.

## Scope

- **First commit,** on `main`, once the user approves it. It holds everything in the working tree except `blueprints/`, `decompiled/`, `.env` and `CLAUDE.local.md`.
- **Engine boundary** ([ticket 16's amendment](../../wotr-planner/issues/16-engine-layout-and-imported-data.md)):
  - `engine/` at the repo root, reached through a `~engine/*` alias in `tsconfig.json` and `vite.config.ts`;
  - a `no-restricted-imports` rule, scoped to `engine/`, that refuses `solid-js`, `@solidjs/*` and `src/`;
  - a vitest project for `engine/` that runs in Node.
- **`show`:** `scripts/dump/show.mjs` prints each `!bp_` reference as `<name> <guid>`.
- **The first allowlist entries** in `tools/importer/allowlist.ts`, for one class, its progression, one selection and `PrerequisiteFeature`. Each entry has its `$type`, the fields it keeps, a hand-written TypeScript type, and a citation: the decompiled file and method that read those fields (guide §3 point 1, [ADR 0005](../../../docs/adr/0005-game-shaped-data-from-a-cited-allowlist.md)).
- **The data layout** (guide §3):
  - one file per blueprint, at `data/<kind>/<asset name>.<guid>.json`;
  - references kept as `!bp_<guid>`;
  - a `name` field ([ADR 0006](../../../docs/adr/0006-display-names-yes-descriptions-never.md));
  - `data/overrides/` with one cited file per correction;
  - deterministic formatting.
- **The loader and its load checks** in `engine/`:
  - every GUID resolves;
  - every override has its reason;
  - every prerequisite component is of a type P reads.
- **P, the prerequisite view** (guide §4): a read-only view over each blueprint's flat prerequisite list. It gives each leaf its group (`All`/`Any`/`ForcedTrue`), whether it requires or forbids something, and what it names: a fact, class, stat or level.
- **`npm run check`:** one command that runs the checks and tests in a fixed order and stops at the first failure. Every later ticket adds to it.

Dropped from the earlier plan:
- `game-sources.pins`: the guide says nothing pins the sources.
- `refs` and `granted-by`: ticket 02 adds them when it first needs them.

## Done when

- The first commit exists, and `git status` is clean apart from ignored files.
- A file in `engine/` that imports `solid-js` or `src/` fails lint.
- `node scripts/dump/show.mjs <guid>` prints references as `<name> <guid>`.
- A hand-written fixture loads, and every load check has a fixture of its own that fails it.
- P gives every fixture leaf its group, polarity and named fact. The fixtures include a forbidding leaf (`PrerequisiteNoFeature`) and an `Any` group.
- `npm run check` passes.

## Outcome

2026-11-19.

- **First commit:** `9ace1ef`, made on `main` with the user's go-ahead.
- **Engine boundary:**
  - `engine/` at the root, with the `~engine/*` alias in `tsconfig.json` and `vite.config.ts`.
  - An `oxlint.config.ts` override for `engine/**` that refuses `solid-js`, `@solidjs/*` and `src/`. It was checked with a throwaway file: three errors, then the file was removed.
  - A vitest `engine` project (node, no jsdom setup) that covers `engine/` and `tools/`.
  - `npm run lint` now also covers `engine/`, `tools/` and `scripts/`.
- **`show`:** a second pass names every reference. `node scripts/dump/show.mjs FighterClass` prints `"m_Progression": "FighterProgression b50e…"`, and it takes about 1.7 s.
- **Allowlist:** `tools/importer/allowlist.ts` has six entries: four blueprint types (class, progression, selection, plain feature) and two component types (`PrerequisiteFeature`, `PrerequisiteNoFeature`), each with citations. Each entry is typed against `engine/data/types.ts`. Leaving a field out, or listing one the type lacks, fails `tsc`; both cases were checked by hand. `kindOf` in `types.ts` is the single map from `$type` to folder.
  - The class's BAB and save tables, `m_Spellbook` and `m_Archetypes` wait for ticket 02's classes and archetypes areas, which also bring the blueprint types they reference.
  - `IsFeatureSelectionWhiteList` (on `Prerequisite`) waits for the selection-waiver work. The dump's `PrerequisiteFeature` didn't show the field, so ticket 02's field-presence check should look into it.
- **Data layout:**
  - Files are `data/<kind>/<asset name>.<guid>.json`. `$type` is the class name only, and the identity fields are `guid`, `assetName` and `name`.
  - Overrides are `{ target, change: add|remove|patch, reason }`. The importer applies them and the loader checks them.
  - `tools/importer/serialise.ts` writes the deterministic form: sorted keys, two-space indent, trailing newline.
- **Loader:** `engine/data/load.ts` (pure) and `engine/data/read-dir.ts` (node only). Ten checks, each with a fixture that fails it, reported together in one `LoadError`:
  - file at its `<kind>/<asset>.<guid>` path;
  - `$type` one the engine reads;
  - well-formed blueprint;
  - unique GUID;
  - every reference resolves;
  - every prerequisite type is one P reads;
  - an override has its reason, a target GUID and a known change;
  - an override's add or patch target is held, and its remove target is gone.
- **P:** `engine/prerequisites.ts`. It turns each prerequisite into a leaf with its group, whether it requires or forbids, and what it names. It reads two types so far; each added type is a new reader entry.
- **Fixture:** `engine/data/fixtures/small/`: a class, its progression, a selection, five features (one nameless, one with an `Any` group and a forbids leaf) and one override.
- **`npm run check`:** lint, then `tsc`, then the engine tests (22), then the template's tests (11), stopping at the first failure.
- **Also added:** `.editorconfig`, because WebStorm's default style (4 spaces, no spaces in braces) had reformatted the template's files. It pins the template's style: 2 spaces, single quotes, spaces in braces.
