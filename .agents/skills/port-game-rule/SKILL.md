---
name: port-game-rule
description: >-
  Port a Pathfinder: Wrath of the Righteous rule from decompiled C# and game
  blueprints into the TypeScript engine or importer, with valid citations and
  copyright-safe documentation. Use when implementing or fixing engine rules,
  importer allowlist entries, or game-data overrides.
---

# Port a game rule into WotR Planner

Every engine rule is a faithful port of a single decompiled C# method operating on game-shaped data.

## Read first

1. [docs/decompiled-guide.md](../../docs/decompiled-guide.md) — overall game model, level-up bands, data shape, and module responsibilities.
2. [engine/cite/README.md](../../engine/cite/README.md) — citation string format and `cites.ts` registry conventions.
3. [tools/decompiled/README.md](../../tools/decompiled/README.md) — how `cites.test.ts` verifies citations against `decompiled/`.
4. [CODING_STANDARDS.md](../../CODING_STANDARDS.md) and [docs/adr/0005-game-shaped-data-from-a-cited-allowlist.md](../../docs/adr/0005-game-shaped-data-from-a-cited-allowlist.md) / [docs/adr/0006-display-names-yes-descriptions-never.md](../../docs/adr/0006-display-names-yes-descriptions-never.md).
5. The target feature's `README.md` and `tools/repo-checks/features.ts` (to stay within the feature import DAG).

## Workflow

1. **Inspect the game sources (local, git-ignored):**
   - Inspect blueprints from `blueprints/blueprints_raw_2.7.0x_0.binz` with:
     ```bash
     bun run show -- <guid|name>
     ```
   - Read the exact C# method(s) under `decompiled/Assembly-CSharp/Kingmaker/`.
   - Confirm whether every field read by the C# method is already imported in `tools/importer/allowlist.ts`.
2. **Keep the game's shape and names (ADR 0005):**
   - If a new component or field is needed, add it to `tools/importer/allowlist.ts` with its C# citation, keep the dump's exact field names (`m_AllFeatures`, `LevelEntries`, etc.), and re-run `bun run import`.
   - If the game's own data has a verified bug, add an override in `data/overrides/` with its reason — never hand-edit imported JSON or add a special case in engine code.
3. **Implement and cite the rule:**
   - Implement the rule inside the single responsible engine module (`P`, `G`, `W`, `S`, `R`, `E`, `C`).
   - Add its citation to the feature's `cites.ts` (in declaration order, re-exported from `index.ts`):
     ```ts
     ruleName: ['Path/File.cs Method (FieldA, FieldB)']
     ```
     Each cited field must be read directly by the cited method's body (fields read in a helper are cited on that helper).
   - Document the rule in your own words in the feature's `README.md` — **zero comments in code** and **no copied C#, descriptions, or raw dump JSON** (ADR 0006).
4. **Write game-grounded tests:**
   - Assert game facts cited by blueprint name + GUID or C# method, including polarity tests (positive and negated cases).
   - Put tests that load `data/` or walk full Builds inside `describe(..., { timeout: 30_000 }, ...)` (higher if a test exceeds ~0.5 s).
5. **Verify:**
   ```bash
   bun run check
   ```
   When `decompiled/` and `OPENROUTER_API_KEY` are available and the feature is registered in `tools/port-review/main.ts`, optionally run:
   ```bash
   bun run review:ports -- <feature>
   ```
