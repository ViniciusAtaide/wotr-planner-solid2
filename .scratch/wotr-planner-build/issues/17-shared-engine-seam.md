# Move the shared Engine & Build-query seam below `engine/mcp` and `src/planner`

Status: todo
Blocked by: none
Plan: [plan](../plan.md)

## Goal

Eliminate the inverted `src/planner → engine/mcp` DAG dependency and consolidate duplicated multi-edit rules, Parametrized feat naming, and Build-progress queries into their owning engine features (`engine/grants`, `engine/walk`, `engine/edits`, `engine/refusals`), making `engine/mcp` a clean stateless protocol adapter (architecture review Candidate 3, grilled and designed on 2026-11-26 via the Design 1 + Design 3 hybrid).

Today two real adapters (`src/planner` and `engine/mcp`) sit over the rules engine, yet their shared seam is inverted and incomplete, producing runtime-verified bugs and repeated drift:
- **Inverted DAG edge:** 12 production files and 5 test files in `src/planner/` import `~engine/mcp` solely for `Engine`, `engineOf`, and `expectedLevel` (plus 2 test call sites).
- **Live `set_start` race-switch bug:** `engine/mcp/tools.ts:223-230` (`plainEdits`) and `addLevelOrRank` (`line 367`) apply multi-edit batches via `edits.reduce(apply, build)`, skipping `applyWith`. Switching Human (`raceStat: "Strength"`) → Elf via MCP `set_start` is **refused** at L1+ and **silently retains stale `raceStat`** on Elf at L0 (breaking the subsequent `level_up`).
- **Live Parametrized feat double-parens bug:** `engine/mcp/tools.ts:497-508` (`optionName`) bypasses `engine/refusals`'s `paramWords`, emitting double parentheses on **103** Parametrized feats in `data/` (e.g., `Expanded Arsenal (Magic School) (Evocation)` instead of `Expanded Arsenal (Evocation)`). Meanwhile `src/planner/words.ts` duplicates `bareNameOf` and `listedName` (and carries dead `ordinal`).
- **Non-stateless global side-channel in MCP:** `clearedByCode` (`tools.ts:93-110`, 64-entry global `Map`) smuggles `clearedOnOpen` to `registry.ts:239-243`.
- **Redundant walks & linear scans:** `options()` calls `picker()` and immediately calls `pauseAt()` a second time (ignoring `p.unit`); `synergies()` re-calls `options()` page by page via `allOpen`; `expectedLevel()` rescans `data.blueprints` on every call; `search()` rebuilds `equippableItems` on every call.

Candidate 5 (memoizing `grantIndexOf`, `picker`, and `gearClashIndex` in their owners) stays separate; `Engine = { data, G }` moves to `engine/grants` here.

## Interface Additions (Design 1 + Design 3 hybrid)

Every addition lands in its owning existing P/G/W/S/R/E feature with **zero new engine features** and **zero new inter-engine DAG edges** in `tools/repo-checks/features.ts`.

### 1. `engine/grants`
```ts
export interface Engine {
  readonly data: CheckedData;
  readonly G: GrantIndex;
}

export function engineOf(data: CheckedData): Engine;
```
- `engine/mcp` re-exports `Engine` and `engineOf` from `../grants` so `src/mcp-server` needs no DAG change; `src/planner` imports them from `~engine/grants`.

### 2. `engine/walk`
```ts
export interface RankDue {
  readonly rank: number;
  readonly expectedLevel: number;
}

export interface SkillBudget {
  readonly spent: number;
  readonly available: number;
  readonly left: number;
}

export function expectedLevel(data: CheckedData, rank: number): number;
export function mythicRankDue(data: CheckedData, build: Build, ranksEnded: boolean): RankDue | undefined;
export function skillsSpent(build: Build, level: number): number;
export function skillBudget(build: Build, walk: Walk, level: number): SkillBudget;
```
- `expectedLevel` caches `BlueprintMythicsSettings.CharcaterLevelRestrictions` in a `WeakMap<CheckedData, readonly number[]>` (no linear blueprint scan per call).
- Move the `expectedLevel` citation from `engine/mcp/cites.ts` to `engine/walk/cites.ts` (verified by `tools/decompiled/cites.test.ts`).

### 3. `engine/edits`
```ts
export function applyAllWith(data: CheckedData, build: Build, edits: readonly Edit[]): Build;
export function allowsAll(
  data: CheckedData,
  build: Build,
  edits: readonly Edit[],
  G?: GrantIndex,
): Verdict;
export function cascadeAll(
  data: CheckedData,
  build: Build,
  edits: readonly Edit[],
  G?: GrantIndex,
): Cascade;
```
- **Atomicity invariant:** `applyAllWith` folds `applyWith(data, acc, edit)` across `edits` in order. `allowsAll` and `cascadeAll` apply the full batch atomically before checking `breaksOf(data, build, after, G)` (so mutually-dependent edits like race + scores or class + archetype validate in one walk).
- **Self-clearing protection in `cascadeAll`:** protect every edited pick slot (`edit.kind === 'pick' && edit.pick !== undefined`), every edited skill level (`edit.kind === 'skills'`), and every edited rank (`rankClass` / `rankLevel` / `addRank`) in `edits` from being cleared by the cascade loop, matching single-edit `cascade`.
- **Rename fast-path:** if every edit in `edits` is `{ kind: 'rename' }`, skip `breaksOf` and return `ok: true` immediately.
- Single-edit `allows` and `cascade` become 1-line delegates to `allowsAll(data, build, [edit], G)` and `cascadeAll(data, build, [edit], G)`.

### 4. `engine/refusals`
```ts
export interface ListName {
  readonly name: string;
  readonly qualifier?: string;
}

export function listedName(listed: ListName): string;
export function shownName(data: CheckedData, feature: Guid, param?: GrantParam, listed?: ListName): string;
export function optionName(data: CheckedData, feature: Guid, param?: GrantParam): string;
export function slotLabel(data: CheckedData, build: Build, slot: SlotId): string;
```
- `ListName` moves from `engine/pickers/option-names.ts` to `engine/refusals/pick-words.ts` (with `engine/pickers/option-names.ts` re-exporting `type ListName` so existing picker callers stay unaffected and the DAG stays acyclic).
- `shownName` and `optionName` both delegate to `paramWords`, fixing the 103 double-paren Parametrized feats in MCP.
- `slotLabel` returns `${slotWords(data, build, parent.slot)}: ${pickName(data, parent)}` for a Sub-choice whose parent pick is held, else `slotWords(data, build, slot)`.

### 5. `engine/mcp` (internal cleanup, stateless adapter)
- Delete `clearedByCode`, `clearedOnOpen()`, and `registry.ts`'s `withCleared`.
- Introduce internal `withOpened` in `engine/mcp/tools.ts`: calls `open(e, code)` returning `{ build: CheckedBuild; cleared?: readonly string[] } | ToolRefusal`, runs the tool callback on `opened.build`, and attaches `clearedOnOpen: opened.cleared` directly onto non-refusal, non-array object results (preserving `synergies`'s array return shape cleanly when `Array.isArray(result)`).
- Extract internal `listOptions(e, build, slot, text?)` reading `p.unit` directly from `picker(...)` (deleting the duplicate `pauseAt` call in `options()`), and have `synergies()` call `listOptions` directly per open slot (deleting `allOpen`).
- Cache `equippableGuids(data)` via `WeakMap<CheckedData, ReadonlySet<Guid>>` for `search()`.
- Replace `plainEdits` with `allowsAll`; replace `edits.reduce(apply, build)` in `addLevelOrRank` with `applyAllWith`; replace MCP's `optionName` and `slotLabel` with `shownName` and `slotLabel` from `../refusals`.

## Scope

1. **Move `Engine` and `engineOf` to `engine/grants`.**
   - Export `Engine` and `engineOf` from `engine/grants` (`index.ts`), and re-export them from `engine/mcp/tools.ts` for `src/mcp-server`.
2. **Add `expectedLevel`, `mythicRankDue`, `skillsSpent`, and `skillBudget` to `engine/walk`.**
   - Implement cached `expectedLevel` (with its cite moved from `engine/mcp/cites.ts` to `engine/walk/cites.ts`), `mythicRankDue`, `skillsSpent`, and `skillBudget`.
   - Export from `engine/walk/index.ts`.
3. **Add `applyAllWith`, `allowsAll`, and `cascadeAll` to `engine/edits`.**
   - Implement atomic batch `applyAllWith`, `allowsAll`, and `cascadeAll`, delegating `allows` and `cascade` to them.
   - Add unit tests in `engine/edits/` covering batch `applyWith` (Human with `raceStat` → Elf at L0 and L1+), mutually-dependent edits, and `cascadeAll` self-clear protection.
4. **Move `ListName`, `listedName`, `shownName`, `optionName`, and `slotLabel` to `engine/refusals`.**
   - Add them to `engine/refusals/pick-words.ts`; re-export `type ListName` in `engine/pickers/option-names.ts`.
   - Delete `src/planner/words.ts` (retiring unused `ordinal` and duplicate `bareNameOf`/`listedName`/`shownName`/`optionName`) and update all `src/planner/` imports to `~engine/refusals`.
5. **Refactor `engine/mcp/tools.ts`, `engine/mcp/registry.ts`, and `engine/mcp/cites.ts`.**
   - Switch to `allowsAll`, `applyAllWith`, `expectedLevel`, `mythicRankDue`, `skillBudget`, `shownName`, `slotLabel`.
   - Replace `clearedByCode` + `registry.ts`'s `withCleared` with internal `withOpened`.
   - Extract internal `listOptions` using `p.unit`; delete `allOpen` and the duplicate `pauseAt` call; cache `equippableGuids(data)` in `search()`.
   - Remove `expectedLevel` from `engine/mcp/cites.ts` (keeping `level_up`).
   - Add regression tests in `engine/mcp/tools.test.ts`:
     - `set_start` switching Human (`raceStat: "Strength"`) → Elf at L0 (strips `raceStat`, subsequent `level_up` succeeds) and at L1+ (succeeds without refusal);
     - `options` on a Parametrized feat whose blueprint name ends in `(...)` (e.g. `Expanded Arsenal (Magic School)` → `Expanded Arsenal (Evocation)`, no double parentheses);
     - stateless `clearedOnOpen` returned directly from `tools` as well as `TOOLS` (and two concurrent/interleaved codes never cross-contaminate);
     - `next_slots` vs `openSlotsAt` parity check (moved from `src/planner/trail-state.test.tsx`).
6. **Clean up `src/planner/` and remove `'engine/mcp'` from `tools/repo-checks/features.ts`.**
   - Update all `src/planner/` files (production and tests) to import `Engine`/`engineOf` from `~engine/grants`, `expectedLevel`/`mythicRankDue`/`skillsSpent`/`skillBudget` from `~engine/walk`, `allowsAll`/`cascadeAll` from `~engine/edits` (simplifying `verdictOfAll` in `planner-state.ts`, or `verdicts.ts` if Ticket 16 has landed), and naming helpers from `~engine/refusals`.
   - Replace `fighterThroughMcp()` in `src/planner/planner.test.tsx` with a helper built directly on `engine/edits`, `engine/pickers`, and `engine/codec`.
   - Remove the `next_slots` parity test from `src/planner/trail-state.test.tsx` (or `trail-view.test.tsx` if Ticket 16 has landed), now covered in `engine/mcp/tools.test.ts`.
   - Delete `'engine/mcp'` from `src/planner`'s `deps` in `tools/repo-checks/features.ts`.
7. **Update feature READMEs.**
   - Update `engine/grants/README.md`, `engine/walk/README.md`, `engine/edits/README.md`, `engine/refusals/README.md`, `engine/mcp/README.md`, and `src/planner/README.md`.

## Done when

- `'engine/mcp'` is removed from `src/planner`'s `deps` in `tools/repo-checks/features.ts` and `bun run check:repo` passes with zero `~engine/mcp` imports anywhere in `src/planner/`.
- `src/planner/words.ts`, `clearedByCode`, `clearedOnOpen()`, `registry.ts`'s `withCleared`, `plainEdits`, `allOpen`, and the duplicate `pauseAt` call in `options()` are all deleted.
- New regression tests pass for:
  - Human (`raceStat: "Strength"`) → Elf via MCP `set_start` at both L0 and L1+;
  - Parametrized feat naming without double parentheses across MCP `options`;
  - Stateless `clearedOnOpen`;
  - `engine/edits` `allowsAll` / `cascadeAll`;
  - `next_slots` vs `openSlotsAt` parity in `engine/mcp/tools.test.ts`;
  - `tools/decompiled/cites.test.ts` (moved `expectedLevel` cite in `engine/walk/cites.ts`).
- All affected feature READMEs are updated.
- `bun run check` passes; then set `Status: done` and add an `## Outcome`.
