import type { CheckedData } from '../load';
import { isShown, kindOf, type Guid, type Kind } from '../data';
import { buildGrantIndex, removes, type GrantIndex } from '../grants';
import { linkIndex } from '../links';
import { prerequisites } from '../prerequisites';
import { nameOf, unmetText } from '../refusals';
import { labelsOf, type Label } from './labels';

export interface Description {
  readonly guid: Guid;
  readonly name: string;
  readonly kind: Kind;
  readonly summary: string;
  readonly summarySource: SummarySource;
  readonly labels: readonly Label[];
  readonly prerequisites: readonly string[];
  readonly grants: readonly { readonly guid: Guid; readonly name: string; readonly level?: number }[];
  readonly pickedIn: readonly { readonly guid: Guid; readonly name: string }[];
  readonly needs: readonly Guid[];
  readonly enables: readonly Guid[];
}

export const NO_SUMMARY = 'No summary yet.';

export type SummarySource = 'written' | 'labels' | 'none';

export function summaryOf(labels: readonly Label[]): string {
  return labels.length === 0 ? NO_SUMMARY : labels.map((l) => l.text).join(' ');
}

const writtenByData = new WeakMap<CheckedData, ReadonlyMap<Guid, string>>();

export function writtenSummary(data: CheckedData, guid: Guid): string | undefined {
  let written = writtenByData.get(data);
  if (written === undefined) {
    written = new Map(data.overrides.flatMap((o) => (o.change === 'summary' ? [[o.target, o.text] as const] : [])));
    writtenByData.set(data, written);
  }
  return written.get(guid);
}

export function summaryText(data: CheckedData, guid: Guid): string {
  return writtenSummary(data, guid) ?? summaryOf(labelsOf(data, guid));
}

export function describe(
  data: CheckedData,
  guid: Guid,
  G: GrantIndex = buildGrantIndex(data),
): Description | undefined {
  const bp = data.blueprints.get(guid);
  if (bp === undefined || !isShown(bp)) return undefined;
  const shown = (g: Guid) => {
    const b = data.blueprints.get(g);
    return b !== undefined && isShown(b);
  };
  const w = { data, G };
  const links = linkIndex(data, G);
  const labels = labelsOf(data, guid);
  const written = writtenSummary(data, guid);
  return {
    guid,
    name: nameOf(data, guid),
    kind: kindOf[bp.$type],
    summary: written ?? summaryOf(labels),
    summarySource: written !== undefined ? 'written' : labels.length > 0 ? 'labels' : 'none',
    labels,
    prerequisites: prerequisites(bp, data.blueprints).map((leaf) =>
      unmetText(w, { leaf }).replace(/^Needs /, leaf.Group === 'All' ? 'Needs ' : 'Or: needs '),
    ),
    grants: G.grantsOf(guid)
      .filter((g) => !removes(g) && shown(g.granted) && g.kind !== 'selectionOption' && g.kind !== 'classArchetype')
      .map((g) => ({
        guid: g.granted,
        name: nameOf(data, g.granted),
        ...(g.level !== undefined && { level: g.level }),
      })),
    pickedIn: [
      ...new Map(
        G.grantorsOf(guid)
          .filter((g) => g.kind === 'selectionOption' && shown(g.grantor))
          .map((g) => [g.grantor, { guid: g.grantor, name: nameOf(data, g.grantor) }]),
      ).values(),
    ],
    needs: links.needs(guid),
    enables: links.enables(guid),
  };
}

export const summaryComponentTypes: readonly string[] = [
  'AddDamageResistanceEnergy',
  'AddDamageResistancePhysical',
  'AddEnergyDamageImmunity',
  'AddEnergyImmunity',
  'AddSpellResistance',
  'AddFortification',
  'SavingThrowBonusAgainstDescriptor',
  'SavingThrowBonusAgainstSchool',
  'BuffDescriptorImmunity',
  'SpellImmunityToSpellDescriptor',
  'AddConditionImmunity',
  'AddImmunityToCriticalHits',
  'AddImmunityToPrecisionDamage',
  'IncreaseSpellDescriptorDC',
  'IncreaseSpellSchoolDC',
  'SpellPenetrationBonus',
  'ConcentrationBonus',
  'IncreaseSpellDescriptorCasterLevel',
  'IncreaseSpellSchoolCasterLevel',
  'SpellSpecializationParametrized',
  'DraconicBloodlineArcana',
  'IncreaseAllSpellsDC',
  'WeaponGroupAttackBonus',
  'WeaponGroupDamageBonus',
  'AttackBonusAgainstFactOwner',
  'DamageBonusAgainstFactOwner',
  'ACBonusAgainstFactOwner',
  'WeaponTraining',
  'WeaponTypeDamageStatReplacement',
  'ManeuverBonus',
  'ManeuverDefenceBonus',
  'WeaponFocusParametrized',
  'WeaponSpecializationParametrized',
  'ImprovedCriticalParametrized',
  'Blindsense',
  'BuffMovementSpeed',
  'FavoredEnemy',
  'FavoredTerrain',
  'Evasion',
  'ImprovedEvasion',
  'BuffAllSavesBonus',
  'BuffAllSkillsBonus',
  'ACBonusAgainstAttacks',
  'AttackTypeAttackBonus',
  'CMDBonusAgainstManeuvers',
  'AddImmunityToAbilityScoreDamage',
  'AddImmunityToEnergyDrain',
  'SavingThrowBonusAgainstFact',
  'ArcaneSpellFailureIncrease',
  'AddEnergyVulnerability',
];
