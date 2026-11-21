import type { CheckedData } from '../load';
import {
  enchantmentsOf,
  guids,
  isShown,
  kindOf,
  refGuid,
  type AddFeatureIfHasFact,
  type AddFeatureOnAlignment,
  type AddFeatureOnClassLevel,
  type Blueprint,
  type Guid,
  type Kind,
} from '../data';
import { buildGrantIndex, EQUIPMENT_GRANT_KINDS, removes, type Grant, type GrantIndex } from '../grants';
import { linkIndex } from '../links';
import { prerequisites } from '../prerequisites';
import { bareNameOf, listNames, nameOf, unmetText } from '../refusals';
import { orList } from './labels';
import { labelsOf, type Label } from './labels';

export interface NamedLink {
  readonly guid: Guid;
  readonly name: string;
}

export interface Description {
  readonly guid: Guid;
  readonly name: string;
  readonly kind: Kind;
  readonly summary: string;
  readonly summarySource: SummarySource;
  readonly labels: readonly Label[];
  readonly prerequisites: readonly string[];
  readonly grants: readonly {
    readonly guid: Guid;
    readonly name: string;
    readonly level?: number;
    readonly when?: string;
  }[];
  readonly pickedIn: readonly { readonly guid: Guid; readonly name: string }[];
  readonly needs: readonly NamedLink[];
  readonly enables: readonly NamedLink[];
  readonly progression?: readonly LevelLink[];
  readonly archetypes?: readonly NamedLink[];
  readonly forClass?: NamedLink;
  readonly replaces?: readonly LevelLink[];
}

export interface LevelLink extends NamedLink {
  readonly level: number;
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

const grantIndexes = new WeakMap<CheckedData, GrantIndex>();

function grantIndexOf(data: CheckedData): GrantIndex {
  let G = grantIndexes.get(data);
  if (G === undefined) grantIndexes.set(data, (G = buildGrantIndex(data)));
  return G;
}

const isItem = (data: CheckedData, guid: Guid) => {
  const bp = data.blueprints.get(guid);
  return bp !== undefined && kindOf[bp.$type] === 'items';
};

interface ItemPart {
  readonly labels: readonly Label[];
  readonly written?: string;
}

function itemParts(data: CheckedData, guid: Guid, G: GrantIndex): ItemPart[] {
  const bp = data.blueprints.get(guid);
  const seen = new Set<Guid>();
  return (bp === undefined ? [] : enchantmentsOf(bp, data.blueprints)).flatMap((enchantment) => {
    const granted = G.grantsOf(enchantment)
      .filter((g) => EQUIPMENT_GRANT_KINDS.has(g.kind) && !seen.has(g.granted))
      .map((g) => g.granted);
    for (const fact of granted) seen.add(fact);
    return [
      { labels: labelsOf(data, enchantment, true) },
      ...granted.map((fact) => {
        const written = writtenSummary(data, fact);
        return { labels: labelsOf(data, fact, true), ...(written !== undefined && { written }) };
      }),
    ];
  });
}

function distinct<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function summaryLabels(data: CheckedData, guid: Guid, G: GrantIndex = grantIndexOf(data)): Label[] {
  if (!isItem(data, guid)) return labelsOf(data, guid);
  return distinct(
    itemParts(data, guid, G).flatMap((p) => p.labels),
    (l) => l.text,
  );
}

export function summaryText(data: CheckedData, guid: Guid, G: GrantIndex = grantIndexOf(data)): string {
  const written = writtenSummary(data, guid);
  if (written !== undefined) return written;
  if (!isItem(data, guid)) return summaryOf(labelsOf(data, guid));
  const parts = distinct(
    itemParts(data, guid, G).flatMap((p) => (p.written !== undefined ? [p.written] : p.labels.map((l) => l.text))),
    (t) => t,
  );
  return parts.length === 0 ? NO_SUMMARY : parts.join(' ');
}

function grantCondition(data: CheckedData, bp: Blueprint, g: Grant): string | undefined {
  const named = (r: unknown) => refGuid(r) === g.granted;
  for (const c of bp.Components) {
    if (c.$type === 'AddFeatureOnClassLevel' && g.kind === c.$type && named((c as AddFeatureOnClassLevel).m_Feature)) {
      const x = c as AddFeatureOnClassLevel;
      const classes = listNames(data, guids([x.m_Class, ...(x.m_AdditionalClasses ?? [])]));
      return `${x.BeforeThisLevel ? 'below' : 'at'} ${orList(classes)} level ${x.Level}`;
    }
    if (c.$type === 'AddFeatureIfHasFact' && g.kind === c.$type && named((c as AddFeatureIfHasFact).m_Feature)) {
      const x = c as AddFeatureIfHasFact;
      const fact = refGuid(x.m_CheckedFact);
      return fact === undefined ? undefined : `${x.Not ? 'without' : 'with'} ${bareNameOf(data, fact)}`;
    }
    if (c.$type === 'AddFeatureOnAlignment' && g.kind === c.$type && (c as AddFeatureOnAlignment).m_Facts.some(named)) {
      return `while the alignment is ${(c as AddFeatureOnAlignment).Alignment}`;
    }
  }
  return undefined;
}

function named(data: CheckedData, guids: readonly Guid[]): NamedLink[] {
  return guids.map((guid) => ({ guid, name: bareNameOf(data, guid) }));
}

function classParts(data: CheckedData, bp: Blueprint, G: GrantIndex): Partial<Description> {
  const link = (guid: Guid): NamedLink => ({ guid, name: nameOf(data, guid) });
  const leveled = (g: Grant): LevelLink[] =>
    g.level === undefined || data.blueprints.get(g.granted)?.name === undefined
      ? []
      : [{ ...link(g.granted), level: g.level }];
  if (bp.$type === 'BlueprintCharacterClass') {
    const own = G.grantsOf(bp.guid);
    const progression = own
      .filter((g) => g.kind === 'classProgression')
      .flatMap((g) => G.grantsOf(g.granted).filter((e) => e.kind === 'levelEntry'))
      .flatMap(leveled)
      .sort((a, b) => a.level - b.level);
    const archetypes = own.filter((g) => g.kind === 'classArchetype').map((g) => link(g.granted));
    return { progression, ...(archetypes.length > 0 && { archetypes }) };
  }
  if (bp.$type === 'BlueprintArchetype') {
    const cls = G.grantorsOf(bp.guid).find((g) => g.kind === 'classArchetype');
    const replaces = G.grantsOf(bp.guid)
      .filter((g) => g.kind === 'archetypeRemove')
      .flatMap(leveled)
      .sort((a, b) => a.level - b.level);
    return { ...(cls !== undefined && { forClass: link(cls.grantor) }), replaces };
  }
  return {};
}

export function describe(
  data: CheckedData,
  guid: Guid,
  G: GrantIndex = buildGrantIndex(data),
): Description | undefined {
  const bp = data.blueprints.get(guid);
  if (bp === undefined || bp.name === undefined) return undefined;
  const shown = (g: Guid) => {
    const b = data.blueprints.get(g);
    return b !== undefined && isShown(b);
  };
  const w = { data, G };
  const links = linkIndex(data, G);
  const labels = summaryLabels(data, guid, G);
  const written = writtenSummary(data, guid);
  const summary = summaryText(data, guid, G);
  return {
    guid,
    name: nameOf(data, guid),
    kind: kindOf[bp.$type],
    summary,
    summarySource: written !== undefined ? 'written' : summary !== NO_SUMMARY ? 'labels' : 'none',
    labels,
    prerequisites: [
      ...new Set(
        prerequisites(bp, data.blueprints).map((leaf) =>
          unmetText(w, { leaf }).replace(/^Needs /, leaf.Group === 'All' ? 'Needs ' : 'Or: needs '),
        ),
      ),
    ],
    grants: G.grantsOf(guid)
      .filter((g) => !removes(g) && shown(g.granted) && g.kind !== 'selectionOption' && g.kind !== 'classArchetype')
      .map((g) => {
        const when = grantCondition(data, bp, g);
        return {
          guid: g.granted,
          name: nameOf(data, g.granted),
          ...(g.level !== undefined && { level: g.level }),
          ...(when !== undefined && { when }),
        };
      }),
    pickedIn: [
      ...new Map(
        G.grantorsOf(guid)
          .filter((g) => g.kind === 'selectionOption' && shown(g.grantor))
          .map((g) => [g.grantor, { guid: g.grantor, name: nameOf(data, g.grantor) }]),
      ).values(),
    ],
    needs: named(data, links.needs(guid)),
    enables: named(data, links.enables(guid)),
    ...classParts(data, bp, G),
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
  'AllSavesBonusEquipment',
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
  'AddAbilityResources',
];
