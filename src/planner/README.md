# Planner

The planner page (map 13; build ticket 05): the Timeline, the side panel, undo and redo, the Share link, fork and
compare. It runs in the browser only: the engine loads the data document once (ADR 0004) and the Build opens from
`#b=<Build code>`. Every change goes through E, statuses come from S and every Refusal's words from R; the page only
shows them.

The page's state is three tagged unions, each with a pure reducer, so it can't represent an impossible state (build
ticket 05d): one `PlannerState` per Build, one `WorkspaceState` per page, and one `ShareCode` per Build, derived.
Everything else (which Builds show, which one is edited, the selection's target) is derived, never stored.

## Public entry

`index.ts` imports `planner.css` and exports `Planner`, the page.

## Modules

- **`engine.ts`: the engine in the browser (ADR 0004).** `loadEngine` fetches the data document once, with the same
  mode and credentials as the preload in `src/Document.tsx` (build ticket 05b) so the browser reuses that response,
  decodes it with `engine/compact` (build ticket 05c), checks and indexes it, and shares the engine after the first
  call. A load that fails clears the shared promise, so Retry asks again. Every pick, picker and cascade then runs in
  the browser, with no round trip.
- **`link.ts`: the Share link's Build (map 13).** `#b=<Build code>` is opened with C, the same code the MCP returns.
  `EMPTY` is an empty Build, nothing chosen yet. `openHash` gives the Build a hash holds (an empty one when it holds no
  code), or why it didn't open: `linkReason` groups C's `DecodeError` reasons into R's three `LinkReason`s, other game
  data (`unknownKey`), a newer planner (`version`) and not a Build code (the rest).
- **`planner-state.ts`: one Build being planned (map 13).** `PlannerState` is the history, `past`, `present` and
  `future`, each a Build a code can hold (map 13: undo and redo walk a history of Builds, each one codable), and the
  edit `Session`: `idle`, `confirming` a Cascade edit's `Pending` (map 11), or `refused` with R's lines, never empty
  (`NonEmpty`). `reducePlanner(engine, state, action)` is the whole transition table:
  - `edit` applies at once when it breaks nothing (`allows`), waits on the Cascade preview when clearing picks mends
    what it breaks (`cascade`), and otherwise is refused, naming each pick it would break with its place and each other
    choice with R's reason (`brokenWords`). From `refused` the result replaces the refusal; while `confirming` it does
    nothing, since the background is inert. `outcomeOf` reads the result as an `EditOutcome`: `applied`, `confirming`
    or `refused`.
  - `refuse` shows lines a panel's constructor refused (a value no Build holds), except while confirming.
  - `confirm` commits the pending Build, `cancel` drops it, `dismiss` clears a refusal.
  - `undo` and `redo` walk the history and clear a refusal; while confirming, `undo` (⌘Z) cancels instead and `redo`
    does nothing, so the history never moves under the preview.
  - `replace` (a link that opens) commits a Build, so undo returns to the one before; it is skipped when the Build is
    the same (`sameBuild`), so the page's own link never adds an undo entry. It discards a pending preview.
  - `reset` starts a new history (the fork's copy).
  - Every change to `present` returns to `idle`. `plannerAt` is a fresh state; `placeWords` writes a place as
    "Level 8" or "Rank 3".
- **`state.ts`: a Build's planner for the components.** `createPlanner` holds one signal of `PlannerState` and sends
  every action through `reducePlanner`. `latest` is the state after the last action, for handlers that send several
  actions in one tick (signal reads lag writes); `restore` puts a whole state back (Close). The rest is what the
  components read: `build`, `walked`, `session`, `pending`, `notice`, `canUndo`, `canRedo`, and the actions; `edit`
  returns the `EditOutcome`.
- **`workspace-state.ts`: the page (map 13).** `WorkspaceState` is the `View` (one Build, `single`, or a fork,
  `forked`, with its `layout`, `one` or `both`, and the edited `side`), the `Selection` the side panel shows, and the
  `LinkStatus` (`ok`, or `didNotOpen` on `load` or on `paste`, with its `LinkReason`). `reduceWorkspace(state,
  action, editing)`:
  - `fork` only from `single`, to `forked`, `both`, `second`;
  - `show` only when forked; the toggle's segments map onto it through a `Record`;
  - `close` only when forked, back to `single`;
  - a side switch (`show` or `select` naming the other side), `fork` and `close` are refused while the edited planner
    is confirming;
  - `select` sets the selection, and the side when it names one;
  - `linkOpened` and `dismissLink` set the link back to `ok`, and `linkFailed` sets `didNotOpen`. Edits never clear it.

  `reducePage` is the glue the page and the sequence test share: a `Page` is the workspace and both planners. `fork`
  resets the second planner to the first's `present`; `close` makes the edited planner's whole state, history
  included, the first's, so Close keeps the Build being edited (user, 2026-11-20); `linkOpened` replaces the edited
  Build (a paste replaces the edited Build, user); a `planner` action goes to the edited planner. The second planner
  sits unused while unforked and is reset at fork.

  Derived values: `edited(view)` is the side the panel edits; `shown(view, phone)` the Builds that show, where `both`
  shows one Build, the edited one, on a phone (the phone projection, user); `resolve(selection, build, slots)` is the
  selection while its target (a slot the walk opens, a level, a rank) still exists, else undefined, when the desktop
  panel shows Add and the phone sheet closes (user); `sameSelection` keeps the panel mounted while it holds, so the
  picker's filter survives a Build change. `workspaceAt` opens the page, at Start for an empty Build.
- **`share-code.ts`: a Build's Share link.** `ShareCode` is `encoding`, `current` with its code, or `failed` with why.
  `createShareCode` encodes each new `present`; the last encode wins (a `latest` token) and a rejected encode is
  `failed`. `shareLinkOf` maps it onto the design system's `ShareLink` props: "Making the link…" with Copy off while
  encoding (user), the URL when current, the reason when failed.
- **`unreachable.ts`**: `unreachable(x: never)`, the default of a switch that names every case.
- **`words.ts`: names for the planner's surfaces.** Game names (ADR 0006) and the planner's own words, never the game's
  text. `ordinal` writes "1st", "2nd", "3rd", "4th"…; `optionName` is an option's name: the feature's game name, with
  its parameter's when it takes one.
- **`Timeline.tsx` (map 13).** One row per character level, with each Mythic rank at its Rank level
  (`placesInWalkOrder`: every level, then the ranks placed at it), and a chip for every slot the walk opens there,
  filled or empty, with its pick or what it waits for. Refusal text never shows here; it belongs to the picker.
- **`panels.tsx`: the side panel's contents (map 13).** The picker for a slot, and the editors for a level, a Mythic
  rank, the start, adding levels and ranks, and Gear. Every change goes through the planner's `edit` (E).
  - `SlotPicker`: S's options the game shows at a slot, open ones first, then the closed ones with R's Refusals, the
    first `CLOSED_SHOWN` of them before "Show all closed" and the rest counted by reason. J and K move between options,
    ↵ picks, / focuses the filter. Each option's Synergy links are the prerequisite-chain kind (map 09): what it builds
    on that the Build already holds at this slot's point of the walk (`heldFeatures`), and what it enables. `onPicked`
    gets the pick's `EditOutcome`; the phone sheet closes only on `applied`.
  - `LevelPanel`: a character level's class, its archetype at the class's first level, its ability increase and its
    skill ranks.
  - `RankPanel`: a Mythic rank's class and Rank level, with the Expected level as a hint (ADR 0003). `mythicClasses`
    lists the Mythic classes: the paths, the starting class and the switches (map 31).
  - `StartPanel`: race, its chosen +2, alignment and the point buy.
  - `AddPanel`: adds the next character level, or the next Mythic rank at its Expected level (ADR 0003).
  - `GearPanel`: the Build's Gear (GLOSSARY.md), an item per place, and ADR 0002's opt-in to count it toward stat
    prerequisites. Its items are those the walk's `PLACE_ITEM_TYPES` (`~engine/walk`, where its citation lives) allows
    in the place, with a twin group shown by the one offered in its place (map 29), filtered by name.
  - `Choice<V>` is a labelled select over its own options' values, so a change hands back a `V` with no cast. A Build
    value its options don't list (a link's class the list hides) is added as an option named by `nameOf`
    (`withValue`), so the select never shows another option as chosen. `shownSortedByName` lists the shown blueprints
    a test keeps, sorted by name.
  - The number inputs (scores, skill ranks, Rank level) check what was typed with `engine/build`'s constructors, and a
    value no Build holds is refused through the planner's `refuse` in R's words, worded with the number typed
    (`typedNumber`), not the input's text. Drafts stay in the inputs.
  - `revertControl` puts a control back to the value it showed before an edit. An edit that applies changes the
    Build, and the binding then writes the new value (reads lag writes, so the revert runs first); an edit waiting on
    the Cascade preview, or refused, leaves the control showing the Build as it still is.
- **`Planner.tsx`: the page.**
  - `Boot` is `loading`, `failed` (with Retry, which loads again) or `ready` with the engine, the linked Build, the
    `LinkStatus` and the hash it opened. The ready workspace reads `location.hash` again, so a link pasted while the
    data loaded still opens.
  - Below `PHONE_WIDTH_QUERY` the page is one column and the side panel is a full-screen sheet (map 13).
  - `linkCode` is the edited Build's `ShareCode`; the address bar and the Share link both show it (user). The hash is
    written (`replaceState`) only when it is `current`, which also covers a side switch; on `failed` it keeps the last
    good code.
  - A pasted hash (`hashchange`) equal to the current `linkCode` does nothing. Otherwise it is decoded behind a
    `latest` token, so the last pasted link wins, and goes to `linkOpened` or to `linkFailed` on `paste`, which puts
    the page's own hash back.
  - One window key handler switches on the edited planner's `Session`, `unreachable` as its default. While
    confirming, ⌘Z and Esc cancel and ⇧⌘Z and / do nothing; otherwise ⌘Z undoes, ⇧⌘Z redoes, / focuses the filter and
    Esc closes the phone sheet.
  - While confirming, everything behind the Cascade preview is `inert` (`planner-behind`), and the preview keeps Tab
    inside itself.
  - The fork's toggle maps its segments onto `show` through `SEGMENT_SHOWS`; on a phone it offers First and Second,
    and presses the edited side's segment when both would show. `lastLevelScores` are the six scores at the Build's
    last level, marked where the two Builds differ.

## Design notes

- `planner.css` styles the page: the toolbar, the Timeline column or columns, the side panel and its fields. Every
  value is a token from `tokens.css`; component looks stay in the design system's `components.css`. On a phone the
  side panel is a full-screen sheet over the Timeline (map 13), and the sheet's bar carries the title, so the panel's
  own title is hidden there. `planner-behind` wraps the page behind the overlay with `display: contents`, so making it
  inert changes no layout.
- A select can't show a value the Build doesn't hold: `Choice` marks `selected` on each option (no `value` on the `<select>`), and its rows are keyed by value. The options are rebuilt on every change, and a `<select>` whose value was set before its options re-rendered fell back to the first one (comparison bug 1).
- Focus:
  - the Cascade preview opens on Cancel, the least destructive action;
  - when it closes, focus goes back to the last element focused outside any dialog (`focusin` tracking in `Planner.tsx`);
  - the picker's option rows are keyed by feature and parameter, so the option just picked keeps its element and its focus;
  - "Clear this pick" sits after the options, so Tab from the filter reaches an option first.
- Before level 1 the stat block shows the point buy only. The walk applies race and its +2 at level 1, as the game's character creation does, so the page says so under the stats rather than computing race early.
- The class, Mythic class and race lists are S's `offeredClasses`, `offeredMythicClasses` and `offeredRaces` (map ticket 34).
- The runtime checks that stay: `resolve`, `Choice`'s missing option, the constructors where values come in, the
  walk's rules across fields (point buy, an increase every 4th level, skill totals, the rank cap), the workspace's
  guard while confirming (backed by the inert background), the `latest` tokens, the `sameBuild` skip, `ShareCode`'s
  `failed`, and the second planner reset at fork.

## Tests

- `planner.test.tsx` checks the planner UI against the MCP (build ticket 05): every Build code the MCP returns opens
  the same Build in the UI, and a change that breaks later picks goes through the Cascade preview.
  - `fighterThroughMcp` builds a level 1 Fighter through the MCP: Strength 13, then the first open option in every
    slot, Power Attack where it is open. Each step's code opens through the Share link to the same Build, encodes back
    to the same code, and shows every pick in the Timeline. Builds are compared with their picks in one order
    (`ordered`), because the code keeps the picks, not the order they were made in. `timelineOf` renders the Timeline
    the UI shows for a Build.
  - Jack in the Green (the gold Build) opens with every level and Mythic rank; a link that does not open says so, in
    R's words, and starts empty.
  - Lowering Strength under Power Attack waits on the Cascade preview; cancel keeps the Build, confirm clears Power
    Attack, and undo restores the Build.
  - The render regressions of build ticket 05d, each written to fail before its fix: the notice survives undo; ⌘Z in
    the preview; the phone sheet on a waiting pick; Tab leaving the preview and the inert background; side by side
    after narrowing to a phone; two hash decodes out of order; a failed paste; the link notice that never cleared; the
    page's own Build re-applied as an undo entry (`storedBlockCode` writes the same Build as another code); a hash
    pasted while loading; `…/#b=` while encoding; a select showing another option for a value it doesn't list; a
    score of 6 or 12.5 mis-worded; Close keeping the first Build; Retry; and `loadEngine` asking again.
  - The page renders whole with the engine module mocked (`gate.load`), C wrapped so a test can hold a decode or an
    encode (`gate.decodeHolds`, `gate.encodeHold`), and a `FakeMediaQueryList` for the phone width.
- `planner-state.test.tsx`: one test per cell of `reducePlanner`'s table, the edit outcomes, and the type-level tests
  (`expectTypeOf`): the unions hold no impossible state, the constructors return a value or undefined, a Build holds
  only codable values, and `Choice` hands back its own values.
- `workspace-state.test.tsx`: fork, Close keeping either Build with its history, the guard while confirming, the
  phone projection, the link status, `resolve` after each way its target goes, and a seeded sequence test: a
  hand-written generator (`seeded`, no dependency) runs random actions through `reducePage`, and after every step at
  most the edited planner is confirming, `shown` holds the edited side, each `present` round-trips through C into a
  `sameBuild` Build, and `resolve` gives undefined or a selection whose target exists.
- The data is found from the repo root, because jsdom's `import.meta.url` isn't a `file:` URL.
