# QA pass 1 fixes

Status: done
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
- **4, first step:** each `allows` walked the unchanged Build again. Its refusals are now kept per Build (`refusalsByBuild`).
  - **Profiled on Jack (bun):** a slot picker takes 7–18 ms, a full walk 12–30 ms depending on load, and one `allows` 8–15 ms.
  - **Measured in one run:**

    | | Before | After |
    | --- | --- | --- |
    | Class list at level 3 (40 `allows`) | 564–607 ms | 299–317 ms |
    | A Cascade | 21–22 ms | 14 ms |

  - **Checkpoints:** whether to add per-level checkpoints on top of this is with the coordinator.
- **4, the fix the coordinator chose:** class lists are judged at one paused walk, as ticket 04 settled for slot pickers. Breakage stays lazy, worked out by `allows` and `cascade` for the chosen class only.
  - **New:** `pauseAtClass` in the walk, built on one `classRefusals` method that the walk itself records, and `classPicker` in S.
  - **Agreement test:** at levels 3, 9 and 15 of both gold Builds, Jack's ranks 3 and 8, and a new level 11, every class's paused status equals the walk's verdict for that class put there. Some open classes break later picks, which is the lazy part.
  - **Measured in one run on Jack:**

    | | Before | After |
    | --- | --- | --- |
    | Class list at level 3 | 603 ms | 1 ms |
    | Class list at level 15 | 599 ms | 5 ms |
    | Mythic list at rank 8 | 182 ms | 7 ms |
    | Scores "Done" (one `allows`) | 16 ms | 8 ms |
    | Cascade preview | 23 ms | 16 ms |

  - **Next for the UI:** it switches the class editor and steps to `classPicker`.
- **5, bare names:**
  - **The importer** writes every qualified name's `qualifier` on its own (2,269 files gain one field; names unchanged).
  - **S:** `namesInList` and `bareName`. `picker` and `classPicker` give each option its bare `name`, plus its `qualifier` only when another option in the same list shares the bare name.
  - **Where "(feature)" came from:** the shared-name rule qualifies across all reachable data, and "Allied Spellcaster" is also a Cavalier buff.
  - **For the UI:**
    - Labels like "Scholar — Nature (Background Selection)" and "Enforcing Gaze (Selection)" are selection names, so the UI uses `bareName` for slot labels.
    - "Expanded Arsenal (Magic School)" is the game's own display name and stays whole. The UI adds "(Abjuration)" for the chosen school.

## Outcome

2026-11-21, coordinator. Every QA pass 1 finding is fixed or recorded as not a bug (the Etude branches and the "(yours: 3)" count, in "Engine progress"). QA pass 2 (on `4b791923`) rechecked them all fixed and found one new severity-3 bug, the phone Refusal running off the screen, fixed in `c3e88e03`. QA pass 3 (on `c3e88e03`) rechecked QA pass 2's list and found nothing at severity 3 or 4, which is this ticket's bar.

- Engine: `850f81d1`, `0f3503c1`, `105429bd`, `7d4eb3ba`, `02a99b37`, `1bf23bb3`, and after QA pass 2 `29208a78`, `76aeca9a`, `49487211`.
- UI: `80d370a5`, `06e467dd`, `93bc007c` (merged `b1a3fde4`, `4b791923`), and after QA pass 2 `ee777c28` (merged `c3e88e03`).
- QA pass 3's severity 2 and 1 findings (speed, focus, the modal's two-click state, sub-option keyboard, doubled parentheses, and small items) went to the Planner UI session's queue with ticket 06's UI side.
