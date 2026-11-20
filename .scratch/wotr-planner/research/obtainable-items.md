# Which equipment the game hands out

Research for [ticket 04](../issues/04-which-items-the-game-hands-out.md). Sources: the BubblePrints dump `blueprints_raw_2.7.0x_0.binz` (236,660 blueprints) and WrathDecompiled at `6ce4a6b` (`decompiled/Assembly-CSharp/Kingmaker`). Done 2026-11-19. The counts come from throwaway scripts in the session scratchpad: a reverse index of every `"!bp_<guid>"` reference in the dump, keyed by the referring blueprint's type, the `$type` of the object around the reference, and the field name. The scripts are not kept. The method is described under "How to redo the count".

## Short answer

Yes, mostly. The dump records an item's source as a **reference from a container or action to the item's GUID**. The item itself carries no "obtainable" flag. Following those references:

- **4,542 equipment blueprints** (weapon, armour, shield and the eleven worn slots; usables are not counted).
- **3,397 are reachable** from a source the dump can vouch for. That is 2,680 without the Midnight Isles dungeon, plus 717 that only the dungeon gives.
- **1,145 are left over.** 297 are natural weapons. 591 appear only on the dungeon's *exclude* list and nowhere else, so they are probably cut or inherited content. 135 are worn only by non-companion NPCs. 58 are only in vendor or unit-loot tables that no blueprint references. 55 are referenced by nothing, mostly loose shield-bash weapon parts. 8 have test names. 7 are referenced only by buffs or abilities.
- So the planner can **build an allowlist from the sources** and needs no large exclusion list. The hand-kept list is small: one natural weapon that slips in (`WeaponEmptyHand` 20375b5a0c9243d45966bd72c690ab74), and whichever of the 58 "unreferenced table" items the user confirms by hand.
- **Restrictions:** 437 of the 3,397 carry an `EquipmentRestriction*` or `ItemDlcRestriction` component. Almost all are class bans: no dragons (329 items) and no druids (232, all armour). `EquipmentRestrictionSpecialUnit` appears on no item at all, and `Stat` and `CannotEquip` appear on one unobtainable item each. The full table is below.

## Where the dump says an item comes from

Each row is a field that **gives** items, with how many equipment blueprints it reaches. An item can have several sources, so the counts overlap. "Only" counts the items that source alone gives.

| Source (my label) | Blueprint type and field | What it is in play | Items | Only |
| --- | --- | --- | --- | --- |
| chest | `BlueprintLoot.Items[].m_Item` | A map container's contents, exported per container with `m_Area` and `ContainerName`. A scene's `InteractionLootSettings.m_LootTables` points at these (`View/MapObjects/InteractionLootPart.MapObjectLoot`). | 758 | 66 |
| vendor | `BlueprintSharedVendorTable` → `LootItemsPackFixed` / `LootItemsPackFixedAndNotInPlayerInitialInventory` / `LootRandomItem` `.m_Item`, where some blueprint references the table | Vendor stock. Tables are attached by `AddSharedVendor`, `AddLootToVendorTable`, `AddVendorItems` on a `BlueprintUnit`, by `AddVendorItemsAction` / `AddItemsToCollection` in etudes and action holders, and by `RandomEncountersRoot.m_TraderTable`. | 1,602 | 191 |
| unit loot | `BlueprintUnitLoot` → `LootItemsPackFixed` / `LootRandomItem`, where the table is referenced | Drops: `AddLoot` on a `BlueprintUnit` puts the table's items into the unit's inventory when it spawns (`UnitLogic/FactLogic/AddLoot.HandleUnitSpawned`). | 77 | 8 |
| scripted | `AddItemToPlayer.m_ItemToGive`, `AddItemsToCollection.m_Item`, `AddPremiumReward.Items`, in `BlueprintCue`, `BlueprintAnswer`, `BlueprintEtude`, `BlueprintDialog`, `ActionsHolder`, `CommandAction`, `BlueprintFeature` | Quest and dialogue rewards, DLC rewards. | 208 | 68 |
| crusade | `AddItemToPlayer` in `BlueprintCrusadeEvent` / `BlueprintKingdomProject`; `KingdomActionGiveLoot` in `BlueprintKingdomEvent`; `BlueprintGlobalMapPoint.Loot[].m_Item` | Crusade events, kingdom projects (some take an item via `EventItemCost` and give an upgraded one back), and loot from defeated garrisons on the global map. | 197 | 142 |
| random-encounter trash | `TrashLootSettings.Types[].Items` of `RE_TrashLootSettings` daf5872cc909705428f4a092d05351d1 only | Random-encounter chests (`RandomEncounters/CombatRandomEncountersGenerator`, via `RandomEncountersRoot.m_TrashLootSettings`). The other two `TrashLootSettings` are referenced by nothing. | 426 | 7 |
| start kit | `BlueprintCharacterClass` / `BlueprintArchetype` `.m_StartingItems`, `AddStartingEquipment.m_BasicItems` | A new character's kit. | 57 | 0 |
| companion gear | `BlueprintUnit` body slots and `m_StartingInventory`, for units named by `Recruit` / `RecruitInactive` `.m_CompanionBlueprint` or `ExchangeRecruits.m_NewUnit` (53 units, mercenaries included) | What a companion joins with. | 258 | 2 |
| Midnight Isles dungeon | `BlueprintDungeonLoot.m_Items` of the loot tables that `BlueprintDungeonRoot.m_Loot` or `DungeonAddLootToVendor` (on a unit) reference, and `BlueprintDungeonIslandRewardLoot.m_Items` referenced by a `BlueprintDungeonExpedition` | The DLC's chests, vendors and island rewards. `DungeonLootMagic` 24e7b8fe37484e06bc88738c9f032da2 (1,788 items) and `DungeonLootRare` afe1a911df6b4fcabeb827077f004678 (591) are the bulk. | 2,417 | 656 |
| form or part | `ItemPolymorph.m_PolymorphItems`; `BlueprintItemWeapon.m_SecondWeapon`; `BlueprintItemShield.m_WeaponComponent` / `m_ArmorComponent` | The other forms of an item that changes shape, the second end of a double weapon, and a shield's bash weapon and armour halves. These count when their parent is obtainable. Finnean's forms hang off the hidden item `FinneanBaseItem` 95c126deb99ba054aa5b84710520c035, which a `BlueprintCue` gives, and they account for 242 items. | — | 455 |

Notes on the dungeon:
- **`m_Items` is the runtime list.** The filter fields (`DungeonLootFilter`: `m_ItemsInclude`, `m_LootInclude`, `m_LootExclude`, path regexes) only drive the editor's "Collect" button, as the tooltips in `Dungeon/Blueprints/BlueprintDungeonLoot.cs` say. They are not read at play time.
- **Some dungeon tables give nothing.** `DungeonLootExclude` 86ad23ddcc074a878e350d822d980c30 (2,114 items) and `DungeonLootVendorExclude` 3e0e18c7484e469e857885f038ab8467 (1,784) are inputs to that filter, and `DungeonLootPotionsAndScrolls` 73cc179f447d49409fd3668b1b919fc8 (2,406) is referenced by nothing. A naive "referenced by a loot blueprint" count reaches 4,365 of 4,542 items through these lists, which is why it fails.

Fields that reference items but **don't give them**, and are left out: `Polymorph`, `AddAdditionalLimb`, `EmptyHandWeaponOverride`, `AddKineticistBlade` and similar on buffs, features and abilities (body weapons); `ItemsEnough`, `ItemsCount`, `RemoveItemFromPlayer`, `PartyInventoryTrigger` (checks and removals); `BlueprintCategoryDefaults.m_DefaultWeapon`; `CommandEquipWeaponTemporally` (cutscenes).

Sources that give items but don't count as play:
- `AddItemToPlayer` in `BlueprintAreaPreset`: developer start-here presets.
- `BlueprintPlayerUpgrader` / `BlueprintUnitUpgrader`: save migrations, which hand back replacement items.
- `BlueprintLoot` in `Tutorial_Test_Polygon`: 4 items.

None of these is an item's only source among the 3,397.

## By slot

| Type | All | Reachable |
| --- | --- | --- |
| `BlueprintItemWeapon` | 3,013 | 2,182 |
| `BlueprintItemArmor` | 569 | 474 |
| `BlueprintItemShield` | 130 | 121 |
| `BlueprintItemEquipmentHead` | 157 | 104 |
| `BlueprintItemEquipmentRing` | 146 | 108 |
| `BlueprintItemEquipmentNeck` | 111 | 86 |
| `BlueprintItemEquipmentShoulders` | 87 | 55 |
| `BlueprintItemEquipmentBelt` | 78 | 62 |
| `BlueprintItemEquipmentGloves` | 72 | 56 |
| `BlueprintItemEquipmentShirt` | 55 | 53 |
| `BlueprintItemEquipmentWrist` | 54 | 41 |
| `BlueprintItemEquipmentFeet` | 37 | 27 |
| `BlueprintItemEquipmentGlasses` | 33 | 28 |
| **all** | **4,542** | **3,397** |

Usables (`BlueprintItemEquipmentUsable`, which covers potions, scrolls, wands, tomes and quick-slot items): 1,207, of which 1,148 are reachable by the same rules (1,101 without the dungeon).

The 3,397 reachable items have **1,865 distinct display-name keys** (`m_DisplayNameText.m_Key`). Many blueprints share a name: the Hellknight copies of plate armour, Finnean's forms, and NPC copies of +N weapons. 277 have no enchantment. The guide-style "unique items" are a much smaller set, roughly the 1,083 whose asset name ends in `Item`, but that is a naming habit, not a rule.

## What's left over (1,145)

| Group | Count | What it is | Examples |
| --- | --- | --- | --- |
| Natural weapons | 297 | The weapon type's `m_IsNatural` is set: claws, bites, slams. The game never lets them be looted (`Items/ItemEntityWeapon.IsLootable`). | `SlamLarge2d6` 5ed9cc5be301fae44b24824074edea0f |
| Only on the dungeon's exclude list | 591 | Referenced by `DungeonLootExclude` and by nothing else in the dump. About half have the `…Item` naming of named uniques (299). Many read like the first game's content (`KingCrown` 2bffd039eb8f54847a2e0642db6c9080, `GamekeeperOfTheFirstWorldItem` 717369864d0ef1f43a291b7b8f3ce4c9, `RingMasterpieceItem` 459cff3f67aea3846a228e0119f5e522). The rest are +N variants nobody stocks (`FlailPlus6` 94909e2a52e99b94e962d1cb10d4c842), Large-size NPC weapons, and 3 Finnean forms not in the base item's list. My reading is that they are cut or inherited and never given. **Unverified:** a scene could still place one directly, and the dump can't show that. | above |
| Worn by NPCs only | 135 | In a body slot or `m_StartingInventory` of a `BlueprintUnit` that is not a companion. NPC body items do go into the NPC's inventory (`Items/Slots/ItemSlot.InsertItem` adds to `Owner.Inventory`). They can be looted from a corpse unless the unit is `Unlootable` (`UnitEntityData.HasLoot`). Whether the unit is ever placed is scene data, though. | `StarbowItem` 9cacbde9b86fae14482a7fda0d831f81, `RingOfLawItem` 5004d122ca41d2b4897d9c2c5ec08439 |
| Only in unreferenced tables | 58 | In a `BlueprintSharedVendorTable` or `BlueprintUnitLoot` that no blueprint references. 82 such tables hold equipment. Most have real-looking names: `DLC2_QuartermasterBaseTable` 8035c1313902fae4796d36065e769297, `C61_IssiliVendorTable` 1cfdec17b06a47740bacb7a7ea9dd0c6, the `DLC3_Tier*` tables. A few are plainly unused: `Unused_vendortable` 20cd2bcf12b142ae9dfaec07b68c4866. These are likely live, because a scene container can attach a vendor table directly (`InteractionLootSettings.m_AttachedVendorTable`) and the dump has no scenes. | `BlackKnightCloakItem` 7bbe13f76b9c91141a98a145d2832f4a, `CloakOfShadows` 42aa20c20917c41448fd6cb27de98d60 |
| Referenced by nothing | 55 | 51 are shield-bash weapon parts that no shield points at (`WeaponHeavyShieldPlus3` 63268520896f78f49a2b61c36772df45), plus 4 others (`HeadbandOfBigBrainsItem` 0a64791fd9ad3d645aa80149b0144435). | |
| Test names | 8 | Asset names say test, debug or cheat. | `OverPoweredTestBow` 37f82ab8449ad3341af335a23a27ceba, `CheatSheetGlovesItem` 593e8705f91e20a4ea62e0a068cb0ad4 |
| Buff or ability references only | 7 | Reached only through non-giving fields. | `DefendersBulwarkArmorItem` 8a85716ad8bfff34c94f46bc4ebf5e07 |

Inside the 3,397, I found nothing to exclude except `WeaponEmptyHand` 20375b5a0c9243d45966bd72c690ab74. It comes in through companions' `m_EmptyHandWeapon`, which should be left out like `m_AdditionalLimbs`. No reachable item has a test-style name. Seven reachable items are worn by test pregens (`NenioTestLevel15` and others), but the dungeon gives each of them anyway.

**What the hand-kept list must cover:**
- **Remove:** `WeaponEmptyHand`, or drop the `m_EmptyHandWeapon` field from the companion source.
- **Allow, if wanted:** the 58 items in unreferenced tables, after the user confirms them.
- **Allow:** any item the user knows is obtainable but the dump can't place. The likely cases are the NPC-worn 135 and the 591 exclude-only items.

So the list grows by adding items, not by removing them.

## Restrictions on reachable items

How many of the 3,397 reachable items carry each component, counted per item. 437 items carry at least one.

| Component | Items | What the rule tests (`CanBeEquippedBy`) | Detail |
| --- | --- | --- | --- |
| `EquipmentRestrictionClass`, `Not`, `DragonClass` | 329 | The wearer has no level in the class | 325 armour, 4 shirts |
| `EquipmentRestrictionClass`, `Not`, `DruidClass` | 232 | Same | All armour: the druid's metal-armour ban. Every one also has the no-dragon rule. |
| `EquipmentRestrictionHasAnyClassFromList` | 59 | The wearer has a level in any listed class (or in none, with `Not`) | 56 barding items: animal companion or dragon. `GauntletsOfMightySwipeItem` 2ef8b0290fafaf647941af8c25a2d7be: animal companion, Shifter, Golden Dragon or dragon. `Artifact_SpikedGauntletItem` 3230a07e17594084f88e770480277de2: not an animal companion, undead or dragon. `RovagugRelicSteppeBattlaxeItem` 7e4c2f4f0db6d644590b610458d9dde7: not an Alchemist. |
| `EquipmentRestrictionClass`, `Not`, `AnimalCompanionClass` | 18 | Same as the other `Not` rules | Armour |
| `EquipmentRestrictionClass`, positive | 27 | The wearer has a level in the class | 6 animal-companion items. 10 mythic cloaks, one per path: `Artifact_AeonCloakItem` b24d6185acea1f949b026c3b58e47947 and its kin for Angel, Azata, Demon, Devil, Trickster, Legend, Swarm, Golden Dragon (`GoldenDragonClass`), and Lich (`Artifact_LichCloakItem` 1622ceba1d7829b4f9ee709b71bd6baf). 5 more Lich items: `Artifact_HornsOfNaragaItem` and the four `PlayersPhylactery*Item`. Monk: 4 robes and veils (`RobeOfOrderItem` 32f8cc0a9152d224f933a5c0879ec368 and others). Shifter: `BestialRagsItem` efc86eef11d548d7be4ebfba999b9e9d. Bloodrager: `AmuletOfCirculatingBloodItem` 5043aad8b5815cc4a86f93c7ff2b50e3. |
| `EquipmentRestrictionAlignment` | 12 | The wearer's alignment is in the item's mask (`AlignmentExtension.MaskHasAlignment`) | `DravensHatItem` 0160c8eabe704db41b6309af0d26a8e0 (no good alignments), `RingOfChaosItem` 97143f0ec43f505409929934811144c3 (chaotic), `RobeOfVirtueItem` 17c5e2686dbb5a843b5ba859f22aeea1 (good, and Monk). The mask can be any set of the nine alignments. |
| `ItemDlcRestriction` | 8 | Not an equip rule: whether the DLC reward is available. If it isn't, the item becomes `m_ChangeTo` and `HideInVendors` hides it. | 4 Commander Pack and 2 preorder items, which swap to `m_ChangeTo` (`DashingCavaliersGlovesItem` 176da707c9c9d764e972a9da8b444ff3). 2 `Dlc4Reward` items (`PeriaptOfPlacebosItem` f823ef25098544a6bcf5366295ee1480). |
| `EquipmentRestrictionMainPlayer` | 3 | The wearer is the main character | `LegendaryBracersItem` 3dec5ad0800c41b2aff99cdeceabf00a, `DoublingAnnoyanceItem` 63c9d4fc0810432aa6d85111d345aa84, `MaskOfNothingItem` 8344b46a6e404227b72d129073383a6c |
| `EquipmentRestrictionSpecialUnit` | 0 | The wearer is one exact unit blueprint | On no item in the dump |
| `EquipmentRestrictionStat` | 0 | A permanent stat of at least `MinValue` | Only on `WarpaintedSkullItem` 5d343648bb8887d42b24cbadfeb36991 (Strength 15), which isn't reachable |
| `EquipmentRestrictionCannotEquip` | 0 | Never | Only on `SimpleEnergyBlasterBracerItem` fe2acd72f8e79884f8b693b1e020a20c, which isn't reachable |

Across all 4,542 equipment blueprints the counts are a little higher: 539 items carry a restriction, and alignment rules appear on 27. Most of the extra items are leftovers.

For a player character, the rules that matter come down to four checks:
- **No druid levels**, on 232 armours.
- **One class or mythic path required**, 21 items.
- **An alignment mask**, 12 items.
- **The main character only**, 3 items.

The dragon and animal-companion rules only matter for pets. Usables carry restrictions too: 2 class, 2 main-character, 1 alignment, 1 class list and 4 DLC components.

## Limits

- **Scenes are not in the dump.** Four things can't be checked:
  - Where units stand. This affects NPC gear and units carrying `AddLoot` tables.
  - Vendor tables attached straight to a container (`m_AttachedVendorTable`).
  - Which of the 2,801 `ActionsHolder` blueprints with no blueprint referrer a scene actually runs.
  - Any container whose `BlueprintLoot` export is missing.

  `BlueprintLoot` is the scene containers' own table, so chests are covered, but only as well as that export is complete. It spans 198 areas.
- **Reachability goes one step.** "Scripted" counts any giving action in any cue, answer or etude, without checking that the dialogue or etude can actually play.
- **DLC numbering in asset names** (`DLC1_`, `DLC3_`, `Dlc4Reward`) is Owlcat's internal numbering. I didn't map it to store names.

## How to redo the count

1. Decode the dump as `tools/game-check/src/binz.rs` in `~/code/wotr-planner` describes. Chunks with id 33 and sub id 0 are LZ4 blocks of records, and each record is the GUID, asset name, full type and JSON.
2. For every blueprint, walk its JSON. For each string `!bp_<guid>`, note the referrer's GUID and type, the `$type` of the closest enclosing object, and the field name.
3. Classify each `(referrer type, enclosing type, field)` with the tables above.
4. Mark a vendor or unit-loot table live if any blueprint references it.
5. Mark the dungeon tables live from `BlueprintDungeonRoot`, `DungeonAddLootToVendor` and `BlueprintDungeonExpedition`.
6. Take companions from the `Recruit` actions.
7. Close the set over item forms and parts.
8. Drop items whose weapon type has `m_IsNatural` set.

On this dump the whole pass takes about 10 seconds in Python.
