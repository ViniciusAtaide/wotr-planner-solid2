import type { Alignment, Place } from '../build';
import {
  refGuid,
  type AddPet,
  type AlignmentComponent,
  type BlueprintBase,
  type BlueprintFeatureSelection,
  type BlueprintWeaponType,
  type ClassLevelsForPrerequisites,
  type Condition,
  type ContextConditionIsWeaponEquipped,
  type Guid,
  type ReplaceStatForPrerequisites,
  type StatType,
  type WeaponRangeType,
} from '../data';
import { isDeityFeature, prerequisites, type PrerequisiteLeaf } from '../prerequisites';
import { dailyChoiceOffers } from './daily-choices';
import type { Unmet } from './failure';
import { casterTypeSpellLevel, classSpellLevel, hasCasterType } from './spellbooks';
import { isAttribute, isSkill, paramValue, type Unit } from './unit';
import { hasSubCategory } from './weapons';

const ALIGNMENT_BIT: Readonly<Record<Alignment, number>> = {
  LawfulGood: 0x1,
  NeutralGood: 0x2,
  ChaoticGood: 0x4,
  LawfulNeutral: 0x8,
  TrueNeutral: 0x10,
  ChaoticNeutral: 0x20,
  LawfulEvil: 0x40,
  NeutralEvil: 0x80,
  ChaoticEvil: 0x100,
};

const MASK_NAMES: Readonly<Record<string, number>> = {
  ...ALIGNMENT_BIT,
  Good: 0x7,
  Evil: 0x1c0,
  Lawful: 0x49,
  Chaotic: 0x124,
  Any: 0x1ff,
  None: 0,
};

export function alignmentMask(mask: string | number): number {
  if (typeof mask === 'number') return mask;
  return mask.split(',').reduce((bits, name) => bits | (MASK_NAMES[name.trim()] ?? 0), 0);
}

export function inMask(alignment: Alignment, mask: string | number): boolean {
  return (ALIGNMENT_BIT[alignment] & alignmentMask(mask)) !== 0;
}

export function hasAlignmentComponent(alignment: Alignment, component: AlignmentComponent): boolean {
  switch (component) {
    case 'Good':
      return alignment.endsWith('Good');
    case 'Evil':
      return alignment.endsWith('Evil');
    case 'Lawful':
      return alignment.startsWith('Lawful');
    case 'Chaotic':
      return alignment.startsWith('Chaotic');
    case 'Neutral':
      return alignment.endsWith('Neutral') || alignment.startsWith('Neutral') || alignment === 'TrueNeutral';
    case 'None':
      return false;
  }
}

export interface SlotChain {
  readonly picked: Guid | undefined;
  readonly next: SlotChain | undefined;
}

function isSelectedInChildren(slot: SlotChain | undefined, feature: Guid): boolean {
  for (let s = slot; s !== undefined; s = s.next) if (s.picked === feature) return true;
  return false;
}

export interface Context {
  readonly unit: Unit;
  readonly place: Place;
  readonly firstLevel: boolean;
  readonly slot?: SlotChain;
  readonly owner: Guid;
  readonly selectionPossible?: (selection: Guid) => boolean;
}

type Truth = boolean | 'story';

function not(t: Truth): Truth {
  return t === 'story' ? t : !t;
}

function conditionsCheck(op: 'And' | 'Or', truths: readonly Truth[]): Truth {
  if (op === 'And') return truths.includes(false) ? false : truths.includes('story') ? 'story' : true;
  return truths.includes(true) ? true : truths.includes('story') ? 'story' : false;
}

function condition(c: Condition, ctx: Context): Truth {
  const { unit } = ctx;
  const value = ((): Truth => {
    switch (c.$type) {
      case 'OrAndLogic':
        return conditionsCheck(
          c.ConditionsChecker.Operation,
          c.ConditionsChecker.Conditions.map((x) => condition(x, ctx)),
        );
      case 'ContextConditionHasFact':
      case 'HasFact':
        return factHeld(unit, refGuid(c.m_Fact) ?? '');
      case 'ContextConditionCharacterClass':
        return unit.classLevel(refGuid(c.m_Class) ?? '') >= c.MinLevel;
      case 'UnitClass': {
        const level = unit.classLevel(refGuid(c.m_Class) ?? '');
        if (c.LimitMinLevel && level < (c.MinLevel?.Value ?? 0)) return false;
        if (c.LimitMaxLevel && level > (c.MaxLevel?.Value ?? 0)) return false;
        return level > 0;
      }
      case 'IsUnitMythicLevel': {
        if (c.CheckMinLevel && unit.mythicLevel < (c.MinLevel?.Value ?? 0)) return false;
        if (c.CheckMaxLevel && unit.mythicLevel > (c.MaxLevel?.Value ?? 0)) return false;
        return true;
      }
      case 'ContextConditionBuffRank': {
        const fact = refGuid(c.Fact);
        return fact !== undefined && unit.rank(fact) > c.RankValue.Value;
      }
      case 'ContextConditionIsMainCharacter':
        return true;
      case 'ContextConditionIsWeaponEquipped':
        return weaponEquipped(unit, c);
      case 'EtudeStatus':
      case 'CompanionInParty':
      case 'IsCampaign':
        return 'story';
    }
  })();
  return c.Not ? not(value) : value;
}

function suitsRange(range: WeaponRangeType, attack: string | undefined): boolean {
  switch (range) {
    case 'Melee':
      return attack === 'Melee' || attack === 'Touch';
    case 'Ranged':
      return attack === 'Ranged' || attack === 'RangedTouch';
    case 'Touch':
      return attack === 'Touch' || attack === 'RangedTouch';
    case 'Normal':
      return attack === 'Melee' || attack === 'Ranged';
    case 'MeleeNormal':
      return attack === 'Melee';
    case 'RangedNormal':
      return attack === 'Ranged';
    case 'MeleeTouch':
      return attack === 'Touch';
    case 'RangedTouch':
      return attack === 'RangedTouch';
  }
}

function weaponEquipped(unit: Unit, c: ContextConditionIsWeaponEquipped): boolean {
  const [primary, secondary] = [unit.weaponIn('MainHand'), unit.weaponIn('OffHand')];
  if (c.JustCheckEmptyHand) {
    const primaryFree = !unit.worn.has('MainHand') && secondary?.m_IsTwoHanded !== true;
    const secondaryFree = !unit.worn.has('OffHand') && primary?.m_IsTwoHanded !== true;
    return c.BothHandsAreEmpty ? primaryFree && secondaryFree : primaryFree || secondaryFree;
  }
  if (c.CheckWeaponRangeType || c.CheckWeaponCategory) {
    const fits = (w: BlueprintWeaponType | undefined) =>
      w !== undefined &&
      (!c.CheckWeaponRangeType || suitsRange(c.RangeType, w.m_AttackType)) &&
      (!c.CheckWeaponCategory || w.Category === c.Category);
    if (c.CheckSlot) return c.Slot === 'PrimaryHand' ? fits(primary) : c.Slot === 'SecondaryHand' && fits(secondary);
    return fits(primary) || fits(secondary);
  }
  return primary !== undefined || secondary !== undefined;
}

export function conditionsHold(
  checker: { readonly Operation: 'And' | 'Or'; readonly Conditions: readonly Condition[] },
  ctx: Context,
): boolean {
  if (checker.Conditions.length === 0) return true;
  return (
    conditionsCheck(
      checker.Operation,
      checker.Conditions.map((c) => condition(c, ctx)),
    ) !== false
  );
}

export function conditionHolds(c: Condition, ctx: Context): boolean {
  return condition(c, ctx) !== false;
}

export function factHeld(unit: Unit, fact: Guid): boolean {
  if (unit.hasFact(fact)) return true;
  return dailyChoiceOffers(unit.data, fact).some((offer) => unit.hasFact(offer));
}

function lentLevels(ctx: Context, cls: Guid): number {
  let lent = 0;
  for (const { component: l } of ctx.unit.componentsOf<ClassLevelsForPrerequisites>('ClassLevelsForPrerequisites')) {
    if (refGuid(l.m_FakeClass) !== cls) continue;
    const forSelection = refGuid(l.m_ForSelection);
    if (forSelection !== undefined) {
      const sel = ctx.unit.bp(forSelection) as BlueprintFeatureSelection | undefined;
      if (!(sel?.m_AllFeatures ?? []).some((r) => refGuid(r) === ctx.owner)) continue;
    }
    lent += Math.trunc(l.Modifier * ctx.unit.classLevel(refGuid(l.m_ActualClass) ?? '') + l.Summand);
  }
  return lent;
}

export function prerequisiteStat(unit: Unit, stat: StatType): number {
  let value = permanentValue(unit, stat);
  for (const { component: r } of unit.componentsOf<ReplaceStatForPrerequisites>('ReplaceStatForPrerequisites')) {
    if (r.OldStat === stat) value = replaceStat(unit, r, value);
  }
  return value;
}

export function permanentValue(unit: Unit, stat: StatType): number {
  if (isSkill(stat)) return unit.skillBase(stat);
  if (isAttribute(stat)) return unit.permanent(stat);
  if (stat === 'BaseAttackBonus') return unit.tableStat('m_BaseAttackBonus');
  if (stat === 'SaveFortitude') return unit.tableStat('m_FortitudeSave');
  if (stat === 'SaveReflex') return unit.tableStat('m_ReflexSave');
  if (stat === 'SaveWill') return unit.tableStat('m_WillSave');
  return 0;
}

function replaceStat(unit: Unit, r: ReplaceStatForPrerequisites, value: number): number {
  const cls = refGuid(r.m_CharacterClass) ?? '';
  switch (r.Policy) {
    case 'NewStat':
      return permanentValue(unit, r.NewStat);
    case 'ClassLevel':
      return Math.max(value, unit.classLevel(cls));
    case 'ClassLevelStacking':
      return value + unit.classLevel(cls);
    case 'SpecificNumber':
      return Math.max(value, r.SpecificNumber);
    case 'Summand':
      return value + r.SpecificNumber;
    case 'MagusBaseAttack':
      return Math.max(value, unit.classLevel(cls));
  }
}

export function scoresRead(unit: Unit, stat: StatType): StatType[] {
  const out: StatType[] = [stat];
  const attribute = isSkill(stat) ? unit.skillAttribute(stat) : undefined;
  if (attribute !== undefined) out.push(attribute);
  for (const { component: r } of unit.componentsOf<ReplaceStatForPrerequisites>('ReplaceStatForPrerequisites')) {
    if (r.OldStat === stat && r.Policy === 'NewStat') out.push(...scoresRead(unit, r.NewStat));
  }
  return out;
}

interface LeafVerdict {
  readonly holds: boolean;
  readonly found?: number;
  readonly needed?: number;
}

const atLeast = (found: number, needed: number) => ({ has: found >= needed, found, needed });

export function judgeLeaf(leaf: PrerequisiteLeaf, ctx: Context): LeafVerdict {
  if (considerFulfilled(leaf, ctx)) return { holds: true };
  const { unit } = ctx;
  const { names } = leaf;
  const { has, ...counts } = ((): { readonly has: boolean; readonly found?: number; readonly needed?: number } => {
    switch (names.kind) {
      case 'fact':
        if (leaf.polarity === 'forbids') return { has: unit.hasFact(names.m_Feature) };
        return { has: !isSelectedInChildren(ctx.slot, names.m_Feature) && factHeld(unit, names.m_Feature) };
      case 'facts': {
        const count = names.m_Features.filter((g) => !isSelectedInChildren(ctx.slot, g) && factHeld(unit, g)).length;
        return atLeast(count, names.IsDeity ? 1 : Math.max(1, names.Amount));
      }
      case 'classLevel':
        return atLeast(unit.classLevel(names.m_CharacterClass) + lentLevels(ctx, names.m_CharacterClass), names.Level);
      case 'archetypeLevel': {
        const data = unit.classData(names.m_CharacterClass);
        const level =
          data === undefined || !data.archetypes.includes(names.m_Archetype)
            ? 0
            : data.level + lentLevels(ctx, names.m_CharacterClass);
        return atLeast(level, names.Level);
      }
      case 'stat':
        return atLeast(prerequisiteStat(unit, names.Stat), names.Value);
      case 'characterLevel':
        return atLeast(unit.characterLevel, names.Level);
      case 'mythicLevel':
        return atLeast(unit.mythicLevel, names.Level);
      case 'alignment':
        if (names.IngorePrerequisiteCheck && ctx.firstLevel) return { has: true };
        return { has: unit.alignment === undefined || inMask(unit.alignment, names.Alignment) };
      case 'proficiency':
        return {
          has:
            leaf.polarity === 'forbids'
              ? names.ArmorProficiencies.every((a) => unit.armorProficiencies().has(a)) &&
                names.WeaponProficiencies.every((w) => unit.weaponProficiencies().has(w))
              : names.ArmorProficiencies.some((a) => unit.armorProficiencies().has(a)) ||
                names.WeaponProficiencies.some((w) => unit.weaponProficiencies().has(w)),
        };
      case 'casterType': {
        if (names.RequiredSpellLevel === null) return { has: hasCasterType(unit, names.IsArcane) };
        const level = casterTypeSpellLevel(unit, names.IsArcane, names.OnlySpontaneous);
        if (level === undefined) return { has: false, needed: names.RequiredSpellLevel };
        return atLeast(level, names.RequiredSpellLevel);
      }
      case 'classSpellLevel': {
        const level = classSpellLevel(unit, names.m_CharacterClass);
        if (level === undefined) return { has: false, needed: names.RequiredSpellLevel };
        return atLeast(level, names.RequiredSpellLevel);
      }
      case 'parametrizedFeature':
        if (isSelectedInChildren(ctx.slot, names.m_Feature)) return { has: false };
        return {
          has: unit.factsOf(names.m_Feature).some((f) => {
            if (names.ParameterType === 'WeaponCategory')
              return paramValue(f.param, 'WeaponCategory') === names.WeaponCategory;
            if (names.ParameterType === 'SpellSchool') return paramValue(f.param, 'SpellSchool') === names.SpellSchool;
            return false;
          }),
        };
      case 'weaponSubCategory':
        if (isSelectedInChildren(ctx.slot, names.m_Feature)) return { has: false };
        return {
          has: unit.factsOf(names.m_Feature).some((f) => {
            const category = paramValue(f.param, 'WeaponCategory');
            return category !== undefined && hasSubCategory(category, names.SubCategory);
          }),
        };
      case 'selectionPossible':
        return { has: ctx.slot !== undefined && (ctx.selectionPossible?.(names.m_ThisFeature) ?? false) };
      case 'pet':
        return { has: unit.componentsOf<AddPet>('AddPet').some((c) => c.component.Type === names.Type) };
      case 'isPet':
        return { has: false };
      case 'mainCharacter':
        return { has: true };
      case 'story':
        return { has: true };
      case 'spellsInSpellbook':
        return { has: false };
      case 'condition':
        return { has: condition(names.Condition, ctx) !== false };
    }
  })();
  return { holds: leaf.polarity === 'forbids' ? !has : has, ...counts };
}

function considerFulfilled(leaf: PrerequisiteLeaf, ctx: Context): boolean {
  const { names } = leaf;
  if (names.kind !== 'facts' || !names.IsDeity || !ctx.firstLevel) return false;
  return ![...ctx.unit.facts()].some((f) => isDeityFeature(ctx.unit.bp(f.blueprint)));
}

export interface Judgement {
  readonly ok: boolean;
  readonly unmet: readonly Unmet[];
}

export function meetsPrerequisites(
  feature: BlueprintBase & { readonly Ranks?: number },
  ctx: Context,
  opts: { readonly fromProgression: boolean; readonly onlyWhiteListed?: boolean },
): Judgement {
  if (!isSelectionType(feature.$type) && ctx.unit.rank(feature.guid) >= (feature.Ranks ?? 1)) {
    return { ok: false, unmet: [] };
  }
  return combine(
    prerequisites(feature, ctx.unit.data.blueprints).filter(
      (l) =>
        (!opts.onlyWhiteListed || l.IsFeatureSelectionWhiteList) && (!opts.fromProgression || l.CheckInProgression),
    ),
    ctx,
    false,
  );
}

export function classMeetsPrerequisites(cls: Guid, ctx: Context, ignoreAlignment = false): Judgement {
  const bp = ctx.unit.bp(cls);
  if (bp?.$type !== 'BlueprintCharacterClass') return { ok: false, unmet: [] };
  const level = ctx.unit.classLevel(cls);
  if (level >= 20 || (bp.PrestigeClass && level >= 10)) return { ok: false, unmet: [] };
  return combine(
    prerequisites(bp, ctx.unit.data.blueprints).filter((l) => !(ignoreAlignment && l.names.kind === 'alignment')),
    ctx,
    true,
  );
}

export function archetypeMeetsPrerequisites(archetype: BlueprintBase, ctx: Context): Judgement {
  return combine(prerequisites(archetype, ctx.unit.data.blueprints), ctx, false);
}

function combine(leaves: readonly PrerequisiteLeaf[], ctx: Context, forcedTrueWins: boolean): Judgement {
  let allOk: boolean | undefined;
  let anyOk: boolean | undefined;
  const unmetAll: Unmet[] = [];
  const unmetAny: Unmet[] = [];
  for (const leaf of leaves) {
    const { holds, ...counts } = judgeLeaf(leaf, ctx);
    const unmet: Unmet = { leaf, ...counts };
    if (leaf.Group === 'All') {
      allOk = (allOk ?? true) && holds;
      if (!holds) unmetAll.push(unmet);
    } else if (forcedTrueWins && leaf.Group === 'ForcedTrue') {
      if (holds) return { ok: true, unmet: [] };
    } else {
      anyOk = (anyOk ?? false) || holds;
      if (!holds) unmetAny.push(unmet);
    }
  }
  const ok = (allOk ?? true) && (anyOk ?? true);
  return { ok, unmet: ok ? [] : [...unmetAll, ...(anyOk === false ? unmetAny : [])] };
}

const SELECTION_TYPES: ReadonlySet<string> = new Set([
  'BlueprintFeatureSelection',
  'BlueprintParametrizedFeature',
  'BlueprintFeatureSelectMythicSpellbook',
]);

export function isSelectionType(type: string): boolean {
  return SELECTION_TYPES.has(type);
}
