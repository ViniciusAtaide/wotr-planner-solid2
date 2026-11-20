# Items, Gear data and trimming

Status: done
Blocked by: 02a
Plan: [plan](../plan.md)

## Goal

`data/` holds the items a Build's Gear can hold, with everything the Gear checks read. It then holds nothing a Build can't reach: the leftovers are trimmed behind a check, so no grant route is lost. This runs alongside ticket 03, and only 03's Gear area waits for it.

## Before starting

Read ticket 02's Outcome and its "Progress" sections ([02-importer-and-grant-index.md](02-importer-and-grant-index.md)), and [Which items count as Gear](../../wotr-planner/issues/12-which-items-count-as-gear.md) with its research, [obtainable-items.md](../../wotr-planner/research/obtainable-items.md). The research's scripts weren't kept; its section "How to redo the count" is the method.

## Scope

- **Sourced items:**
  - The importer adds the equipment blueprints the dump traces to a source in play: weapon, armour, shield and the eleven worn slots.
  - It follows the research's method: the source tables, the live vendor and dungeon tables, companions' gear, item forms and parts, and no natural weapons.
  - Expect about 3,397. The count is a check: a large difference is investigated before the data is written.
- **The hand-kept list**, as override files with their reasons: `colossus-ring` (`RingofConstitution` 6c7f785bab7bd1243a43e365dc2089bd) added, and `WeaponEmptyHand` 20375b5a0c9243d45966bd72c690ab74 removed.
- **What the Gear checks read** (ticket 03's Gear area; [ADR 0002](../../../docs/adr/0002-gear-does-not-meet-stat-prerequisites-by-default.md)):
  - each item's slot;
  - weapon types (category, natural, monk, fighter group);
  - armour types (proficiency group);
  - `EquipmentRestriction*`;
  - the enchantments whose stat bonuses ADR 0002's opt-in counts (`AddStatBonusEquipment` and its kin). Only `Enhancement` bonuses from items count for prerequisites (`ModifiableValue.Modifier.IsPermanent`);
  - the features items grant (`AddUnitFeatureEquipment`).
- **The unlock components' type lists:** `MonkNoArmorAndMonkWeaponFeatureUnlock.m_BowWeaponTypes` and `HasArmorFeatureUnlock.m_BlueprintArmorTypes`, now that the types are held.
- **The keep rule, its check, then trimming:**
  - **Keep:** what G reaches from the root (`reachableFromRoot`), plus what the sourced items reach, plus every blueprint a kept blueprint's kept fields name (spellbooks, tables, prerequisite targets).
  - **The check:** the import fails when a kept blueprint's kept field names a dropped one.
  - **The 28 prerequisite leaves** that name a fact no Build can reach (the census, 2026-11-19): each is modelled, or listed with its reason. Rerun the census (`npm run census`, [scripts/dump/census.ts](../../../scripts/dump/census.ts)) before trimming and after each added grant route: it groups every leftover by what in the dump still names it.
  - **Then** the importer writes only the kept set.
- **The final size:** the browser document, gzipped, with items, recorded in the Outcome (ADR 0004).

## Done when

- The sourced-item count is recorded beside the research's 3,397, with every difference explained.
- Both hand-kept overrides are applied, and the loader checks them.
- Every field the Gear checks read is allowlisted with its A test, including the unlock components' type lists.
- The keep rule's check is part of the import, and every one of the 28 leaves is modelled or reasoned.
- `data/` holds only the kept set, and a second import writes nothing.
- `npm run check` passes, and the work is committed as the plan's "How to work" says.
- `Status: done`, with an `## Outcome`: the item count, the trimmed count and the final gzipped size.

## Outcome

2026-11-20. Two commits: "Ticket 02b: items, Gear data and the keep rule", made early at the planning session's request so ticket 03 could start, and "Ticket 02b: the character-creation unit's grants (map 28)", after the user's decision.

**Sourced items** (`tools/importer/items.ts`, the research's method ported): **3,397**, the research's count, and every slot's count matches its table. Two differences inside the total:
- The research says its 3,397 held `WeaponEmptyHand` 20375b5a0c9243d45966bd72c690ab74. Here the natural rule drops it, because its weapon type `EmptyHand` has `m_IsNatural`. It is the only sourced natural weapon.
- So the research's set lacked one weapon this one holds. The likely one is `ArmagsBladeItem` ce0842546b73aa34b8fcf40a970ede68, whose weapon type is missing from the dump, so its natural flag can't be read. This is inferred: the research's scripts weren't kept.

The import fails when the count strays more than 34 from 3,397. The report lists the count by source.

**Hand-kept overrides** (`data/overrides/`), each with its reason; the loader checks each one:
- add `RingofConstitution` (colossus-ring);
- remove `ArmagsBladeItem`: its type is missing, so proficiency can't be checked;
- patch `CertaintyOfDeathSecondItem`, whose name key points at a description (ADR 0006).

No override is needed for `WeaponEmptyHand`: the rule already drops it.

**What the Gear checks read**, each allowlisted with its A test:
- The item's place: its `$type`, as the slots' `IsItemSupported` reads it.
- Its weapon type (category, natural, monk, two-handed, fighter group) or armour type (proficiency group, `m_IsArmor`). Also a double weapon's `Double`, which keeps it out of the off hand alone.
- A shield's armour half and bash weapon.
- The four restrictions on sourced items (class, class list, alignment, main character). The other three occur on no sourced item.
- The enchantments the item and its type carry: `AddStatBonusEquipment` and `IncreaseStatEquipment`, kept only when `Enhancement`, since `IsPermanent` counts only that. Also `AddUnitFeatureEquipment` and `AddUnitFactEquipment` (132 of the latter give features), and `MithralEnchantment` and `IgnoreArmorGroupComponent`, which the armour group and proficiency read.
- An enchantment is held only when its kept form says something: 696 are.
- The unlock lists `m_BowWeaponTypes` and `m_BlueprintArmorTypes` (null entries kept, as the game matches none).

**G** gained the edge kinds `itemEnchantment`, `shieldPart`, `AddUnitFeatureEquipment` and `AddUnitFactEquipment`, plus `reachableFromGear`.

**The keep rule** (`keptSet` in `tools/importer/import.ts`): what G reaches from the root and from the sourced items, plus every blueprint a kept field names, until nothing new is named.
- A first filter of everything held builds G, and the second writes only the kept set, judging every reference against it. A strict reference to a dropped blueprint fails the import.
- **Trimmed 2,071** of 13,763 held. `data/` now holds 11,692 blueprints.
- The census (`npm run census`, now counting Gear's reach) went from 2,888 leftovers to 283. All 283 are named by kept fields: item types, spellbooks, tables, prerequisite targets, pet classes. Its output is in the shared notes folder, `ticket-02b-*`.
- 75 types left `not-needed.ts` and 14 item types joined it. The report reads "None left to review".

**The 28 leaves**, counted through P: 31 leaves on reachable blueprints named 14 facts no Build could reach (the census's 28 by component, plus 3 inside `PrerequisiteFeaturesFromList`). None is reached through Gear.
- **Modelled** ([map ticket 28](../../wotr-planner/issues/28-facts-the-chargen-unit-grants.md), user 2026-11-20): `ForbiddenDeityFeature` c4403567ea9e5fe478ca38e3052fadc2.
  - The character-creation unit (`BlueprintRoot.m_DefaultPlayerCharacter`, `StartGame_Player_Unit` 4391e8b9afbb0cf43aeba700c089f56d) gives it to every main character through `AddFacts`, and nothing removes it.
  - `data/units/` now holds that unit, with only its `AddFacts`; `BlueprintRoot` keeps the reference, and G makes it a `root` grant.
  - So every Build holds the fact, and its 6 leaves are real refusals: Areshkagal, Baphomet, Deskari, Kabriri, Pulura and the Lich deity.
  - The unit's other components are noted in `not-needed.ts`.
- **Reasoned:** the other 25 leaves, on 12 facts. 8 of the leaves require such a fact, and 17 forbid one, which is always met.
  - 7 facts are in `no-grantor.ts`. Vow of Dahak's reason now cites map 25.
  - 5 are in the new `unreachable.ts`.
  - The import fails on such a fact listed in neither file, and on a stale entry.

**Final size** (ADR 0004): the browser document with items is 5.63 MB minified, **0.82 MB gzip**, 0.43 MB brotli. Without items, before trimming, it was 0.72 MB gzip.

**Check:** `npm run check` passes with no lint warnings: 497 engine tests and 11 template tests. A second import writes nothing. The import check now takes about 8 s (was about 4 s): it decompresses the dump twice and diffs more files.

**Follow-ups:**
- 02c: items share display names heavily (1,865 name keys for 3,397 items).
- Ticket 03's Gear area: the sourced count includes shield halves and double-weapon ends, which are worn only with their parent. Which items the Gear picker offers on their own is for 03 to settle.
- 02a's real-data test for `AddFeatureOnAlignment` now uses a fixture: its one game example, `RuinFeature`, is on an item nothing gives, so it is trimmed.
