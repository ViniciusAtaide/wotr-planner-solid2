# Commit the game's display names, never its descriptions

This narrows ADR 0001. The UI, the agents and the gold builds all need readable names, but the dump holds them only as localisation keys into the game's text. So the importer resolves each kept blueprint's English display name and commits it to `data/` as `name`. That is the only game text the repo holds: a name refers to the thing in the game (Power Attack is Power Attack), as the Rust planner's names did, under the same OGL notice. Descriptions, flavour text and every other string stay out, and Summaries remain our own words.

## Consequences

- **Templates:** some names are filled in by the game at runtime (`{Name}, L{mf|ord|ady} of Death`). The importer resolves the tokens to a neutral form ("Lord/Lady of Death") and lists every such name in its report.
- **Blueprints with no name** are never shown. A Refusal or a "this needs" link that has to mention one words it through what grants it (ticket 19).
- **Shared names:** where two reachable blueprints share a name, a qualifier is added, taken in this order: the grantor; the prerequisite that sets them apart; an override file. The importer's report lists every collision and which source settled it. The MCP always identifies blueprints by GUID.

## Amended 2026-11-19: qualifying shared names blueprint by blueprint

On the build's data, 708 names are shared among reachable blueprints. The three sources above, applied all-or-nothing to each group, settle few of them, and overrides for the rest would number in the hundreds. A shared name is now qualified blueprint by blueprint:
1. the nearest named grantor;
2. that grantor with the grant level ("Patron Spells (Witch Patron 4)");
3. the blueprint's kind, so a class keeps its plain name beside picks named after it;
4. the distinguishing prerequisite;
5. an override file of the new `"change": "name"` kind.

One blueprint in a group may stay bare when the other labels are distinct. See [map ticket 27](../../.scratch/wotr-planner/issues/27-qualifying-shared-names-per-blueprint.md).


## Note 2026-11-21: names the game composes from display names are display names

An item whose own display name is empty is named by the game from other display strings: a weapon from its type's default name with its enchantments' prefixes and suffixes ("Cold Iron Longsword +1"), an armour from its type's default name, a shield from its armour half. The importer ports those `Name` getters (`BlueprintItemWeapon`, `BlueprintItemArmor`, `BlueprintItemShield`) and commits the result as `name`, like any display name. It only joins strings the game itself joins, so it never invents text. Coordinator, on the user's standing instruction; build ticket 12.
