# Display names

Type: grilling
Status: resolved
Parent: [map](../map.md)

## Question

Where do the names the UI, the agents and the gold builds read come from? The guide's §3.9 drops display names with the rest of the game's text, and ADR 0001 covers only descriptions. Without names:
- the UI has nothing readable to show;
- an agent can't search for "Power Attack";
- the gold builds, which are lists of write-up names, can't be matched to GUIDs.

The dump holds every display name as a localisation key into chunk 34, which carries one locale. Asset names (`PowerAttackFeature`) are always present but repeat, and they read poorly.

Raised by the plan review on 2026-11-19, which flagged it as the riskiest unsettled assumption.

## Decided so far

- **Blueprints with no display name are never shown** (user, 2026-11-19), and there is no fallback name, not even a readable version of the asset name. They surface only through the named features that grant them.
- **Wording a nameless prerequisite in a Refusal or a "this needs" link** (user, 2026-11-19). This revises the line above: there is a fallback, but only in these two places.
  1. When every named grantor is of one kind (all deities, all bloodlines…), word it by that kind, filtered to this Build: "Needs a deity that allows it (yours, Asmodeus, doesn't)". List the grantors only when there are a few.
  2. When the grantors are of mixed kinds, list the ones this Build can still reach: at most 3 names, then "and N more".
  3. When no named blueprint grants it, use a readable version of the asset name, marked as internal. The importer's report lists every such case.

  Hidden blueprints still never appear as options, in search or on the sheet.

## Facts found (2026-11-19, scratch script over the dump)

- **216 named-feature → nameless-prerequisite pairs** (165 `PrerequisiteFeature`, 51 `PrerequisiteNoFeature`), across 91 distinct nameless blueprints. Almost all are permission flags granted by deities: `ChannelPositiveAllowed` 8c769102f3996684fb6e09a2c4e7e5b9, `ChannelNegativeAllowed` dab5255d809f77c4395afc2b713e9cd6, the `<Domain>DomainAllowed` and `…AllowedSeparatist` flags, and `ForbiddenDeityFeature` c4403567ea9e5fe478ca38e3052fadc2.
- **Four have no named referrer:** `Scout_FeatureList` (Urban Hunter), `Penta_FeatureList` (Numerian Companion), `SpellSpecializationProgression` (Spell Specialization), `WeaponFocusWing` (Greater Weapon Focus (Wing)).
- **Same-name collisions are real.** Each domain exists as two "… Domain" progressions, one normal and one separatist, told apart only by their prerequisites.
- **Some display names are templates** that the game fills in at runtime, for example a deity named `{Name}, L{mf|ord|ady} of Death`. Names need their template tokens handled.

## Answer

User, 2026-11-19 (ADR 0006).

- **Source:** the importer commits each kept blueprint's English display name to `data/` as `name`. Descriptions and every other string are never committed. Template tokens resolve to a neutral form ("Lord/Lady of Death"), and the importer's report lists each template name.
- **Shared names:** a qualifier is added only where two blueprints the player can reach share a name. It comes from the first source that tells them apart:
  1. the grantor ("Sneak Attack (Slayer)");
  2. the prerequisite that sets them apart ("Air Domain (Separatist)");
  3. an override file.

  The importer's report lists every collision and which source settled it. The MCP always identifies blueprints by GUID.
- **Nameless blueprints:** see "Decided so far" above. They are never shown, and Refusals and links word them by the kind of grantor, then reachable grantors, then the asset name marked as internal.
- **Gold builds:** each is converted once into a GUID-keyed fixture. Every line keeps the write-up's name beside its GUID, and a test checks that each GUID's display name matches that name or a listed alias.
