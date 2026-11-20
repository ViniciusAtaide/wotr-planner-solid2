// Judging prerequisites against the walk's character. P (engine/prerequisites.ts) says what each leaf asks; this
// module answers whether the character has it, porting each component's CheckInternal (paths under
// decompiled/Assembly-CSharp/Kingmaker/Blueprints/Classes/Prerequisites/ unless given in full) and the one rule that
// combines them (BlueprintFeature.MeetsPrerequisites, BlueprintCharacterClass.MeetsPrerequisites).
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
} from '../data/types';
import { isDeityFeature, prerequisites, type PrerequisiteLeaf } from '../prerequisites';
import { dailyChoiceOffers } from './daily-choices';
import type { Unmet } from './failure';
import { casterTypeSpellLevel, classSpellLevel, hasCasterType } from './spellbooks';
import { isAttribute, isSkill, paramValue, type Unit } from './unit';
import { hasSubCategory } from './weapons';

/** Kingmaker/UnitLogic/Alignments/AlignmentMaskType.cs: each alignment's bit. */
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

/** AlignmentMaskType's named groups, beside the nine alignments. */
const MASK_NAMES: Readonly<Record<string, number>> = {
  ...ALIGNMENT_BIT,
  Good: 0x7,
  Evil: 0x1c0,
  Lawful: 0x49,
  Chaotic: 0x124,
  Any: 0x1ff,
  None: 0,
};

/** An AlignmentMaskType value as the dump writes it: raw bits, or names joined by ", ". */
export function alignmentMask(mask: string | number): number {
  if (typeof mask === 'number') return mask;
  return mask.split(',').reduce((bits, name) => bits | (MASK_NAMES[name.trim()] ?? 0), 0);
}

export function inMask(alignment: Alignment, mask: string | number): boolean {
  return (ALIGNMENT_BIT[alignment] & alignmentMask(mask)) !== 0;
}

/**
 * Kingmaker/Enums/AlignmentExtension.cs HasComponent: whether an alignment has one axis; `Neutral` is either axis
 * neutral.
 */
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

/**
 * The slot a pick is judged in (UnitLogic/Class/LevelUp/FeatureSelectionState.cs), as far as prerequisites read it:
 * the item picked in it and in the slots nested below it (IsSelectedInChildren follows `Next`).
 */
export interface SlotChain {
  readonly picked: Guid | undefined;
  readonly next: SlotChain | undefined;
}

function isSelectedInChildren(slot: SlotChain | undefined, feature: Guid): boolean {
  for (let s = slot; s !== undefined; s = s.next) if (s.picked === feature) return true;
  return false;
}

/** What a check knows besides the character: where it happens, the slot, and the blueprint whose list it is. */
export interface Context {
  readonly unit: Unit;
  readonly place: Place;
  /** LevelUpState.IsFirstCharacterLevel. */
  readonly firstLevel: boolean;
  readonly slot?: SlotChain;
  /** Prerequisite.OwnerBlueprint, which ClassLevelsForPrerequisites' ForSelection compares with. */
  readonly owner: Guid;
  /**
   * Whether a selection's options are possible (PrerequisiteSelectionPossible): the walk passes its own CanSelect so
   * this module doesn't judge picks itself.
   */
  readonly selectionPossible?: (selection: Guid) => boolean;
}

/** Story state is always met, but the walk keeps it apart, so a condition tree can tell (map ticket 21). */
type Truth = boolean | 'story';

function not(t: Truth): Truth {
  return t === 'story' ? t : !t;
}

/**
 * Kingmaker/ElementsSystem/ConditionsChecker.cs Check, with story conditions three-valued: a tree that turns on story
 * state alone is met, since a Refusal never cites story state (map ticket 21).
 */
function all(op: 'And' | 'Or', truths: readonly Truth[]): Truth {
  if (op === 'And') return truths.includes(false) ? false : truths.includes('story') ? 'story' : true;
  return truths.includes(true) ? true : truths.includes('story') ? 'story' : false;
}

function condition(c: Condition, ctx: Context): Truth {
  const { unit } = ctx;
  const value = ((): Truth => {
    switch (c.$type) {
      case 'OrAndLogic':
        // Designers/EventConditionActionSystem/Conditions/OrAndLogic.cs CheckCondition.
        return all(
          c.ConditionsChecker.Operation,
          c.ConditionsChecker.Conditions.map((x) => condition(x, ctx)),
        );
      case 'ContextConditionHasFact':
      case 'HasFact':
        // UnitLogic/Mechanics/Conditions/ContextConditionHasFact.cs, Designers/.../Conditions/HasFact.cs.
        return factHeld(unit, refGuid(c.m_Fact) ?? '');
      case 'ContextConditionCharacterClass':
        // UnitLogic/Mechanics/Conditions/ContextConditionCharacterClass.cs CheckCondition.
        return unit.classLevel(refGuid(c.m_Class) ?? '') >= c.MinLevel;
      case 'UnitClass': {
        // Designers/EventConditionActionSystem/Conditions/UnitClass.cs CheckCondition.
        const level = unit.classLevel(refGuid(c.m_Class) ?? '');
        if (c.LimitMinLevel && level < (c.MinLevel?.Value ?? 0)) return false;
        if (c.LimitMaxLevel && level > (c.MaxLevel?.Value ?? 0)) return false;
        return level > 0;
      }
      case 'IsUnitMythicLevel': {
        // Designers/EventConditionActionSystem/Conditions/IsUnitMythicLevel.cs CheckCondition.
        if (c.CheckMinLevel && unit.mythicLevel < (c.MinLevel?.Value ?? 0)) return false;
        if (c.CheckMaxLevel && unit.mythicLevel > (c.MaxLevel?.Value ?? 0)) return false;
        return true;
      }
      case 'ContextConditionBuffRank': {
        // UnitLogic/Mechanics/Conditions/ContextConditionBuffRank.cs CheckCondition: the rank above RankValue.
        const fact = refGuid(c.Fact);
        return fact !== undefined && unit.rank(fact) > c.RankValue.Value;
      }
      case 'ContextConditionIsMainCharacter':
        // UnitLogic/Mechanics/Conditions/ContextConditionIsMainCharacter.cs CheckCondition: Unit.IsMainCharacter,
        // which a Build always is (map ticket 01).
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

/** WeaponRangeTypeExtensions.IsSuitableAttackType: whether a weapon's attack type fits a range type. */
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

/**
 * UnitLogic/Mechanics/Conditions/ContextConditionIsWeaponEquipped.cs CheckCondition, on the Build's Gear: the primary
 * hand is MainHand and the secondary OffHand. Additional limbs are the natural weapons a body or a polymorph gives,
 * which the walk doesn't hold, so a test only a limb could pass fails here. That is the data's only use (a natural
 * weapon category, in PrerequisiteConditionForWeaponCategory), so the walk refuses those parameters, as the game does
 * for a character without the limb. HoldInTwoHands is read as a two-handed weapon type (the grip a Build can't set).
 */
function weaponEquipped(unit: Unit, c: ContextConditionIsWeaponEquipped): boolean {
  const [primary, secondary] = [unit.weaponIn('MainHand'), unit.weaponIn('OffHand')];
  if (c.JustCheckEmptyHand) {
    const primaryFree = !unit.worn.has('MainHand') && secondary?.m_IsTwoHanded !== true;
    const secondaryFree = !unit.worn.has('OffHand') && primary?.m_IsTwoHanded !== true;
    return c.BothHandsAreEmpty ? primaryFree && secondaryFree : primaryFree || secondaryFree;
  }
  if (c.CheckWeaponRangeType || c.CheckWeaponCategory) {
    // CheckWeapon.
    const fits = (w: BlueprintWeaponType | undefined) =>
      w !== undefined &&
      (!c.CheckWeaponRangeType || suitsRange(c.RangeType, w.m_AttackType)) &&
      (!c.CheckWeaponCategory || w.Category === c.Category);
    if (c.CheckSlot) return c.Slot === 'PrimaryHand' ? fits(primary) : c.Slot === 'SecondaryHand' && fits(secondary);
    return fits(primary) || fits(secondary);
  }
  // UnitEntityData.GetFirstWeapon.
  return primary !== undefined || secondary !== undefined;
}

/**
 * A ConditionsChecker outside a prerequisite (an action's Conditional, an ActivateTrigger, a parameter check): story
 * state counts as met there too (map ticket 21).
 */
export function conditionsHold(
  checker: { readonly Operation: 'And' | 'Or'; readonly Conditions: readonly Condition[] },
  ctx: Context,
): boolean {
  if (checker.Conditions.length === 0) return true;
  return (
    all(
      checker.Operation,
      checker.Conditions.map((c) => condition(c, ctx)),
    ) !== false
  );
}

/** One condition, as a parameter check (IParamPrerequisite) runs it: story state counts as met. */
export function conditionHolds(c: Condition, ctx: Context): boolean {
  return condition(c, ctx) !== false;
}

/**
 * Whether the character holds a fact, counting daily choices: a fact a daily choice offers is held while the
 * character holds the feature that offers it (map tickets 24 and 26). Story-granted features are never held (map
 * ticket 25): nothing in a Build grants them.
 */
export function factHeld(unit: Unit, fact: Guid): boolean {
  if (unit.hasFact(fact)) return true;
  return dailyChoiceOffers(unit.data, fact).some((offer) => unit.hasFact(offer));
}

/**
 * Designers/Mechanics/Facts/ClassLevelsForPrerequisites.cs, as PrerequisiteClassLevel.GetClassLevel reads it: the
 * levels other classes lend this one, for this owner.
 */
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

/**
 * The value a stat prerequisite reads (PrerequisiteStatValue.GetStatValue): a skill's base value, else the stat's
 * permanent value, then each held ReplaceStatForPrerequisites for that stat (ReplaceStatForPrerequisites.ResultStat).
 */
export function prerequisiteStat(unit: Unit, stat: StatType): number {
  let value = permanentValue(unit, stat);
  for (const { component: r } of unit.componentsOf<ReplaceStatForPrerequisites>('ReplaceStatForPrerequisites')) {
    if (r.OldStat === stat) value = replaceStat(unit, r, value);
  }
  return value;
}

/**
 * ModifiableValue.PermanentValue, for the stats a Build's rules read: a skill's base value
 * (ModifiableValueSkill.CalculateBaseValue), an ability score's permanent value, and the class tables' attack bonus
 * and saves (ApplyClassMechanics.ApplyBaseStats).
 */
export function permanentValue(unit: Unit, stat: StatType): number {
  if (isSkill(stat)) return unit.skillBase(stat);
  if (isAttribute(stat)) return unit.permanent(stat);
  if (stat === 'BaseAttackBonus') return unit.tableStat('m_BaseAttackBonus');
  if (stat === 'SaveFortitude') return unit.tableStat('m_FortitudeSave');
  if (stat === 'SaveReflex') return unit.tableStat('m_ReflexSave');
  if (stat === 'SaveWill') return unit.tableStat('m_WillSave');
  return 0;
}

/** Designers/Mechanics/Facts/ReplaceStatForPrerequisites.cs ResultStat, with fullValue false. */
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

/**
 * The stats a stat prerequisite reads, down to the ability scores (for ADR 0002's marking): the stat itself, a
 * skill's attribute (ModifiableValueSkill.BaseAttribute), and the stat a held ReplaceStatForPrerequisites swaps in.
 */
export function scoresRead(unit: Unit, stat: StatType): StatType[] {
  const out: StatType[] = [stat];
  const attribute = isSkill(stat) ? unit.skillAttribute(stat) : undefined;
  if (attribute !== undefined) out.push(attribute);
  for (const { component: r } of unit.componentsOf<ReplaceStatForPrerequisites>('ReplaceStatForPrerequisites')) {
    if (r.OldStat === stat && r.Policy === 'NewStat') out.push(...scoresRead(unit, r.NewStat));
  }
  return out;
}

/** One leaf's verdict: whether it holds, and for a leaf that counts, what the character has and what it asks. */
interface LeafVerdict {
  readonly holds: boolean;
  readonly found?: number;
  readonly needed?: number;
}

/** A counted leaf's requiring form: at least `needed`. */
const atLeast = (found: number, needed: number) => ({ has: found >= needed, found, needed });

/**
 * One leaf: Prerequisite.Check, which takes ConsiderFulfilled as met whatever the component's flags say, and otherwise
 * CheckInternal, its polarity applied.
 */
export function judgeLeaf(leaf: PrerequisiteLeaf, ctx: Context): LeafVerdict {
  if (considerFulfilled(leaf, ctx)) return { holds: true };
  const { unit } = ctx;
  const { names } = leaf;
  // Each case is the requiring form; `forbids` inverts it below, as the component's own flag or type does.
  const { has, ...counts } = ((): { readonly has: boolean; readonly found?: number; readonly needed?: number } => {
    switch (names.kind) {
      case 'fact':
        // PrerequisiteFeature.cs and PrerequisitePlayerHasFeature.cs CheckInternal; PrerequisiteNoFeature.cs reads
        // HasFact alone.
        if (leaf.polarity === 'forbids') return { has: unit.hasFact(names.m_Feature) };
        return { has: !isSelectedInChildren(ctx.slot, names.m_Feature) && factHeld(unit, names.m_Feature) };
      case 'facts': {
        // PrerequisiteFeaturesFromList.cs CheckInternal: it counts only on a held feature and returns at the first
        // count that reaches Amount, so at least one is needed whatever Amount says; a deity list (P's IsDeity) needs
        // one.
        const count = names.m_Features.filter((g) => !isSelectedInChildren(ctx.slot, g) && factHeld(unit, g)).length;
        return atLeast(count, names.IsDeity ? 1 : Math.max(1, names.Amount));
      }
      case 'classLevel':
        // PrerequisiteClassLevel.cs GetClassLevel; PrerequisiteNoClassLevel.cs.
        return atLeast(unit.classLevel(names.m_CharacterClass) + lentLevels(ctx, names.m_CharacterClass), names.Level);
      case 'archetypeLevel': {
        // PrerequisiteArchetypeLevel.cs GetArchetypeLevel; PrerequisiteNoArchetype.cs CheckInternal.
        const data = unit.classData(names.m_CharacterClass);
        const level =
          data === undefined || !data.archetypes.includes(names.m_Archetype)
            ? 0
            : data.level + lentLevels(ctx, names.m_CharacterClass);
        return atLeast(level, names.Level);
      }
      case 'stat':
        // PrerequisiteStatValue.cs CheckUnit; PrerequisiteFullStatValue reads the full value, which for a Build's
        // permanent stats is the same.
        return atLeast(prerequisiteStat(unit, names.Stat), names.Value);
      case 'characterLevel':
        // PrerequisiteCharacterLevel.cs CheckInternal: UnitProgressionData.CharacterLevel.
        return atLeast(unit.characterLevel, names.Level);
      case 'mythicLevel':
        // PrerequisiteMythicLevel.cs CheckInternal: UnitProgressionData.MythicLevel.
        return atLeast(unit.mythicLevel, names.Level);
      case 'alignment':
        // PrerequisiteAlignment.cs CheckInternal. At the first level the alignment is picked in the level-up's last
        // band, so a Build's chosen alignment stands in for it; an unchosen one leaves the Build incomplete, not
        // impossible.
        if (names.IngorePrerequisiteCheck && ctx.firstLevel) return { has: true };
        return { has: unit.alignment === undefined || inMask(unit.alignment, names.Alignment) };
      case 'proficiency':
        // PrerequisiteProficiency.cs CheckInternal: proficient with any listed item. PrerequisiteNotProficient.cs: not
        // proficient with some listed item, so its requiring form is "proficient with all of them".
        return {
          has:
            leaf.polarity === 'forbids'
              ? names.ArmorProficiencies.every((a) => unit.armorProficiencies().has(a)) &&
                names.WeaponProficiencies.every((w) => unit.weaponProficiencies().has(w))
              : names.ArmorProficiencies.some((a) => unit.armorProficiencies().has(a)) ||
                names.WeaponProficiencies.some((w) => unit.weaponProficiencies().has(w)),
        };
      case 'casterType': {
        // PrerequisiteCasterType.cs CheckInternal; PrerequisiteCasterTypeSpellLevel.cs CheckInternal, where no
        // spellbook of the type (null) never reaches the level.
        if (names.RequiredSpellLevel === null) return { has: hasCasterType(unit, names.IsArcane) };
        const level = casterTypeSpellLevel(unit, names.IsArcane, names.OnlySpontaneous);
        if (level === undefined) return { has: false, needed: names.RequiredSpellLevel };
        return atLeast(level, names.RequiredSpellLevel);
      }
      case 'classSpellLevel': {
        // PrerequisiteClassSpellLevel.cs CheckInternal.
        const level = classSpellLevel(unit, names.m_CharacterClass);
        if (level === undefined) return { has: false, needed: names.RequiredSpellLevel };
        return atLeast(level, names.RequiredSpellLevel);
      }
      case 'parametrizedFeature':
        // PrerequisiteParametrizedFeature.cs CheckInternal, CheckFeature.
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
        // PrerequisiteParametrizedWeaponSubcategory.cs CheckInternal, CheckFeature: the feat held at a weapon category
        // of the subcategory (WeaponCategoryExtension.HasSubCategory, engine/walk/weapons.ts).
        if (isSelectedInChildren(ctx.slot, names.m_Feature)) return { has: false };
        return {
          has: unit.factsOf(names.m_Feature).some((f) => {
            const category = paramValue(f.param, 'WeaponCategory');
            return category !== undefined && hasSubCategory(category, names.SubCategory);
          }),
        };
      case 'selectionPossible':
        // PrerequisiteSelectionPossible.cs CheckInternal: false outside a slot.
        return { has: ctx.slot !== undefined && (ctx.selectionPossible?.(names.m_ThisFeature) ?? false) };
      case 'pet':
        // PrerequisitePet.cs CheckInternal: a held fact's AddPet of the type.
        return { has: unit.componentsOf<AddPet>('AddPet').some((c) => c.component.Type === names.Type) };
      case 'isPet':
        // PrerequisiteIsPet.cs CheckInternal: Unit.IsPet, which a Build never is (map ticket 01).
        return { has: false };
      case 'mainCharacter':
        // PrerequisiteMainCharacter.cs CheckInternal: Unit.IsMainCharacter, which a Build always is (map ticket 01).
        return { has: true };
      case 'story':
        // PrerequisiteEtude.cs CheckInternal reads the story's etudes; story state is always met (map ticket 21).
        return { has: true };
      case 'spellsInSpellbook':
        // PrerequisiteAnySpellsInSpellbook.cs CheckInternal: spell-parametrized feats are out of v1 (map ticket 22).
        return { has: false };
      case 'condition':
        // PrerequisiteCondition.cs CheckInternal.
        return { has: condition(names.Condition, ctx) !== false };
    }
  })();
  return { holds: leaf.polarity === 'forbids' ? !has : has, ...counts };
}

/**
 * Prerequisite.ConsiderFulfilled, which only PrerequisiteFeaturesFromList.cs overrides: a deity list (P's IsDeity) at
 * the first character level is met while the character holds no deity, since the deity is chosen in a later band.
 */
function considerFulfilled(leaf: PrerequisiteLeaf, ctx: Context): boolean {
  const { names } = leaf;
  if (names.kind !== 'facts' || !names.IsDeity || !ctx.firstLevel) return false;
  return ![...ctx.unit.facts()].some((f) => isDeityFeature(ctx.unit.bp(f.blueprint)));
}

/** The leaves a check judges, and those that failed. */
export interface Judgement {
  readonly ok: boolean;
  readonly unmet: readonly Unmet[];
}

/**
 * Blueprints/Classes/BlueprintFeature.cs MeetsPrerequisites: a feature at its rank cap fails unless it is a
 * selection; then every All leaf holds and, when other leaves exist, one of them does. A progression's grant
 * (`fromProgression`) checks only CheckInProgression leaves, and a waived slot under ExceptWhiteListed only
 * whitelisted ones.
 */
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

/**
 * Blueprints/Classes/BlueprintCharacterClass.cs MeetsPrerequisites: 20 levels at most, 10 for a prestige class, then
 * the leaves, where a passing ForcedTrue leaf is enough on its own.
 */
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

/** Blueprints/Classes/BlueprintArchetype.cs MeetsPrerequisites: every All leaf, and one of the others. */
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
    } else {
      if (forcedTrueWins && leaf.Group === 'ForcedTrue' && holds) return { ok: true, unmet: [] };
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

/** IFeatureSelection: the blueprint types that open a slot. */
export function isSelectionType(type: string): boolean {
  return SELECTION_TYPES.has(type);
}
