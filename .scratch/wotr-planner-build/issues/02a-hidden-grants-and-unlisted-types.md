# Hidden grants and the unlisted types

Status: done
Blocked by: 02
Plan: [plan](../plan.md)

## Goal

G sees every grant a Build can receive, and every component type on a written blueprint is accounted for: allowlisted, or noted as not needed with its reason. Ticket 03's walk relies on G being complete.

## Before starting

Read ticket 02's Outcome and its "Progress" sections ([02-importer-and-grant-index.md](02-importer-and-grant-index.md)): what the importer, the specs, the carriers and G already do. The commands are `npm run import` and `npm run check`. The dump tools `scripts/dump/show.mjs`, `refs.mjs` and `granted-by.mjs` trace a grant chain. The leftover census, which finds grant routes G misses, is in the shared notes folder (`ticket-02-leftover-census.mjs`).

## Scope

- **Grants G can't see yet**, each allowlisted with its A test and given its G edge kind:
  - `AddFeatureOnAlignment` (25 written blueprints);
  - `AddParametrizedFeatures` (9) and `AddFeatureParametrized` (1). A feat granted at one parameter is a grant of that feat, and the edge carries the parameter.
- **Re-run the leftover census** afterwards. Any new grant route a reachable blueprint uses is either modelled the same way, or noted with its reason.
- **The unlisted component types** in `data/report.md` ("Component types the allowlist lacks", 552 on 2026-11-19). Each one is either:
  - allowlisted, when the planner's rules read it; or
  - noted in `tools/importer/not-needed.ts` with the reason the planner doesn't read it.

  Note them by family, one reason per family, with every type in it listed by name, so the report stays exact. The families are: UI and art; recommendations; combat-time triggers, damage and saves (Summaries may want these, build ticket 06); pets and companions; armies and the kingdom; DLC gating (the map: no DLC gating). Work through the types on blueprints a Build can reach first.
- **Leave to ticket 03** the components the walk reads, which it allowlists area by area: class skills, skill points, proficiencies, spellbook levels and markers, context stat bonuses and aspect group size. Note them in `not-needed.ts` as "read by ticket 03's <area>", so the report still accounts for them.

## Done when

- `AddFeatureOnAlignment`, `AddParametrizedFeatures` and `AddFeatureParametrized` grants are in G, with a test each citing a game blueprint.
- The re-run census shows no grant route from a reachable blueprint that is neither modelled nor noted.
- The report's unlisted list reads "None left to review": every type is allowlisted or noted.
- `npm run check` passes, and each finished area is committed by path.
- `Status: done` and a short `## Outcome`: what G gained, the census before and after, and the families noted.

## Outcome

2026-11-19. One commit for the whole ticket, "Ticket 02a: hidden grants in G, every unlisted type reviewed".

**What G gained.** Six component types are allowlisted with A citations, and each is a G edge kind with a test citing a game blueprint:
- `AddFeatureOnAlignment`: only RuinFeature grants a held feature. The other 49 grant buffs, toggles or abilities, so they are dropped and counted.
- `AddParametrizedFeatures` (9, Zen Archer, Mantis Zealot, Disenchanter): `Grant` gained `param`, read as `FeatureData.Param` reads it: a weapon category, a spell school, a skill or a blueprint, by the feat's `ParameterType`.
- `AddFeatureParametrized` (TricksterLoreReligionTier2Parametrized): each `BlueprintParameterVariants` option is a grant carrying itself as the parameter. The 34 Trickster domain features are now reachable.
- Three more found on the way, each a grant a Build reaches:
  - `AddFeatureOnSkill`, found by the census: Kitsune heritages hold `KitsuneSpellLike` at Charisma or Intelligence 11.
  - `FactSinglify`: Alchemist bombs, and the Serpentine bite swap, which adds a removal kind.
  - `KensaiChosenWeapon`: the Sword Saint's chosen weapon holds Weapon Focus at the pick's own parameter, so the grant carries none.

**Census** (script and output in the shared notes folder, `ticket-02a-leftover-*`):
- Before: 2,938 leftovers, 128 of them reached only through unheld blueprints (ticket 02).
- After: 2,888 leftovers, 112 of them.
- Every grant route from a reachable blueprint that is left is noted:
  - pets and units: `AddPet`'s unit facts, `AddFeatureToPet`, `AddFactsToPet`, `AddFeatureToNPC`, `OnSpawnBuff`;
  - buffs that are on only in play: Consume Flesh, Imitation, Animal Fury's rage, wild-shape polymorphs, Mind Blank;
  - Trickster arcana item enchantments;
  - the shared-value conditions on the Unsworn Shaman spirits and the Locust Clone, which ticket 02 already drops and counts as "grant not modelled".

**Unlisted types:** 552 to review before, "None left to review" now. 547 are noted in `not-needed.ts` in 17 families, one reason each, and the report lists them by family:
- ticket 03's areas: class skills, skill points, proficiencies, spellbook levels and markers, ability scores, aspect group size;
- spells (phase 2);
- pets, companions and other units;
- armies and the crusade;
- DLC gating;
- story state;
- recommendations;
- UI and art;
- old saves and dead components;
- grants of abilities and buffs only;
- items handed out or changed;
- in play, which has 409 types.

The import now fails when a noted type is allowlisted, or when no written blueprint carries it.

**For ticket 03:** its area lists now also name `AddBackgroundArmorProficiency`, `AddSpellbook`, `ReplaceStatBaseAttribute`, and the weapon proficiency `KensaiChosenWeapon` adds.

**Check:** `npm run check` passes: 364 engine tests and 11 template tests.
