# QA pass 1 fixes

Status: in-progress
Session: ticket-03c-walk-fixes (engine), trail-start-step (UI)
Blocked by: none
Plan: [plan](../plan.md)

## Goal

Fix every finding of the first QA pass on the planner (run on `e77c4d7e`, 2026-11-21, at 375 px and 1280 px; screenshots in the coordinator's scratchpad `shots/`). The user's standing instruction (2026-11-21): keep going until the planner works with no bugs, with a QA pass after each finished task, fixing every finding the recommended way.

## Engine (ticket-03c-walk-fixes)

1. **Sev 4:** Gold Dragon at ranks 8–10, then rank 8 set to Devil: ranks 9–10 stayed Gold Dragon. `switchAtRank8` (`33720645`) should refuse them; a test that this edit's Cascade clears ranks 9–10. Check that no switch class passes through a `PrerequisiteCondition` Etude branch the game's other branch refuses.
2. **Sev 3:** a class change blocked by skill ranks ("No skill points left at this level"). The Cascade clears a level's skill ranks when an edit leaves it over budget (clear, never move), and lists them.
3. **Sev 2:** Refusals: `ForcedTrue`/`HideInUI` prerequisites never show as unmet; the wrong count in "Needs Mythic rank 7 (yours: 3)"; duplicate lines.
4. **Sev 2:** slow pickers (880 ms to about 1 s to open a class editor, 1 s for scores Done, 0.9 s for a Cascade preview): per-level checkpoints so a slot is judged from its level, as ticket 04 deferred until measured.
5. **Sev 2:** internal qualifiers in shown names ("(feature)", "(Background Selection)", "(Tiefling Heritage)", "(Fighter 5)", "(Selection)", "(Aeon 3)"): S exposes the bare name plus a qualifier only when two options in the same list share it.

## UI (trail-start-step)

1. **Sev 3:** a dead "Ascend to Mythic rank 9" step after Legend (reads `Walk.ranksEnded`).
2. **Sev 3:** a dead "Onward to level 21" at the level cap; offer the due rank, else no next-level step.
3. **Sev 3:** no-op edits fill the undo history; the reducer drops edits that change nothing, and "Same as level N−1" hides when equal.
4. **Sev 2:** the + skill stepper is disabled at the cap.
5. **Sev 2:** gear-dependent marks on chips and in Export (ADR 0002); Export's scores agree with the card or say they count Gear.
6. **Sev 2:** Up and Down move through options; focus lands on the next step's first control after a pick or skills Done.
7. **Sev 2:** a broken `#b=` link stays in the address bar with the reason it didn't open.
8. **Sev 2:** "Ring 1" and "Ring 2" labels; bare option names from S.
9. **Sev 2:** "Show all closed" opens in under 200 ms.
10. **Sev 1:** Scholar's sub-choice beside Background; no "Current" before any rank; "1 later pick. It'll be cleared"; the folded row's label; an opaque Undo bar at 375; the ⋯ menu closes after Copy link.

## Done when

- Every finding is fixed with a test, or recorded here with the reason it isn't a bug.
- A second QA pass on the merged result finds nothing at severity 3 or 4.
- `bun run check` passes; each commit goes through the hook.

## Engine progress (ticket-03c-walk-fixes)

- **1 and 2, `850f81d1`:** the Cascade clears more than picks.
  - It clears a level's skill ranks when an edit leaves the level over its budget (`clearedSkills`).
  - It clears Mythic ranks from the first refused one to the end (`clearedRanks`), with their picks.
  - Tested on the QA's edit: Gold Dragon at 8–10 with rank 8 set to Devil clears ranks 9–10. Also tested: Jack with a Rogue level 3 that spends its budget, changed to Fighter, clears level 3's skill ranks.
  - **The Etude check isn't a bug.** Gold Dragon's, Legend's and Devil's `PrerequisiteCondition` each have a main-campaign branch that passes in the main campaign, so map 21's "story checks are met" gives the game's answer.
  - The UI still has to list `clearedSkills` and `clearedRanks` in the preview.
- **3, `0f3503c1`:**
  - **ForcedTrue:** a class's failing `ForcedTrue` prerequisite counts for nothing, as in the game's three-way class check. Before, Angel, Demon and Dragon Disciple were refused at their first level, and their "level 1" leaf showed as unmet.
  - **Duplicate lines:** R words each repeated unmet line once.
  - **The rank count isn't a bug.** "(yours: 3)" is the character's rank after Legend. Since `switchAtRank8` and `ranksEnded`, that case reads "After Legend, no Mythic rank follows".
  - **`HideInUI` leaves still show,** because they are real reasons.
- **`Walk.maxCharacterLevel`** (for the trail's level cap): 20, or 40 after Legend.
