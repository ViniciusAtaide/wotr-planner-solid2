# Ticket 03 review fixes: the walk

Status: done
Session: ticket-03c-walk-fixes
Blocked by: none
Plan: [plan](../plan.md)

## Goal

Close every walk finding from the two-axis review of tickets 02 and 03 together (2026-11-20, `ed9752a...87386083`, `data/` left out). The user chose "Fix all first". Ticket [02g](02g-importer-review-fixes.md) takes the importer and naming findings and runs alongside in its own worktree. This ticket owns `engine/` apart from `engine/data/`, and `scripts/engine-run.mjs`.

## Scope

### Correctness

- **A fact goes when the fact that granted it goes (Spec c1, high).** Today the walk keeps a fact after its granting fact is gone. The game's `AddFacts` and `AddFeatureIfHasFact` remove what they gave when they deactivate (cite each `OnDeactivate`, or whatever method the decompiled code uses). Two reproduced cases:
  - Jack switched to Legend still holds the mythic feat upgrade `544056cc…`, granted by the dropped feat `51b6b22f…`.
  - Every walk of Jack keeps the Azata summon tier `370dbb81…`, whose source is no longer held.

  The same gap applies to taking Gear off, turning an aspect off, Devil's dropped picks and anything else that ends a source. Each source removes the fact it applied, as the game does (Coordinator, 2026-11-20, on 03c's question): features merge by `FeatureCollection.PrepareFactForAttach` and drop a rank or leave by `PrepareFactForDetach`, so a Ranks 1 feature granted by two sources goes when either goes; abilities and toggles are separate facts per grant (`AbilityCollection`, `ActivatableAbilityCollection.PrepareFactForAttach`); buffs follow their Stacking (`BuffCollection.PrepareFactForAttach`). Add a hand-built test of a Ranks 1 feature from two sources, one of which goes. Write real-data tests for both reproduced cases, plus one for Gear and one for an aspect. A pick whose prerequisite was met only through a removed fact now fails, as in the game.
- **`PrerequisiteFeaturesFromList` with `Amount` 0 still needs one feature held (Std hard 1).** `walk/check.ts:281-285` passes it with none held. The cited `CheckInternal` requires at least one. Test it on WearyingStrike `b4befb0a…` and fix every feature of that shape. Say in the Outcome whether a gold line moves.
- **The walk applies grants through G, not its own switch (Std hard 2).** `walk.ts:500-518` `runActions` repeats G's grant-action switch, cites only map 23 and ignores `ContextActionApplyBuff.Permanent`. Make G's `grantField` / `actionGrants` the only answer, as 02e did for the importer, and delete the copy.
- **Every walk rule cites its method (Std hard 3).**
  - `leafHolds`' `characterLevel`, `mythicLevel`, `isPet`, `mainCharacter` and `story` each cite a method.
  - So do the conditions `ContextConditionIsMainCharacter` and `ContextConditionIsWeaponEquipped`.
  - `weaponSubCategory` (`check.ts:378`) is ported from its method, not a stub returning false. If the data can't answer it (e.g. no Gear is worn yet), refuse with a reason that says so, and test both outcomes on real data.
- **The gear-dependent marking follows ADR 0002 exactly (Spec c2).**
  - A pick is marked with the worn items whose bonus it needs: items that raise the score its prerequisite reads, and only when the score without them falls short. Not every worn item that boosts some score.
  - A later pick that depends on a gear-dependent pick is marked too, with the same items.
  - Class choices (class-level prerequisites, archetype and Mythic class picks) are marked like feats.
  - Tests on hand-built and real data for each case. The Enforcer's Greater Two-Weapon Fighting stays marked with its belt only.

### Missing tests (Spec a4)

Real-data tests for each ticket 03 area that lacks one:
- the Swarm That Walks switch;
- Devil dropping the gazes;
- the Mythic spellbook rules;
- `ReplaceStatForPrerequisites` (Worm That Walks);
- the Trickster waiver;
- the main-character rules;
- story-granted features.

Each cites the blueprint it reads by GUID and asserts a game fact, not a count.

### Standards smells

- **One deity-group test.** It is written in both `prerequisites.ts:140` and `check.ts:371-374`. Keep P's.
- **Use `unit.componentsOf`** where the walk re-scans held components by hand.
- **A type for `{ name; level }`,** which travels through four functions.
- **One typed accessor for `pick.param`** in place of the three repeated casts.
- **`requiredNames` reads P's leaf kinds from one place,** not its own switch.
- **Rename `judge`** for what it does.
- **Delete the empty `awaitingArea` and `grantsAwaitingArea`** and the checks that read them, unless 02g's field test still needs them. If it does, say why in the Outcome.
- **`Failure` carries structured data, not English.** `Failure.check` holds free English that tests pin, which is Refusal wording forming outside R (ticket 04). Make it the leaf, the values found and the values needed; tests assert those. R words them in ticket 04.

### Scope creep (Spec b9)

`scripts/engine-run.mjs`: delete it. If something already relies on it, keep it with one line in `README.md` saying what it's for, and say so in the Outcome.

### Added by the coordinator from 02g's field test

- **`ContextActionAddFeature.m_SetRankFrom`.** `RunAction` (ContextActionAddFeature.cs) sets the added feature's rank to the `SetRankFrom` feature's. 34 Trickster Lore (Religion) domain features use it, e.g. TricksterLoreReligionAirDomainFeature 2dc50974… adds TricksterLoreReligionAirDomainRankFeature 5e9edb9d… at the rank of TricksterLoreReligionDomainFeature c0e6f7e7…. AirDomainProgression lists that rank feature in `m_FeaturesRankIncrease` (`engine/walk/progression.ts`), so today a Trickster's borrowed domain advances at rank 1. 02g keeps the field in `data/`. The walk applies it, with a real-data test on a Trickster's domain level. Done: see the Outcome.

## Recorded by the coordinator (no work)

- **Ticket 03's three spellbook components went to the not-needed list instead of being allowlisted (Spec a8).** The coordinator accepts this: the reason given rests on `Spellbook.cs` and holds. No change.

## Done when

- Every item above is done.
- Both gold builds pass, with no gap added. A gold line that moves because the walk now matches the game is explained in the Outcome with its cited method.
- `npm run check` passes, and the work is one commit by path through the hook, on branch `ticket/03c` if run in a worktree.
- `Status: done` and an `## Outcome` that maps each finding to what closed it.

## Outcome

2026-11-20. Two commits: "Ticket 03c: walk review fixes" (`9bb6426b`), then, after 02g merged, the items the coordinator handed back.

**Correctness**
- **A fact goes with the fact that granted it (Spec c1).** The walk now keeps, for each held fact, what each of its grant components applied (`Walker.appliedBy`, the components' `Data.AppliedFact(s)`).
  - `Walker.lose` removes one fact (`Unit.remove`, ported from `FeatureCollection.PrepareFactForDetach`). When the fact leaves, it takes away what that fact's components applied, as their `OnDeactivate` does. The cited components are `AddFacts`, `AddFeatureIfHasFact`, `AddFeatureOnClassLevel`, `AddFeatureOnAlignment`, `AddFeatureOnSkill`, `AddParametrizedFeatures`, `AddFeatureParametrized`, `FactSinglify`, `BuffExtraEffects`, the Gear unlocks, `AddUnitFeatureEquipment`, `AddUnitFactEquipment` and an aspect's buff.
  - `AddFeatureOnApply`, `KensaiChosenWeapon`, `AddFactContextActions` and `ActivateTrigger` have no such method, so what they gave stays.
  - Every removal goes through `lose`: `RemoveFeatureOnApply`, `FactSinglify`, a conditional grant ending, Gear coming off, an aspect going off, and both kinds of path switch. In `dropRanks`, a component's grant goes with its owner, not with the rank it came at. A switch's `dropped` now lists the facts that went along with it.
  - Abilities and toggles are separate facts per grant (`AbilityCollection`, `ActivatableAbilityCollection`). Features merge as `FeatureCollection` merges them, so a Ranks 1 feature granted twice goes when either grant goes, as the coordinator ruled on 03c's question. No gold line moved.
  - Buffs follow their `Stacking` (`BuffCollection.PrepareFactForAttach`), now allowlisted. Stack is a fact of its own. Replace removes the held buff, with what it gave, and attaches the new one, so the first grant going leaves the buff. Prolong, Ignore, Poison and Summ keep the held buff, since a Build's buffs are permanent. Rank is left out of the allowlist's enum: a kept Rank buff would fail the import, as the walk would need its Ranks. Live sources do grant kept Replace buffs twice: CompositeBlastBuff from each element, each Shifter aspect buff from its toggle and its Fey Chimera feature, and HeartOfEarthShifterBuff. Tested on hand-built givers of ShifterAspectHorseBuff (Replace, kept) and CavalierTacticianOutflankBuff (Prolong, gone).
  - Tests in `engine/walk/removal.test.ts`:
    - Jack switched to Legend loses `544056cc…`.
    - Jack never ends holding `370dbb81…`.
    - AdamantineBanded's feature comes off with the armour at a druid level (real data).
    - What that feature gives goes too, and a later pick needing it is refused (hand-built: no real equipment fact grants further).
    - The Horse aspect going off takes Endurance.
    - A feature granted twice is kept until either grant goes.
- **`Amount` 0 (Std hard 1).** `judgeLeaf` needs at least one held feature, as `PrerequisiteFeaturesFromList.CheckInternal` returns only from inside a hit. Eight features have that shape: WearyingStrike, DispellingAttack, CripplingStrike, ShiftersEdgeFeature, PetrifyingStrike, EmboldeningStrike, LimitlessRage and ConfoundingBlades. Tested on WearyingStrike and on all eight. No gold line moved.
- **Grants through G (Std hard 2).** `runActions` walks the `Conditional` trees and asks G's `grantField` which actions grant, so a non-Permanent `ContextActionApplyBuff` no longer grants. The walk's copy of the switch is deleted. Tested on hand-built data.
- **Citations (Std hard 3).** Each of `characterLevel`, `mythicLevel`, `isPet`, `mainCharacter`, `story`, `spellsInSpellbook` and `condition` cites its method, and so do `ContextConditionIsMainCharacter` and `ContextConditionIsWeaponEquipped`.
  - `weaponSubCategory` is ported from `PrerequisiteParametrizedWeaponSubcategory.CheckFeature`, with `WeaponCategoryExtension`'s table copied into `engine/walk/weapons.ts` (it is code, not data). It reads the held feat's weapon category, which the data always answers, so no "can't tell" case exists. Tested on Slashing Grace with Weapon Focus at a longsword and at a rapier.
  - `ContextConditionIsWeaponEquipped` is ported over the Build's Gear in hand. The walk holds no natural limbs, so a test only a limb could pass fails.
  - Porting it showed that `canSelectParam` skipped two of `BlueprintParametrizedFeature.CanSelect`'s tests: the `IParamPrerequisite` components and the Disabled subcategory. Both are ported now. The data's only conditions are on natural weapons and exempt everyone but an animal companion. Tested on real data (Sling refused, Claw allowed) and on hand-built data (a longsword in hand or not).
- **ADR 0002's marking (Spec c2).** `markGearDependent` judges a choice again with the Gear not counting and the earlier gear-dependent picks set aside (`Unit.withoutGear`).
  - The items are those its failing leaves need. For a stat leaf, it is the worn item whose Enhancement counts on a score the leaf reads (`scoresRead`; only the largest bonus counts). For a leaf naming a gear-dependent pick's fact, it is that pick's items.
  - Class levels (Mythic ones included) and archetypes are marked like picks. `GearDependent` now has `choice` and `subject`.
  - A first level's archetype never rests on the Gear, since the Gear goes on in the ApplyClass band, after the Archetype band.
  - The Enforcer's Greater Two-Weapon Fighting stays marked, with its belt only.
  - Tests in `engine/walk/gear-dependent.test.ts`, real and hand-built for each case: Dodge with a belt and a headband, DodgeMythicFeat resting on Dodge, Stalwart Defender resting on Dodge, a Charisma feat and one resting on it, and an archetype and a class given Dexterity 13.

**Missing tests (Spec a4),** in `walk.test.ts` "the areas ticket 03 left untested":
- Swarm That Walks on Jack.
- Devil dropping an Aeon's two gaze picks.
- AngelIncorporateSpellbook: a cleric's spellbook is merged; a spellbook not held and one not allowed are each refused.
- The Trickster's Knowledge (World) tier 3 waiving Power Attack's Strength.
- MythicCompanionClass refused for its `mainCharacter` leaf, MaskOfNothing's `EquipmentRestrictionMainPlayer`, and `ContextConditionIsMainCharacter`.
- BackgroundRekarthDLC2 refused for the story-only Scout_FeatureList.
- `ReplaceStatForPrerequisites`: the data holds no Worm That Walks blueprint. Its holders are Kinetic Knight, Sword Saint and Warpriest, so the test reads Kinetic Knight's Intelligence-as-Constitution.

**Standards smells**
- One deity test: P's `isDeityFeature`, which `considerFulfilled` uses.
- `unit.componentsOf` replaces the hand re-scans in `lentLevels`, `prerequisiteStat`, `PrerequisitePet` and the Trickster waiver.
- One typed accessor each for the parameter's blueprint and weapon category: `paramBlueprint` and `paramWeaponCategory` in `unit.ts`.
- `judge` is gone. Its parts are `permanentValue` and `archetypeMeetsPrerequisites`.
- `grantsAwaitingArea` is deleted.
- `Failure` is data: `rule` (the game method and field, or the deciding map ticket), `found`, `needed`, and `unmet` leaves, each with its `found` and `needed` (`engine/walk/failure.ts`). The walk's structured reason is called `FailedRule`, because GLOSSARY's Refusal is R's wording. GLOSSARY's "Gear-dependent" now covers class choices and picks resting on another.
- Moved to 02g on the coordinator's say: the `{ name; level }` type and `requiredNames` (both in `tools/importer/qualify.ts`), and deleting `awaitingArea`. 03c deleted the engine-only `grantsAwaitingArea` and left `awaitingArea` alone.

**Scope creep (Spec b9).** `scripts/engine-run.mjs` stays: `npm run census` runs through it. README.md has one line saying what it is for.

**After 02g merged (handed back by the coordinator):**
- **`m_SetRankFrom`.** `runActions` gives a `ContextActionAddFeature`'s feature the rank of its `m_SetRankFrom` feature when that is held (`ContextActionAddFeature.RunAction`, `Unit.setRank` ported from `Feature.SetRank`). A Trickster taking the Air domain at M4 through Lore (Religion) now has its domain progression at level 8, the rank of TricksterLoreReligionDomainFeature, not 1. Tested on real data in `walk.test.ts`.
- **The `awaitingArea` mentions** are gone: the `engine/areas.test.ts` fixture's reader is an area, `readerProblems` says "no module reads it" (its `tools/importer/allowlist.test.ts` expectation with it), and the `engine/walk/areas.ts` comment.
- **`BlueprintBuff.Stacking`**, as above. **Data diff:** the 71 kept buffs each gain `Stacking` (59 Replace, 12 Prolong); nothing else moved.

**Measured:** `npm run check` passes with 899 engine tests and 11 client tests. Both gold builds pass with the same single gap; no gold line moved, under the merge rule, `m_SetRankFrom` or Stacking.
