# Choice lists: inline first or modal first

Status: done
Blocked by: the capped choice lists change (same list files)
Plan: [plan](../plan.md)

## Goal

User, 2026-11-21, after weighing a big modal against the trail's inline lists: "lets give options. in the hamburger menu let the user select between modal first or inline first. I don't know yet if adding a modal by default for 15 options or more is better or not".

So the planner offers both, and the user tries them before anything is decided by default.

## Scope

- **A setting in the ⋯ menu:** "Choice lists: Inline first / Modal first". Inline first is the default (today's trail). The choice persists per viewer in `localStorage`, read and written under try/catch, and the page works when storage is unavailable.
- **Inline first:** as today: the step's list sits in the trail, capped at six and a half rows with closed choices hidden behind "Show N closed". Each inline list also has an "Expand" control that opens the same list in the modal.
- **Modal first:** every choice step opens its list in a large dialog.
  - Desktop: a centered dialog using most of the viewport, the list on the left and a detail pane on the right (the focused option's status, Refusal and, once ticket 06b lands, its summary and Synergy links).
  - Phone (under 600 px): full screen, with a header naming the step, a back control, and the list using the full height.
  - The same filter, keyboard, grouped closed reasons and "Show N closed" as inline. A pick applies, closes the dialog and advances the trail as inline does; Escape or the back control closes without picking.
  - A small header line keeps the Build in view: the level or rank being chosen and the scores the step reads.
- **One list component** renders both modes, so filtering, statuses, sub-choices (ticket 08) and tests are shared.
- **Dialog behaviour:** focus moves into the dialog and returns to the step on close; the page behind doesn't scroll; the phone's browser back closes the dialog (a history entry while open) instead of leaving the planner; a Cascade preview raised by a pick replaces the choice dialog rather than stacking on it; Undo works while it's open.
- **Measure both:** the click count and pointer travel of the baseline level-20 Build (ticket 07's method) in each mode at 375 px and 1280 px, recorded in the Outcome, so the user can choose a default with numbers.

## Done when

- The setting switches every choice step between the two modes, and persists across reloads.
- Render tests for both modes: open, filter, pick and advance, Escape, focus return, back-button close, the Cascade replacing the dialog, and "Show N closed".
- Checked in the browser at 375 px and 1280 px in both modes.
- `bun run check` passes; one commit through the hook in its own worktree.
- `Status: done` and an `## Outcome` with both modes' measurements.

## Outcome

Done (`ae12d307`, merged as `999b97bd`). The ⋯ menu's "Choice lists" switch persists per viewer, both modes share one list component, and the render tests listed above pass.

**Measured** (2026-11-21, on `ae12d307`, ticket 07's method): the baseline level-20 Build (ticket 07's profile) entered from an empty Build in each mode and width, counting clicks, pointer travel and scrolls.

| | Inline 375 | Inline 1280 | Modal 375 | Modal 1280 |
|---|---|---|---|---|
| Clicks | 167 | 167 | 173 | 173 |
| Pointer travel | 26,700 px | 36,385 px | 30,626 px | 44,440 px |
| Scrolls | 31 | 29 | 19 | 21 |

| Clicks by action | Inline | Modal |
|---|---|---|
| Slot picks | 56 (44 + 12 second clicks on a value) | 56 |
| Skill ranks | 29 | 29 |
| Levels | 22 | 22 |
| Mythic ranks | 10 | 10 |
| Gear | 24 | 24 |
| Start (scores, race, character) | 26 | 26 |
| "Open the list" | 0 | 6 |

Ticket 07 measured 170 clicks, 27,445 px at 375 and 34,837 px at 1280 for the same Build. Modal first costs six more clicks (the six level-1 lists that did not open by themselves, below) and more pointer travel, since the dialog's rows sit away from the trail. It saves about a third of the scrolling, because the list no longer pushes the trail down. Neither mode wins outright; inline first stays the default, and the user decides.

Deviations from ticket 07's profile: no "None" background is offered, so the run took "Craftsman · Farmhand"; the scores came first (since then the race comes first, `ef0df824`); an archetype took one click (a class row with its archetype); twelve parametrized picks took a second click on the value.

**What the run found, and where it went:**

- In modal first, six level-1 lists did not open their dialog by themselves: a closing dialog's `history.back()` popped the next dialog's entry and closed it. Fixed in `b84bb87d`: open dialogs share one history entry. Rechecked: class, background, deity and the level-1 feat each open in their dialog.
- Focus fell to the page when a dialog closed onto the skills step. Fixed with QA pass 3 (`keepFocus`, `b84bb87d`). Rechecked: focus lands on the skills step.
- The scores "Done" button was 36 px tall; it is 44 px (QA pass 2).
- The score steppers were 40 px wide at 375 px; the tiles lost their side padding and the steppers are 44 × 44 (this commit).
- The Gear dialog's layout shifted at 1280 px. Rechecked: the dialog and its list keep one size (1100 × 720) across places and on hover. What fixed it isn't pinned down; one of the later list changes.

**Since the measurement**, the inline lists changed (`c62d0ce4`, the user's request): a list collapses to its filter until the filter has focus, and rows are one 44 px line (60 px with a second line). A list that arrives through auto-advance opens by itself, so the measured flow should gain no clicks, and the compact rows should cut inline scrolling further. These numbers have not been re-measured; a rerun with the same method would confirm it.

