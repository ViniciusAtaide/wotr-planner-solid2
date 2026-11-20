# A better automatic qualifier when a blueprint has several grantors

Type: grilling
Status: resolved
Blocked by: none
Parent: [map](../map.md)

## Question

Build ticket 02c qualifies shared names ([Qualifying shared names](27-qualifying-shared-names-per-blueprint.md)). A grantor qualifies a blueprint only when every route from the root to it passes through a grantor of that name, so the qualifier holds for the blueprint itself. Where that leaves more than one blueprint in a group, a fallback takes a grantor that sets the blueprint apart though some route misses it ("some grantor" in `data/report.md`). On the build's data (2026-11-20) the fallback names 167 blueprints in 50 groups. Their labels are distinct, but some mislead, because they name one grantor among several:
- "Resist Energy (Draconic Bloodline — Black)", "Dispel Magic (Draconic Bloodline — Black)", "Spell Resistance (Draconic Bloodline — Black)": features every draconic bloodline grants;
- "Favored Enemy (Sable Company Marine)": the ranger's own selection, which an archetype grants too;
- "Uncanny Dodge (Archaeologist)": a feature many classes grant;
- "Archery (Nomad 10)", and the other ranger combat styles: the ranger's own selections.

What should the importer write instead, before the pickers and search (build ticket 04) first show these names? Patterns seen so far (user, 2026-11-20):
- **Grantors all of one kind:** name the kind, as in "Resist Energy (Draconic Bloodlines)". This is close to how map ticket 19 words a nameless prerequisite by the kind of its grantors.
- **A class's own progression over an archetype's:** where the grantors are a class and its archetypes, the class's copy stays bare. Then the ranger's Favored Enemy is plain "Favored Enemy".

The 50 groups are listed in build ticket 02c's Outcome, and each label with its source is in `data/report.md`'s "Shared names" section.

Raised by build ticket 02c, with the user, 2026-11-20. Open and unblocked; settle it before build ticket 04.

## Answer

Coordinator, 2026-11-20, on the user's standing instruction to answer grilling tickets itself, using the GameFAQs pages and the Rust planner for the harder ones.

**What the sources show.**
- GameFAQs' class pages list "Uncanny Dodge", "Favored Enemy" and the bloodline powers under each class or bloodline that grants them, by their plain names. The section they sit in is the context.
- The Rust planner keyed an option by its owner (`witch/hex/iceplant`) but showed the plain name.
- Both read a feature the way the user's two patterns do: by its owner, not by one arbitrary grantor.

**The rule.** These two automatic sources replace the "some grantor" fallback. They are tried after ticket 27's every-route sources 1–4 and before an override:

1. **A class's own copy stays bare.** Where a blueprint's grantors are a class's progression and archetypes of that class, the class's copy keeps its plain name, and a copy only archetypes reach takes the archetype ("Favored Enemy" beside "Favored Enemy (Sable Company Marine)"). This covers the ranger's Favored Enemy and combat styles.
2. **Grantors of one family share their common name.** Where every grantor's display name starts with the same words, the qualifier is that common prefix, cut at a word boundary or separator: "Resist Energy (Draconic Bloodline)". This uses only display names, so it holds as the data changes.
3. **What's left** gets an override with its reason. That's expected to include features many unrelated classes grant, such as "Uncanny Dodge".

No label may name only one grantor among several. The importer's report lists each group with the source that settled it, as now.

**Who builds it:** build ticket 02f, before ticket 04.
