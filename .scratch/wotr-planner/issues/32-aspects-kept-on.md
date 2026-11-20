# Shifter aspects kept on

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

Build ticket 02 recorded the user's answer of 2026-11-19: a Build can keep a Shifter aspect on (Final Aspect makes it free), so what `BuffExtraEffects` adds while an aspect is on counts as held. Which aspects does a Build keep on, and how many at once?

The game caps toggles per group (WrathDecompiled 6ce4a6b, paths under `decompiled/Assembly-CSharp/Kingmaker/`):
- `UnitLogic/ActivatableAbilities/ActivatableAbility.cs TryStart` sums the `WeightInGroup` of the group's toggles that are on, against `UnitLogic/Parts/UnitPartActivatableAbility.cs GetGroupSize`;
- the group size is 1 plus each held `UnitLogic/FactLogic/IncreaseActivatableAbilityGroupSize.cs` for the group.

Raised by build ticket 03, from its aspect group size area.

## Answer

User, 2026-11-20 ("Accept both"):
- **A Build field lists the aspect toggles it keeps on.**
- **At every level, the walk judges the list against the group size:** 1 plus each held `IncreaseActivatableAbilityGroupSize` for the group, with each toggle's `WeightInGroup`.
- **The walk refuses a toggle over the limit, or one the character doesn't hold.**
- **Only the listed toggles' buffs count as on,** so only their `BuffExtraEffects` grants are held.
- GLOSSARY.md gains "Aspect kept on". The Build code encodes the list (build ticket 04).

## Amendment: buffs a `BuffExtraEffects` checks through a list

Coordinator, 2026-11-20, on the user's standing instruction. Build ticket 02e's allowlist field test found that `BuffExtraEffects.CheckHadPrerequiredBuff` also reads `m_CheckedBuffList` (ShapeshiftersHelmFeature checks 92 buffs, and the bard and skald cantrip features 35 each), besides the single `m_CheckedBuff`.

- **The list is kept,** and its buffs are held exactly as `m_CheckedBuff`'s are: a buff a kept field names is kept for its own sake (map 27's keep rule).
- **The extra effect applies while any listed buff is on.** Under this ticket's rule, that means any buff of an aspect the Build keeps on.
- Build ticket 03 builds it with the aspects-kept-on area.

### As built (build ticket 03, 2026-11-20)

- **`m_CheckedBuffList` is not kept after all, because the data rules it out.** Every `BuffExtraEffects` that sets the list is dropped, since its extra buff grants nothing a Build holds (`requiresHeld`). That covers ShapeshiftersHelmEnchantment and the cantrip features. So the import refuses the field as one "on no written blueprint".
  - The allowlist lists it in `notKept`, with a `holds` check that fails the import if a kept component ever sets it. Then the field gets allowlisted and read as the amendment says.
- **The Shifter aspect group's size is 1.** No written `IncreaseActivatableAbilityGroupSize` raises `ShifterAspect`; Final Aspect raises `ShifterChimeraAspect`. So a Build keeps one Shifter aspect on at a time.
