import type { CheckedData } from '~engine/load';
import type { GrantorCheck } from './grantors';
import { noGrantor } from './no-grantor';

const MONSTROUS_HUMANOID_CLASS = '8a3c86893f383214da070e9c84c1e95b';
const SPIRIT_TOTEM_LESSER_FEATURE = 'bd63d3ea0e030cf4c930db9ba5eaf931';
const BLIZZARD_SERVANT_LOCK_EQUIPMENT_FEATURE = 'daf893d14cc54e98a319fb121d7ac4d9';
const SCALYKIND_DOMAIN_PROGRESSION_SECONDARY = 'af40f7b8e21048ae80123b5a395b3bbb';
const GROETUS_FEATURE = 'c3e4d5681906d5246ab8b0637b98cbfe';
const GREEN_FAITH_CAMELIA_FEATURE = 'ca763809e01f4247a3639965364c26cb';

export const unreachable: ReadonlyMap<string, string> = new Map<string, string>([
  [
    MONSTROUS_HUMANOID_CLASS,
    "a monster's class, which ProgressionRoot doesn't offer; Indomitable Mount names it among the classes a mount " +
      'may have.',
  ],
  [
    SPIRIT_TOTEM_LESSER_FEATURE,
    'no selection, progression or grant offers it: only the four other lesser totems, which forbid it, and ' +
      'SpiritTotemFeature name it.',
  ],
  [
    BLIZZARD_SERVANT_LOCK_EQUIPMENT_FEATURE,
    'held only by the Blizzard servant, a summoned unit (BlizzardServantUnit 287a354894264478b6190632380e85f4), and its ' +
      'upgrade features; Weapon Finesse forbids it so the servant never takes the feat.',
  ],
  [
    SCALYKIND_DOMAIN_PROGRESSION_SECONDARY,
    'no selection lists it: only the Scalykind domain progressions, which forbid it, and ScalykindDomainAllowed name it.',
  ],
  [
    GROETUS_FEATURE,
    "the deity selection doesn't offer Groetus, and no grant gives it to a character; the Deceiver ways and the Feral " +
      'Champion forbid it.',
  ],
  [
    GREEN_FAITH_CAMELIA_FEATURE,
    "Camelia's own faith, given only to her companion and pregen units (Camelia_FeatureList); the Deceiver ways forbid it.",
  ],
]);

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
