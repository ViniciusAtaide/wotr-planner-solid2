# The importer keeps the Summary carriers

Status: in-progress
Session: ticket-03c-walk-fixes
Blocked by: none
Parent: [06](06-after-first-use.md)
Plan: [plan](../plan.md)

## Goal

`data/` keeps only the component types the walk needs. The components a Summary describes (bonuses, saves, immunities, resistances, spell DCs, triggers) are dropped as "In play" (`data/report.md`). Keep the top 50 of them, with their fields, so 06b can label them and 06d can link on them.

## Decisions (coordinator, 2026-11-21)

- **"Top 50"** is the top 50 *carriers of a readable value* (a bonus, a save, an immunity, a resistance, a DC, a trigger on a weapon or school), as [map 10](../../wotr-planner/issues/10-generating-summaries.md) counted them in [component-vocabulary.md](../../wotr-planner/research/component-vocabulary.md). It is not the top 50 In-play types by count, which plumbing dominates (`AddAbilityResources`, `RecalculateOnStatChange`, `ContextCalculateSharedValue`, `BindAbilitiesToClass`).
- **The list** is chosen from `data/report.md`'s In-play counts, carriers only, and written in this ticket's Outcome.
- **Work family by family, one commit each.** Each commit holds the types, field specs, enums and citations (ADR 0005), the re-import with every `data/` change explained, and the compact-document defaults.

## Baseline

The data document before 06a: raw 2.046 MB, gzip 0.478 MB, brotli 0.380 MB (`encodeDocument` over `data/`, gzip level 9, brotli quality 11).

## Guardrails

- **The data document's size** (raw, gzip and brotli) is measured after each family. If gzip passes about 0.65 MB (0.5 MB at the start), stop and report before the next family: ADR 0004's first-load budget is at stake.
- **Both gold Builds** walk unchanged.
- **The picker sweep** stays at 0 disagreements at the end.

## Done when

- The 50 carriers are kept, each with cited fields.
- Each family's commit records its size measurement.
- The checks pass, and the Outcome lists the 50 and the sizes.

## Progress

| Family | Commit | Carriers | `data/` files | Raw | gzip | brotli |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline | — | — | — | 2.046 MB | 0.478 MB | 0.380 MB |
| 1. Resistances and immunities | e0dcd9d0 | `AddDamageResistanceEnergy`, `AddDamageResistancePhysical`, `AddEnergyDamageImmunity`, `AddEnergyImmunity`, `AddSpellResistance`, `AddFortification` (6) | 279 gain the component; nothing else changes | 2.057 MB | 0.481 MB | 0.381 MB |
| 2. Saves and immunities by descriptor, school and condition | 55048111 | `SavingThrowBonusAgainstDescriptor`, `SavingThrowBonusAgainstSchool`, `BuffDescriptorImmunity`, `SpellImmunityToSpellDescriptor`, `AddConditionImmunity`, `AddImmunityToCriticalHits`, `AddImmunityToPrecisionDamage` (7; 13 in all) | 246 gain components; 2 new referenced facts | 2.070 MB | 0.485 MB | 0.384 MB |
| 3. Spellcasting | fbb7c006 | `IncreaseSpellDescriptorDC`, `IncreaseSpellSchoolDC`, `IncreaseAllSpellsDC`, `IncreaseSpellDescriptorCasterLevel`, `IncreaseSpellSchoolCasterLevel`, `SpellPenetrationBonus`, `ConcentrationBonus`, `SpellSpecializationParametrized`, `DraconicBloodlineArcana` (9; 22 in all) | 148 gain components (156 in all); 2 new held facts; 4 keep a granted toggle | 2.076 MB | 0.486 MB | 0.386 MB |
| 4. Weapons, attacks and maneuvers | (this commit) | `WeaponGroupAttackBonus`, `WeaponGroupDamageBonus`, `WeaponTraining`, `WeaponTypeDamageStatReplacement`, `WeaponFocusParametrized`, `WeaponSpecializationParametrized`, `ImprovedCriticalParametrized`, `AttackBonusAgainstFactOwner`, `DamageBonusAgainstFactOwner`, `ACBonusAgainstFactOwner`, `ManeuverBonus`, `ManeuverDefenceBonus` (12; 34 in all) | 123 gain components; 57 new held blueprints, the checked facts and what they name | 2.092 MB | 0.489 MB | 0.387 MB |

- **Family 1's data changes:** each changed file only gains its kept resistance or immunity components (the diff's removed lines are a `}` becoming `},`). The report's In-play count falls from 376 to 370.
- **The reader set:** `engine/describe` declares `summaryComponentTypes`, and the allowlist test holds every kept type to one reader set.
- **Not kept:** `not-needed.ts` drops the six types. The physical resistance keeps its material, form, magic, alignment and epic bypasses; it lists its reality, weapon-type and melee bypasses as not kept, because a Summary doesn't name them.
- **Family 2's data changes:**
  - 246 files gain their kept save bonuses and immunities.
  - Two facts are newly held because the kept immunities name them: `FeyType` (a buff immunity's fact to check) and `IgnoreImmunityToFear` (a caster fact that ignores fear immunity).
- **Exact descriptor values:** a spell descriptor is a 64-bit flag set (`SpellDescriptorWrapper.m_IntValue`) with bits up to 63. A JSON number would lose those bits, so the importer reads the value as an exact decimal string (`exactWideInts`) and the engine decodes it with BigInt.
- **Kept, not dropped:** the "this field doesn't matter" guard caught three references that do. Bravery's save bonus has a disabling feature, several spell immunities name a caster fact that ignores them, and buff immunities name an ignore feature and a fact to check. All three are kept as references.
- **Family 3's data changes:**
  - 148 features gain their kept DC, caster-level, spell-penetration, concentration and Draconic arcana components.
  - Improved Spell Combat's concentration bonus applies only while Spell Combat is on, so its kept `m_RequiredFact` names `SpellCombatBuff`. That buff, and the `SpellCombatAbility` toggle whose buff it is, are now held.
  - Because the toggle is held, the four features that grant it (Spell Combat, Eldritch Archer's Ranged Spell Combat, Divine Trick and Soulless Command) now keep it in their `AddFacts`. Two of them change only for that: Spell Combat and Ranged Spell Combat.
  - The feature and the toggle share the display name, so the shared-name rule qualifies them: the feature's name is now "Spell Combat (Magus)". Lists still show the bare name unless both appear in one list.
  - The toggle brings three in-play types, now noted in `not-needed.ts`: `ActivatableAbilityRestrictionByEquipmentSet`, `DeactivateOnGripChanged` and `SetMagusFeatureActive`.
- **Left for later families or dropped:** `AutoMetamagic` (it needs the metamagic flags and spell lists) and `IncreaseSpellDC` (it names single spells, which `data/` doesn't hold) stay not needed for now.
- **Family 4's data changes:**
  - 123 blueprints gain their kept weapon-group, weapon, focus, critical, maneuver and against-a-foe bonuses.
  - **Against a foe:** the three `…AgainstFactOwner` bonuses name the fact the foe must have (`m_CheckedFact`), and a Summary needs that fact's name ("+4 AC against Giants"). The new spec `heldRefOrNull` keeps such a reference when the dump's held set has the fact, and drops it to `null` otherwise, counted under References dropped, as `heldRefs` does for lists. One is dropped: a bonus against the Huge size fact, a bare `BlueprintUnitFact`.
  - The kept facts are now held, with what their own kept fields name. The 57 new files: 34 features (creature types and subtypes such as `GiantSubtype`, `VerminType`, `ConstructType`, `SubtypeDemon`, `ReptilianSubtype`, and the resistances and immunities they carry), 18 buffs (charge, fear, challenge and summon buffs), `GoblinRace` (for Hatred), and `OutsiderProgression` (for the Portal Stone ring), whose class and two save archetypes come with it. Nine more `AddFacts` references are kept because their targets are now held.
  - No existing display name changes. The race and class pickers list only what `ProgressionRoot` offers, so Goblin and the Outsider class don't appear there.
  - `VolleyFireEffectBuff` stacks by rank, so `StackingType` gains `Rank`.
  - The new blueprints bring nine types, now noted in `not-needed.ts`: `SummonedUnitBuff` and `BuffOnEntityCreated` (units), and `AddSpellImmunity`, `AddIncorporealDamageDivisor`, `ConstructHealth`, `GhostCriticalAndPrecisionImmunity`, `IncorporealACBonus`, `RemoveWhenCombatEnded` and `UniqueBuff` (in play).
