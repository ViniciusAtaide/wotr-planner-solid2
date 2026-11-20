# Planner

The planner page (map 13; build ticket 05): the Timeline, the side panel, undo and redo, the Share link, fork and
compare. It runs in the browser only: the engine loads the data document once (ADR 0004) and the Build opens from
`#b=<Build code>`. Every change goes through E, statuses come from S and every Refusal's words from R; the page only
shows them.

## Public entry

`index.ts` imports `planner.css` and exports `Planner`, the page: it loads the engine and the linked Build, shows
"Loading the game data…" until then (or why the data didn't load), and then the workspace.

## Modules

- **`engine.ts`: the engine in the browser (ADR 0004).** `loadEngine` fetches the data document once, checks and
  indexes it, and shares the engine after the first call. Every pick, picker and cascade then runs in the browser,
  with no round trip.
- **`link.ts`: the Share link's Build (map 13).** `#b=<Build code>` is opened with C, the same code the MCP returns.
  `EMPTY` is an empty Build, nothing chosen yet. `buildFromHash` returns the Build a Share link holds, or an empty one,
  with `stale` set when a link was there but didn't open.
- **`state.ts`: one Build being planned, its state and history.** Every change goes through E (`~engine/edits`), so no
  sequence of UI actions reaches an impossible Build. `createPlanner`'s `edit` applies an edit at once when it breaks
  nothing (`allows`); when clearing picks mends what it breaks (`cascade`), it opens the Cascade preview (map 11),
  which applies only on `confirm`; otherwise it refuses, and `notice` holds why, in R's words, naming each pick it
  would break with its place and each other choice with R's reason (`brokenWords`). `Pending` is a Cascade edit
  waiting for its confirm: what it clears and the Build it leaves. `replace` swaps the Build outright, as opening a
  link does, and undo still reaches the one before; `reset` starts over from a Build with no history, as a fork's copy.
  `placeWords` writes a place as "Level 8" or "Rank 3".
- **`words.ts`: names for the planner's surfaces.** Game names (ADR 0006) and the planner's own words, never the game's
  text. `ordinal` writes "1st", "2nd", "3rd", "4th"…; `optionName` is an option's name: the feature's game name, with
  its parameter's when it takes one.
- **`Timeline.tsx` (map 13).** One row per character level, with each Mythic rank at its Rank level
  (`placesInWalkOrder`: every level, then the ranks placed at it), and a chip for every slot the walk opens there,
  filled or empty, with its pick or what it waits for. Refusal text never shows here; it belongs to the picker.
  `Selection` is what the side panel shows.
- **`panels.tsx`: the side panel's contents (map 13).** The picker for a slot, and the editors for a level, a Mythic
  rank, the start, adding levels and ranks, and Gear. Every change goes through the planner's `edit` (E).
  - `SlotPicker`: S's options the game shows at a slot, open ones first, then the closed ones with R's Refusals, the
    first `CLOSED_SHOWN` of them before "Show all closed" and the rest counted by reason. J and K move between options,
    ↵ picks, / focuses the filter. Each option's Synergy links are the prerequisite-chain kind (map 09): what it builds
    on that the Build already holds at this slot's point of the walk (`heldFeatures`), and what it enables.
  - `LevelPanel`: a character level's class, its archetype at the class's first level, its ability increase and its
    skill ranks.
  - `RankPanel`: a Mythic rank's class and Rank level, with the Expected level as a hint (ADR 0003). `mythicClasses`
    lists the Mythic classes: the paths, the starting class and the switches (map 31).
  - `StartPanel`: race, its chosen +2, alignment and the point buy.
  - `AddPanel`: adds the next character level, or the next Mythic rank at its Expected level (ADR 0003).
  - `GearPanel`: the Build's Gear (GLOSSARY.md), an item per place, and ADR 0002's opt-in to count it toward stat
    prerequisites. Its items are those the walk's `PLACE_ITEM_TYPES` (`~engine/walk`, where its citation lives) allows in the place, with a twin group shown by the one offered
    in its place (map 29), filtered by name.
  - `shownSortedByName` lists the shown blueprints a test keeps, sorted by name; `Choice` is a labelled select in the
    design system's control style.
  - `revertControl` puts a control back to the value it showed before an edit. An edit that applies changes the
    Build, and the binding then writes the new value (reads lag writes, so the revert runs first); an edit waiting on
    the Cascade preview, or refused, leaves the control showing the Build as it still is.
- **`Planner.tsx`: the page.** Below `PHONE_WIDTH_QUERY` the page is one column and the side panel is a full-screen
  sheet (map 13). `liveBuildCode` keeps a planner's Build code current; the last encode wins. The first Build's code is
  the page's link, so a reload reopens it, and a Share link pasted into the tab changes only the hash, so the page
  opens its Build (undo returns to the one before). A fork copies the first Build into a second; `Side` is which of
  the two the side panel edits, and `shownBuilds` which Builds show: one, the other, or both side by side. `focus` is
  what the side panel shows and in which Build; a new focus mounts a fresh panel (`panelOf`), so its filter starts
  empty. `lastLevelScores` are the six scores at the Build's last level, marked where the two Builds differ.

## Design notes

- `planner.css` styles the page: the toolbar, the Timeline column or columns, the side panel and its fields. Every
  value is a token from `tokens.css`; component looks stay in the design system's `components.css`. On a phone the
  side panel is a full-screen sheet over the Timeline (map 13), and the sheet's bar carries the title, so the panel's
  own title is hidden there.

## Tests

`planner.test.tsx` checks the planner UI against the MCP (build ticket 05): every Build code the MCP returns opens the
same Build in the UI, and a change that breaks later picks goes through the Cascade preview, so no UI action reaches
an impossible Build.

- `fighterThroughMcp` builds a level 1 Fighter through the MCP: Strength 13, then the first open option in every
  slot, Power Attack where it is open. Each step's code opens through the Share link to the same Build, encodes back
  to the same code, and shows every pick in the Timeline. Builds are compared with their picks in one order
  (`ordered`), because the code keeps the picks, not the order they were made in. `timelineOf` renders the Timeline the
  UI shows for a Build.
- Jack in the Green (the gold Build) opens with every level and Mythic rank.
- A link that does not open says so and starts empty.
- Lowering Strength under Power Attack waits on the Cascade preview; cancel keeps the Build, confirm clears Power
  Attack, and undo restores the Build.
- The data is found from the repo root, because jsdom's `import.meta.url` isn't a `file:` URL.
