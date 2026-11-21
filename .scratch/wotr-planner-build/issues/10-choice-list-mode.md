# Choice lists: inline first or modal first

Status: open
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
