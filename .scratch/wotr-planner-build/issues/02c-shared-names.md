# Shared names

Status: done
Session: ticket-02c-names
Blocked by: 02a
Plan: [plan](../plan.md)

## Goal

Every display name a player sees tells its blueprint apart from any other reachable blueprint with the same name. Pickers, search and the MCP (ticket 04 on) need that.

## Before starting

The rule is [map ticket 27](../../wotr-planner/issues/27-qualifying-shared-names-per-blueprint.md), which amends [Display names](../../wotr-planner/issues/19-display-names.md) and [ADR 0006](../../../docs/adr/0006-display-names-yes-descriptions-never.md). Read ticket 02's Outcome for how names are resolved today (`tools/importer/names.ts`), and G's `grantorsOf` and `reachableFromRoot` (`engine/grants.ts`). A probe that measured the rule's first steps, with its output, is in the shared notes folder: `ticket-02c-qualifier-probe.test.ts` and `.json`.

## Scope

- **The qualifier:** among the blueprints a Build can reach, group those sharing a display name. Qualify each one in the group from the first source that leaves every label in the group distinct, in map ticket 27's order:
  1. the nearest named grantor (`Arcanist (Loremaster)`);
  2. grantor and level (`Patron Spells (Witch Patron 4)`);
  3. kind: a class keeps its plain name beside picks named after it;
  4. the distinguishing prerequisite;
  5. an override.

  One blueprint in a group may stay bare when every other label is distinct. The importer writes the qualified form into `name`.
- **Name overrides:** a new override change, `"change": "name"`, carrying the qualifier (our own words) and its reason. The importer applies it after resolving names. The loader checks it: a known target that's held, a reason, and a non-empty qualifier.
- **The report** lists every group, the source that settled each blueprint in it, and the groups still open. It also lists groups whose blueprints share an asset name too (such as `RampageER5`), which no qualifier can tell apart. Each of those gets an override, or a note on why both stay.

## Done when

- No two reachable blueprints share a written `name`, apart from the report's listed exceptions, each with its reason.
- Every name override has its reason and passes the loader's checks; overrides are the last source, used only where steps 1–4 fail.
- A test per source cites a game group that the source settles: the Witch's patron spells by level, Arcanist by grantor, and the Arcanist class staying bare.
- `npm run check` passes, and the work is committed by path.
- `Status: done` and an `## Outcome`: groups settled per source, overrides written, and exceptions.

## Outcome

2026-11-20. No two blueprints that a Build reaches from the root and a player sees share a written `name`. There are no exceptions: `shared-names.ts` is empty.

**Decisions the user made on the way** (map ticket 27 amended, [map ticket 29](../../wotr-planner/issues/29-telling-gear-items-apart.md) opened):
- **Hidden blueprints are never shown, like nameless ones**, so they join no group. The allowlist keeps `HideInUI` on the seven feature types (cited `UnitLogic/Feature.cs Hidden`), and `engine/data/types.ts` exports `isShown` (named and not hidden). Ticket 04's pickers and search should use it.
- **Scope is what a Build reaches from the root.** Items reached only as Gear share 199 names of their own, which no grantor tells apart; that is map ticket 29, open and unblocked, for the Gear pickers.

**The rule as built** (`tools/importer/qualify.ts`; the report's "Shared names" section lists every group, each blueprint's source and its written name):
- Source 1 takes the nearest named grantor that sets a blueprint apart, climbing past names the others share. It counts **only a name that every route from the root to the blueprint passes through**, so the qualifier holds for the blueprint itself. Without this, a feature all ten draconic bloodlines grant was "Resist Energy (Draconic Bloodline — Black)" and the ranger's selection "Favored Enemy (Sable Company Marine)".
- Source 2 is such a grantor and the level it grants at ("Patron Spells (Winter 2)"; "level N" when the grantor shares the name). G now carries the class level of `AddFeatureOnClassLevel` grants (not with `BeforeThisLevel`); the walk doesn't read `Grant.level`, so its behaviour is unchanged.
- Source 3: the one class in a group stays bare; otherwise a word for the blueprint's type (`kindWords`).
- Source 4 takes a required fact, class or archetype by name, and a class or archetype also with its level ("Skeletal Barbarian I (Lich 2)").
- After any source settles some, the rest start again from source 1, since a settled blueprint no longer blocks a qualifier it shared.
- **Only where 1–4 leave more than one**, a grantor that some route misses serves as a fallback ("some grantor", "some grantor level") before overrides.
- One leftover stays bare. Map 27's own example "Arcanist (Loremaster)" doesn't arise: Loremaster's prestige spellbook picks are hidden, and its secrets are "Arcanist (Wizard Spell)", after their nearest grantor.

**Measured** (603 groups, 2,241 blueprints; 709 groups before hidden blueprints left them):
- Groups by the last source they needed: grantor 364, level 136, kind 23, prerequisite 12, some grantor 37, some grantor level 12, override 19.
- Blueprints by source: grantor 1,019, level 581, kind 57, prerequisite 27, some grantor 118, some grantor level 49, override 63, bare 327.
- 14 groups also share an asset name inside the group (the report lists them). Every one is told apart by sources 1–4, so none needed an override.

**Overrides written: 63**, each `data/overrides/<asset>.<guid>.name.json` with its reason, in 19 groups:
- Spell Specialization's 20 re-choices ("change 1"–"change 20", by their prerequisite chain);
- the kineticist bonus feat copies (14, by the feats each copy is for);
- the Wyrmshifter forms (12, by draconic aspect);
- Loremaster's Hunter and Inquisitor secrets (6, by spell list and class);
- the Divine Hunter's second companion ability bonus (6);
- Legend against the Legend path choice (3);
- All Is Darkness's rank (1), Loremaster's Trickster combat feat (1).

**Loader and importer checks:** `"change": "name"` needs a held target, a reason and a non-empty qualifier (`load.ts`, with tests). The importer refuses a name override that sources 1–4 or the bare rule already settle, one on a name nobody shares, and one whose qualifier is taken in its group. It fails on any written name still shared unless `shared-names.ts` lists it with a reason, and on a stale entry there.

**Tests** (`qualify.test.ts`, hand-built from the game's own groups):
- the Witch's patron spells by patron and level;
- Loremaster's Arcanist secrets by grantor;
- the Arcanist class bare, and the Inquisitor class bare by kind;
- the bloodline feat selections by prerequisite;
- hidden blueprints left out;
- a grantor counted only on every route;
- overrides and their refusals.

**Gold builds:** they pass with their listed gaps unchanged. 24 lines' aliases in `engine/gold/gold.ts` gained the qualified names, 13 of them new entries; for example, Jack's draconic spells are "Resist Energy (Draconic Bloodline — Black)". The Spell Specialization gap now names the refusal "Spell Specialization (Bonus Feat)".

**`data/` diff:** the seven feature types gain `HideInUI`, 1,914 blueprints get a qualified name, `report.md` gains its section, and 63 override files are added. `npm run check` passes: 534 engine tests and 11 client tests.

**The fallback** (kept by the user, 2026-11-20): it labels 167 blueprints in 50 groups by one grantor among several. Every label is distinct, but some mislead:
- "Resist Energy (Draconic Bloodline — Black)", a feature every draconic bloodline grants;
- "Favored Enemy (Sable Company Marine)", the ranger's own selection;
- "Uncanny Dodge (Archaeologist)", a feature many classes grant;
- "Archery (Nomad 10)", the ranger's own combat style.

The 50 groups: Ameliorating, Ancestor, Archery, Aura of Purity, Banishment, Battle, Blessings, Bones, Bonus Feats, Breath Weapon (30), Celestial Resistances, Claws, Combat Casting Adept, Conviction, Dispel Magic, Dispel Magic, Greater, Draconic Defenses, Draconic Strike, Dragon Form (10), Evil Eye, Favored Enemy, Favored Terrain, Flame, Fortune, Healing, Iceplant, Judgment, Life, Menacing, Might of Wyrms, Misfortune, Nails, Nature, Powerless Prophecy, Protection from Energy, Protective Luck, Resist Energy, Slayer Talents, Slumber, Spell Resistance, Spell Specialization, Stone, Two-Handed Weapon, Two-Weapon Combat, Uncanny Dodge, Ward, Waves, Weapon and Shield, Wind, Wings (13). Each label is in `data/report.md`, marked "some grantor" or "some grantor level".

**Follow-up:** [map ticket 30](../../wotr-planner/issues/30-qualifier-for-several-grantors.md), "A better automatic qualifier when a blueprint has several grantors", is open and unblocked, to be settled before ticket 04. Map ticket 29 covers names shared by items reached only as Gear. `plan.md` is unchanged here.
