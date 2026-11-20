// S, slots and pickers (guide §4; build ticket 04): what each slot can take. S lists a slot's options and asks W about
// each, at the walk paused at the slot (`pauseAt`); it never repeats the band order or judges an option itself, so a
// picker's answer is the walk's.
import { slotKey, withPick, type Build, type SlotId } from './build';
import type { CheckedData } from './data/load';
import { isShown, refGuid, type BlueprintParametrizedFeature, type Guid, type SpellSchool } from './data/types';
import { buildGrantIndex, type GrantIndex, type GrantParam } from './grants';
import type { FailedRule } from './walk/failure';
import { SKILL_ATTRIBUTE } from './walk/unit';
import { pauseAt, walk, type OpenedSlot, type PausedWalk } from './walk/walk';
import { WEAPON_CATEGORIES } from './walk/weapons';

/** One option of a slot, with its status at the paused walk. */
export interface OptionStatus {
  readonly feature: Guid;
  /** The parameter, for a parametrized feat (one option per parameter) or a Mythic spellbook. */
  readonly param?: GrantParam;
  /** Whether the game shows it (map 19): a hidden option is judged like any other, and surfaces leave it out. */
  readonly shown: boolean;
  /** Why the game refuses it; absent when it is open. */
  readonly closed?: FailedRule;
  /** ADR 0002: the worn items an open option needs under the Gear opt-in; absent when it needs none. */
  readonly gearItems?: readonly Guid[];
}

export interface Picker {
  readonly slot: OpenedSlot;
  readonly options: readonly OptionStatus[];
}

/** Kingmaker/Blueprints/Classes/Spells/SpellSchool.cs, less None (BlueprintParametrizedFeature.CanSelect refuses it). */
const SPELL_SCHOOLS: readonly SpellSchool[] = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
  'Universalist',
];

/**
 * A parametrized feat's parameters (BlueprintParametrizedFeature.ExtractSelectionItems, by ParameterType): every
 * weapon category, school or skill, or its BlueprintParameterVariants. The spell parameters are out of v1 (map 22).
 */
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

/** Every option a slot lists: its selection's items, a parametrized one once per parameter. */
export function candidates(data: CheckedData, selection: Guid): readonly { feature: Guid; param?: GrantParam }[] {
  const bp = data.blueprints.get(selection);
  if (bp?.$type === 'BlueprintFeatureSelectMythicSpellbook') {
    // Its items are itself, with no spellbook or one of m_AllowedSpellbooks.
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

/** Every option of a slot with its status, judged at the walk paused there. Undefined when the slot never opens. */
export function picker(
  data: CheckedData,
  build: Build,
  slot: SlotId,
  G: GrantIndex = buildGrantIndex(data),
): Picker | undefined {
  const paused = pauseAt(data, build, slot, G);
  if (paused === undefined) return undefined;
  return { slot: paused.slot, options: candidates(data, slot.selection).map((o) => status(data, paused, o)) };
}

function status(data: CheckedData, paused: PausedWalk, o: { feature: Guid; param?: GrantParam }): OptionStatus {
  const bp = data.blueprints.get(o.feature);
  const closed = paused.judge(o.feature, o.param);
  const gearItems = closed === undefined ? paused.gearItems(o.feature, o.param) : undefined;
  return {
    feature: o.feature,
    ...(o.param && { param: o.param }),
    shown: bp !== undefined && isShown(bp),
    ...(closed && { closed }),
    ...(gearItems && { gearItems }),
  };
}

/**
 * What the walk says of `option` in `slot`: the refusal it records for that slot, or undefined when it applies the
 * pick. The self-check every picker answer must agree with (guide §6).
 */
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
