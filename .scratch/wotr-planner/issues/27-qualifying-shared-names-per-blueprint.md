# Qualifying shared names, blueprint by blueprint

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

[Display names](19-display-names.md) qualifies a name shared by blueprints a player can reach, from the first source that tells them apart: (1) the grantor, (2) the prerequisite that sets them apart, (3) an override file. Measured on the build's data (2026-11-19), 708 names are shared by 2,856 reachable blueprints.
- Requiring every blueprint in a group to get its own grantor qualifier settles 227 groups.
- Qualifying blueprint by blueprint from the nearest named grantor settles 369.
- The distinguishing prerequisite adds 1.

What stays open is mostly one grantor's own series, handed out at different levels: Patron Spells 1–6, the dragon resistances, claws. The rest is prestige classes' spellbook picks named after their class: "Arcanist" ×34, alongside the Arcanist class itself. Adding the grant level settles 139 of the 338 open groups. Overrides for the rest would number in the hundreds.

## Answer

User, 2026-11-19. Qualify **blueprint by blueprint**, taking the first source that leaves every label in the group distinct:
1. its nearest named grantor that a Build can reach: "Arcanist (Loremaster)";
2. that grantor and the grant level: "Patron Spells (Witch Patron 4)";
3. its kind, so a class keeps its plain name beside picks named after it: "Arcanist" is the class;
4. the prerequisite that sets it apart;
5. an override file, using a new override change `"change": "name"` that carries the qualifier (in our own words) and its reason. The loader checks it like any other override.

One blueprint in a group may stay unqualified when every other label is distinct. The importer's report lists each group, the source that settled it, and those still open. This amends ticket 19's order of sources ([ADR 0006](../../../docs/adr/0006-display-names-yes-descriptions-never.md), amended). Build ticket 02c does it.

## Amended 2026-11-20: hidden blueprints are never shown

User, 2026-11-20, from build ticket 02c. Many shared names are carried by blueprints the game itself hides from the player (`BlueprintFeatureBase.HideInUI`, read by `UnitLogic/Feature.cs` `Hidden`): the prestige classes' per-archetype spellbook picks, the inner steps of a feature's upgrades. Measured on the build's data with sources 1–4, keeping them in left 42 groups (242 blueprints) open; leaving them out leaves 26.

- **A hidden blueprint is treated like a nameless one** ([Display names](19-display-names.md)): never an option, never in search, and named only through its grantor in a Refusal or a "this needs" link. "Never shown" now covers both.
- **So hidden blueprints join no shared-name group.** The allowlist keeps `HideInUI` on the feature types, and `data/` holds it.
- **Scope:** the groups are what a Build reaches from the root. Items reached only as Gear share names too, which no grantor tells apart; that question is [map ticket 29](29-telling-gear-items-apart.md).
- **A grantor qualifies only when every route to the blueprint passes through it** (user, 2026-11-20), so the label holds for the blueprint. Where sources 1–4 then leave more than one, a grantor that some route misses serves as a fallback before overrides. That fallback's misleading labels are [map ticket 30](30-qualifier-for-several-grantors.md).
