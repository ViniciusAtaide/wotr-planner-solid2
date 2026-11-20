# Which items the game actually hands out

Type: research
Status: resolved
Parent: [map](../map.md)

## Question

Can the dump tell which equipment blueprints a player can actually obtain (loot tables, vendor tables, quest rewards, crafting), as opposed to unused, test or NPC-only items? Which blueprint types and fields hold that information, how many items does it keep, and what's left over that a small hand-kept exclusion list would have to cover?

Also: which `EquipmentRestriction*` components appear on obtainable items, and how often? The code side is in `decompiled/Assembly-CSharp/Kingmaker/Blueprints/Items/Components/EquipmentRestriction*.cs`.

## Answer

Yes. An item's source is a reference to its GUID from a container or a giving action. The item has no flag of its own, so the planner can build an **allowlist from the sources**, not an exclusion list. Findings: [research/obtainable-items.md](../research/obtainable-items.md).

- **Counts:** 4,542 equipment blueprints. 3,397 are reachable: 2,680 without the Midnight Isles dungeon and 717 more with it.
- **Where the sources are:**
  - `BlueprintLoot.Items` (map containers)
  - `BlueprintSharedVendorTable` and `BlueprintUnitLoot` packs, when some blueprint references the table
  - `AddItemToPlayer` and `AddItemsToCollection` in cues, answers, etudes and crusade events
  - `BlueprintGlobalMapPoint.Loot`
  - the random-encounter `TrashLootSettings`
  - class starting items
  - companions' units
  - the dungeon's live `BlueprintDungeonLoot.m_Items`
  - closed over item forms and parts
- **The 1,145 left over:**
  - 297 natural weapons
  - 591 found only on the dungeon's exclude list (probably cut)
  - 135 worn only by NPCs
  - 58 only in tables no blueprint references (probably live, attached in scenes)
  - 55 referenced by nothing
  - 8 with test names
  - 7 reached only through buffs
- **The hand-kept list is small:** remove `WeaponEmptyHand`, and confirm any items the dump can't place.
- **Restrictions:** 437 reachable items carry one. Most are class bans: no dragon (329) and no druid (232, all armour). Class-list rules cover 59 (mostly barding), required classes or mythic paths 27, alignment masks 12, DLC swaps 8 and main character only 3. `SpecialUnit`, `Stat` and `CannotEquip` are on no reachable item.
