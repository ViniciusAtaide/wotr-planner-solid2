import type { CheckedData } from '~engine/data/load';
import type { GrantorCheck } from './grantors';

// Facts, classes and archetypes that a prerequisite on a reachable blueprint names but that no grant the planner holds
// gives, each with the
// reason it is so. The importer fails on any such fact not listed here (ticket 02, "Done when"), and the report lists
// every one with its reason. Traced with scripts/dump/refs.mjs and referrer-tree.mjs.
const COMPANION_LIST =
  "a companion's pregenerated feature list, given only to that companion's unit. No Build holds it, so the leaf is " +
  'never met for the main character.';

const PET_CLASS =
  "a pet's class: animal companions and mounts level in it, and ProgressionRoot doesn't offer it to a character, so " +
  'no Build has a level in it. A leaf requiring its levels (the Barding Proficiency feats, which are for a mount) is ' +
  'never met for the main character, and one forbidding them always is.';

export const noGrantor: ReadonlyMap<string, string> = new Map<string, string>([
  ['26b10d4340839004f960f9816f6109fe', PET_CLASS], // AnimalCompanionClass
  ['4cd1757a0eea7694ba5c933729a53920', PET_CLASS], // AnimalClass
  ['27d646fc04ff43f48af74300a4a58f9e', COMPANION_LIST], // Scout_FeatureList, needed by BackgroundRekarthDLC2
  ['29f6945052434f4a8392b511099a3ce6', COMPANION_LIST], // Penta_FeatureList, needed by Penta_Numerian_Background
  ['4bf1e3da22a4fe44f8a516cc24e6ef79', COMPANION_LIST], // WoljifPregenTestFeatureList, by TieflingHeritageBaphomet
  [
    'f3e19b0d6d82e2a4d98957af591f5d36', // ShamanNatureSpiritWanderingProgression
    'granted by nothing in the dump (refs.mjs finds only the prerequisite naming it). It is one Any-group alternative on ' +
      'ShamanHexFriendToAnimalsFeature, beside the Nature wandering spirit, so the other alternatives decide.',
  ],
  [
    'aa846143662cea944b0cc4aa87fcb894', // MythicTestFeature
    'a test flag no blueprint grants. It is one Any-group alternative on the Mythic path classes, so the other ' +
      'alternatives decide.',
  ],
  [
    'daca06a3f3355664bba1e87e67f3b5b3', // MongrelmanRace
    "Lann's race, held only by companion and army units; it isn't one of ProgressionRoot's character races, so no " +
      'Build has it.',
  ],
  [
    '1e66cfb4f351466fb05636082bce50d6', // CorruptedGoldenDragonFeature (Vow of Dahak)
    'granted only by the story: a dialogue cue gives it (and a save upgrader). A story-granted feature is never held ' +
      '(map ticket 25), so a leaf requiring it is never met and one forbidding it is always met.',
  ],
]);

/** The list stays honest: every fact without a grantor has a reason here, and a fact that has one now leaves it. */
export function noGrantorProblems(grantors: GrantorCheck, data: Pick<CheckedData, 'blueprints'>): string[] {
  const problems: string[] = [];
  const found = new Set(grantors.findings.map((f) => f.fact));
  for (const fact of noGrantor.keys())
    if (!found.has(fact))
      problems.push(`no-grantor.ts lists ${fact}, which now has a grantor or isn't needed; remove it`);
  for (const f of grantors.findings) {
    if (f.reason !== undefined) continue;
    const by = f.neededBy.map((g) => data.blueprints.get(g)?.assetName).join(', ');
    problems.push(
      `${data.blueprints.get(f.fact)?.assetName} ${f.fact}: no grantor, needed by ${by}; give a reason in no-grantor.ts`,
    );
  }
  return problems;
}
