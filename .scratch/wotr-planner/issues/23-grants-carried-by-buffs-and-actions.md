# Grants carried by buffs and action trees

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

The guide (§3 point 5) has the importer follow buffs and abilities but write only features, classes, archetypes, progressions, selections, races, items and settings. Build ticket 02's grantor check, through G, found features the game grants only through blueprints `data/` doesn't hold:
- **buffs:** the Kineticist's composite blasts come from `CompositeBlastBuff` cb30a291c75def84090430fbf2b5c05e, which the element features grant through `AddFacts`. 57 prerequisite leaves on blueprints a Build can reach (the infusions) name a composite blast. A scratch census found 337 grants of held features on buffs;
- **action trees:** `AddFactContextActions` with `ContextActionAddFeature`, under `Conditional` trees, on 53 held blueprints (Magical Tail's ranks via `MagicalTailArchetypeFeature1`… and `MagicalTail` febb8fe9a2d142fb80c1be6b0b539d9d, Spontaneous Healing) and 13 buffs, granting 99 held features.

The Rust planner avoided this because its guide-extracted data restated these prerequisites by hand (Torrent Infusion named the elements, not the composite blasts). This planner keeps the game's own prerequisites, so G has to see these grants.

## Answer

User, 2026-11-19: **write the carriers.** `data/` gains the buffs that a held fact grants and that themselves grant held features (or other such buffs), keeping only their grant parts. `AddFactContextActions` keeps only its add-feature, remove-feature and apply-buff actions, with the conditions around them. G follows feature → buff → feature and action grants. This amends the guide's "buffs are followed but not written" for grant carriers only.
