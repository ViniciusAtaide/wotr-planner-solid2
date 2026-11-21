# The levelling trail (UI remake, part 1)

Status: open
Blocked by: none
Plan: [plan](../plan.md)

## Goal

Make the planner page the levelling trail the user picked from the prototype: phone first, with flavor, and with the fewest taps and the least travel between them. The current Timeline and side picker go. A Build reads as the character's path: who they are, then a trail of levels, with the next step always open in place and every pick a chip you can tap to change.

Steps 2 and 3 of the remake's order in `ui-findings-combined.md`. Step 1, the bugs, was fixed in `6d07a62c`.

## Sources to read first

- **The prototype**, variant D: branch `ticket/prototype-levelling-flow` at `1e434669`, in the worktree `~/code/wotr-planner-solid2.worktrees/prototype-levelling-flow`.
  - Run it with the `prototype-levelling-flow` preview config at `/?variant=D`.
  - `src/planner/prototype/flow.ts` holds the step model and `TrailVariant.tsx` the page.
  - Read it as a reference. Never merge it or copy it wholesale: it's throwaway code, with no tests and some shortcuts, listed under "Fix what the prototype cut".
- **The notes folder**, `~/Library/Application Support/Claude/side-session-notes/local_1e4948e3-90e9-4432-a18b-2731593f48d6/`:
  - `prototype-levelling-flow.md`, the handover, with measurements and open questions;
  - `prototype-d-shots/`, five phone screenshots of the target;
  - `ui-findings-combined.md`, the two reviews and the user's requirements: mobile first and flavor;
  - `ui-state-design.md`, the planner's state machine, which this ticket keeps.
- **The map's UI decision:** [Planner UI for fast exploration](../../wotr-planner/issues/13-planner-ui-prototype.md), with its 2026-11-21 amendment.
- `AGENTS.md` before touching `src/`; `src/design/` for the tokens and components.

## Decisions (user, 2026-11-21)

The user picked variant D ("Mix A and C"), then asked for automatic folding on phones ("yeah let's do D"). Where the prototype and this list disagree, this list wins.

### The page, top to bottom
1. **The character card** holds:
   - race, as one-tap chips;
   - alignment, as a 3×3 grid of one-tap buttons;
   - the six ability scores as tiles, each with − and + steppers, and a +2 button when the race lets you choose the bonus, with the points left;
   - the character-wide picks as chips: background and its sub-choices, deity, and whatever the race grants.

   Nothing character-wide sits on the Level 1 row any more.
2. **The trail:** one stop per level, showing its class and class level, with its picks as chips:
   - each selection the level opens;
   - the ability increase on every 4th level;
   - skills, as "N ranks".

   Each Mythic rank is its own stop after the level it was taken at, in the Mythic color. Every 4th level is a milestone, marked in gold.
3. **The current step opens in place,** on its stop or in the character card, and scrolls into view.
   - The step's title speaks to the player: "Level 5 · choose a feat", "Your character · choose a deity", "Onward to level 6". It never uses the game's text (ADR 0006).
   - Arriving takes a short transition, which is off under `prefers-reduced-motion` and never blocks input.

### The flow
4. **Auto-advance:** each pick opens the next empty one. The order is:
   1. the first empty selection;
   2. any ability increase that's due;
   3. the last level's skills, until their budget is spent or the player chooses "Done · leave N unspent";
   4. the next level.
5. **The next level is one tap:** "Continue as <previous class> → level N". "Another class…" opens every class with its status: open ones first, the previous class first, and closed ones showing R's reasons.
6. **A Mythic rank that's due** (by its Expected level, ADR 0003) is offered in place, before the next level, as the list of Mythic classes with their status.
7. **Pick lists are open lists:**
   - a filter above them, which takes focus only with a fine pointer, so the phone keyboard stays down;
   - Enter takes the first open row;
   - open rows sorted by name, the current pick marked, and closed rows showing R's reasons.

   A choice with a handful of options or fewer is a row of buttons instead: race, +2, alignment, the six ability increases (with the last one marked "as before").
8. **Skills:**
   - a budget line ("3 of 4 skill points spent");
   - "Same as level N−1";
   - − and + steppers on each skill.

   A past level shows its ranks without a budget.
9. **Editing:** tap any chip to open that pick in place, with "Back to the next choice". After the pick, the flow returns to the next empty one. A change that breaks later picks goes through the Cascade preview, unchanged. When it clears picks, the flow lands on the first one cleared.
10. **Undo:** one line naming the last change ("Picked Acid Bomb · Undo"), plus ⌘Z and ⇧⌘Z. There are no Undo and Redo buttons.

### Folding (phones only, under 900 px)
11. **The character card shrinks to one line** once level 1 is done (race, alignment, +2 and the character's picks). A tap opens it.
12. **Levels group into chapters of four,** ending on the milestone levels.
    - A finished chapter before the current one folds into one row: its classes, Mythic ranks and picks, with an ellipsis.
    - A tap opens the row, and "Fold levels N–M" closes it.
    - Taking the next level folds them all again.
    - A chapter that holds the current step never folds.
13. **From 900 px wide, nothing folds.** The trail is a centred column.

### The rest of the page
14. **The toolbar becomes a menu** ("⋯"): Share link (copy), Fork this Build, Export. The URL row and the Start and Gear labels go, and the address bar keeps the Build in `#b=`, as today.
15. **Fork and compare keep `workspace-state.ts` as built.** On a phone, they show one trail with the toggle. On desktop, they show two trails side by side.
16. **Touch targets are at least 44 px,** all styling uses the design tokens, and the switcher bar and every `proto-` name are gone.

## Fix what the prototype cut

- **The skills budget comes from the engine, not the UI.** `skillPointsAvailable` is the character's points left, and never below 1. So the prototype re-walked the Build without the last level's skills to learn that level's budget. Give the walk (or `engine/walk`'s public API) a per-level budget, cited like the rest of `stats.ts`.
- **The class list is lazy.** Judging every class with `allows` costs 45–210 ms (Solid devtools flagged 84 ms on each change). Compute it only while "Another class…" is open, and the next-level button's one class only otherwise.
- **The Build survives a reload,** through the existing `#b=` link. The prototype kept it only in memory.
- **The step model is a pure module with tests,** in the style of `planner-state.ts`:
  - next step;
  - its title;
  - which slots are character-wide;
  - chapters and folding;
  - budget and Mythic-due logic.

  The prototype mixed these into components.
- **Edits made through the race, +2, alignment and score controls** reach the Undo line too.
- **Character-wide slots** come from what grants them: the race, the deity selection, and the background base `f926dabeee7f8a54db8f2010b323383c` with its children. Name that GUID with a cite, not a bare string.
- Today's `Timeline.tsx` and `panels.tsx` go once nothing uses them. Their tests move to the new components.

## Questions the coordinator takes to the user

Build each as the prototype does, so it's easy to change, and record the answers here:

1. Is the Human bonus feat (granted by the race) a character chip, as built, or a Level 1 pick?
2. For Mythic ranks, should a one-tap "Continue as <current path>" offer the next rank, like classes do?
3. Should adding a level also add its Mythic rank at the Expected level, as one edit?
4. Should step titles use cleaned names ("choose discovery", not "choose discovery (alchemist)")?

## Done when

- The page matches the decisions above at 375×812 and 1280×800, checked in the browser. The handover lists screenshots of both, folded and unfolded.
- The step model's tests cover:
  - auto-advance order;
  - skills closing on budget or Done;
  - folding;
  - a Cascade landing on the first cleared pick;
  - a reload keeping the Build.
- **Measured against the reviews' baseline** (438 clicks and 205,859 px for a full level-20 Build with 10 Mythic ranks, `ui-interaction-comparison.md`): the same Build's clicks and pointer travel at 375 px and 1280 px, as an `## Outcome` table.
- Then the coordinator dispatches the same pristine audit again for the real "after". That run isn't part of this ticket.
- The feature's `README.md` describes the flow in our own words.
- `bun run check` passes. The work stays uncommitted in its worktree for review, then becomes one commit by path through the hook. Don't push.
- `Status: done` and an `## Outcome`.
