import type { CheckedData } from '../load';
import { isShown, kindOf, type Guid, type Kind } from '../data';
import { buildGrantIndex, removes, type GrantIndex } from '../grants';
import { linkIndex } from '../links';
import { prerequisites } from '../prerequisites';
import { nameOf, unmetText } from '../refusals';

export interface Description {
  readonly guid: Guid;
  readonly name: string;
  readonly kind: Kind;
  readonly summary: string;
  readonly prerequisites: readonly string[];
  readonly grants: readonly { readonly guid: Guid; readonly name: string; readonly level?: number }[];
  readonly pickedIn: readonly { readonly guid: Guid; readonly name: string }[];
  readonly needs: readonly Guid[];
  readonly enables: readonly Guid[];
}

export const NO_SUMMARY = 'No summary yet.';

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
  return {
    guid,
    name: nameOf(data, guid),
    kind: kindOf[bp.$type],
    summary: NO_SUMMARY,
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
];
