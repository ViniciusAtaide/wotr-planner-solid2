# Sub-choices nested under their parent in pick lists

Status: done
Session: trail-start-step
Blocked by: the flat choice lists work (worktree `flat-choice-lists`), whose planner `edits` action (several edits as one Undo step) this reuses
Plan: [plan](../plan.md)

## Goal

User, 2026-11-21: "for feats that open subselections let's create a ticket to make those cards expand other cards under it with a small margin left like a subselection. for example weapon focus -> kukri. kukri being the only a small margin. when you select any weapon you continue for example, do this for all tasks that has subsequent choices".

In a pick list, an option that opens a follow-up choice expands its own options right under it, indented a little, so the whole choice is made in one place.

## Scope

- **What expands:** every option whose pick opens a further choice, as S reports it:
  - a parametrized feat lists its parameter values (Weapon Focus → Kukri, Longsword…; Spell Focus → its schools);
  - a selection whose option is itself a selection lists that nested selection's options;
  - a Mythic spellbook selection lists its spellbooks.
  
  Not only feats: every slot kind in the trail that has a follow-up choice.
- **How it looks:** the sub-options render as option cards under their parent, indented by a small step (a `space-*` token, about 12–16px), the parent marked as expanded. One parent is open at a time; opening another closes the first. On a phone the indent stays small enough that names don't wrap more than they do today.
- **Status per sub-option:** each sub-option carries its own status and Refusal from S and R, as a top-level option does. A parent whose every sub-option is closed shows closed, with a summary of why.
- **Picking:** taking a sub-option makes the parent pick and the sub-pick in one go, as one Undo step (the flat-lists `edits` action), then the trail moves on as it does today. A parent with exactly one open sub-option still expands; nothing is picked without the user choosing it.
- **Keyboard:** Right or Enter opens a parent, Left closes it, Up and Down move through parents and open sub-options in order; focus stays visible.
- **No engine change expected:** S already lists parameters and nested selections. If it doesn't expose what the expansion needs, ask the coordinator before touching `engine/`.

## Done when

- Weapon Focus expands into its weapon list, and picking Kukri sets both picks and advances, undone by one Undo.
- A nested selection (a selection whose option opens another) and a Mythic spellbook selection expand the same way.
- Render tests for: expand, collapse, one-open-at-a-time, a closed sub-option with its Refusal, a parent with every sub-option closed, the single-Undo pick, and keyboard navigation.
- Checked in the browser at 375 px and 1280 px.
- `bun run check` passes; one commit through the hook with `scripts/commit-paths.sh`, in its own worktree; not pushed.
- `Status: done` and an `## Outcome`.

## Outcome

Built on `ticket/ticket-08-nested`, in `src/planner/` only; no engine change was needed.

- **Parent rows:** `nested-options.ts` (`pickRows`) groups S's options into plain options, parametrized feats (the
  options sharing a feature with different parameters) and options that are themselves selections. In a level-1
  Fighter's feat list that is 174 rows instead of 947, since 690 options were 10 feats' parameter values.
- **Expansion:** `PickStep.tsx` (moved out of `steps.tsx`) shows a parent with ▸/▾ and `aria-expanded`, and its
  sub-options under it, indented one `space-3` step with a rule on the left. One parent is open at a time. A nested
  selection's sub-options come from S's `picker` at the slot it opens (`childSlotOf`: same place, the option's own
  selection, index 0), asked only when expanded.
- **Statuses:** each sub-option has its own status and Refusal; a parametrized feat with every value closed is one
  closed row with up to three distinct reasons.
- **Picking:** a value is one pick with its parameter; a nested selection is the parent pick plus the sub-pick through
  the planner's `edits` action, after clearing the sub-pick of a parent it replaces. Either is one Undo entry, and the
  trail moves on ("Picked Armor Focus (Light Armor Focus)").
- **Keys:** Right or Enter opens a parent, Left closes it (returning focus from a sub-option), Up/Down/J/K move
  through parents and open sub-options; Enter on a marked parent in the filter opens it.
- **Spellbooks:** the data's spellbook selections (prestige classes' "Arcane Spellcasting", Loremaster's "Spellbook
  Selection") are selections, so they expand by the nested rule; their options replace a spellbook and open nothing
  further.
- **Tests** (`planner.test.tsx`, "nested sub-choices (ticket 08)"): expand and collapse, one open at a time, a closed
  sub-option with its Refusal, a parametrized feat with every value closed, Weapon Focus → Kukri and Armor Focus →
  Light Armor Focus each as one Undo entry, and Right/Down/Left.
- **Browser:** checked at 375 px (Weapon Focus's 84 values indented, no horizontal scroll) and 1280 px (Armor Focus
  expanding while Weapon Focus closes, then both picks taken and the trail on to the bonus combat feat).

**Left for later:** the nested pick still shows as two chips ("Feat: Armor Focus" and "Armor Focus: Light Armor
Focus"); merging them like the background chip would be a small follow-up. Solid's devtools flag the step's focus
and scroll effect at 8.4 ms against an 8 ms budget on a 174-row list.

