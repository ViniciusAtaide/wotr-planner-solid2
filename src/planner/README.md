# Planner

The planner page (map 13; build tickets 05 and 07): the levelling trail, undo and redo, the Share link, fork and
compare. It runs in the browser only: the engine loads the data document once (ADR 0004) and the Build opens from
`#b=<Build code>`. Every change goes through E; a slot's options and their statuses come from S, a class, path or
archetype row's status from E (whether the edit applies, needs the Cascade preview or breaks), and every Refusal's
words from R; the page only shows them.

The page's state is three tagged unions, each with a pure reducer, so it can't represent an impossible state (build
ticket 05d): one `PlannerState` per Build, one `WorkspaceState` per page, and one `ShareCode` per Build, derived.
Everything else (which Builds show, which one is edited, the selection's target) is derived, never stored.

## The levelling trail (build ticket 07, map 13's 2026-11-21 amendment)

A Build reads as the character's path, phone first. From top to bottom the page shows:

- **The character card**: the race as one-tap buttons, the alignment as a 3×3 grid, the six ability scores as tiles
  with − and + steppers and a +2 button under each (disabled, in the same place, when the race sets its bonuses), the
  points left, and the character's own picks as chips: what the race grants (a Human's bonus feat), the background and
  what it opens, and the deity. Which slots those are is S's answer (`characterWideSlots`), so nothing character-wide
  sits on the Level 1 stop.
- **The trail**: one stop per character level, titled with its class and class level, with its picks as chips: each
  slot the walk opens there, an Archetype chip at a class's first level when it has archetypes, the ability increase
  when the walk offers one, and the skills ("4 ranks"). Each Mythic rank is its own stop after the level it is taken at,
  in the Mythic color; every 4th level is a milestone, marked in gold.
- **Gear**: a card after the trail, one line listing what is worn; a tap opens the places and their items in place.

**The current step opens in place**, on its stop, in the character card, or on a new stop after the last level, and
scrolls into view with a short arrival (off under `prefers-reduced-motion`; it never blocks input). Its title speaks
to the player in the planner's own words: "Level 5 · choose feat", "Your character · choose deity", "Onward to level 6".

**The next step** is the first of these that is open, in reading order (`nextStep`):

1. the ability scores, while the Build has none: the step opens in the character card in the tiles' place, and stays
   open through its edits (race, +2 and alignment included) until "Done" ("Done · leave N unspent" while points are
   left), which keeps every score at 10 when none was changed. So a fresh Build opens here, and a link opens on its
   first unfinished step;
2. the first empty slot with the character, then the first empty slot on the trail, in the walk's order;
3. an ability increase the walk offers and the Build hasn't taken;
4. the last level's skills, until the walk's budget for that level is spent or the player chooses "Done · leave N
   unspent";
5. a Mythic rank whose Expected level (ADR 0003) the Build has reached, offered as the Mythic paths with their status,
   the current path first (before any rank, the game's starting Mythic class, S's `mythicStartingClass`);
   "Not now" puts it off until the next level;
6. the next level: "Continue as <previous class> → level N" in one tap, or "Another class…", which lists every class
   with its status, the previous class first, then the open ones, then the closed ones with their reasons.

Each pick goes back to the next step. Tapping any chip (or a stop's title, for its class, archetype and removal, or a
rank's, for its path and Rank level) opens that choice in place with "Back to the next choice"; the ability scores,
the skills, a rank and Gear stay open through their edits, everything else returns to the next step once it applies. An edit that breaks later
picks goes through the Cascade preview as before; once confirmed, the page lands on the first pick it cleared.

**Icons**: a feat's chip and its row in a pick list carry its category's icon (`feat-category.ts`).

**Lists**: a pick list is open, sorted by name, with a filter above it that takes focus only under a fine pointer (so a
phone keeps its keyboard down); Enter takes the first open row; the current pick is marked; closed rows show R's
reasons. A small set (race, +2, alignment, the six ability increases, the last one marked "as before") is a row of
buttons. A class or path list gets the filter from 13 rows up.

**Skills**: a budget line ("3 of 4 skill points spent") on the last level, "Same as level N−1", and − and + steppers.
A past level shows its ranks without a budget. The budget is the walk's (`Walk.skillPoints`), never the page's.

**Undo**: one line at the bottom naming the last change ("Picked Acid Bomb · Undo"; "Opened a link" after a pasted
link), offered while there is history, plus ⌘Z and ⇧⌘Z. After an undo it names the change now on top. There are no Undo and Redo buttons.

**Folding, phones only (under 900 px)**: once level 1 is done (every choice made, `levelOneDone`) the character card
shrinks to one line (race, alignment, +2 and the character's picks) until tapped; before that it is open with its
controls. Levels group into chapters of four, ending on the milestones; a finished
chapter before the current step folds into one row (its classes, Mythic ranks and picks), which a tap opens and "Fold
levels N–M" closes. Taking the next level folds them all again. The chapter holding the current step never folds. From
900 px wide nothing folds: the card keeps its race, alignment and score controls, and the trail is a centred column.

**The menu (⋯)**: Copy link, Fork this Build, and Export as text (a plain build sheet copied to the clipboard). The
address bar keeps the Build in `#b=`, so a reload opens it again. When forked, the compare toggle and "Close the fork…"
sit beside the menu; a phone shows one trail with the toggle, a desktop two side by side, the one not being edited
dimmed and inert behind "Edit the Second Build".

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
  - Every change to `present` returns to `idle`. `change` is the title of the edit that made `present` (an edit that
    applied, the confirmed preview's, or `OPENED_A_LINK` for a `replace`), for the Undo line; `pastChanges` and
    `futureChanges` keep each history entry's title beside it, so undo and redo bring back the right name, and `reset`
    starts without one. `verdictOf` is the one answer to what an edit does: it `applies`, it `clears` later picks
    through the Cascade preview, or it `breaks` what nothing mends. The reducer and the class and path rows share it;
    `laterPicks` words a count of picks.
    `plannerAt` is a fresh state; `placeWords` writes a place as "Level 8" or "Rank 3"; `brokenWords` words what an
    edit would break, for the refusal and for a closed class or path row.
- **`state.ts`: a Build's planner for the components.** `createPlanner` holds one signal of `PlannerState` and sends
  every action through `reducePlanner`. `latest` is the state after the last action, for handlers that send several
  actions in one tick (signal reads lag writes); `restore` puts a whole state back (Close). The rest is what the
  components read: `build`, `walked`, `session`, `change`, `pending`, `notice`, `canUndo`, `canRedo`, and the
  actions; `edit` returns the `EditOutcome`.
- **`workspace-state.ts`: the page (map 13).** `WorkspaceState` is the `View` (one Build, `single`, or a fork,
  `forked`, with its `layout`, `one` or `both`, and the edited `side`), the `Selection`, and the
  `LinkStatus` (`ok`, or `didNotOpen` on `load` or on `paste`, with its `LinkReason`). The `Selection` is the choice
  the player tapped open on the trail: a slot, a level's class (`level`), its ability increase (`increase`) or skills
  (`skills`), a rank, Gear, or the ability scores (`scores`, which the trail selects at their first edit to keep the
  step open); undefined follows the next step. `reduceWorkspace(state,
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
  selection while its target (a slot the walk opens, a level, a rank) still exists, else undefined, when the trail
  goes back to the next step; `sameSelection` compares two selections. `workspaceAt` opens the page following the next
  step.
- **`share-code.ts`: a Build's Share link.** `ShareCode` is `encoding`, `current` with its code, or `failed` with why.
  `createShareCode` encodes each new `present`; the last encode wins (a `latest` token) and a rejected encode is
  `failed`. `shareLinkOf` maps it onto the design system's `ShareLink` props: "Making the link…" with Copy off while
  encoding (user), the URL when current, the reason when failed.
- **`unreachable.ts`**: `unreachable(x: never)`, the default of a switch that names every case.
- **`words.ts`: names for the planner's surfaces.** Game names (ADR 0006) and the planner's own words, never the game's
  text. `ordinal` writes "1st", "2nd", "3rd", "4th"…; `optionName` is an option's name: the feature's game name, with
  its parameter's when it takes one.
- **`trail-state.ts`: the step model (build ticket 07).** Pure functions over a `TrailView` (the data, the Build and
  its walk) and a small `TrailState` with its reducer `reduceTrail`, the page's own memory per Build: the levels whose
  skills were left unspent (`skillsLeft`), the level a Mythic rank was put off at (`mythicLater`), the chapters tapped
  open (`unfolded`), the character card opened or closed by hand (`characterOpen`) and "Another class…" (`otherClass`).
  `levelAdded` folds every chapter again and closes the class list.
  - `Step` is a `Selection`, a due Mythic rank (`mythic`) or the next level (`nextLevel`); `nextStep` gives the next
    one in the order above, `whereOf` where it opens (the character, the score tiles, a level, a rank, the next stop,
    or Gear) and
    `stepTitle` its title. `slotWords` names a slot in a title (the selection's game name, lower case, without
    "selection"; build question 4 below) and `slotLabel` on a chip.
  - `shownSlots` leaves out the parametrized feats' own slots (their parameter is chosen with the feat);
    `characterSlots` and `slotsAt` split the rest between the character card and the stops by S's `characterWideSlots`.
  - `skillBudget`, `skillsDue`, `increaseDue` and `increaseOffered` read the walk's `skillPoints` and
    `attributePoints`; `mythicDue` reads the Expected level (`expectedLevel`).
  - `keepsSelection` says which choices stay open through their edits; `firstCleared` is the first slot, in the walk's
    order, whose pick a Cascade cleared and that still opens.
  - Chapters: `chapterOf`, `chapterRange`, `chapters`, `folded`; the card (`CardView`): `levelOneDone`,
    `characterFolded`, `characterEditing` (always on from 900 px).
    The words of the folded rows and the card: `characterLine`, `characterPicksLine`, `levelLine`, `chapterSummary`;
    `classLevelAt`, `isFirstLevelOfClass`, `rankNumbersAt` (ranks placed after the last level show after it) and
    `alignmentWords`.
- **`Trail.tsx`: one Build's trail.** The character card, the stops, the chapters and Gear, with the current step in
  place (`Here`, keyed by `stepKey` so a new step arrives and scrolls into view) and `StepBody` choosing its
  contents. Its `edit` sends the edit to the planner and, once it applies, goes back to the next step unless the
  choice stays open (`keepsSelection`), and folds the chapters again after a new level. `ChapterRow` is a folded
  chapter.
- **`CharacterCard.tsx`**: the card, `RaceChips`, `AlignmentGrid` (`ALIGNMENT_GRID`), `ScoresStep` (the scores step:
  the tiles with their controls and "Done") and `StatTiles`, whose steppers
  stop at the scores a Build can hold (`MIN_SCORE`, `MAX_SCORE`) and send a point buy the walk refuses to the notice
  area.
- **`steps.tsx`: what opens in place.** `TrailApi` is what a step reads and sends. `SlotStep` is a slot's open list:
  S's options the game shows, open then closed with R's Refusals (the first `CLOSED_SHOWN`, then "Show all closed"
  and the rest counted by reason), each option's Synergy links (what it builds on that the character already holds at
  the slot, and what it enables), J and K to move, Enter in the filter to take the first open one, and "Clear this
  pick" after the options. `IncreaseStep`, `SkillsStep`, `NextLevelStep` (with the lazy `ClassList`), `MythicStep`,
  `LevelEditor` (class, archetype, Remove level on the last) and `RankEditor` (Rank level stepper with the Expected
  level as a hint, path, Remove rank on the last).
- **`ChoiceList.tsx`**: the class, path and archetype lists. `judge` gives a row's status from E: open when `allows`
  passes, open with "Clears N later picks" when only a `cascade` mends it, else closed with `brokenWords`.
  `currentFirst` sorts the current one first, then open, then by name. `Filter` is the list filter (`focusFilter`
  focuses it only under a fine pointer); `FILTER_FROM` is the row count from which a list gets one.
- **`GearStep.tsx`**: the Gear (GLOSSARY.md) in place (`GearStep`), `PLACES` (the Gear places in the walk's order),
  `placeWords` (a place's name in words, "Left Hand"), and `wornLine` (what the Gear card's line lists: each worn
  item's game name, or "Nothing worn"). In place: ADR 0002's opt-in, the places as a grid of chips with what each
  wears, and the chosen place's items as an open list (the first `ITEMS_SHOWN`, filtered by name), from the walk's
  `PLACE_ITEM_TYPES` (`~engine/walk`, where its citation lives) with a twin group shown by the one offered in its place
  (map 29).
- **`feat-category.ts`: a feat's icon.** The game tags each feat for its level-up list (`FeatureTagsComponent`,
  shown under the feat's name and searched by the list, `CharGenFeatureSelectorItemVM`); only the game's feats carry
  it, so a pick whose feature has it gets an icon and any other pick none. S reads the tags (`featureTags`);
  `categoryOfTags` sorts them onto the design system's twelve
  `FeatCategory` drawings, the first that fits: Teamwork, Mounted, Style (the unarmed styles), Combat Manoeuvre,
  Magic or Metamagic, Class Specific, Ranged without Melee, then any attack, damage, melee, critical or ranged tag as
  Weapon, Skills, Defense or Saving Throws as Armour and Shield, and Miscellaneous for a feat with no tag. The game has
  no tag for racial feats, so the Racial drawing is unused. This sorting is the planner's own (user, 2026-11-21);
  the tags are the game's. `featCategory(data, feature)` reads a feature's tags through S and returns its drawing, or
  undefined when the game gives it no tags.
- **`Menu.tsx`**: `PlannerMenu`, the ⋯ menu (`copyText` reports whether the clipboard took the text), and `UndoLine`.
- **`sheet.ts`**: `buildSheet`, the plain-text build sheet Export copies: the character line, the scores, the
  character's picks, one line per level with its class, archetype, picks and skills, one per Mythic rank, and the Gear.
- **`Planner.tsx`: the page.**
  - `Boot` is `loading`, `failed` (with Retry, which loads again) or `ready` with the engine, the linked Build, the
    `LinkStatus` and the hash it opened. The ready workspace reads `location.hash` again, so a link pasted while the
    data loaded still opens.
  - Below `PHONE_WIDTH_QUERY` (900 px) the page folds and compare shows one trail with the toggle.
  - `linkCode` is the edited Build's `ShareCode`; the address bar and the Share link both show it (user). The hash is
    written (`replaceState`) only when it is `current`, which also covers a side switch; on `failed` it keeps the last
    good code.
  - A pasted hash (`hashchange`) equal to the current `linkCode` does nothing. Otherwise it is decoded behind a
    `latest` token, so the last pasted link wins, and goes to `linkOpened` or to `linkFailed` on `paste`, which puts
    the page's own hash back.
  - One window key handler switches on the edited planner's `Session`, `unreachable` as its default. While
    confirming, ⌘Z and Esc cancel and ⇧⌘Z and / do nothing; otherwise ⌘Z undoes, ⇧⌘Z redoes, / focuses the filter and
    Esc goes back to the next choice.
  - `confirm` commits the Cascade preview's Build and selects the first pick it cleared (`firstCleared`).
  - Each side keeps its own `TrailState`, so switching sides keeps a trail's folds and skills left unspent.
  - While confirming, everything behind the Cascade preview is `inert` (`planner-behind`), and the preview keeps Tab
    inside itself.
  - The fork's toggle maps its segments onto `show` through `SEGMENT_SHOWS`; on a phone it offers First and Second,
    and presses the edited side's segment when both would show. `scoreDiffers` marks, while forked, the scores on a
    card that differ from the other Build's.

## Design notes

- `planner.css` styles the page phone first: the bar and menu, the trail's card, stops, chips, steps and folded
  rows, and the Undo line. Every value is a token from `tokens.css`; component looks stay in the design system's
  `components.css`. Every target is at least 44 px. `planner-behind` wraps the page behind the overlay with
  `display: contents`, so making it inert changes no layout. The arrival (`trail-arrive`) runs only under
  `prefers-reduced-motion: no-preference`.
- Focus:
  - the Cascade preview opens on Cancel, the least destructive action;
  - when it closes, focus goes back to the last element focused outside any dialog (`focusin` tracking in `Planner.tsx`);
  - a list's filter takes focus only under a fine pointer, without scrolling, so the step's own scroll into view wins;
  - "Clear this pick" sits after the options, so Tab from the filter reaches an option first.
- Before level 1 the tiles show the point buy only. The walk applies race and its +2 at level 1, as the game's
  character creation does, so the card says so rather than computing race early.
- The class, Mythic class and race lists are S's `offeredClasses`, `offeredMythicClasses` and `offeredRaces` (map
  ticket 34).
- Nothing moves under the pointer: refusals and the link notice float in `planner-notices`, a fixed area at the top
  right; the +2 buttons keep their place, disabled, before a race is chosen or for a race that sets its bonuses; the
  Undo line keeps its place at the bottom.
- "Close the fork…" asks first ("Keep the Second Build and drop the First Build?"), sits at least 24 px from the
  toggle, and only "Keep Second" drops a Build.
- Picker lists are sorted by name, and the closed summary counts each reason once ("need a prerequisite", "refused by
  the game").
- The Skills chip says what its level holds ("4 ranks"), and "2 of 4" while the last level's budget isn't spent.
- A refusal names its place in words ("Level 2: …") and, through R's `refusalWords`, the unmet needs after the rule's
  sentence.
- The class list costs a walk per class, so it is built only while "Another class…", the level editor or an empty
  Build's first step shows it; otherwise only the previous class is judged, for its Continue button.
- The runtime checks that stay: `resolve`, the constructors where values come in, the walk's rules across fields
  (point buy, an increase every 4th level, skill totals, the rank cap), the workspace's guard while confirming (backed
  by the inert background), the `latest` tokens, the `sameBuild` skip, `ShareCode`'s `failed`, and the second planner
  reset at fork.

### Questions built the prototype's way, waiting on the user (build ticket 07)

1. A Human's bonus feat comes from the race, so it is a chip on the character card, not a Level 1 pick.
2. A due Mythic rank is a list of paths each time, with the current path first and marked; there is no one-tap
   "Continue as <path>".
3. Adding a level never adds its Mythic rank; the rank is offered as the next step once its Expected level is reached.
4. Step titles use the selection's game name in lower case without "selection" ("choose discovery (alchemist)").

## Tests

- `trail-state.test.tsx`, the step model on the committed data: auto-advance (a fresh Build, or a linked one without
  scores, starts on the ability scores; one with scores starts on a first class;
  the character's slots, then the level's in the walk's order; then a due increase, the last level's skills and the
  next level; a due Mythic rank before the next level, and "Not now"), skills closing on the walk's budget or on Done,
  chapters and folding (a finished chapter before the step folds; the current, an unfinished and a tapped one don't;
  a new level folds them again; the card's one line), a Cascade landing on the first pick it cleared, and which
  choices stay open through an edit. `filled` takes the first open option in every empty slot.
- `planner.test.tsx` checks the page against the MCP (build ticket 05) and the trail (build ticket 07).
  - `fighterThroughMcp` builds a level 1 Fighter through the MCP: Strength 13, then the first open option in every
    slot, Power Attack where it is open. Each step's code opens through the Share link to the same Build, encodes back
    to the same code, and shows every pick on the trail (`trailOf`). Builds are compared with their picks in one order
    (`ordered`), because the code keeps the picks, not the order they were made in. Jack in the Green (the gold Build)
    opens with every level and Mythic rank; a link that does not open says so, in R's words, and starts empty.
  - Lowering Strength under Power Attack waits on the Cascade preview; cancel keeps the Build, confirm clears Power
    Attack, and undo restores the Build.
  - The trail: a reload keeps the Build through `#b=`; a pick opens the next choice and the Undo line names it; a
    tapped chip opens its pick with "Back to the next choice"; Continue adds a level in one tap; the class list waits
    for "Another class…" and offers player classes only; the Mythic path lists; the menu copies the link and exports
    the build sheet. `apiOf` gives a step a `TrailApi` over a planner.
  - The render regressions of build ticket 05d, each written to fail before its fix, moved onto the trail: the notice
    survives undo; ⌘Z in the preview; a chip's pick waiting on the preview keeps its step open, also after Cancel; Tab
    leaving the preview and the inert background; focus on Cancel and back on the control; side by side after
    narrowing to a phone; two hash decodes out of order; a failed paste; the link notice that never cleared; the page's
    own Build re-applied as an undo entry (`storedBlockCode` writes the same Build as another code); a hash pasted
    while loading; "Making the link…" while encoding; a class the list doesn't offer; the race chip pressed after a
    change; the +2 row's place; the floating refusal; the score steppers' bounds; Close keeping the edited Build and
    asking first; Retry; and `loadEngine` asking again. A Cascade confirmed lands on the first pick it cleared.
  - The page renders whole with the engine module mocked (`gate.load`), C wrapped so a test can hold a decode or an
    encode (`gate.decodeHolds`, `gate.encodeHold`), and a `FakeMediaQueryList` for the phone width.
- `planner-state.test.tsx`: one test per cell of `reducePlanner`'s table (an applied edit and a confirm keep their
  title as `change`), the edit outcomes, and the type-level tests (`expectTypeOf`): the unions hold no impossible
  state, the constructors return a value or undefined, and a Build holds only codable values.
- `workspace-state.test.tsx`: fork, Close keeping either Build with its history, the guard while confirming, the
  phone projection, the link status, `resolve` after each way its target goes, and a seeded sequence test: a
  hand-written generator (`seeded`, no dependency) runs random actions through `reducePage`, and after every step at
  most the edited planner is confirming, `shown` holds the edited side, each `present` round-trips through C into a
  `sameBuild` Build, and `resolve` gives undefined or a selection whose target exists.
- The data is found from the repo root, because jsdom's `import.meta.url` isn't a `file:` URL.
