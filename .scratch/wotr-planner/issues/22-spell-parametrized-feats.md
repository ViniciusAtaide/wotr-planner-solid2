# Feats whose parameter is a spell

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

94 written `BlueprintParametrizedFeature`s take a spell as their parameter (`ParameterType` `SpellSpecialization`: 21, such as `SpellSpecialization1` e69a85f633ae8ca4398abeb6fa11b1fe; `LearnSpell`: 73). Their variants are abilities, which the importer doesn't write (guide §3 point 5), so their parameter lists are empty in `data/`. Picking spells is out of v1 scope (map, "Out of scope"). Are these feats in v1?

## Answer

User, 2026-11-19: **out of v1, until phase 2 brings spells.** The planner holds the feats, but offers no spell parameter for them. The importer keeps dropping the spell variants, and its report lists each of these feats by name and GUID, so the phase 2 decision has its data.
