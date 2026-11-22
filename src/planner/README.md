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

- **The character card**: the alignment as a wheel (as the game and the Rust planner
  draw it: Neutral Good at the top, the other eight around the ring, True Neutral in the middle; good tinted blue across
  the top, neutral at the sides, evil red across the bottom; the name of the alignment under the pointer or focus, else
  the chosen one, above it), the six ability scores as tiles
  with − and + steppers and a +2 button under each (disabled, in the same place, when the race sets its bonuses), the
  points left, and the character's own picks as a column of labeled search fields (user, 2026-11-21;
  `CharacterField.tsx`): Race at the top, then what the race grants (a Human's bonus feat), the background and the
  deity. Which slots those are is S's answer (`characterWideSlots`), so nothing character-wide sits on the Level 1
  stop. A field shows its label and the current choice, or "Choose your …" in the accent style while unset; the one the
  trail waits on is underlined in gold. Inline first, focusing or typing in it opens its list under it (the lists'
  field mode, `FieldMode` on `ChoiceList` and `PickStep`: the same cap, windowing, closed rows and keys), and a pick
  closes it and moves the trail on, with no step heading, Back or Expand around it. While closed, a field computes
  nothing (its rows and picker load only while its list is open). Modal first, focusing or clicking it opens the
  dialog instead. A field whose step arrives through auto-advance opens itself (and takes focus under a fine pointer;
  on touch its first option does), never on first load. Both are the trail's call, not the field's (QA pass 5): a
  field arrives only when the trail's next step becomes it (`arriving` in `Trail.tsx`), so a pick made elsewhere
  never opens a waiting field, and any change to the Build closes an open field's dialog. A click on a focused
  field reopens its list. An arrival is taken once (QA pass 6): the field (or the alignment wheel) reports it handled
  (`onArrived`) and the trail clears `arriving`, so a list or wheel rebuilt by a later change never arrives again; a
  stale arrival used to reopen Background's list and focus its picked row a moment after the pick, above Deity's,
  and to refocus the wheel after a race change. On touch the arriving field's first option takes focus unless focus
  is already in that field, so the previous field's list closes (its focus left it) after a tap, an Undo or a race
  change; under a fine pointer its filter does.
- **The trail**: one stop per character level, titled with its class and class level, with its picks as chips: each
  slot the walk opens there, an Archetype chip at a class's first level when it has archetypes, the ability increase
  when the walk offers one, and the skills ("4 ranks"). Each Mythic rank is its own stop after the level it is taken at,
  in the Mythic color; every 4th level is a milestone, marked in gold.
- **Gear**: a card after the trail, one line listing what is worn; a tap opens the places and their items in place.

**The current step opens in place**, on its stop, in the character card, or on a new stop after the last level, and
scrolls into view with a short arrival (off under `prefers-reduced-motion`; it never blocks input). Its title speaks
to the player in the planner's own words: "Level 5 · choose feat", "Your character · choose deity", "Onward to level 6".

**The next step** is the first of these that is open, in reading order (`nextStep`):

1. the race, while the Build has none (below, "Flat lists"), since its bonuses shape the scores. The race is a
   labeled field at the top of the character card ("Race", "Choose your race" in the accent color while unset;
   `trail-race`), and its list opens right under it, above the tiles. So a fresh Build opens here (user, 2026-11-21);
2. the ability scores, while the Build has none: the step opens in the character card in the tiles' place, and stays
   open through its edits (+2 and alignment included) until "Done" ("Done · leave N unspent" while points are
   left), which keeps every score at 10 when none was changed. The step is due too while the race gives +2 to an
   ability of your choice and none is chosen (S's `raceStatPending`, QA pass 6), as after a race change to Human:
   "Choose a score for the race's +2." shows under the tiles and "Done" waits until a +2 is placed. A link opens on
   its first unfinished step;
2b. the alignment, while the Build has none (QA pass 5): an unset alignment is unknown, so every pick that asks for one
   waits for it. The wheel in the character card is its field: outlined in gold with "Choose an alignment" while the
   trail waits on it, and arriving there scrolls it into view and focuses its first node. It comes before the first
   class, and so before the deity and every other character choice.
3. the first empty slot with the character, then the first empty slot on the trail, in the walk's order;
4. an ability increase the walk offers and the Build hasn't taken;
5. the last level's skills, until the walk's budget for that level is spent or the player chooses "Done · leave N
   unspent";
6. a Mythic rank whose Expected level (ADR 0003) the Build has reached, offered as the Mythic paths with their status,
   the current path first and marked (before any rank, the game's starting Mythic class, S's `mythicStartingClass`,
   comes first but unmarked, since nothing is current yet); "Not now" puts it off until the next level. No rank is
   offered once the walk says the ranks have ended (`Walk.ranksEnded`, Legend at rank 8);
7. the next level: "Continue as <previous class> → level N" in one tap, or "Another class…", which lists every class
   (and each archetype of a class the Build hasn't taken, below) with its status, the previous class first, then the
   open ones, then the closed ones with their reasons. At the level cap (`Walk.maxCharacterLevel`, `atLevelCap`) no
   next level is offered: a due Mythic rank still is, even after "Not now" (which the cap hides), and otherwise the
   trail simply ends on the cap level's stop, with no closing card (user, 2026-11-21; `complete`, where `end`).

Each pick goes back to the next step. Tapping any chip (or a stop's title, for its class, archetype and removal, or a
rank's, for its path and Rank level) opens that choice in place, with "Back to the next choice" only when it isn't the next choice already; the ability scores,
the skills, a rank and Gear stay open through their edits, everything else returns to the next step once it applies. An edit that breaks later
picks goes through the Cascade preview as before, which lists what E clears: the picks, the levels whose skill ranks
go (`clearedSkills`) and the Mythic ranks that go (`clearedRanks`), worded together (`clearsSummary`, `clearsList`);
once confirmed, the page lands on the first pick it cleared.

**Icons**: a feat's chip and its row in a pick list carry its category's icon (`feat-category.ts`).

**A feat held for a spell** (map 22, QA pass 4): spells aren't in the planner yet, so a feat whose parameter is a spell
(`SpellSpecialization`, `LearnSpell`) can only be held without one, as the gold Build holds Spell Specialization at
level 11. The walk doesn't count such a pick, so the trail credits it itself (`spellPick`, filled in by `shownSlots`):
the slot is no open step, its chip and the sheet name the feat, and the chip and the slot's list say the spell isn't in
the planner yet (`SPELL_NOT_MODELLED`).

**Lists**: a pick list is open, sorted by name, with a filter above it that takes focus only under a fine pointer (so a
phone keeps its keyboard down); the filter matches each typed word on its own (`matches`: "tiefling rak" finds
Rakshasa-Spawn) and says "No matches for …" when nothing does. A choice list ranks what matches (`matchRank`, `ranked`, QA pass 5): a name
that starts with the text first, then one where every typed word starts a word, then the rest, each in list order,
so "human" and Enter take Human, not Half-Orc · Human-Raised. A slot's pick list and the Gear list order their matches the same way
(`rankOrder`). In the filter, Up and Down move a mark over the open rows
(`clampMark`) and Enter takes the marked row, the first until moved; on the rows, Up, Down, J and K move the focus
(`moveThroughOptions`). The filter's placeholder is just "Filter", so it fits at 375 px (QA pass 5); `/` focuses it from anywhere, announced as its `aria-keyshortcuts`. The current pick is marked; closed rows show R's reasons; an open row carries no badge, since
a row you can tap is open. Closed rows are hidden until "Show N closed", which shows every one of them at once (QA
pass 3; 201 closed feats render in about 35 ms in a production build). Names are S's
bare names, qualified only when two in the same list share one (`shownName`, `pickLabels`, `bareNameOf`). A small set
(+2, the six ability increases, the last one marked "as before") is a row of buttons. A class or path list gets the
filter from 13 rows up. An open parent's values
are sorted by name, open before closed, and a level's archetype list starts with "No archetype", then the held
archetype, then the rest by name.

**Focus**: when a new step arrives and focus was lost with the old one (on the page body), it lands on the step's
first control: the filter under a fine pointer, else its first button, never "Back to the next choice".

**First draw** (build ticket 11): the page opens at the top with nothing focused, so the first Tab reaches the top
bar. The step region's scroll into view and focus, and a filter's own focus, wait until the step has changed since the
page loaded (`StepArrived`, a context `Trail` provides; sticky once true), and the browser's scroll restoration is
manual, so a reload starts at the top too. The scroll and focus run in the next animation frame, after paint. A
list's marked row is kept in view by scrolling the list box only (`scrollToIndex`), never the page.

**The Build's name** (build ticket 11, `BuildName.tsx`): a label centred in the top bar (portalled into the shell's
`#app-header-center`; in the toolbar when there is no shell, as in tests) shows the Build's name, or "Untitled
Build" in `ink-muted`. A click, Enter or Space turns it into a text field in place; Enter or leaving the field saves
through E's `rename` (one Undo entry, "Named the Build …"), Escape cancels and keeps the step, and a blank name
clears it. A name past 60 characters (`MAX_NAME_LENGTH`, counted in code points) is refused in R's words
(`buildNameLength`) under the field; leaving the field then cancels. The field's text is set once when it opens,
not bound, so a re-render (the refusal) never resets what is typed. The document title is "<name> · Worldwound
Planner" (`pageTitle`). The name travels in the Build code, so a link or a reload keeps it.

**Choice lists: inline first or modal first** (build ticket 10, user 2026-11-21): the ⋯ menu's "Choice lists" group
switches every list step (a slot, the race, a level's or rank's editor, a due Mythic rank, the next level, Gear:
`isListStep`) between two frames around the same list component, so filtering, statuses, closed rows and nested
sub-choices are shared. The choice is kept per viewer in `localStorage` (`wotr.choiceLists`, `list-mode.ts`, read and
written under try/catch; the page works without storage).
- **Inline first** (the default): the list sits in the trail as before, and "Expand" opens it in the dialog.
- **Modal first**: a list step opens in the dialog when it arrives (never on page load), and the trail shows "Open the
  list" in its place.
- **The dialog** (`ChoiceDialog.tsx`, in a `Portal`): centered over most of the viewport on desktop with a detail pane
  for the option under the pointer, under focus or marked from the filter, full screen without it under 600 px; a header naming the
  step, the scores the step reads, and "← Back". Focus moves into it (the filter under a fine pointer, else the first
  option). Closed by Escape, Back or the back button, it gives focus back to the opener, or to the step's button when
  the opener is gone; closed because a pick moved the trail on, it leaves focus to the next step: that step's arrival
  focuses its first control, and failing that the targeted chip, the targeted field's filter (a Modal first field's input is left alone, since focusing it opens
  its dialog) or the step's first control does
  (`focusNextStep`, QA pass 5), never ⋯ or the control that opened a dialog several picks ago. While another dialog is
  open (the next field's, or a Cascade preview that only hid this one) it leaves focus to that dialog, so after Cancel
  focus goes back to the field and its dialog is back; the page behind doesn't scroll
  (`choice-open` on the root). Escape or Back closes it without picking; Escape is caught at the document while it is
  open (capture phase), so one press closes it from anywhere in it, the filter included, whatever is typed, and the
  page's own Escape (leave the step) skips a key the dialog took. Open dialogs share one history entry, and
  `history-moves.ts` owns every move the planner makes in history (QA pass 5): a dialog takes the entry when it opens
  (`holdDialogEntry`) and gives it back exactly once when the last one closes, by a `history.back()` the module counts
  as its own (`releaseDialogEntry`). Until that back has landed, nothing else moves: a new dialog's push and the
  Build's `#b=` write wait (`afterHistorySettles`), and once it lands the newest code is written onto the entry it
  landed on (`onHistorySettled`). The popstate and hashchange that follow a move of its own are never read as a link
  the user opened (`isOwnHashChange`), so a pick made in a dialog can't come back as "Opened a link" with the Build
  before it. The Build's code is written only through `writeHash`, which keeps the entry's state and marks it
  `plannerEntry` (QA pass 6): writing `#b=` used to replace the state with `null`, so a dialog's entry lost its mark
  after its first pick, the next dialog pushed another one, and no close gave either back; after a few chained Modal
  first picks a browser Back landed on an older `#b=`. Now every close finds its entry and releases it, whatever closed
  the dialog. A Back or Forward that lands on an entry the planner wrote, with no dialog open, is a move of its own
  too: the current code is written onto it and the Build stays (Undo is for going back). The entry a link opened in
  is marked once the Build is open (`holdsHash`), so this holds from the first pick. A phone's back while a dialog is open closes the dialog the same way (`onUserPop`). A pick applies, closes it and the trail moves on; Undo works while
  it is open. Whether it is open is the trail's state, not the dialog's (`TrailState.dialog`, the step key it shows,
  QA pass 3): arriving at a list step or "Open the list" sets it, Back, Escape or the back button clears it. A Cascade
  preview hides it without clearing it, so it is back after Cancel, and a chip of the step whose dialog was closed
  opens it again in one click instead of leaving the step.
  Inside it the list is capped at 60vh (`--choice-list-max: 60vh`), so it windows like the inline list.

**Capped lists, closed choices hidden** (user, 2026-11-21): every choice list (a slot's pick list, the race,
background, class, archetype and Mythic path lists, and the Gear items) scrolls inside a capped height
(`trail-scroll`, `SCROLL_STYLE`: `max-height: var(--choice-list-max)`, `overflow-y: auto`), at least six and a half
rows (`--choice-list-max` is 6.5 rows and their gaps, in `tokens.css`), with the filter and the
headings outside the scroll. The marked row Enter takes is kept in view (`scrollToIndex`), and keyboard focus scrolls
the row it reaches. Closed choices are hidden by default: "Show N closed" below the list reveals them with their
grouped reasons, and "Hide closed" hides them again; the choice is remembered per list kind for the session, in the
trail's state (`closedShown`, `toggleClosed`; `closedToggle` in `steps.tsx`). A list with no open row says "No choices
open here" and keeps the button. The Build's current pick shows even when it has become closed, marked Current.

**Inline lists collapse to their filter** (user, 2026-11-21): in the trail (inline first), a list with a filter shows
only the filter and, when there is one, the current pick, until the filter or a row in it has focus; then the list
opens under the filter (`createListPanel` in `list-panel.ts`, turned on by the `CollapsedLists` context that `Here`
gives its inline children; inside the dialog, and in a list too short for a filter, the list always shows). Typing,
Up or Down open it too. It closes when focus moves outside the step, on a tap outside it, on Escape (which then
leaves the step where it is) and after a pick. A press inside the step never closes it, so a tap on a row lands even
where a tap doesn't focus the button. A step that arrives through auto-advance opens its list at once (and its filter
takes focus under a fine pointer); on first load nothing opens, as ticket 11 asks.

**Compact rows** (user, 2026-11-21): a row is one line, 44 px (`--choice-row-height`), the tap-target minimum, with a
4 px gap (`--choice-row-gap`). A list whose rows carry a second line (a pick list, with its Synergy line, or a class
list with notes) is 60 px a row (`--choice-row-two-line`, `trail-scroll--two-line`), the same for every row in it, so
windowing holds.

**Windowed lists** (coordinator, 2026-11-21): the open rows of a pick list and of the class, path and archetype lists
render through `WindowedRows` (`WindowedRows.tsx`): only the rows in the scroll box plus `OVERSCAN` (6) above and
below, with spacer blocks for the rest. Every row is one fixed height, `--choice-row-height`
(`trail-window-row--fixed`, the name and the meta line cut with an ellipsis), so a row's place is its index times the
row height and gap (`rowHeightOf`, `windowOf`) and no row is measured. An expanded parent's sub-options are rows of their own in the same window
(`trail-sub-row`, `data-child-of`), so the pick list is one flat list of parents and sub-options. Filtering, the mark
and keyboard movement work on that list, not the DOM; a row keeps its element while its item and index are unchanged,
so scrolling and expanding rebuild only the rows that come into view. Without layout (jsdom) every row renders. The
closed rows, shown on demand and capped, render after the window. Measured on the Gold Dragon Jack Build's M9 Dragon
Feat chip (258 options) in a production build with the tab in front: opening it went from 46–62 ms to 35–71 ms with
13 rows in the DOM instead of 258, and a pick takes 32–37 ms both before and after. The dev server's figures (about
260 ms and 110 ms) are mostly Solid's development instrumentation.

**Sub-choices nested in pick lists** (build ticket 08, user 2026-11-21): in a pick list, an option that opens a
further choice is one parent row that expands its sub-options right under it, indented a step with a rule on the left
(`trail-sub-row`), the parent marked ▸ or ▾ (`aria-expanded`). Two kinds, from S's options (`nested-options.ts`,
`pickRows`): a parametrized feat's values, its options sharing a feature with different parameters (Weapon Focus →
Kukri, Spell Focus → its schools); and an option that is itself a selection (Armor Focus → Light Armor Focus; a
prestige class's spellbook selection), whose sub-options are S's picker at the slot it opens (`childSlotOf`), asked
only when it is expanded. One parent is open at a time. Each sub-option shows its own status and R's Refusal; a
parametrized feat whose every value is closed is one closed row with its reasons. Taking a sub-option makes the whole
choice as one change, one Undo entry (a value is one pick with its parameter; a nested selection is the parent pick
and the sub-pick, after clearing the sub-pick of a parent it replaces), then the trail moves on. Keys: Right (or
Enter, a click) opens a parent, Left closes it and returns to it from a sub-option, Up and Down move through the
parents and the open sub-options in order. The filter matches a parent by its name or its values' names; Enter on a
marked parent opens it.

**Flat lists** (user, 2026-11-21): a choice that opens a second choice is listed as one row per pair, so typing in the filter finds either name, and a row takes both as one change (one Undo entry). Each
name is S's bare name, and a variation never repeats its group: "Aasimar" and "Scholar (Nature)", not "Aasimar (Aasimar
(Heritage))" or "Scholar (Scholar — Nature)" (`flatName`). The group "None" (no background) is not listed:

- the race with its heritage after a dot, "Tiefling · Beastbrood (Rakshasa-Spawn)" (`joinedName`; QA pass 3 found
  the nested parentheses of the first form, "Tiefling (Beastbrood (Rakshasa-Spawn))", hard to read), or the race alone when it opens none (a
  Human's bonus feat stays a pick of its own). The heritage is the race's own selection in the game's Racial feature
  group. A row works before level 1: the heritage pick waits in the Build for the slot level 1 opens. Changing the
  race clears the old heritage first, so the old pick never lingers;
- the background group with its variation in parentheses, "Noble (Courtier)" (`flatName`), or the group alone;
- the class with its archetype after a dot, "Fighter · Two-Handed Fighter" (`joinedName`), in the class list for a class the Build hasn't taken
  (an archetype belongs to a class's first level).

The race chip and the background chip name the pair; the heritage and the variation have no chip of their own. Each
list's statuses come from S at one walk: `racePicker` (each race's own refusal and its heritage options),
`backgroundPicker` (each group with its variations' picker) and `classPicker` (each class at the place, the classes the
game hides left out, and each archetype's own status). A row is open when its group and its variation are; what it
would break later is found when it is taken: the edits apply, wait on the Cascade preview, or are refused. The race
list opens in about 55 ms and the first class list, 236 rows with the archetypes, in about 160 ms.

**Skills**: a budget line ("3 of 4 skill points spent") on the last level, "Same as level N−1" (only when it would
change the level, `sameRanks`), and − and + steppers; a + is disabled when the walk refuses that rank (`allows` on the
open step's level only: the rank cap or no points left), as the score steppers stop at their bounds.
A past level shows its ranks without a budget. The budget is the walk's (`Walk.skillPoints`), never the page's.

**Undo**: one line at the bottom naming the last change ("Picked Acid Bomb · Undo"; "Opened a link" after a pasted
link), offered while there is history, plus ⌘Z and ⇧⌘Z. After an undo it names the change now on top. There are no Undo and Redo buttons.
An edit that changes nothing (`sameBuild`) adds no history entry. The bar is opaque, so chips never show through.

**Gear marks** (ADR 0002): a pick the walk marks as taken through Gear (`Walk.gearDependent`, `gearDependentSlots`)
carries ◈ on its chip and "(Gear)" after its name in the folded rows and Export; Export's score line says "(Gear
counted)" when the Build counts Gear, so it reads as the card does.

**Folding, phones only (under 900 px)**: once level 1 is done (every choice made, `levelOneDone`) the character card
shrinks to one line (race, alignment, +2 and the character's picks) until tapped; before that it is open with its
controls. Levels group into chapters of four, ending on the milestones; a finished
chapter before the current step folds into one row (its classes, counted as "Alchemist ×4" so the count never reads as a class level, Mythic ranks and picks), which a tap opens and "Fold
levels N–M" closes. Taking the next level folds them all again. The chapter holding the current step never folds. From
900 px wide nothing folds: the card keeps its race, alignment and score controls, and the trail is a centred column.

**The menu (⋯)**: Copy link, Fork this Build, and Export as text (a plain build sheet copied to the clipboard). A copy
closes the menu and says so beside it for a moment; a refused copy keeps the menu open with the reason. The
address bar keeps the Build in `#b=`, so a reload opens it again. When forked, the compare toggle and "Close the fork…"
sit beside the menu; a phone shows one trail with the toggle, a desktop two side by side, the one not being edited
dimmed and inert behind "Edit the Second Build".

## Public entry

`index.ts` imports `planner.css` and exports `Planner`, the page.

**QA pass 2** (2026-11-21):
- A refusal names its reasons before the picks it would break (`brokenWords`); a reason the same at several places
  shows once with them, in runs (R's `groupedFailures` and `placesWords`: "Levels 1–9: …", QA pass 6). It shows the first `NOTICE_LINES` and
  folds the rest into "…and N more" (`RefusalNotice`); the notice area is capped (`--notice-max-height`) and scrolls,
  so its lines are reachable on a phone.
- The Cascade preview gives one count of what it clears ("This breaks 14 later choices: …", "Clear 14 choices"),
  its rows in walk order, levels and ranks interleaved by where they fall (`clearsList`).
- Levels whose skill ranks a confirmed Cascade cleared (`Pending.clearedSkills`) come back as a trail step until spent
  or left (`skillsCleared`, `clearedSkillsDue`), with the budget line and "Done · leave N unspent". They come in walk
  order with the empty slots (QA pass 3, `afterLevel` in `nextStep`): a cleared level's skills come before a later
  level's empty pick, and an increase due at or before that level comes before them.
- "Same as level N−1" shows only when the walk allows it; the skills step's checks (the + steppers and "Same as") run
  once per Build change, just after the edit paints (`skillChecks`).
- The folded card line and Export name the race and background as their flat pairs (`characterPicksLine`).
- A refused copy keeps its menu label and says why in the status beside ⋯.
- A broken link says it came from a newer planner only when its version byte is higher and its body still inflates
  (`looksNewer`); otherwise it isn't a planner link.
- The level editor sorts archetypes by name, the current one first; "Builds on" and "Enables" use R's bare names.

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
  - An edit whose result is the same Build (`sameBuild`) adds no history entry and leaves `idle`.
  - `edits` is the same for several edits as one change, one history entry under one title: `verdictOfAll` folds
    `verdictOf` over them, adding up what each clears, and stops at the first that breaks. `judgeAll` words that
    verdict for a list row (open, open with "Clears N later picks", or closed with `brokenWords`).
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
  actions; `edit` and `editAll` return the `EditOutcome`.
- **`workspace-state.ts`: the page (map 13).** `WorkspaceState` is the `View` (one Build, `single`, or a fork,
  `forked`, with its `layout`, `one` or `both`, and the edited `side`), the `Selection`, and the
  `LinkStatus` (`ok`, or `didNotOpen` on `load` or on `paste`, with its `LinkReason`). The `Selection` is the choice
  the player tapped open on the trail: a slot, a level's class (`level`), its ability increase (`increase`) or skills
  (`skills`), a rank, Gear, the ability scores (`scores`, which the trail selects at their first edit to keep the
  step open) or the race (`race`); undefined follows the next step. `reduceWorkspace(state,
  action, editing)`:
  - `fork` only from `single`, to `forked`, `both`, `second`;
  - `show` only when forked; the toggle's segments map onto it through a `Record`;
  - `close` only when forked, back to `single`;
  - a side switch (`show` or `select` naming the other side), `fork` and `close` are refused while the edited planner
    is confirming;
  - `select` sets the selection, and the side when it names one;
  - `linkOpened` and `dismissLink` set the link back to `ok`, and `linkFailed` sets `didNotOpen`. Edits never clear it.
    `linkOpened` also closes any open step, so the trail resolves as on load.

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
- **`flat-choices.ts`: the flat lists.** `FlatChoice` is a row: its name, the edits it takes as one change, whether it
  is the Build's, and its status. `flatName` writes "Group (Variation)"; `after` puts clearing edits first.
  `raceChoices` (on S's `racePicker`), `backgroundChoices` (on S's `backgroundPicker`) and the labels `raceLabel` and
  `backgroundLabel`; `heritageSlot` (S's `heritageSlotIn`, found with S's `firstLevelWith` before the Build has a
  level), `backgroundChildren`
  and `shownArchetypes` (a class's archetypes the game shows).
- **`nested-options.ts`: the parent rows of a pick list.** `PickRow` is an `option`, a `params` group (a
  parametrized feat's values) or a `nested` selection; `pickRows` groups, filters and sorts S's options into them;
  `rowOpen` and `rowMembers` read a row; `opensSelection` says an option is a selection; `childSlotOf` is the slot it
  opens; `optionKey` keys an option with its parameter.
- **`PickStep.tsx`**: a slot's open list (`PickStep`, moved out of `steps.tsx`): S's options as rows, open then
  closed, a parent row expanding its sub-options in place (`paramLabel` names a value without repeating its feat),
  the keys above, Synergy links, the filter and its mark, "Show N closed", and "Clear this pick".
- **Gear's place and filter** survive Expand and closing (QA pass 5): the chosen place is the trail's
  (`TrailState.gearPlace`) and the typed text the step's (`StepFilter`), so the inline card and the dialog share them.
- **Gear that won't stack** (`gear-clash.ts`): E's `gearClashes` names the bonuses an item would give in a place that
  won't stack with what the Build holds or wears elsewhere, worded by `stackWords`. A worn item that clashes says so
  under it; in the item list a row carries a "Won't stack" badge and the dialog's pane the sentence. E's
  `gearClashIndex` walks the Build once per place, and the planner keeps that index and each item's words per Build and
  place, so the whole list's badges cost one walk.
- **A step's filter text** lives in `Here` (`StepFilter`, `createFilterMemory` in `list-panel.ts`), not in the list, so
  Expand and the dialog's return after a Cascade Cancel keep what was typed.
- **The address bar** takes a Build's code only when the code is the active Build's own (`ShareCode`'s `of`), so a
  Fork never writes the empty second Build's code while its own code is still being made.
- **`list-mode.ts`**: `ListMode`, `readListMode`/`writeListMode` (try/catch around `localStorage`, `browserStorage`)
  and `isListStep`. **`ChoiceDialog.tsx`**: the modal frame (`ChoiceDialog`, `detailOf`, `dialogStart`).
- **`option-detail.ts`**: what an option says beyond its name (ticket 06's UI side). `summaryFor` is S's Summary of a
  blueprint (`summaryText`, `summaryLabels`, `writtenSummary` from `engine/describe`), cached per data document. A
  row shows it as its one meta line, cut with an ellipsis, and falls back to its link line when there is none; Gear
  items show it in the list (two lines at most) and under the worn item. `topicWords`, `sharedWords`
  and `stackWords` (from `engine/links`, shared with the MCP) put S's Synergy in words for every topic kind (ability, weapon, weapon group, school, energy,
  descriptor) and for a bonus that won't stack; a row carries a "Synergy" badge when it builds on or shares a topic
  with what the Build holds, and a "Won't stack" badge for a clash. The detail pane gets the whole story through the
  `OptionDetails` context: a list hands the dialog a resolver from a row's `data-detail-key` to an `OptionDetail`, and
  points it at the marked row as the mark moves; the pane then shows the name, Current and Open or Closed, the
  Refusal, the written Summary and its labels by role (or "No summary yet."), the won't-stack warnings, and every
  link (builds on, shares, enables) without "and N more". Linked feats are named by `linkNames` (`engine/links`: each bare name once, no qualifier, sorted here). What a value enables comes from `enablesWith` (`engine/links`), so a weapon
  value lists only what its weapon can lead to (Weapon Focus (Rapier) enables Fencing Grace, (Bardiche) doesn't).
  A pointed key (the marked row) applies a microtask later, and only if nothing newer was pointed at since. The lists
  point again whenever their rows change (a filter, an expanded parent), so the pane never keeps a row the list no
  longer shows: it moves to the marked row, or empties when nothing is listed (QA pass 5). A parent row speaks for all its values: open when any is,
  sharing what any of them shares. Rows without a resolver fall back to what the row shows (`detailOf`).
- **`CharacterSteps.tsx`**: `RaceStep` and `BackgroundStep`, the flat race and background lists in place.
- **`words.ts`: names for the planner's surfaces.** Game names (ADR 0006) and the planner's own words, never the game's
  text. `ordinal` writes "1st", "2nd", "3rd", "4th"…; `optionName` is an option's name: the feature's game name, with
  its parameter's when it takes one.
- **`trail-state.ts`: the step model (build ticket 07).** Pure functions over a `TrailView` (the data, the Build and
  its walk) and a small `TrailState` with its reducer `reduceTrail`, the page's own memory per Build: the levels whose
  skills were left unspent (`skillsLeft`), the level a Mythic rank was put off at (`mythicLater`), the chapters tapped
  open (`unfolded`), the character card opened or closed by hand (`characterOpen`), "Another class…" (`otherClass`) and
  the list kinds whose closed choices are shown (`closedShown`).
  `levelAdded` folds every chapter again and closes the class list.
  - `Step` is a `Selection`, a due Mythic rank (`mythic`) or the next level (`nextLevel`); `nextStep` gives the next
    one in the order above, `whereOf` where it opens (the character, the score tiles, a level, a rank, the next stop,
    or Gear) and
    `stepTitle` its title. `slotLabel` names a slot (the selection's game name without "selection"; build question 4
    below), lower case in a title. `slotName` is the name a field, chip and title show: a feat slot the race grants
    (the Human's) reads "Bonus feat" (QA pass 5), so it isn't taken for the level's own feat.
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
- **`CharacterCard.tsx`**: the card, `AlignmentWheel` (`ALIGNMENT_WHEEL`, each alignment's place on the
  ring and its tint), `ScoresStep` (the scores step:
  the tiles with their controls and "Done") and `StatTiles`, whose steppers
  stop at the scores a Build can hold (`MIN_SCORE`, `MAX_SCORE`) and send a point buy the walk refuses to the notice
  area.
- **`steps.tsx`: what opens in place.** `TrailApi` is what a step reads and sends. `SlotStep` is a slot's open list:
  S's options the game shows, open then closed with R's Refusals (all of them once "Show N closed" is pressed), each option's Synergy links (what it builds on that the character already holds at
  the slot, and what it enables), J and K to move, Enter in the filter to take the first open one, and "Clear this
  pick" after the options. `IncreaseStep`, `SkillsStep`, `NextLevelStep` (with the lazy `ClassList`), `MythicStep`,
  `LevelEditor` (class, archetype, Remove level on the last) and `RankEditor` (Rank level stepper with the Expected
  level as a hint, path, Remove rank on the last).
- **`ChoiceList.tsx`**: the class, path and archetype lists. A class or path list takes each row's status from S's
  `classPicker`, one paused walk for the whole list (`judgeClasses` in `planner-state.ts`): open, or closed with R's
  reasons. What a taken row would break is found only when it is taken (the Cascade preview or a refusal). Other rows
  use `judge`: open when `allows` passes, open with "Clears N later picks" when only a `cascade` mends it, else closed
  with `brokenWords`.
  `currentFirst` sorts the current one first, then open, then by name. `Filter` is the list filter (`focusFilter`
  focuses it only under a fine pointer); `FILTER_FROM` is the row count from which a list gets one.
- **`GearStep.tsx`**: the Gear (GLOSSARY.md) in place (`GearStep`), `PLACES` (the Gear places in the walk's order),
  `placeWords` (a place's name in words, "Left Hand", "Ring 1"), and `wornLine` (what the Gear card's line lists: each worn
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
  The menu closes after any item, on Escape, on a tap outside and when the page's link changes (`hashchange`), handing
  focus back to its button. Opening it focuses its first item; Up, Down, Home and End move between its items
  (`moveInMenu`), wrapping at the ends. While a choice dialog is open the Undo bar is fixed above it (`html.choice-open`), and on a
  phone the full-screen dialog stops short of it (`--undo-bar-height`), so Undo stays in reach.
- **`sheet.ts`**: `buildSheet`, the plain-text build sheet Export copies: the character line, the scores, the
  character's picks, one line per level with its class, archetype, picks and skills, one per Mythic rank, and the Gear.
  A nested pick is one entry, as it is one chip on the trail: "Armor Focus (Light Armor Focus)" (`nestedParent`,
  `chipSlots` and `pickLabels` in `trail-state.ts`). `nestedLabel` names the value once: a value whose name already
  repeats its parent, in parentheses or after " — ", keeps only its own part ("Ascendant Element (Electricity)",
  "Elemental Focus (Electricity)"); a parent named "… Selection" drops the word ("Bloodline Feat (Improved
  Initiative)"); and "Bloodline", "Feat" or "Selection" the parent already says leaves the value ("Second Bloodline
  (Draconic — Bronze)"). A value not yet chosen keeps its own chip, so the step stays in
  reach.
- **`Planner.tsx`: the page.**
  - `Boot` is `loading`, `failed` (with Retry, which loads again) or `ready` with the engine, the linked Build, the
    `LinkStatus` and the hash it opened. The ready workspace reads `location.hash` again, so a link pasted while the
    data loaded still opens.
  - Below `PHONE_WIDTH_QUERY` (900 px) the page folds and compare shows one trail with the toggle.
  - `linkCode` is the edited Build's `ShareCode`; the address bar and the Share link both show it (user). The hash is
    written (`replaceState`) only when it is `current`, which also covers a side switch; on `failed` it keeps the last
    good code.
  - A pasted hash (`hashchange`) equal to the current `linkCode` does nothing. Otherwise it is decoded behind a
    `latest` token, so the last pasted link wins, and goes to `linkOpened` or to `linkFailed` on `paste`.
  - A link that doesn't open, on load or pasted, stays in the address bar with the notice saying why, until the Build
    is edited (`brokenOver`): only then does the page write its own code again.
  - One window key handler switches on the edited planner's `Session`, `unreachable` as its default. While
    confirming, ⌘Z and Esc cancel and ⇧⌘Z and / do nothing; otherwise ⌘Z undoes, ⇧⌘Z redoes (also from an empty
    filter, which has no text to undo; a filter with text keeps its own undo), / focuses the filter and Esc goes back
    to the next choice.
  - `confirm` commits the Cascade preview's Build and selects the first pick it cleared (`firstCleared`).
  - Each side keeps its own `TrailState`, so switching sides keeps a trail's folds and skills left unspent.
  - While confirming, everything behind the Cascade preview is `inert` (`planner-behind`), and the preview keeps Tab
    inside itself.
  - The fork's toggle maps its segments onto `show` through `SEGMENT_SHOWS`; on a phone it offers First and Second,
    and presses the edited side's segment when both would show. `scoreDiffers` marks, while forked, the scores on a
    card that differ from the other Build's.

## Design notes

- Layout (QA pass 6): a Mythic rank that is due marks its stop "M" and the rank in the Mythic style, not the next level's
  number. In a two-line windowed list a row's name has the first line to itself and its badges (Current, ▸, Synergy,
  Won't stack) sit at the end of the second, beside the summary, so a long name isn't cut at 375 px; one-line lists
  keep the badges beside the name. Gear's place chips fill as many columns of at least 9rem as their container holds
  (`auto-fill`), so they fit the dialog's narrower column at 800 px, and a chip's name wraps instead of spilling.
- `planner.css` styles the page phone first: the bar and menu, the trail's card, stops, chips, steps and folded
  rows, and the Undo line. Every value is a token from `tokens.css`; component looks stay in the design system's
  `components.css`. Every target is at least 44 px. A tile's controls (the score steppers and +2) fill their track (`width: 100%`, `min-width: 0`, `border-box`, the stepper pair a two-column `minmax(0, 1fr)` grid) and keep their 44 px height, so nothing spills past a tile however narrow its column; checked in the browser at 375, 768, 920 and 1280 px and with the grid squeezed to 80 px tiles. `planner-behind` wraps the page behind the overlay with
  `display: contents`, so making it inert changes no layout. The arrival (`trail-arrive`) runs only under
  `prefers-reduced-motion: no-preference`.
- Focus:
  - the Cascade preview opens on Cancel, the least destructive action;
  - when it closes, focus goes back to the last element focused outside any dialog (`focusin` tracking in `Planner.tsx`),
    or, when that element is gone, to the nearest stable control (`keepFocus`, `stableControl` in `focus-return.ts`:
    the targeted chip, the targeted field's filter, the step's first control, the ⋯ button);
  - a step's first control (`firstControl`) skips its aside links ("Back to the next choice", "Expand", and at the
    skills step "Same as level N" and "Done · leave N unspent"), so arriving at the skills step focuses the first
    skill's stepper (QA pass 5);
  - the same holds wherever a control that had focus goes away (QA pass 3): Escape on the ⋯ menu returns to its
    button, Dismiss on a notice to the nearest stable control, and a skill stepper that turns disabled ("Fewer" at no
    ranks, "More" at the cap) hands focus to the skill's other stepper;
  - in a pick list the filter's Up and Down mark parents and the open values of an expanded parent alike (`nextMark`
    skips closed values), so Enter from the filter opens a parent and, after Down, takes one of its values;
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
- The class list is built only while "Another class…", the level editor or an empty Build's first step shows it;
  otherwise only the previous class is judged, for its Continue button. One `classPicker` walk judges the list (46 ms
  for a level editor on Jack in the Green, from about 0.9 s with an `allows` per class).
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
    while loading; "Making the link…" while encoding; a class the list doesn't offer; the race marked after a
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
