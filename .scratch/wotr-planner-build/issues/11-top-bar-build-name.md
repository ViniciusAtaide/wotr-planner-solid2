# The top bar: the Build's name, first focus, and "WP" on phones

Status: done
Blocked by: none (the UI half waits on the engine half for the name)
Plan: [plan](../plan.md)

## Goal

User, 2026-11-21: "I don't like how at first draw the focus it on the character sheet. I want the focus to be on the top section height 0 let's add a centered label that when you click becomes a text that can let you give a name to your build. on mobile that can become a crowded topbar so on mobile change "Worldwound Planner" to two letters "WP"".

## Scope

### Engine (ticket-03c-walk-fixes)

- **A Build has an optional `name`** (this reverses map 08's amendment, where `start_build` took no name; maps 07 and 08 amended). Plain text, trimmed, at most 60 characters, never game text.
- **The Build code carries it:** an optional field written after everything else in version 1's body, as a length-prefixed UTF-8 string. A code without it (every code written so far) decodes as a Build with no name, and a code with it round-trips exactly; the exact-decoding rule still refuses anything else after it. No new version byte: no planner link has been published.
- **E has a `rename` edit**, one Undo entry, that never touches the walk's judgement (a name changes nothing the walk reads).
- **The MCP:** `start_build` takes an optional `name` again, and `sheet` returns it.
- Tests: the round trip with and without a name, an old code decoding nameless, the 60-character limit refused in R's words, and `rename` in the history.

### UI (trail-start-step)

- **First draw:** the page opens scrolled to the top, and nothing in the character sheet takes focus on load. Keyboard focus starts at the top of the document, so the first Tab reaches the top bar.
- **A centered label in the top bar** shows the Build's name, or "Untitled Build" in `ink-muted` when it has none. Clicking it (or Enter or Space when it has focus) turns it into a text field in place; Enter or leaving the field saves through `rename`, and Escape cancels. The document title becomes "<name> · Worldwound Planner".
- **Phones (under 600 px):** the top bar's "Worldwound Planner" becomes "WP" (keeping the full name as its accessible label), so the name label and the ⋯ menu fit without crowding.
- Tests: no focus in the sheet on load, the label's edit and cancel, the title, and "WP" at 375 px. Checked in the browser at 375 and 1280.

## Done when

- Both halves are merged and the checks above pass.
- `Status: done` and an `## Outcome`.

## Progress

- **Engine half (done):** `Build.name` (`BuildName`, `toBuildName`, `MAX_NAME_LENGTH` 60, counted in code points), R's `buildNameLength`, the codec's optional last field (varint length, UTF-8), E's `rename` (allowed without a walk), `start_build`'s optional `name` and `sheet`'s `name`. A blank name leaves the Build nameless. The UI's history takes `rename` like any edit, so it is one Undo entry; the UI half's tests cover it there.
- **UI half (done, Planner UI session):** first draw at the top with nothing focused and "WP" under 600 px landed with QA pass 2's fixes. The name label is `src/planner/BuildName.tsx`, portalled into the shell header's new centre slot: "Untitled Build" muted, click or Enter or Space to edit, Enter or blur saves through `rename` (one Undo entry), Escape cancels, a blank name clears it, past 60 characters R's `buildNameLength` shows under the field. The title is "<name> · Worldwound Planner".

## Outcome

Done. Tests: the untitled label, naming as one Undo step with focus back on the label, Escape cancelling without leaving the step, the 60-character refusal, clearing, the page title, and the shell's centre slot (with ticket 11's earlier tests for first focus and "WP"). Checked in the browser at 1280 and 375: the label sits centred in the top bar beside "Worldwound Planner" or "WP", nothing has focus on load, a name saves on Enter, shows in the tab title, rides in the link and survives a reload.
