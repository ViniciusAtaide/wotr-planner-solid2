# Telling Gear items apart

Type: grilling
Status: resolved
Blocked by: none
Parent: [map](../map.md)

## Question

Build ticket 02c qualifies the display names that blueprints a Build reaches from the root share ([Qualifying shared names](27-qualifying-shared-names-per-blueprint.md)). Items reached only as Gear were left out: on the build's data (2026-11-20) they make 199 more shared-name groups, holding 668 items. Examples are the Hellknight copies of adamantine armour beside the plain ones ("Adamantine Full Plate +2"), and the ten "The Bound of Possibility" cloaks, one per Mythic path. 12 of those names also belong to a blueprint the root reaches, such as an item and the feature its enchantment gives ("All-Round Defense").

No grantor tells these apart, since items aren't granted. How should the Gear pickers (build tickets 04 and 05) name them? The likely sources are the item's own facts, such as its enhancement bonus, its slot, its source (map ticket 12's sourcing) or its required Mythic path, with an override as the last resort, as in ticket 27.

Raised by build ticket 02c, with the user, 2026-11-20. Settle it before the Gear pickers are built.

## Added by build ticket 02e: features reached only through Gear

Build ticket 02e found 5 groups where a feature reached only through Gear (an item's enchantment) shares its name with a feature the root reaches: Dispelling Touch, Freedom of Movement, Magic Domain, Poison Immunity and Undead (6 Gear-only features). The list with GUIDs and grantors is in the shared notes, `ticket-02e-gear-only-names.txt`. Three more dropped out once hidden blueprints were left out.

**Answer** (coordinator, 2026-11-20, on the user's standing instruction): these are features, so a sheet or search can show them beside the root feature of the same name. They follow [ticket 27](27-qualifying-shared-names-per-blueprint.md)'s grantor rule with the item as their grantor, e.g. "Poison Immunity (Periapt of Neutralize Poison)", while the root feature stays bare. With several item grantors, map 30's answer applies: a common family name, otherwise an override. Build ticket 02f builds it.

## Answer

Coordinator, 2026-11-20, on the user's standing instruction to answer grilling tickets itself, using the GameFAQs pages and the Rust planner for the harder ones.

**What the sources show.**
- GameFAQs (`~/code/wotr-planner/guide-cache/txt/items.txt`) treats "The Bound of Possibility" as one cloak "whose benefit depends on your Mythic path", listing one effect per path. The game's ten blueprints are that one item, one per path.
- The Rust planner's Gear names each item once, by its display name, with the enhancement in its key (`belt-of-giant-strength-4`).
- Neither source tells apart copies that differ only in which vendor or story event hands them out, because in play they're the same item.

**The rule.** Applied to every group of items a Build can equip that share a display name, in this order. The first rule that leaves every label in the group distinct settles it.

1. **Twins collapse.** Items whose kept fields are all equal, apart from GUID, asset name and source, are one choice. The pickers offer the lowest GUID; the others stay decodable in Build codes and open as that one. This covers the Hellknight copies of plain armour.
2. **Required Mythic path or class.** An `EquipmentRestriction*` naming a path or class becomes the qualifier: "The Bound of Possibility (Aeon)".
3. **The item's own numbers.** Differing enhancement bonus, slot or weapon or armour type become the qualifier, e.g. "+2", "Shield".
4. **An override,** with its reason, as in [ticket 27](27-qualifying-shared-names-per-blueprint.md).

**Other kinds.** An item that shares its name with a feature (such as "All-Round Defense", the ring and the feature its enchantment gives) needs no qualifier in the Gear picker, which only lists items. Search shows each result's kind ("item", "feat"…) beside the name.

**Who builds it:** build ticket 02f, before ticket 04.

## As built

Build ticket 02f (commit `87386083`), 2026-11-20; the coordinator agreed both points.

- **Item parts are left out of the groups.** These are a shield's armour half (`m_ArmorComponent`) and bash weapon (`m_WeaponComponent`), and a double weapon's second end (`m_SecondWeapon`). The game builds them only as part of their item (`Items/ItemEntityWeapon.cs`'s constructor makes the second end; `BlueprintItemShield` holds its halves), so no Build equips them on their own. `BlueprintItemWeapon.m_SecondWeapon` is now kept to find the second ends. One dangling reference, on `DLC3_JabstabberPunchdaggerWeaponItem`, a weapon that isn't double, is cleared by a cited patch override.
- **Finnean collapses by rule 1.** Each weapon type's stages (Stage1, Stage2, Stage3Base) have equal kept fields, since `data/` keeps their enchantments without the enhancement bonus. So they are twins and offered as one choice, the lowest GUID, told apart from the other weapon types by rule 3's type name ("Finnean the Talking Weapon (Bardiche)"). The planner judges what `data/` keeps. If a later ticket keeps enhancement bonuses, the stages split again by themselves under rule 3. GameFAQs (`items.txt`, "Finnean the Talking Weapon") gives them as +1 Cold Iron Ghost Touch in chapter 1, +3 Ghost Touch Heartseeker in chapter 3 and +5 Brilliant Energy Heartseeker in chapter 5. No Finnean override is written.
- **Two more readings of the rules:**
  - Twins compare a part without its own display name, since a part is never shown.
  - A shield's type is its bash weapon's ("Heavy Shield +1 (Spiked Heavy Shield)").
  - A type that only repeats the item's name leaves that item bare.
  - Twins are recorded in `data/twins.json` and exposed as `CheckedData.twins` (until 02g; see the amendment below).

## Amendment after the review of tickets 02 and 03

User, 2026-11-20 ("Fix all first"), on the review's findings. Build ticket [02g](../../wotr-planner-build/issues/02g-importer-review-fixes.md) builds both.

- **Finnean's stages are separate choices.** Rule 1 is for copies that differ only in who hands them out. Finnean's stages are different items in play (+1, +3, +5 by chapter, per GameFAQs), so they aren't twins. The import keeps the enchantments' enhancement bonus, and rule 3 tells the stages apart.
- **Twins are derived at load, not stored.** The guide (§3.4) keeps derived views out of `data/`, so `data/twins.json` goes. The loader computes `CheckedData.twins` with rule 1.

### As built (build ticket 02g, `2646319e`)

- **Enhancement bonuses:** the import keeps `WeaponEnhancementBonus` and `ArmorEnhancementBonus`. Rule 3 reads the bonus as the game sums it and runs in this order: slot, type, enhancement, then type and enhancement together. That gives "Finnean the Talking Weapon (Bardiche +1)", "(+3)" and "(+5)", with no override.
- **Twins:** 145 → 39.
- **Yaniel's Radiance:** the Holy Avenger and Bane Living pairs at +4 and +6 stay twins, because what tells them apart isn't kept. They're different items in play, so build ticket 06 splits them.
- **Cost:** `deriveTwins` takes about 2 ms at load.
