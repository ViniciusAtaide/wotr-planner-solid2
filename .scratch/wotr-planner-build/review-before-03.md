# Review before ticket 03 (2026-11-19)

> Acted on the same day: ticket 02 closed, and its remaining work is now tickets [02a](issues/02a-hidden-grants-and-unlisted-types.md), [02b](issues/02b-items-gear-data-and-trimming.md), [02c](issues/02c-shared-names.md) and ticket 03's areas (plan.md).

A fresh look at where the build stands, made at the user's request before ticket 03 starts. It checks ticket 02's "Done when" against the committed data (`f86c4bf`), lists the design text our decisions have overtaken, and checks what ticket 03's walk needs from `data/`. The ordered task list at the end is ticket 02's remaining work.

## Ticket 02's "Done when", measured

| Item | State |
| --- | --- |
| Every held blueprint has an entry; every reference resolves | **Holds** for what is written (the import runs the load checks). Items aren't written yet. |
| Every prerequisite leaf finds a grantor through G, or is reported with a reason | **Holds**: 7 facts are reported with reasons in `no-grantor.ts`. |
| `ChannelPositiveAllowed` gives one "deity" group | **Doesn't hold as written, and shouldn't.** G gives `Deities` plus `PriestOfBalanceArchetype`, which the game data really has. Record it in the Outcome as a corrected expectation. |
| The missing component types are reviewed | **Not done**: 552 types, none noted except `OnSpawnBuff`. |
| A second run writes nothing | **Holds.** |
| No game text in `data/` but `name` | **Holds**: a scan finds no sentence-like string outside `name`, and no text-shaped keys. |
| The browser document's size is recorded in the Outcome | **Partly**: measured without items (0.71 MB gzip); the Outcome isn't written. |
| `npm run check` runs the importer's checks and the A tests | **Holds** (337 engine tests). |

## Design text our decisions have overtaken

The map tickets are the record, but the guide and ADR 0005 still say otherwise in places. Each should point at its map ticket, so ticket 03 doesn't port from stale text:
- **Guide §2 ("Prerequisite") and §4 (P):** "a flat list with no nesting". `PrerequisiteCondition` carries a condition tree ([map 20](../wotr-planner/issues/20-nested-prerequisite-conditions.md)).
- **Guide §3 point 5 and ADR 0005:** "spells, buffs and units are followed but not written" and "only features, classes, selections and items are written". `data/` now also holds:
  - grant-carrying buffs, and `AddFactContextActions` and `ActivateTrigger` grant actions ([map 23](../wotr-planner/issues/23-grants-carried-by-buffs-and-actions.md));
  - choice-carrying abilities ([24](../wotr-planner/issues/24-wandering-spirit-is-a-daily-choice.md), [26](../wotr-planner/issues/26-mixed-bloodline-is-a-daily-choice.md));
  - Shifter aspect toggles;
  - the settings blueprints.
- **Guide §7 "Race and subrace", "Feats and selections":** nothing wrong, but the daily-choice abilities (map 24, 26) and story-granted features ([25](../wotr-planner/issues/25-story-granted-features.md)) aren't mentioned.
- **Ticket 02 itself:** "every reference … to a blueprint of the expected kind" now includes the new kinds; nothing to change.

## What ticket 03's walk reads that `data/` doesn't hold yet

Each area of ticket 03, against the components the guide's §7 cites for it. Counts are written blueprints carrying the unlisted type (`data/report.md`).

| Walk area | Missing from `data/` |
| --- | --- |
| Class skills and skill ranks | `AddClassSkill` 110, `AddBackgroundClassSkill` 39, `AddSkillPointPerCharacterLevel` 3 |
| Proficiency (feats and Gear) | `AddProficiencies` 90, `AddBackgroundWeaponProficiency` 24; weapon and armour types (items area) |
| Spellbooks as gates | `AddSpellbookLevel` 41 (prestige classes advancing a spellbook), `SkipLevelsForSpellProgression` 1, `IsAlchemistSpellbook` 1 and `IsSinMagicSpecialistSpellbook` 7 (`PrerequisiteCasterTypeSpellLevel` excludes alchemists), `AddCasterLevel*` 11 |
| Stat prerequisites (permanent value) | `AddContextStatBonus` 279 with `ContextRankConfig` 402 (scaled bonuses, some permanent), `ReplaceStatBaseAttribute` 15 |
| Grants G can't see yet | `AddFeatureOnAlignment` 25, `AddParametrizedFeatures` 9 and `AddFeatureParametrized` 1 (a feat granted at one parameter) |
| Shifter aspects kept on | `IncreaseActivatableAbilityGroupSize` 63 (how many aspects at once) |
| Gear checks | the whole items area: sourced items, `EquipmentRestriction*`, `AddStatBonusEquipment` and other enchantments for ADR 0002's opt-in, and the unlock components' weapon- and armour-type lists |
| Mythic ranks and path switches | nothing more for ranks. Path switches go through story actions (`RemoveMythicLevels`…) that `data/` doesn't hold; ticket 03 must first raise "Path switches in detail" on the map (its own scope says so). |
| Gold builds | present: `~/code/wotr-planner/libs/seeds/tests/game_data/gold/enforcer.ron`, `jack-in-the-green.ron` |

Not needed by the walk, as noted in the census or the map:
- `DlcCondition` 102: no DLC gating (map, "Settled before this map").
- `AddClassLevels` 138 and `AddFeatureToPet`: companions and pets (map 01).
- `Recommendation*`, `StatsDistributionPreset`, UI and art components.
- Combat-time triggers and damage, which Summaries may want later (build ticket 06).

## Open points the walk inherits

- **Daily choices:** a leaf needing an option of a daily-choice ability is met while the character holds that ability's feature (map 24, 26). The walk needs the cited list of those abilities, which is ticket 24's list.
- **Story-granted features** are never held (map 25).
- **`PrerequisiteFeaturesFromList.IsDeity`:** a deity list needs one, not `Amount`. P keeps `Amount` raw, so the walk applies `IsDeity` from the features' `Groups`.
- **G's Build-aware half** (who holds what, from where) is ticket 03's.

## Ticket 02's remaining work, in order

1. **Grants G can't see yet:** `AddFeatureOnAlignment`, and `AddParametrizedFeatures`/`AddFeatureParametrized` (with their parameter). Re-run the leftover census after.
2. **The walk's inputs above,** allowlisted with A tests: class skills, proficiencies, spellbook levels and markers, skill points, context stat bonuses (decide with the user how far `ContextRankConfig` goes), and aspect group size.
3. **Items area:** the 3,397 sourced items (the research's method), the hand-kept overrides (`colossus-ring` added, `WeaponEmptyHand` removed), `EquipmentRestriction*`, weapon and armour types, Gear stat enchantments, and the unlock components' type lists.
4. **Review the remaining unlisted types:** each allowlisted, or noted in `not-needed.ts` with its reason. Bulk notes are fine per family (UI, recommendation, combat triggers for Summaries later, pets, armies, DLC).
5. **Keep rule and trimming:**
   - The keep rule: reachable through G, plus what kept blueprints' fields name, plus what sourced items reach.
   - A check that no kept grant names a dropped blueprint.
   - The 28 prerequisite leaves that name an unreachable fact, checked one by one.
   - Then drop the leftovers.
6. **Shared names:** qualifiers per member (grantor, then prerequisite, then override). Raise ticket 19's rule with the user if many stay open.
7. **Design text:** point the guide's §2, §3 point 5 and §4, and ADR 0005, at map tickets 20 and 23–26.
8. **Outcome,** with the size including items and the `ChannelPositiveAllowed` correction, then `Status: done`.
