import { slotKey, withPick, type Build, type SlotId } from '../build';
import type { CheckedData } from '../load';
import { refGuid, type Blueprint, type BlueprintParametrizedFeature, type Guid, type SpellSchool } from '../data';
import { buildGrantIndex, type GrantIndex, type GrantParam } from '../grants';
import type { FailedRule, Unit } from '../walk';
import { SKILL_ATTRIBUTE, pauseAt, walk, type OpenedSlot, type PausedWalk, WEAPON_CATEGORIES } from '../walk';
import { heldIndex, synergyOf, type HeldIndex, type Synergy } from '../links';
import { namesInList } from './option-names';

export interface OptionStatus {
  readonly feature: Guid;
  readonly param?: GrantParam;
  readonly shown: boolean;
  readonly closed?: FailedRule;
  readonly gearItems?: readonly Guid[];
  readonly name?: string;
  readonly qualifier?: string;
  readonly synergy?: Synergy;
}

export interface Picker {
  readonly slot: OpenedSlot;
  readonly options: readonly OptionStatus[];
  readonly unit: Unit;
}

const SPELL_SCHOOLS: readonly SpellSchool[] = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
];

export function parameters(feat: BlueprintParametrizedFeature): readonly GrantParam[] {
  switch (feat.ParameterType) {
    case 'WeaponCategory':
      return WEAPON_CATEGORIES.map((WeaponCategory) => ({ WeaponCategory }));
    case 'SpellSchool':
      return SPELL_SCHOOLS.map((SpellSchool) => ({ SpellSchool }));
    case 'Skill':
      return Object.keys(SKILL_ATTRIBUTE).map((StatType) => ({ StatType }) as GrantParam);
    case 'Custom':
    case 'FeatureSelection':
      return (feat.BlueprintParameterVariants ?? [])
        .map((r) => refGuid(r))
        .filter((g): g is Guid => g !== undefined)
        .map((Blueprint) => ({ Blueprint }));
    default:
      return [];
  }
}

export function candidates(data: CheckedData, selection: Guid): readonly { feature: Guid; param?: GrantParam }[] {
  const bp = data.blueprints.get(selection);
  if (bp?.$type === 'BlueprintFeatureSelectMythicSpellbook') {
    const spellbooks = bp.m_AllowedSpellbooks.map((r) => refGuid(r)).filter((g): g is Guid => g !== undefined);
    return [{ feature: bp.guid }, ...spellbooks.map((Blueprint) => ({ feature: bp.guid, param: { Blueprint } }))];
  }
  if (bp?.$type !== 'BlueprintFeatureSelection') return [];
  return bp.m_AllFeatures.flatMap((r) => {
    const feature = refGuid(r);
    if (feature === undefined) return [];
    const option = data.blueprints.get(feature);
    if (option?.$type !== 'BlueprintParametrizedFeature') return [{ feature }];
    return parameters(option).map((param) => ({ feature, param }));
  });
}

export function picker(
  data: CheckedData,
  build: Build,
  slot: SlotId,
  G: GrantIndex = buildGrantIndex(data),
): Picker | undefined {
  const paused = pauseAt(data, build, slot, G);
  if (paused === undefined) return undefined;
  const held = heldIndex(data, [...paused.unit.facts()]);
  const options = candidates(data, slot.selection).map((o) => status(data, paused, o));
  return { slot: paused.slot, options: withSynergy(data, held, withListNames(data, options)), unit: paused.unit };
}

function withSynergy(data: CheckedData, held: HeldIndex, options: readonly OptionStatus[]): OptionStatus[] {
  return options.map((o) => {
    if (!o.shown) return o;
    const synergy = synergyOf(data, held, o);
    return synergy.shared.length === 0 && synergy.wontStack.length === 0 ? o : { ...o, synergy };
  });
}

function withListNames(data: CheckedData, options: readonly OptionStatus[]): OptionStatus[] {
  const names = namesInList(
    data,
    options.filter((o) => o.shown).map((o) => o.feature),
  );
  return options.map((o) => {
    const listed = names.get(o.feature);
    return listed === undefined ? o : { ...o, ...listed };
  });
}

export function shownInSelection(bp: Blueprint, unavailable: boolean): boolean {
  if (bp.name === undefined) return false;
  return !(unavailable && 'HideNotAvailibleInUI' in bp && bp.HideNotAvailibleInUI);
}

function status(data: CheckedData, paused: PausedWalk, o: { feature: Guid; param?: GrantParam }): OptionStatus {
  const bp = data.blueprints.get(o.feature);
  const closed = paused.judge(o.feature, o.param);
  const gearItems = closed === undefined ? paused.gearItems(o.feature, o.param) : undefined;
  return {
    feature: o.feature,
    ...(o.param && { param: o.param }),
    shown: bp !== undefined && shownInSelection(bp, closed !== undefined),
    ...(closed && { closed }),
    ...(gearItems && { gearItems }),
  };
}

export function walkVerdict(
  data: CheckedData,
  build: Build,
  slot: SlotId,
  option: { feature: Guid; param?: GrantParam },
  G: GrantIndex = buildGrantIndex(data),
): FailedRule | undefined {
  const key = slotKey(slot);
  return walk(data, withPick(build, { slot, ...option }), G).failures.find(
    (f) => f.choice === 'pick' && f.slot !== undefined && slotKey(f.slot) === key,
  );
}
