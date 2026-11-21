# Items the game names from their type: composed Gear names

Status: done
Session: ticket-03c-walk-fixes
Blocked by: none
Plan: [plan](../plan.md)

## Goal

QA pass 5 found that 548 wearable items have no display name of their own in `data/` (506 weapons, 25 armours, 15 shields, 2 others), so `isShown` drops them and Gear never offers them: no plain Longsword, no Chainshirt. The game names such an item itself: a weapon from its type's default name with its enchantments' prefixes and suffixes (`BlueprintItemWeapon.Name`, `GetEnchantmentPrefixes`, `GetEnchantmentSuffixes`), an armour from its type's default name (`BlueprintItemArmor.Name`), a shield from its armour half (`BlueprintItemShield.Name`).

Coordinator, 2026-11-21, on the user's standing instruction: severity 3, before QA pass 5's Summaries.

## Scope

- **The importer composes those names** by porting the three `Name` getters, from display strings only (the type's `m_DefaultNameText`, falling back to `m_TypeNameText`; the enchantments' `m_Prefix` and `m_Suffix`), cited to those methods. It never invents text. ADR 0006's notes and map 29 record that a name the game composes from display names is a display name.
- **Then map 29's rules run on the new names:** twins collapse, then the qualifiers. The import's shared-name checks stay clean.
- **Tests:** a plain Longsword and a Chainshirt are offered in Gear; a data-wide test that no Gear place lists two options with the same name; the walk tests that wear them still pass.

## Done when

- `bun run check` passes, the `data/` diff is explained in the Outcome, and the gzip size of the data document is measured before and after.
- `Status: done` and an `## Outcome`.

## Outcome

Done. `tools/importer/item-names.ts`'s `composedItemName` ports `BlueprintItemWeapon.Name` (with `GetEnchantmentPrefixes` and `GetEnchantmentSuffixes`), `BlueprintItemArmor.Name` and `BlueprintItemShield.Name`, cited, and the importer writes the result as `name` when an item's own display name is empty. ADR 0006 has a note, and map 29 an amendment.

- **The `data/` diff:** 728 item files. 727 gain a `name` line (the line before it gains a comma). These are weapons, armours and shields, among them parts such as shields' armour halves, which the game names the same way. One name changes: the Hellknight "Spiked Heavy Shield +3" is now "Spiked Heavy Shield +3 (shield)", since a newly named item shares its name. 2 items (a pair of gloves and a helmet) stay nameless, as in the game, whose names for those come from nothing else.
- **One override's reason changed:** `CertaintyOfDeathSecondItem` (a double weapon's second end) has a patch that clears a shared string holding a description. It now takes the composed "Holy Dwarven Urgrosh +3" instead of staying nameless, and `engine/load`'s test that no description is written as a name checks that.
- **Gear:** MainHand offers 1999 items (was 1514), OffHand 2108 (was 1614), Armor 370 (was 347). Twins went from 39 to 68, and the qualifiers settle the rest ("Heavy Shield (+1)" beside "Heavy Shield +1"). No Gear place lists two options with the same name (the data-wide test in engine/pickers).
- **Size:** the data document went from 2.123 MB raw, 0.498 MB gzip, to 2.135 MB raw, 0.499 MB gzip.
- **Tests:** `item-names.test.ts` (a weapon with prefix and suffix, an armour, a shield through its armour half); engine/pickers checks that a plain Longsword and a Chainshirt are offered; the walk's tests that wear them pass unchanged.
