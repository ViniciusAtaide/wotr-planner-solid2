# Unify the Planner's Picker lists (`PickerList`)

Status: todo
Blocked by: none
Plan: [plan](../plan.md)

## Goal

Deepen the planner's three Picker list modules (`ChoiceList.tsx`, `PickStep.tsx`, `GearStep.tsx`) and `list-panel.ts` into one **deep module**, `src/planner/PickerList.tsx` (architecture review Candidate 1, grilled and designed on 2026-11-25 via the Design 1 + Design 3 hybrid).

Today filter memory, inline collapse, `FieldMode`, keyboard mark/navigation, `WindowedRows`, closed-row reveal, and `OptionDetails` syncing are wired independently in three places (`ChoiceList.tsx` alone exports 23 symbols). That split has driven lockstep edits between `ChoiceList.tsx` and `PickStep.tsx` and live UX drift in both directions:
- `ChoiceList.tsx` hardcodes `summary: undefined`, dropping `engine/describe`'s hand-written Summaries for every race, background, class, archetype, and Mythic path inside `ChoiceDialog`.
- `GearStep.tsx` caps lists at `ITEMS_SHOWN = 60` without `WindowedRows`, omits keyboard mark/navigation (`onMove`, `moveThroughOptions`), and omits `hub.point` (leaving `ChoiceDialog`'s detail pane blank until hovered).
- `NextLevelStep`'s `"Another class…"` dialog mounts under `Here`'s `CollapsedLists = true` scope, and `< 13`-row lists (`MythicStep`, `RankEditor`) blank `ChoiceDialog`'s detail pane on arrow-key focus changes.

Candidate 6 (unifying class and Mythic path row builders in `flat-choices.ts`) stays separate; this ticket attaches blueprint Summaries at the existing flat-choice call sites.

## Interface (Design 1 + Design 3 hybrid)

`src/planner/PickerList.tsx` replaces `src/planner/ChoiceList.tsx` and absorbs `src/planner/list-panel.ts`. Its entire public surface is **2 runtime entry points + 7 TypeScript types (9 exports total)**; all internal list, panel, filter, matching, ranking, and keyboard helpers remain unexported.

```ts
import type { JSX } from '@solidjs/web';

import type { FeatCategory } from '../design';
import type { OptionSummary } from './option-detail';

export interface FieldMode {
  readonly label: string;
  readonly value: string | undefined;
  readonly placeholder: string;
  readonly target: boolean;
  readonly arrive: boolean;
  readonly onArrived?: (() => void) | undefined;
}

export interface ClosedToggle {
  readonly shown: boolean;
  readonly toggle: () => void;
}

export interface PickerDetail {
  readonly name?: string | undefined;
  readonly summary?: OptionSummary | undefined;
  readonly links?: readonly string[];
  readonly warnings?: readonly string[];
  readonly refusal?: readonly string[];
  readonly gear?: string | undefined;
}

export interface PickerChildRow {
  readonly key: string;
  readonly name: string;
  readonly take?: () => void;
  readonly open?: boolean;
  readonly current?: boolean;
  readonly reasons?: readonly string[];
  readonly note?: string | undefined;
  readonly icon?: FeatCategory | undefined;
  readonly summary?: string | undefined;
  readonly linked?: boolean;
  readonly clash?: boolean;
  readonly held?: string | undefined;
  readonly gear?: string | undefined;
  readonly detail?: () => PickerDetail;
}

export interface PickerRow extends Omit<PickerChildRow, 'detail'> {
  readonly group?: string | undefined;
  readonly children?: readonly PickerChildRow[] | (() => readonly PickerChildRow[]);
  readonly detail?: (keptChildren?: readonly PickerChildRow[]) => PickerDetail;
}

export interface PickerScopeProps {
  readonly arrived?: boolean | undefined;
  readonly collapsed?: boolean | undefined;
  readonly shareFilter?: boolean | undefined;
  readonly children: JSX.Element;
}

export interface PickerListProps {
  readonly label: string;
  readonly rows: readonly PickerRow[];
  readonly closed?: ClosedToggle | undefined;
  readonly field?: FieldMode | undefined;
  readonly filter?: 'auto' | 'always';
  readonly twoLine?: boolean;
  readonly counts?: boolean;
  readonly resetKey?: string | undefined;
  readonly currentLabel?: string | undefined;
  readonly notice?: string | undefined;
  readonly footer?: JSX.Element;
}

export function PickerScope(props: PickerScopeProps): JSX.Element;
export function PickerList(props: PickerListProps): JSX.Element;
```

### Invariants

1. **Composable `PickerScope` (Solid 2.0 compliant):**
   - Replaces `CollapsedLists`, `StepFilter`, `createFilterMemory`, and `StepArrived` with one private composable context.
   - All three props are plain values (not accessors), read only inside thunks (`arrived: () => props.arrived ?? parent.arrived()`, etc.) with zero top-level prop reads. Root defaults: `arrived: true`, `collapsed: false`, no shared filter.
   - `shareFilter` allocates one shared filter signal for inline ↔ `ChoiceDialog` persistence; `collapsed={false}` overrides an enclosing collapsed scope without disturbing `arrived` or `shareFilter`.
2. **Row defaults, 1-level static nesting, and keys:**
   - `open` defaults to `true`; `current` defaults to `false`; `reasons` defaults to `[]`.
   - `children` omitted ⇒ leaf row (`panel.hide()` then `take?.()`).
   - `children` as `readonly PickerChildRow[]` ⇒ eager expandable parent (**Parametrized feat**). Effective `open` is `kept.some(c => c.open !== false)`; effective `current` is `row.current === true || kept.some(c => c.current === true)`; effective `linked` (read at render time only) is `row.linked === true || kept.some(c => c.linked === true)`; effective closed `reasons` (read at render/detail time only, when omitted on parent) are the first 3 deduplicated `reasons` across `kept`.
   - `children` as `() => readonly PickerChildRow[]` ⇒ lazy expandable parent (**Sub-choice**). `children()` is never called while collapsed; when expanded, it evaluates inside a memo for the single expanded parent.
   - Sibling keys must be unique; child `data-detail-key` is `${parent.key}/${child.key}`. `findDetail(key)` matches top-level `listed()` keys first, then `${expandedKey}/${child.key}` in `expandedChildren()` (no `/` splitting).
3. **Strict `FieldMode` & O(visible) read-laziness:**
   - While `props.field !== undefined && !panel.shown()` (`idle()`), `PickerList` never reads `props.rows`, `props.footer`, or `props.currentLabel`. Closing a `FieldMode` panel clears filter text, mark, and expanded parent.
   - `PickerList` never spreads or clones `PickerRow` / `PickerChildRow` instances and reads display/Refusal fields (`icon`, `summary`, `note` when `twoLine` is explicit, `linked`, `clash`, `held`, `gear`, `reasons`) only for visible windowed rows, shown closed rows, and the inspected detail row. Large-list adapters (`PickStep`, `GearStep`) expose expensive fields via JS getters and pass `twoLine` so work stays O(visible) on 945-option Slots and 1,999-item Gear lists.
4. **Filtering, matching, and ranking (all internal):**
   - Callers always pass unfiltered rows. `filter` defaults to `'auto'` (`props.field !== undefined || all().length >= 13`, short-circuiting before `all()` in `FieldMode`); `filter="always"` always shows the filter.
   - Multi-word matching (`every` whitespace-delimited word present, case-insensitive) OR compact-spelling match (Unicode non-alphanumerics stripped), ranked by 4-tier `matchRank` (`-1` exact compact, `0` prefix / compact prefix, `1` every typed word prefixes a name word, `2` substring), stable on caller order.
   - Grouped rows (`group !== undefined`) stay contiguous per `row.group ?? row.key`, ranked by `[bestMemberRank, firstSeenInKept, originalIndex]`.
   - Eager parents match parent `name` (keeping all children) or `${parent.name} ${child.name}` (keeping matched children; dropping parent if 0 match), ranked by `matchRank(parent.name, text)`. Expanded children sort open before closed, then `name.localeCompare`.
5. **Inline height vs closed-row parity vs `OptionDetails`:**
   - `twoLine` defaults to auto-detect (44 px one-line unless any row in `all()` carries `note`, `summary`, or `held`, which applies `.trail-scroll--two-line` at 60 px). Passing `twoLine` applies 60 px directly without scanning `all()`.
   - Closed top-level rows pass `icon`, `selected`, `detailKey`, `links={note}`, and `refusal` to `PickerOption`, omitting `summary`, `linked`, `clash`, `held`, and `gear` so `PickerOption`'s meta precedence never hides Synergy links on closed Slot rows. Closed child rows pass `name`, `status="closed"`, `selected={child.current === true}`, `detailKey`, and `refusal`.
   - `PickerList` registers `hub?.resolve(findDetail)` and syncs `hub?.point(...)` (`undefined` when `!filtering()`, else clamped markable item key, else `closed[0]?.key`). `detail(keptChildren)` runs lazily on lookup and shallow-merges onto row defaults.
6. **Deferred `resetKey` (Solid 2.0):**
   - Memoize `const resetKey = createMemo(() => props.resetKey)` before `createEffect(() => resetKey(), () => { ... }, { defer: true })` so initial mount preserves `shareFilter` across Expand/Escape and unrelated `TrailState` writes with the same Gear place never wipe the filter.
7. **Empty, closed, count, keyboard, and mark modes:**
   - `text.trim() !== '' && listed.length === 0`: renders `"No matches for “{text}”."` and unmounts `.trail-scroll` + `<WindowedRows>` cleanly.
   - `counts === true` (and not zero-match): renders `"{openCount} open · {closedCount} closed"`, live-recounted as a parent expands (replacing 1 parent in `openCount` with its open children and adding its closed children to `closedCount` and `"Show N closed"`).
   - `listed.length > 0 && open.length === 0`: renders `"No choices open here."`. Closed `current` rows and closed `current` children stay visible while closed rows are hidden.
   - Keyboard: `ArrowDown`/`ArrowUp` in filter move mark over markable items (skipping closed children and empty-branch notes) and call `scrollToIndex`; `Enter` activates leaf/child or expands parent; `ArrowDown`/`ArrowUp`/`j`/`k` on rows move focus; `ArrowRight` expands `[data-parent]`; `ArrowLeft` collapses parent or `[data-child-of]` child (returning focus to `[data-parent] .ww-option`). Clamp active mark whenever `items()` shrinks or a parent collapses (returning mark to parent index on collapse).
   - `notice` renders under the filter input; `footer` renders inside `<Show when={!idle()}>` after the closed toggle.

## Scope

1. **Create `src/planner/PickerList.tsx` and retire `ChoiceList.tsx` + `list-panel.ts`.**
   - Implement `PickerList` and `PickerScope` satisfying every invariant above, absorbing `Filter`, `createListPanel`, `createClosedToggle`, matching/ranking, windowing, keyboard navigation, and `OptionDetails` wiring internally.
   - Delete `src/planner/ChoiceList.tsx` and `src/planner/list-panel.ts`.
2. **Update `src/planner/ChoiceDialog.tsx`.**
   - Delete the `detailOf` DOM-scraping fallback.
   - Wrap `{props.children}` inside `<PickerScope collapsed={false}>` beside `<OptionDetails value={hub}>` so dialogs opened from collapsed inline steps (such as `NextLevelStep`'s `"Another class…"`) never collapse.
   - Guard `showMark()` so `marked === undefined` does not clear `detail` when `keyOf(document.activeElement) !== undefined`, fixing arrow-key navigation on `< 13`-row lists (`MythicStep`, `RankEditor`).
3. **Update `src/planner/Trail.tsx` and `src/planner/CharacterField.tsx`.**
   - Replace `StepArrived`, `CollapsedLists`, `StepFilter`, and `createFilterMemory` with `<PickerScope arrived={arrived()}>`, `<PickerScope shareFilter>`, and `<PickerScope collapsed>`. Pass `arrived?: boolean` into `HereProps` (replacing `useContext(StepArrived)` in `Here`).
   - Update `FieldMode` imports to `./PickerList`.
4. **Update `src/planner/nested-options.ts` and `src/planner/PickStep.tsx`.**
   - Remove `matches` import, `text` parameter, `rowOpen`, and `rowMembers` from `nested-options.ts`; `pickRows` returns all unfiltered `PickRow`s once per Picker.
   - Rewrite `PickStep.tsx` as a thin adapter over `<PickerList>` inside `<div class="trail-step">`:
     - Mark `p`, `held`, and `rows` memos `{ lazy: true }` so `FieldMode` computes zero Picker work while closed.
     - Use JS getters for expensive display/Refusal fields (`icon`, `summary`, `note`, `linked`, `clash`, `held`, `gear`, `reasons`) and pass `filter="always"`, `twoLine`, `counts`, `currentLabel={currentName()}`, `notice={spellNotice()}`, and `footer` (`"Clear this pick"`).
     - Pass `detail: (kept) => ...` on `params` parents so `ChoiceDialog` aggregates Synergy links only over matched Parameters; pass `childPicker?.unit` for nested Sub-choice Refusals.
5. **Update `src/planner/GearStep.tsx` and `src/planner/planner.css`.**
   - Keep place chips, `"Count Gear"` checkbox, `"Take off"`, and worn Summary/clashes outside `<PickerList>`.
   - Render `<PickerScope collapsed={false}><PickerList label={...} rows={rows()} filter="always" twoLine resetKey={place()} /></PickerScope>` with JS getters for `summary` and `clash`, and lazy `detail: () => ({ summary, warnings })`.
   - Delete `ITEMS_SHOWN` from `GearStep.tsx` and `.trail-gear__items .ww-option__meta` from `planner.css` (Gear items now use 60 px fixed-height `WindowedRows` with single-line ellipsis inline and full Summaries in `ChoiceDialog`).
6. **Attach flat-list Summaries in `src/planner/flat-choices.ts`, `src/planner/CharacterSteps.tsx`, and `src/planner/steps.tsx`.**
   - Move unified group-aware `currentFirst` (normalizing `current === true` and `open !== false`, retiring `groupedFirst`) into `flat-choices.ts`; call `judgeAll` directly in `NextLevelStep` (retiring `judge`); widen `startingWith` in `steps.tsx` to `PickerRow[]`.
   - Carry blueprint GUID(s) on `FlatChoice` and wire lazy `detail: () => ({ summary })` across `RaceStep`, `BackgroundStep`, `ClassList`, `LevelEditor`, `MythicStep`, and `RankEditor` using the settled compound-row Summary rule (keeping inline flat rows 44 px one-line unless carrying a Cascade `note`):
     - **Background (Variation):** the variation's `summaryFor`.
     - **Race · Heritage:** the race's written Summary paired with the heritage's `labels` (or the race's alone if the heritage has none).
     - **Archetype · Class:** the class's `summaryFor` (or the archetype's if it has a written Summary).
7. **Tests (`replace, don't layer`) and documentation.**
   - Remove direct imports/tests of unexported internals (`ChoiceList`, `Filter`, `matches`, `matchRank`, `ranked`) in `src/planner/planner.test.tsx`, and migrate the standalone `<Filter>` arrival test (`planner.test.tsx:757-783`) onto `<PickerList>`.
   - Update `.trail-gear__items` selectors (`planner.test.tsx:3165-3180`) to `.trail-scroll`.
   - Add interface-level tests exercising `<PickerList>` / `<PickerScope>` / `<ChoiceDialog>`:
     - matching & 4-tier ranking (`"human"`, `"chain shirt"` / `"chainshirt"`, `"tiefling rak"`), grouped class+archetype cohesion, `< 13` vs `>= 13` / `filter="always"` threshold;
     - eager Parametrized feat matching by parent or child name, filtered `detail(keptChildren)`, lazy Sub-choice `children()` uncalled until expand, empty `"Nothing to choose here yet."`, live `open · closed` counts, `ArrowRight`/`ArrowLeft` focus return, and mark clamping on collapse/shrink;
     - `FieldMode` laziness (assert `rows` and `pickerFor` do not run while closed, and stay cold after open → close → Build edit) and O(visible) display-getter laziness (off-screen/hidden closed rows not read when `twoLine` is set);
     - `resetKey` clearing shared filter only on value change (not mount, not equal-value re-run);
     - flat-list Summaries appearing in `ChoiceDialog` (including Race · Heritage, Background (Variation), and Archetype · Class) while inline flat rows stay 44 px;
     - `GearStep` showing > 60 items via `WindowedRows`, keyboard mark/Enter, and `ChoiceDialog` initial detail sync;
     - `NextLevelStep`'s `"Another class…"` dialog staying open on blur/outside click, and `< 13`-row `MythicStep` arrow navigation keeping the detail pane populated.
   - Update `src/planner/README.md` to document `PickerList` and `PickerScope` and remove references to `ChoiceList.tsx`, `list-panel.ts`, `detailOf`, and `ITEMS_SHOWN`.

## Done when

- `ChoiceList.tsx` and `list-panel.ts` are deleted; `src/planner/PickerList.tsx` exports only the 2 runtime entry points and 7 types above.
- All interface-level tests and existing `src/planner` integration tests pass.
- Checked in the browser at 375 px and 1280 px:
  - Flat lists (Race, Background, Class/Archetype, Mythic path) stay compact inline and show their Summaries in `ChoiceDialog`'s detail pane;
  - `PickStep` expands Parametrized feats and nested Sub-choices with live counts, filtered Synergy details, and hidden `"Clear this pick"` while a `FieldMode` field is closed;
  - `GearStep` scrolls past 60 items via `WindowedRows` (verify single-line ellipsis truncation reads cleanly), supports keyboard mark/Enter and `ChoiceDialog` detail sync, and clears its filter on place change while keeping it across Expand;
  - `NextLevelStep`'s `"Another class…"` dialog does not collapse on blur, and `MythicStep` arrow navigation keeps the detail pane visible.
- `src/planner/README.md` is updated.
- `bun run check` passes; then set `Status: done` and add an `## Outcome`.
