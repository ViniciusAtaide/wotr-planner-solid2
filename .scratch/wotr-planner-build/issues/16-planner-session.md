# Unify the Planner's session state (`session.ts`)

Status: todo
Blocked by: none
Plan: [plan](../plan.md)

## Goal

Collapse the planner's three fragmented state reducers (`PlannerState` in `planner-state.ts`, `WorkspaceState` + `Page` in `workspace-state.ts`, `TrailState` in `trail-state.ts`) and three stacked pass-throughs (`createPlanner` in `state.ts`, `TrailApi` in `steps.tsx`, `dialogTrail` in `CharacterField.tsx`) into one **deep module**, `src/planner/session.ts` (architecture review Candidate 2, grilled and designed on 2026-11-25/26 via the Design 1 + Design 3 hybrid).

Today single-Build state is stitched imperatively across `Planner.tsx`, `Trail.tsx`, and `CharacterField.tsx`, causing concrete defects and leakage:
- **Live Share link state leak:** `Planner.tsx:214` dispatches `linkOpened` on `hashchange` without resetting `TrailState`, leaking stale `skillsLeft`, `skillsCleared`, `mythicLater`, `unfolded`, `dialog`, `otherClass`, `characterOpen`, and `gearPlace` from the prior Build into the newly opened Build.
- **Imperative dialog proxy & `flush()`:** `CharacterField.tsx:41-66` wraps `TrailApi` in `dialogTrail` (`closeForPick() + flush() + reopenUnless(...)`) and `Trail.tsx:434` runs a secondary `closeDialog` effect solely because `build` and `dialog` live in separate signals.
- **Shadow mutable state & untested glue:** `state.ts` leaks `latest()`/`restore()` so `Planner.tsx` can keep a shadow `latest` variable for `reducePage`; Cascade confirmation (`Planner.tsx:284-295`) and edit post-processing (`Trail.tsx:210-219`) stitch all three reducers outside any pure reducer test.
- **Bloated `trail-state.ts` with view drifts:** `trail-state.ts` (632 lines, 66 exports) mixes a 70-line reducer with 510 lines of pure `TrailView` derivations where `chapterSummary` drops archetypes (calling `nameOf` instead of `levelClassName`) and `characterPicksLine` duplicates `raceLabel`/`backgroundLabel`.

## Module Split & Interface (Design 1 + Design 3 hybrid)

Retire `workspace-state.ts`, `state.ts`, `planner-state.ts`, `trail-state.ts`, and `TrailApi` in `steps.tsx`, replacing them with a strictly acyclic three-module split inside `src/planner/`:

1. **`src/planner/verdicts.ts`** — pure stateless Build-edit judgment & Cascade wording (`verdictOf`, `verdictOfAll`, `judgeAll`, `judgeClasses`, `brokenWords`, `clearsSummary`, `clearsList`, `clearedRows`, `laterPicks`, `laterChoices`, `shownPicks`, `clearedCount`, `placeWords`, `NonEmpty`, `Pending`, `EditOutcome`, `Judged`, `ArchetypeJudged`, `ClassJudged`, `Verdict`). Zero imports from `session.ts` or `trail-view.ts`.
2. **`src/planner/trail-view.ts`** — pure stateless `TrailView` derivations, selection resolution (`Selection`, `sameSelection`, `resolve`, `keepsSelection`), step ordering (`Step`, `Where`, `TrailProgress`, `nextStep`, `stepKey`, `whereOf`, `stepTitle`, `firstCleared`), and labels/formatting. Zero mutable state or reducer logic.
3. **`src/planner/session.ts`** — the unified pure session state machine (`sessionAt`, `reduceSession`) and single Solid 2 reactive adapter (`createPlannerSession` → `PlannerSession`), renaming the edit sub-union from `Session` to `EditState`.

```ts
import type { Build, GearPlace } from '~engine/build';
import type { Attribute } from '~engine/data';
import type { CheckedBuild, Edit } from '~engine/edits';
import type { Engine } from '~engine/mcp';
import type { LinkReason } from '~engine/refusals';
import type { Walk } from '~engine/walk';

import type { ClosedToggle } from './ChoiceList';
import type { Selection, Step, TrailView } from './trail-view';
import type { EditOutcome, NonEmpty, Pending } from './verdicts';

export { resolve, sameSelection, type Selection } from './trail-view';
export { placeWords, type EditOutcome, type NonEmpty, type Pending } from './verdicts';
export type { LinkReason };

export type LinkOn = 'load' | 'paste';

export interface ClearedRow {
  readonly name: string;
  readonly place: string;
}

export type LinkStatus =
  | { readonly kind: 'ok' }
  | { readonly kind: 'cleared'; readonly rows: readonly ClearedRow[]; readonly build: Build }
  | { readonly kind: 'didNotOpen'; readonly on: LinkOn; readonly reason: LinkReason };

export const LINK_OK: LinkStatus = { kind: 'ok' };
export const OPENED_A_LINK = 'Opened a link';

export type EditState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'confirming'; readonly pending: Pending }
  | { readonly kind: 'refused'; readonly lines: NonEmpty<string> };

export type Change = string | undefined;

export interface SessionState {
  readonly past: readonly CheckedBuild[];
  readonly present: CheckedBuild;
  readonly future: readonly CheckedBuild[];
  readonly editState: EditState;
  readonly change: Change;
  readonly pastChanges: readonly Change[];
  readonly futureChanges: readonly Change[];
  readonly selection: Selection | undefined;
  readonly link: LinkStatus;
  readonly skillsLeft: ReadonlySet<number>;
  readonly skillsCleared: ReadonlySet<number>;
  readonly mythicLater: number | undefined;
  readonly unfolded: ReadonlySet<number>;
  readonly characterOpen: boolean | undefined;
  readonly otherClass: boolean;
  readonly closedShown: ReadonlySet<string>;
  readonly dialog: string | undefined;
  readonly gearPlace?: GearPlace | undefined;
}

export type SessionAction =
  | { readonly kind: 'edit'; readonly edit: Edit; readonly title: string }
  | { readonly kind: 'edits'; readonly edits: NonEmpty<Edit>; readonly title: string }
  | { readonly kind: 'refuse'; readonly lines: NonEmpty<string> }
  | { readonly kind: 'confirm' }
  | { readonly kind: 'cancel' }
  | { readonly kind: 'dismiss' }
  | { readonly kind: 'undo' }
  | { readonly kind: 'redo' }
  | { readonly kind: 'escape' }
  | { readonly kind: 'select'; readonly selection: Selection | undefined }
  | { readonly kind: 'linkOpened'; readonly build: CheckedBuild; readonly cleared: readonly ClearedRow[] }
  | { readonly kind: 'linkFailed'; readonly on: LinkOn; readonly reason: LinkReason }
  | { readonly kind: 'dismissLink' }
  | { readonly kind: 'leaveSkills'; readonly level: number }
  | { readonly kind: 'mythicLater'; readonly level: number }
  | { readonly kind: 'toggleChapter'; readonly chapter: number }
  | { readonly kind: 'character'; readonly open: boolean }
  | { readonly kind: 'otherClass'; readonly open: boolean }
  | { readonly kind: 'toggleClosed'; readonly list: string }
  | { readonly kind: 'dialog'; readonly step: string | undefined }
  | { readonly kind: 'gearPlace'; readonly place: GearPlace };

export function sessionAt(build: CheckedBuild, link?: LinkStatus): SessionState;
export function reduceSession(engine: Engine, state: SessionState, action: SessionAction): SessionState;

export interface PlannerSession {
  readonly engine: Engine;
  readonly state: () => SessionState;
  readonly build: () => CheckedBuild;
  readonly walked: () => Walk;
  readonly view: () => TrailView;
  readonly score: (a: Attribute) => number;
  readonly selection: () => Selection | undefined;
  readonly next: () => Step;
  readonly step: () => Step;
  readonly editState: () => EditState;
  readonly pending: () => Pending | undefined;
  readonly notice: () => NonEmpty<string> | undefined;
  readonly change: () => Change;
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  readonly edit: (edit: Edit, title: string) => EditOutcome;
  readonly editAll: (edits: NonEmpty<Edit>, title: string) => EditOutcome;
  readonly refuse: (lines: NonEmpty<string>) => void;
  readonly select: (selection: Selection | undefined) => void;
  readonly closedToggle: (list: string) => ClosedToggle;
  readonly send: (action: SessionAction) => void;
}

export function createPlannerSession(
  engine: Engine,
  initial: Build,
  initialLink?: LinkStatus,
): PlannerSession;
```

*(If Ticket 15 [`15-picker-list.md`](15-picker-list.md) has already landed, import `ClosedToggle` from `./PickerList` instead of `./ChoiceList`.)*

### Invariants & Transition Rules

1. **No `latest()` or `restore()` escape hatches:** `createPlannerSession` keeps its synchronous `let current: SessionState` private inside the closure, updates `[state, setState]` on every `send`, and returns `EditOutcome` from `edit`/`editAll` directly from the new `current.editState`. Callers never see `latest()` or `restore()`.
2. **Atomic `linkOpened` reset:** Opening a Share link pushes `state.present` onto `past` with `OPENED_A_LINK` (unless `sameBuild`), sets `link` (`LINK_OK` if `cleared` is empty, else `{ kind: 'cleared', rows: cleared, build }`), clears `editState` to `idle`, clears `selection` to `undefined`, and resets ALL trail fields (`skillsLeft`, `skillsCleared`, `mythicLater`, `unfolded`, `characterOpen`, `otherClass`, `closedShown`, `dialog`, `gearPlace`) to clean initial state.
3. **Atomic `dialog` rule (universal, zero special cases):**
   - On any Build-changing commit (`edit`/`edits` that applies, `confirm`, `undo`, `redo`, `linkOpened`):
     - If the action is a single `{ kind: 'rename' }` edit, preserve `selection` and `dialog` untouched.
     - Otherwise, preserve `state.dialog` **only** when `nextSelection !== undefined && keepsSelection(nextSelection) && state.dialog === stepKey(nextSelection)` (so Gear's and `RankEditor`'s dialogs stay open while editing Gear or Mythic ranks, while every `CharacterField` dialog and non-held step dialog closes atomically in the exact same state update as `present`).
   - On refused edits or edits entering `confirming`, leave `state.dialog` untouched (the UI hides dialogs while `pending() !== undefined` and restores them automatically on `cancel`).
4. **All four cross-state rules inside `reduceSession`:**
   - **Level-adding reset:** whenever an applied `edit`/`edits` or `confirm` results in `nextBuild.levels.length > beforeBuild.levels.length`, clear `unfolded` to `new Set()` and set `otherClass: false`.
   - **Held `'scores'` step:** on a single applied `{ kind: 'scores' }` edit, if the resolved step *before* the edit was `{ kind: 'scores' }`, set `selection: { kind: 'scores' }` so the score steppers stay open until `"Done"`.
   - **`rename` preserves step:** a single `{ kind: 'rename' }` edit leaves `selection` and `dialog` unchanged.
   - **Cascade `confirm`:** commits `pending.build` with `pending.title`, adds `pending.clearedSkills` to `skillsCleared` and removes them from `skillsLeft`, clears `dialog`, runs level-adding reset if `levels.length` grew, and sets `selection` to `{ kind: 'slot', slot }` from `firstCleared(before, afterView)` (or `undefined`).
5. **Atomic `leaveSkills` and `escape`:**
   - `{ kind: 'leaveSkills', level }` adds `level` to `skillsLeft` and clears `selection` if `selection` is `{ kind: 'skills', level }` (replacing two calls in `SkillsStep`).
   - `{ kind: 'escape' }` cancels when `editState.kind === 'confirming'`, otherwise clears `selection` to `undefined` (letting `Planner.tsx`'s `onKey` dispatch `escape`, `undo`, and `redo` without reading `latest()`).
6. **Undo / Redo history scope:**
   - `past`/`future` store `CheckedBuild` and change title only (no trail snapshots).
   - While `confirming`: `undo` cancels (`editState = idle`, preserving `dialog`), `redo` is a no-op, and `edit`/`edits`/`refuse` are ignored.
   - On `undo`/`redo` commit: clears a `'cleared'` link banner when `link.build` appears in `future`, clears `dialog`, and leaves `selection` to `resolve` (or clears stale selection).
7. **Derived memos owned once on `PlannerSession`:**
   - `walked`, `scored` (`score(a)`), `view`, `selection` (already passed through `resolve`), `next` (deduplicated by `stepKey`), and `step` (`selection() ?? next()`, deduplicated by `stepKey`) live on `PlannerSession` instead of being rebuilt across `state.ts`, `Planner.tsx`, and `Trail.tsx`.
   - `closedToggle(list)` reads `state().closedShown.has(list)` inside a getter (zero top-level reactive reads, Solid 2.0 safe).

## Scope

1. **Extract `src/planner/verdicts.ts` from `planner-state.ts`.**
   - Move stateless edit judgment and Cascade wording (`verdictOf`, `verdictOfAll`, `judgeAll`, `judgeClasses`, `brokenWords`, `clearsSummary`, `clearsList`, `clearedRows`, `laterPicks`, `laterChoices`, `shownPicks`, `clearedCount`, `placeWords`, and their types).
   - Update imports in `flat-choices.ts`, `steps.tsx`, `Planner.tsx`, `PickStep.tsx`, and `flat-choices.test.tsx`.
2. **Create stateless `src/planner/trail-view.ts` (replacing `trail-state.ts`).**
   - Move all pure `TrailView` derivations, `Selection`, `sameSelection`, `resolve`, `keepsSelection`, `Step`, `Where`, `nextStep`, `stepKey`, `whereOf`, `stepTitle`, `firstCleared`, and formatting helpers into `trail-view.ts`, removing `TrailState`, `TrailAction`, `TRAIL_START`, and `reduceTrail`.
   - Fix the two view drifts:
     - `chapterSummary`: call `levelClassName(t.data, t.build, l)` instead of `nameOf(t.data, t.build.levels[l - 1]?.class ?? '')` so folded chapters show held archetypes.
     - `characterPicksLine`: share pure race-pair and background-pair formatting helpers with `flat-choices.ts` (`raceLabel`/`backgroundLabel`) instead of duplicating the logic.
   - Update imports in `sheet.ts`, `list-mode.ts`, `CharacterCard.tsx`, `CharacterSteps.tsx`, `PickStep.tsx`, `steps.tsx`, and `Trail.tsx`.
3. **Create `src/planner/session.ts` and delete `workspace-state.ts`, `state.ts`, `planner-state.ts`, and `trail-state.ts`.**
   - Implement `sessionAt`, `reduceSession`, and `createPlannerSession` satisfying every invariant above.
   - Delete `src/planner/workspace-state.ts`, `src/planner/state.ts`, `src/planner/planner-state.ts`, and `src/planner/trail-state.ts`.
4. **Simplify `Planner.tsx`, `Trail.tsx`, `CharacterField.tsx`, and all step adapters.**
   - `Planner.tsx`: replace `createPlanner`, `trail` signal, `workspace` signal, shadow `latest`, `reducePage`, `send`, `sendTrail`, `resolved`, and imperative `confirm()` with one `const session = createPlannerSession(engine, props.initialBuild, props.initialLink)`. In `onKey`, dispatch `escape` / `undo` / `redo` directly via `session.send(...)` and read `build === brokenOver` from the `createEffect` compute return value.
   - `Trail.tsx`: replace `TrailProps`'s 5 state props (`planner`, `state`, `send`, `selection`, `select`) with `readonly session: PlannerSession`; delete `applied()` and `api: TrailApi`; delete the `closeDialog` line from the `arrival` effect (keeping DOM scroll/focus `arriving` choreography).
   - `CharacterField.tsx`: delete `dialogTrail`, `closeForPick`, `reopenUnless`, and `flush()` completely (keeping only DOM focus-return guard `returning`). Pass `props.session` directly into `props.list`.
   - `steps.tsx`: delete `TrailApi` and `closedToggle`; update `SlotStep`, `IncreaseStep`, `SkillsStep`, `NextLevelStep`, `ClassList`, `MythicStep`, `LevelEditor`, `RankEditor`, `CharacterCard`, `CharacterSteps`, `PickStep`, and `GearStep` to accept `readonly session: PlannerSession`. In `SkillsStep`, replace the two-call `leaveSkills` + `select(undefined)` click handler with one `props.session.send({ kind: 'leaveSkills', level: props.level })`.
5. **Consolidate tests (`replace, don't layer`) and update documentation.**
   - Delete `src/planner/planner-state.test.tsx` and `src/planner/workspace-state.test.tsx`; replace with `src/planner/session.test.tsx` covering:
     - full state-machine transitions (`idle` / `confirming` / `refused`, undo/redo, Cascade confirm + `clearedSkills` + `firstCleared`, level-adding fold reset, held `'scores'` step, `rename` preserving step/dialog, `leaveSkills`, `escape`);
     - `linkOpened` resetting all trail fields (regression test for the live state-leak bug) and clearing `'cleared'` banner on undo;
     - atomic `dialog` closing on applied field/step edits while staying open on Gear / `RankEditor` edits, `rename`, refused edits, and `confirming`;
     - expanded 4-seed 60-step randomized property test firing edits, confirms, cancels, undo/redo, selections, trail actions, dialog opens/closes, and `linkOpened`, asserting Build-code round-trip, `resolve` validity, and zero stale trail state after `linkOpened`.
   - Rename `src/planner/trail-state.test.tsx` → `src/planner/trail-view.test.tsx` (removing `reduceTrail` tests moved to `session.test.tsx`, adding a regression test for archetype names in `chapterSummary`).
   - Update `src/planner/planner.test.tsx`: delete the `apiOf(...)` helper and pass `createPlannerSession(e, build)` directly to step components; add a regression test proving that picking in a Modal-first `CharacterField` dialog tears down the dialog without recomputing its list (`racePicker` / `picker`) for the new Build.
   - Update `src/planner/README.md` to document `session.ts`, `verdicts.ts`, and `trail-view.ts` and remove references to `workspace-state.ts`, `state.ts`, `planner-state.ts`, `trail-state.ts`, `TrailApi`, and `dialogTrail`.

## Done when

- `workspace-state.ts`, `state.ts`, `planner-state.ts`, `trail-state.ts`, `TrailApi`, `dialogTrail`, `closeForPick`/`flush()`, `Trail.tsx`'s `applied()` and `closeDialog` effect, and `Planner.tsx`'s `latest`/`restore`/`confirm()` glue are all deleted.
- `session.test.tsx` (including the expanded 4-seed randomized property test), `trail-view.test.tsx`, `flat-choices.test.tsx`, and `planner.test.tsx` (including the closing field-dialog non-recompute test) all pass.
- Checked in the browser at 375 px and 1280 px:
  - Pasting a Share link into `#b=` resets folded chapters, open dialogs, skipped skills, and Mythic deferrals from the previous Build;
  - Modal-first picks in `CharacterField` (Race, Deity, Background) close smoothly without lag or flicker, while refused/Cascade picks keep the dialog intact after Cancel;
  - Wearing/removing Gear inside Gear's `ChoiceDialog` keeps the dialog open;
  - Renaming a Build in the top bar keeps the open step;
  - Folded 4-level chapters show held archetype names.
- `src/planner/README.md` is updated.
- `bun run check` passes; then set `Status: done` and add an `## Outcome`.
