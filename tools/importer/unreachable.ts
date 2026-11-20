import type { CheckedData } from '~engine/data/load';
import type { GrantorCheck } from './grantors';
import { noGrantor } from './no-grantor';

// Facts, classes and archetypes that a prerequisite leaf on a reachable blueprint names but that no Build can reach (ticket 02b, "the 28
// prerequisite leaves"), each with the reason, beyond those no-grantor.ts already lists. A Build never holds one, so a
// leaf forbidding it is always met. The importer fails on any such fact listed in neither file, and on an entry here
// whose fact a Build can now reach or no leaf names. Traced with scripts/dump/refs.mjs and referrer-tree.mjs.
export const unreachable: ReadonlyMap<string, string> = new Map<string, string>([
  [
    '8a3c86893f383214da070e9c84c1e95b', // MonstrousHumanoidClass
    "a monster's class, which ProgressionRoot doesn't offer; Indomitable Mount names it among the classes a mount " +
      'may have.',
  ],
  [
    'bd63d3ea0e030cf4c930db9ba5eaf931', // SpiritTotemLesserFeature
    'no selection, progression or grant offers it: only the four other lesser totems, which forbid it, and ' +
      'SpiritTotemFeature name it.',
  ],
  [
    'daf893d14cc54e98a319fb121d7ac4d9', // BlizzardServantLockEquipmentFeature
    'held only by the Blizzard servant, a summoned unit (BlizzardServantUnit 287a354894264478b6190632380e85f4), and its ' +
      'upgrade features; Weapon Finesse forbids it so the servant never takes the feat.',
  ],
  [
    'af40f7b8e21048ae80123b5a395b3bbb', // ScalykindDomainProgressionSecondary
    'no selection lists it: only the Scalykind domain progressions, which forbid it, and ScalykindDomainAllowed name it.',
  ],
  [
    'c3e4d5681906d5246ab8b0637b98cbfe', // GroetusFeature
    "the deity selection doesn't offer Groetus, and no grant gives it to a character; the Deceiver ways and the Feral " +
      'Champion forbid it.',
  ],
  [
    'ca763809e01f4247a3639965364c26cb', // GreenFaithCameliaFeature
    "Camelia's own faith, given only to her companion and pregen units (Camelia_FeatureList); the Deceiver ways forbid it.",
  ],
]);

/**
 * The list stays honest (ticket 02b): every leaf naming a fact no Build can reach is reasoned here or in
 * no-grantor.ts, and an entry leaves once a Build can reach its fact or no leaf names it.
 */
export function unreachableProblems(grantors: GrantorCheck, data: Pick<CheckedData, 'blueprints'>): string[] {
  const problems: string[] = [];
  const unreached = new Set(grantors.unreachable.map((f) => f.fact));
  for (const fact of unreachable.keys()) {
    if (noGrantor.has(fact)) problems.push(`unreachable.ts lists ${fact}, which no-grantor.ts lists already`);
    else if (!unreached.has(fact))
      problems.push(`unreachable.ts lists ${fact}, which a Build can now reach or no leaf names; remove it`);
  }
  for (const f of grantors.unreachable) {
    if (f.reason !== undefined) continue;
    const by = f.neededBy.map((g) => data.blueprints.get(g)?.assetName).join(', ');
    problems.push(
      `${data.blueprints.get(f.fact)?.assetName} ${f.fact}: no Build can reach it, named by ${by}; give a reason in unreachable.ts`,
    );
  }
  return problems;
}
