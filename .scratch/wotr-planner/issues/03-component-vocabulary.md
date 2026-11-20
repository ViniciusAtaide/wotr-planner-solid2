# Component vocabulary for summaries and synergy links

Type: research
Status: resolved
Parent: [map](../map.md)

## Question

Which component types, across the blueprints reachable from `ProgressionRoot`, carry each of these, and in which fields?
- weapon category or group
- spell school or spell descriptor (fire, mind-affecting…)
- ability score
- bonus type (`ModifierDescriptor`)
- condition or effect (flanking, fear, critical hits…)

For each kind, how many blueprints does it cover, and how long is the tail of rare component types? Both the generated Summaries and the Synergy links read these fields.

Prior art: `~/code/wotr-planner/.scratch/wotr-planner/research/component-vocabulary-2026-11-15.md` and its census TSV.

## Answer

- **Spread.** Each kind sits on a few component types, but none is a single field. 1,596 of the 6,556 reachable facts carry one of the kinds, on 155 component types. The top 25 types cover 80% of those facts and the top 50 cover 90%; 82 types are used by 3 blueprints or fewer.
- **Per kind, on facts:**
  - ability score: 460 facts, 26 types
  - bonus type: 597 facts, 69 types (40 in the tail)
  - weapon category: 216 facts, 24 types; another 19 parametrized feats carry it as the pick's parameter (Weapon Focus family)
  - weapon group: 21 facts, 7 types
  - spell school: 28 facts, 10 types, plus 7 parametrized feats (Spell Focus family); `SpellComponent` gives it on 241 granted abilities
  - spell descriptor: 200 facts, 21 types; `SpellDescriptorComponent` gives it on 479 granted abilities
  - unit condition: 46 facts, 3 types
  - damage energy: 188 facts, 13 types
  - mechanics flags: 83 facts, 1 type with 86 values
- **Themes are not closed.** Fear and mind-affecting are a union of descriptors and conditions. Critical hits are about 31 type names and trigger booleans. Flanking is almost absent from data.
- **Cost.** Reading is one fixed piece of work: a reader driven by declared field types from the decompiled classes, with `Check*` gate rules. Meaning costs one role label per component type, so it follows the tail.
- **Coverage through grants.** Reading through granted abilities and buffs raises shown facts that carry a kind from 1,439 to 2,564 of 5,227.
- **v1.** Cheapest strong links: ability score, weapon category or group (with the Build's parameter values and the weapon-type table), spell school, damage energy, and a curated descriptor subset. Use bonus type for Summary wording and stacking notes. Leave critical hits and flanking to overrides.

Findings: [research/component-vocabulary.md](../research/component-vocabulary.md)
