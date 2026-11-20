# The walk, with gear checks

Status: done
Session: ticket-03-walk
Blocked by: 02a, 02d; 02b for the Gear area only
Plan: [plan](../plan.md)

## Goal

The single judge of legality (module W, guide §4 and §7). It makes one pass over a Build, level by level in the game's band order. It records every held fact with its source and level, and every choice that fails, including feat, stat and equipment checks.

## Scope

- **Order of growth** (guide §5 step 6):
  1. a single class to level 20;
  2. archetypes;
  3. selections and nested selections;
  4. ranks;
  5. skill ranks;
  6. ability scores (point buy and increases);
  7. race;
  8. Mythic ranks at their Rank levels: any level, in rank order ([ADR 0003](../../../docs/adr/0003-mythic-rank-levels-are-expected-not-required.md));
  9. path switches.

  Each rule is ported from its cited C# method, onto the fields that method reads.
- **Each area allowlists what it reads** (decided 2026-11-19, [review-before-03.md](../review-before-03.md)), with its A tests, as ticket 02 did: class skills (`AddClassSkill`, `AddBackgroundClassSkill`); skill points (`AddSkillPointPerCharacterLevel`); proficiencies (`AddProficiencies`, `AddBackgroundWeaponProficiency`, `AddBackgroundArmorProficiency`, and the weapon proficiency that the allowlisted `KensaiChosenWeapon` adds for its feat's parameter); spellbook levels and markers (`AddSpellbookLevel`, `SkipLevelsForSpellProgression`, `IsAlchemistSpellbook`, `IsSinMagicSpecialistSpellbook`, `AddCasterLevel*`, `AddSpellbook`); ability scores (`AddContextStatBonus`, `ContextRankConfig`, `ReplaceStatBaseAttribute`); aspect group size (`IncreaseActivatableAbilityGroupSize`). Each is noted in `tools/importer/not-needed.ts` until its area takes it; the import fails when a noted type is allowlisted, so the note goes with it.
- **Stat prerequisites count only `Racial` and item-sourced `Enhancement` bonuses** (`ModifiableValue.Modifier.IsPermanent`), after `ReplaceStatForPrerequisites`. The ability-score area allowlists `AddContextStatBonus` and only the `ContextRankConfig` base types its Racial bonuses use. Three of them bear on a Build: Kindred-Raised (Half-Elf), the Shifter's Wolverine aspect, and Worm That Walks.
- **Daily choices** ([map 24](../../wotr-planner/issues/24-wandering-spirit-is-a-daily-choice.md), [26](../../wotr-planner/issues/26-mixed-bloodline-is-a-daily-choice.md)):
  - A cited table in `engine/`, keyed by the feature that offers each ability, lists the daily choices. The citations are `UnitHelper.Replenish` and `AbilityApplyFact.Apply`.
  - A leaf needing one of a daily choice's options is met while the character holds that feature.
  - A check fails when a feature that gives an `AbilityApplyFact` ability is in neither this table nor a short cited list of in-play abilities (Tactician, Greater Wyrmshifter).
- **Story-granted features are never held** ([map 25](../../wotr-planner/issues/25-story-granted-features.md)). A deity list (`PrerequisiteFeaturesFromList.IsDeity`, from the features' `Groups`) needs one of its deities, not `Amount`.
- **Path switches:** before building them, raise the map's "Path switches in detail" as a new ticket on the map and settle it there.
- **G's Build-aware half:** who holds a fact in this Build, and from where; what a pick gives, including the nested slots it opens. It is W's record (`Walk.unit`), not a second index.
- **Judging only reads** (decided 2026-11-20 for ticket 04's pickers): `canSelect`, `judgePick` and `context` read the walk's state and never change it, so ticket 04 can pause the walk at a slot and judge every option there.
- **Main character only** ([Whose builds](../../wotr-planner/issues/01-whose-builds.md)):
  - `EquipmentRestrictionMainPlayer` and `PrerequisiteMainCharacter` always pass;
  - Trickster's waiver on `BasicFeatSelection` applies when the Build holds it.
- **Stat prerequisites and Gear** ([ADR 0002](../../../docs/adr/0002-gear-does-not-meet-stat-prerequisites-by-default.md)): Gear is ignored unless the Build opts in. Under the opt-in, a pick that relies on Gear is marked as gear-dependent.
- **Gear checks** ([Which items count as Gear](../../wotr-planner/issues/12-which-items-count-as-gear.md)):
  - proficiency, by weapon category and armour group;
  - a main character's item restrictions: no druid levels, a required class or path, an alignment mask, main character only.

  Gear means the worn places plus one main hand and one off hand. Single-use items are excluded.
- **Gold builds** ([Display names](../../wotr-planner/issues/19-display-names.md), [Verification depth](../../wotr-planner/issues/14-verification-depth.md)):
  - Convert Jack-in-the-Green and the Enforcer (`~/code/wotr-planner/libs/seeds/tests/game_data/gold/`) once into GUID-keyed fixtures. Each line keeps the write-up's name, checked against the display name or a listed alias.
  - They serve as the acceptance test from the first area on: every gain the write-up lists at a level or rank must be gained there.
  - A refusal is never the write-up's fault. Known gaps are listed, each with its ticket, and the list can only shrink.

## Done when

- Each area has real-data tests that cite the blueprint or the method they check.
- Both gold builds pass, apart from their listed gaps.
- Three items are each refused, with the failing check recorded:
  - one a druid can't wear;
  - one locked to a class;
  - one locked to an alignment.
- `npm run check` runs the gold builds.

## Checkpoint (2026-11-20)

User, 2026-11-20: commit a checkpoint of ticket 03 now, run 02d on top of it, then resume 03. This is an approved exception to plan.md's one commit per session.

In the checkpoint commit:
- **`engine/build.ts`:** the Build in the game's terms. A slot is keyed as `LevelUpState.AddSelection` keys it: place (level or rank), selection GUID, index. A parametrized feat is one pick with its `param`.
- **`engine/walk/`:** W, with areas 1–4 (a class to 20, archetypes, selections and nested selections, ranks) and first cuts of 5–8 (skill points and ranks, point buy and increases, race and its +2, Mythic ranks at their Rank levels):
  - `walk.ts`: level-ups in band order, slots, picks (retried within their band), component grants, failures with their unmet leaves;
  - `check.ts`: each prerequisite's `CheckInternal` on P's leaves, with story conditions three-valued (map 21) and daily choices (map 24, 26);
  - `progression.ts`: `CalcLevel` and the archetype merge;
  - `stats.ts`, `unit.ts`, `daily-choices.ts`.
- **`engine/gold/`:** both gold builds as GUID-keyed fixtures (each line keeps the write-up's words; names checked against display names or `ALIASES`). `gold.test.ts` passes, so `npm run check` runs the gold builds. Jack has one gap (map 22). The Enforcer's gaps are this ticket's own proficiency and Gear areas.

**Left, after 02d:**
- **After 02d.** `Walker.activate` and `Walker.conditional` keep reading each held fact's components themselves, as the game does: 02d was amended on 2026-11-20 and no longer moves conditions into G. The walk exports the set of grant types it applies, for 02d's coverage check.
- **Allowlist per area:** `BlueprintProgression.m_Archetypes` and `m_AlternateProgressionClasses` (CalcLevel; `progression.ts` reads them when present). After them: class skills, skill points, proficiencies, spellbooks, `AddContextStatBonus`/`ContextRankConfig`, aspect group size.
- **Real-data tests per area.**
- **Map ticket "Path switches in detail".**
- **The Gear area.**
- **The daily-choice table's check.**

## Second checkpoint (2026-11-20, paused for 02e)

User, 2026-11-20: pause ticket 03 so the review-fix ticket 02e runs first, then resume on its renamed P leaves ("Pause 03, run 02e"). This checkpoint commit holds the work below. `npm run check` passes: 616 engine tests and 11 client tests.

**Landed:**
- **CalcLevel's lists:** `BlueprintProgression.m_Archetypes` and `m_AlternateProgressionClasses` are allowlisted (552 progressions rewritten).
- **Skills:** `AddClassSkill`, `AddBackgroundClassSkill` and `AddSkillPointPerCharacterLevel`, so the Human's extra point now counts.
- **Proficiencies:** `AddProficiencies` (race-restricted ones too), the background proficiencies, `KensaiChosenWeapon`'s weapon, and the starting set (natural weapons, no armour). `PrerequisiteNotProficient` is now ported exactly: it holds when any listed item is missing. This closed all eight of the Enforcer's proficiency gaps.
- **Spellbooks as gates:** `ClassData.Spellbook` (archetype removes and replaces, ReplaceSpellbook picks, the Mythic spellbook merge), ApplySpellbook with `SkipLevelsForSpellProgression`, `AddSpellbookLevel`, `MaxSpellLevel` from the table, and the alchemist left out. `IsSinMagicSpecialistSpellbook`, `AddCasterLevel*` and `AddSpellbook` gate nothing; each is noted in not-needed.ts with its reason.
- **Ability scores:** Racial `AddContextStatBonus`, with `ContextRankConfig` for the ClassLevel base type only, and `ReplaceStatBaseAttribute` for skills.
- **Gear:** the Build's `gear` and `countGear` (ADR 0002's opt-in).
  - Each item is judged as `ItemEntity.CanBeEquippedBy` judges it, and must fit its place.
  - A worn item holds its equipment facts. The Gear unlocks are conditional grants.
  - Under the opt-in, a pick that needs the Gear's Enhancement is marked gear-dependent.
  - The Enforcer wears its belt, so its last gap closed.
- **`engine/walk/areas.ts`:** each area exports its component types. `engine/areas.ts` `awaitingArea` is empty.
- **Tests:** `engine/walk/walk.test.ts`, area by area, including the three refused items.

**Decided on the way:** [map 31, path switches in detail](../../wotr-planner/issues/31-path-switches-in-detail.md), and [map 32, Shifter aspects kept on](../../wotr-planner/issues/32-aspects-kept-on.md), with GLOSSARY.md's "Aspect kept on". Both were answered by the user on 2026-11-20 and are recorded on the map.

**Left, after 02e:**
- Move `walk/check.ts` onto 02e's renamed P leaves, and onto P's `IsDeity`.
- Build path switches per map 31. First check its community points against the data (the Devil class's prerequisites, the Devil and Legend components, the rank Devil is offered at), then answer the re-keying question from `GetMythicSelectionsData`.
- Build aspects kept on per map 32. This allowlists `IncreaseActivatableAbilityGroupSize`, which leaves not-needed.ts, and turns on the listed toggles' buffs (G's `ActivatableBuff`).
- The Outcome, then `Status: done`.

## Added by the coordinator, 2026-11-20 (from ticket 02e)

Ticket 02e's allowlist field test left these as `awaiting` entries in `tools/importer/allowlist.ts`. Each leaves when its area lands. Do them first when you resume:
- **Ability scores (a real bug):** TieflingHeritageClassic and TieflingHeritageDevil take a Racial Charisma −2 through `AddStatBonusIfHasFact` with `ValueType` Rank, ranked by a FeatureList `ContextRankConfig`. Today the walk skips non-Simple values and the import drops FeatureList configs, so a Tiefling's Charisma reads 2 high. Keep `ValueRank`, evaluate Rank there, and allow FeatureList in `rankOf`. The data diff touches every kept `ContextRankConfig`; explain it in the Outcome.
- **Gear:** `BlueprintWeaponType.m_AttackType`, and `CanTakeOneHand`'s FighterOnHandedGrip exception (noted as left out in `gear.ts`).
- **Aspects kept on:** `BuffExtraEffects.m_CheckedBuffList`, as amended on [map 32](../../wotr-planner/issues/32-aspects-kept-on.md).

## Outcome

2026-11-20. Two approved checkpoints (`651ea0c`, `d3dfe57b`) and this final commit, "Ticket 03: the walk".

**Built** (`engine/build.ts`, `engine/walk/`, `engine/gold/`):
- **W, the walk:** level-ups in the game's band order, each rule ported from its cited method.
  - Areas in the guide's order: a class to 20, archetypes, selections and nested selections, ranks, skill ranks, ability scores, race, Mythic ranks at their Rank levels, and path switches.
  - It records every fact with its source and place, every slot with its pick, every failing choice with its unmet leaves, the Gear-dependent picks, and what a switch dropped.
- **Each area allowlists what it reads,** with A citations, and exports its component types (`engine/walk/areas.ts`). `engine/areas.ts` `awaitingArea` and `grantsAwaitingArea` are empty, and no `awaiting` field is left in the allowlist.
- **Fixes from 02e's review:**
  - The Tiefling heritages' Charisma −2: Rank values on `AddStatBonusIfHasFact`, and FeatureList `ContextRankConfig`s.
  - `m_AttackType` and FighterOnHandedGrip.
  - `m_CheckedBuffList`, which the data rules out (map 32, "As built").
- **Gear:**
  - Each item is judged as `ItemEntity.CanBeEquippedBy` judges it (restrictions, proficiency) and must fit its place.
  - A worn item holds its equipment facts, and the Gear unlocks follow what is worn.
  - Under ADR 0002's opt-in, a pick that needs the Gear's Enhancement is marked gear-dependent.
- **Path switches (map 31):**
  - Gold Dragon and Swarm are ported from `ReplaceAllMythicLevelsWithMythicHeroLevels`.
  - Devil and Legend follow GameFAQs and the Rust planner where the data can't answer. Map 31 records which source settled each point.
  - The guide's open question about re-keying is answered (§7).
  - The character-level cap is 20, or 40 under `LegendaryHero`.
- **Aspects kept on (map 32):** a Build field, judged at each level against the group size. Only listed toggles' buffs are on.
- **Daily choices:** the cited table, and a test that every feature offering an `AbilityApplyFact` ability is in it or is an in-play ability.

**Gold builds:** both pass. The one listed gap is Jack's Spell Specialization, which waits on map 22. The Enforcer wears its Dexterity belt under the opt-in, and its Greater Two-Weapon Fighting is marked gear-dependent.

**Measured:** `npm run check` passes with 755 engine tests (46 of them the walk's area tests) and 11 client tests. A Sorcerer 20 walks in about 23 ms.

**Data diff since 02e** (289 files):
- 134 kept `ContextRankConfig`s gain `m_FeatureList`. Three FeatureList configs are newly kept: the two Tiefling heritages' and `BloodragerStandartRageBuff`'s. The report's dropped count goes from 236 to 233.
- 75 weapon types gain `m_AttackType`.
- 61 `IncreaseActivatableAbilityGroupSize` components are kept, and their not-needed family leaves the report.
- The Racial `AddStatBonusIfHasFact` and `AddContextStatBonus` values gain `ValueRank`.

**Choices to know:**
- **Gear facts and prerequisites:** a worn item's facts meet fact prerequisites without the opt-in. ADR 0002 covers stat prerequisites, and the game never switches a feat off when the fact behind its prerequisite goes.
- **Sohei:** its unlock reads only monk weapons, not `UnitPartWeaponTraining`'s weapons, so it is stricter than the game.
- **Rank configs:** only the `ClassLevel` and `FeatureList` base types are kept; Racial bonuses use no other.

**Follow-up:**
- The Sohei's weapon-training weapons, if a Build needs them.
- Ticket 04 builds the pickers and Refusals on the walk's `failures` and `slots`. Its Build code carries `aspects`, `gear` and `countGear`.
