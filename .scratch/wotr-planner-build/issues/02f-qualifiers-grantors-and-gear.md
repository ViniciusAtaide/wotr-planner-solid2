# Qualifiers for several grantors and Gear items

Status: done
Session: ticket-02c-names
Blocked by: 03 (both rewrite `data/`)
Plan: [plan](../plan.md)

## Goal

Every name a picker or search shows reads true. No label names one grantor among several, and items that share a name are told apart, before ticket 04 shows names to anyone.

## Scope

- **Several grantors** ([map 30](../../wotr-planner/issues/30-qualifier-for-several-grantors.md)'s answer). In `tools/importer/qualify.ts`, replace the "some grantor" fallback with two automatic sources, tried after map 27's every-route sources 1–4 and before an override:
  1. a class's own copy stays bare beside its archetypes' copies;
  2. grantors of one family give their common display-name prefix, cut at a word boundary or separator.

  Remove the fallback; what remains gets a name override with its reason.
- **Gear items** ([map 29](../../wotr-planner/issues/29-telling-gear-items-apart.md)'s answer). For the items a Build can equip, group shared names and settle each group by the first rule that leaves every label distinct:
  1. identical twins collapse into one choice. The pickers offer the lowest GUID, and the others decode to it;
  2. the required Mythic path or class from `EquipmentRestriction*`;
  3. the item's enhancement bonus, slot or type;
  4. an override.

  Record the collapsed twins, as data the pickers and the Build code read, so ticket 04 can use them.
- **Gear-only features** that share a name with root features: the groups 02e added to map 29 or 30 follow the same rules.
- **The report** lists every group with the source that settled it, the collapsed twins, and the overrides.

## Done when

- No shown label names one grantor among several. A test covers the draconic bloodlines' shared features ("Resist Energy (Draconic Bloodline)"), the ranger's Favored Enemy staying bare, and a combat style.
- No two items a Build can equip share a label unless they're collapsed twins. A test covers "The Bound of Possibility (Aeon)" and one collapsed Hellknight twin.
- Every name override has its reason.
- Both gold builds pass with their listed gaps, updating aliases only where a label changed, and the Outcome lists those.
- `npm run import -- --check` and `npm run check` pass. Every `data/` change is explained in the Outcome.
- One commit by path through the hook, `Status: done` and an `## Outcome`.

## Outcome

2026-11-20. One commit, "Ticket 02f: qualifiers for several grantors and Gear items". `npm run check` passes: 766 engine tests and 11 client tests. `npm run import -- --check` passes. Both gold builds pass with only Jack's map 22 gap.

No shown label names one grantor among several: the "some grantor" fallback is gone. No two items a Build can equip share a label unless they are collapsed twins. `shared-names.ts` stays empty.

### Several grantors (map 30), `tools/importer/qualify.ts`

Two sources follow map 27's every-route sources 1–4, before overrides.

- **5, a class's own copy** (`class`). A copy's routes are climbed through the selections it is an option of, to a class's progression, an archetype, or anything else.
  - A copy that exactly one class's progression grants is that class's copy. When archetypes add it too, the earliest such copy stays bare: the ranger's "Favored Enemy", the inquisitor's "Judgment", "Favored Terrain", "Powerless Prophecy".
  - A copy only that class and the class's own archetypes give takes the class, or the class and level when the class has several.
  - A copy only archetypes give takes the archetype, or their family name.
  - Two refinements that keep labels true:
    - A copy stays bare only when archetypes add it too, so the Golden Dragon's wings don't go bare among the bloodlines'.
    - The class names a copy only when nothing outside the class and its archetypes gives it. Otherwise "Wings (Demon)" would name one of the Demon path and the Abyssal Bloodline.
- **6, family** (`family`). Every nearest shown grantor, climbing past those of the group's own name, shares its leading words up to a separator: "Resist Energy (Draconic Bloodline)", "Bonus Feats (Draconic 12)". The level is added when all of them grant at one level.
  - The shared words must end at a dash, comma or parenthesis in every name, so "Second Mystery" and "Second Curse" give nothing.
- **0, item** (`item`, map 29's addition). A feature only Gear gives joins its root group, qualified by the items that give it (with the level when needed). Labels:
  - "Dispelling Touch (Razmir's Ring)", "Magic Domain (Razmir's Ring)", "Magic Domain (Razmir's Ring 1)";
  - "Freedom of Movement (Cape of Morta)", "Poison Immunity (Broken Trickster)", "Undead (Dead Man's Hat)".

  The root "Freedom of Movement" and "Poison Immunity" stay bare.
- **What's left gets an override:** 145 root name overrides, each with its reason, in 46 groups:
  - witch and shaman hexes (22, "witch hex" and "shaman hex");
  - the Divine Herbalist and Enlightened Philosopher mysteries (18);
  - the ranger combat styles by level (15);
  - draconic energy features by energy (12);
  - elemental bodies (4);
  - the bloodrager's dragon forms and breaths by colour (20);
  - the sorcerer's draconic breath extra use and ability (20);
  - claws and Combat Casting Adept steps;
  - the rank-ups, Judgment's additional use, Slayer Talents' level 10;
  - the kineticist defenses' effects, Uncanny Dodge's class feature;
  - wings by colour or by naming their two grantors;
  - the bloodrager's Conviction and Celestial Resistances;
  - Banishment and Greater Dispel Magic, by naming both grantors.

  Where a label lists grantors it names all of them ("Arcane Bloodline or Sage Sorcerer").
- Root blueprints by source:

  | Source | Blueprints |
  | --- | --- |
  | item | 6 |
  | grantor | 1,020 |
  | level | 576 |
  | kind | 57 |
  | prerequisite | 21 |
  | class | 5 |
  | family | 9 |
  | override | 208 (02c's 63 and these 145) |
  | bare | 347 |

### Gear (map 29), new `tools/importer/gear-names.ts`

- **Items a Build can equip:** every named item but a part worn only with another (a shield's armour half or bash weapon, a double weapon's second end). That needs `BlueprintItemWeapon.m_SecondWeapon`, now kept and cited at `Items/ItemEntityWeapon.cs ItemEntityWeapon`.
- **Twins** (rule 1) compare kept fields without GUID and asset name, and a part's without its name too, since a part is never shown.
  - 145 twins collapse into the lowest GUID, for example the Hellknight armour copies.
  - Every Finnean stage collapses too, since its enchantments' bonuses aren't in `data/`. Finnean needs no override.
  - They are recorded in the new `data/twins.json` (twin → the item offered). The loader checks each is a held item offered as one that isn't itself a twin, and exposes `CheckedData.twins` for ticket 04's pickers and Build code. The importer owns the file (`sync.ts`).
- **Rules 2 and 3:**
  - Restriction: 9 Bound cloaks, "The Bound of Possibility (Aeon)". The Golden Dragon's has none and stays bare.
  - Slot: 76.
  - Type: 147, from the type's display name. The weapon, armour and shield types gain `name` from `m_TypeNameText`. A shield's type is its bash weapon's ("Heavy Shield +1 (Spiked Heavy Shield)").
  - A type that only repeats the item's name stays bare instead ("Heavy Shield +1").
  - The enhancement bonus isn't in `data/`, so it can't be a rule here.
- **34 Gear overrides:**
  - the 28 aszite armour and shield copies ("aszite");
  - Camellia's Bone Amulet;
  - Dawnflower's Kiss's evil and good forms;
  - Immaculate Petal +4;
  - Staunton's two Soulshears.
- 111 groups and 473 items. Items by rule:

  | Rule | Items |
  | --- | --- |
  | twin | 145 |
  | restriction | 9 |
  | slot | 76 |
  | type | 147 |
  | override | 34 |
  | bare | 62 |
- Item name overrides share `"change": "name"`. `qualify.ts` leaves items to Gear, and each side refuses its own stale or colliding overrides.

### Report and tests

- **`report.md`:** the "Shared names" section counts the new sources, and a new "Shared Gear names" section lists every group with its rule, each twin with the item offered for it, and the overrides.
- **`qualify.test.ts`** (hand-built with game GUIDs):
  - "Resist Energy (Draconic Bloodline)", where the celestial and empyreal one stays bare and no colour is named;
  - the ranger's Favored Enemy bare as the class's copy, and the rank-up by override;
  - a combat style, open without an override and never named "Nomad".
- **`gear-names.test.ts`:** "The Bound of Possibility (Aeon)" with the Golden Dragon's bare, the Hellknight Adamantine Full Plate +2 collapsed into the lower GUID, "Executioner of Evil (Battleaxe)", a shield's armour half left out, and a stale override refused.
- **`load.test.ts`:** `twins.json` read, and its two refusals.

### The data diff (2,563 files changed, 180 added)

- **items (2,282):**
  - every weapon gains `m_SecondWeapon` (2,181);
  - 369 equippable items get qualified names;
  - `DLC3_JabstabberPunchdaggerWeaponItem` gets a cited patch override that clears its `m_SecondWeapon`. It names a blueprint the dump doesn't hold, and the weapon isn't double, so the game never reads it.
- **itemtypes (91):** the type names.
- **features (158), selections (27), progressions (3):** 190 root labels changed:
  - 177 old fallback labels, now override 141, bare 23, family 8, class 5;
  - 6 Gear-only features, new;
  - 2 root features newly in a group, bare;
  - 5 that were bare before: SecondBlessingSelection is now "Blessings (Warpriest)", beside the warpriest's first selection kept bare by source 5; "Celestial Resistances (before level 9)", "Favored Enemy (rank up)", and "Flesh of Stone (effect)" and "Searing Flesh (effect)", where the class copy or the defense took the bare name.
- **New files:** `twins.json`, 179 name override files and the Jabstabber patch.
- **`report.md`:** the counts above and the new section.

### Gold builds

No alias changed, since `matchesName` accepts any qualifier. The one gap entry's refusal name went back to "Spell Specialization": the feat lost its fallback label "(Bonus Feat)" and is bare again.

### Follow-up for ticket 04

- Read `CheckedData.twins`: offer only an item that isn't a twin, and decode a twin to the item offered for it.
- `isShown` is still the one test for "never shown".
