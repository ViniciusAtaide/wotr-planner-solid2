import type { CheckedData } from '../load';
import {
  refGuid,
  type ACBonusAgainstAttacks,
  type ACBonusAgainstFactOwner,
  type AddConditionImmunity,
  type AddDamageResistanceEnergy,
  type AddDamageResistancePhysical,
  type AddEnergyDamageImmunity,
  type AddEnergyImmunity,
  type AddEnergyVulnerability,
  type AddFortification,
  type AddImmunityToAbilityScoreDamage,
  type AddSpellResistance,
  type AlignmentComponent,
  type ArcaneSpellFailureIncrease,
  type AreaSetting,
  type AttackBonusAgainstFactOwner,
  type AttackTypeAttackBonus,
  type Blindsense,
  type BuffAllSavesBonus,
  type BuffAllSkillsBonus,
  type BuffDescriptorImmunity,
  type BuffMovementSpeed,
  type CMDBonusAgainstManeuvers,
  type CombatManeuver,
  type Component,
  type ConcentrationBonus,
  type DamageBonusAgainstFactOwner,
  type DamageEnergyType,
  type DraconicBloodlineArcana,
  type Evasion,
  type FavoredEnemy,
  type FavoredTerrain,
  type Guid,
  type ImprovedEvasion,
  type IncreaseAllSpellsDC,
  type IncreaseSpellDescriptorCasterLevel,
  type IncreaseSpellDescriptorDC,
  type IncreaseSpellSchoolCasterLevel,
  type IncreaseSpellSchoolDC,
  type ManeuverBonus,
  type ManeuverDefenceBonus,
  type ModifierDescriptor,
  type RankedContextValue,
  type Ref,
  type SavingThrowBonusAgainstDescriptor,
  type SavingThrowBonusAgainstFact,
  type SavingThrowBonusAgainstSchool,
  type SavingThrowType,
  type SpellDescriptorWrapper,
  type SpellImmunityToSpellDescriptor,
  type SpellPenetrationBonus,
  type StatType,
  type UnitCondition,
  type WeaponFighterGroup,
  type WeaponGroupAttackBonus,
  type WeaponGroupDamageBonus,
  type WeaponRangeType,
  type WeaponSpecializationParametrized,
  type WeaponTypeDamageStatReplacement,
} from '../data';
import { spellDescriptors } from '../links';
import { bareNameOf, statName } from '../refusals';

export type Role = 'bonus' | 'save' | 'immunity' | 'resistance' | 'weakness' | 'requirement' | 'trigger';

export interface Label {
  readonly role: Role;
  readonly text: string;
}

const SPELL_DESCRIPTOR_WORDS: Readonly<Record<string, string>> = {
  MindAffecting: 'mind-affecting',
  StatDebuff: 'ability-lowering',
  RestoreHP: 'healing',
  TemporaryHP: 'temporary hit point',
  VilderavnBleed: 'bleed',
  SightBased: 'sight-based',
  NegativeEmotion: 'negative emotion',
  FearImmunity: 'fear-immunity',
  ChannelPositiveHeal: 'positive channel',
  ChannelNegativeHeal: 'negative channel',
  ChannelPositiveHarm: 'positive channel',
  ChannelNegativeHarm: 'negative channel',
  AnomalyDistortion: 'anomaly',
};

export const GROUP_WORDS: Readonly<Record<WeaponFighterGroup, string>> = {
  None: 'no weapon group',
  Axes: 'axes',
  BladesHeavy: 'heavy blades',
  BladesLight: 'light blades',
  Bows: 'bows',
  Crossbows: 'crossbows',
  Double: 'double weapons',
  Flails: 'flails',
  Hammers: 'hammers',
  Monk: 'monk weapons',
  Natural: 'natural weapons',
  Polearms: 'polearms',
  Spears: 'spears',
  Thrown: 'thrown weapons',
  Close: 'close weapons',
};

const RANGE_WORDS: Readonly<Record<WeaponRangeType, string>> = {
  Melee: 'melee',
  Ranged: 'ranged',
  Touch: 'touch',
  Normal: 'non-touch',
  MeleeNormal: 'non-touch melee',
  RangedNormal: 'non-touch ranged',
  MeleeTouch: 'melee touch',
  RangedTouch: 'ranged touch',
};

const ALIGNMENT_WORDS: Readonly<Record<AlignmentComponent, string>> = {
  None: '',
  Neutral: 'neutral',
  Good: 'good',
  Evil: 'evil',
  Lawful: 'lawful',
  Chaotic: 'chaotic',
};

const UNTYPED: ReadonlySet<ModifierDescriptor> = new Set(['None', 'UntypedStackable']);

export const words = (s: string): string => s.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

export function orList(items: readonly string[]): string {
  const unique = [...new Set(items)];
  if (unique.length <= 1) return unique[0] ?? '';
  return `${unique.slice(0, -1).join(', ')} or ${unique.at(-1)}`;
}

function andList(items: readonly string[]): string {
  const unique = [...new Set(items)];
  if (unique.length <= 1) return unique[0] ?? '';
  return `${unique.slice(0, -1).join(', ')} and ${unique.at(-1)}`;
}

export const descriptorWord = (d: string): string => SPELL_DESCRIPTOR_WORDS[d] ?? words(d);

function descriptorWords(wrapper: SpellDescriptorWrapper): string {
  return orList(spellDescriptors(wrapper).map(descriptorWord));
}

const signed = (n: number) => (n < 0 ? `-${-n}` : `+${n}`);

function amount(v: RankedContextValue, plain = 0): string | undefined {
  if (v.ValueType !== 'Simple') return undefined;
  return String(v.Value + plain);
}

function bonusOf(flat: number, v?: RankedContextValue): string {
  if (v === undefined || (v.ValueType === 'Simple' && v.Value === 0)) return signed(flat);
  if (v.ValueType === 'Simple') return signed(flat + v.Value);
  return 'a bonus that grows with level';
}

function typed(bonus: string, d: ModifierDescriptor): string {
  if (!bonus.startsWith('+') && !bonus.startsWith('-')) return bonus;
  return UNTYPED.has(d) ? `${bonus}` : `${bonus} ${words(d)} bonus`;
}

const energy = (e: DamageEnergyType) => words(e);

const maneuver = (m: CombatManeuver) =>
  m.startsWith('DirtyTrick') ? `dirty trick (${words(m.slice('DirtyTrick'.length))})` : words(m);

const save = (s: SavingThrowType) => (s === 'Unknown' ? 'any' : s);

const area = (a: AreaSetting) => words(a);

const condition = (c: UnitCondition) => words(c);

function factName(data: CheckedData, ref: Ref | null): string | undefined {
  const guid = ref === null ? undefined : refGuid(ref);
  const bp = guid === undefined ? undefined : data.blueprints.get(guid);
  return bp === undefined || bp.name === undefined ? undefined : bareNameOf(data, bp.guid);
}

const article = (noun: string) => (/^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`);

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function whileHolding(data: CheckedData, check: boolean, ref: Ref | null): string {
  const name = check ? factName(data, ref) : undefined;
  return name === undefined ? '' : ` while under ${name}`;
}

function against(data: CheckedData, ref: Ref | null, not = false, unnamed = 'certain foes'): string {
  const name = factName(data, ref);
  if (name === undefined) return unnamed;
  return not ? `foes without ${name}` : name;
}

const stat = (s: StatType) => statName(s);

function physical(c: AddDamageResistancePhysical): string {
  const flags = (v: string | number) => (typeof v === 'string' ? v.split(', ').filter((x) => x !== '') : []);
  const bypass = [
    ...(c.BypassedByMaterial ? flags(c.Material).map(words) : []),
    ...(c.BypassedByForm ? flags(c.Form).map(words) : []),
    ...(c.BypassedByMagic ? ['magic'] : []),
    ...(c.BypassedByAlignment ? flags(c.Alignment).map(words) : []),
    ...(c.BypassedByEpic ? ['epic'] : []),
  ];
  const by = bypass.length === 0 ? '—' : c.Or ? bypass.join(' or ') : bypass.join(' and ');
  const n = amount(c.Value);
  if (n !== undefined) return `Damage reduction ${n}/${by}.`;
  return bypass.length === 0
    ? 'Damage reduction that grows with level, which nothing overcomes.'
    : `Damage reduction that grows with level, overcome by ${by}.`;
}

function acAgainstAttacks(c: ACBonusAgainstAttacks): string {
  const which = [
    c.OnlyAttacksOfOpportunity ? 'attacks of opportunity' : undefined,
    c.OnlySneakAttack ? 'sneak attacks' : undefined,
  ].filter((x): x is string => x !== undefined);
  const kind = [
    c.AgainstMeleeOnly ? 'melee' : undefined,
    c.AgainstRangedOnly ? 'ranged' : undefined,
    c.IsTouch ? 'touch' : undefined,
    c.NotTouch ? 'non-touch' : undefined,
  ].filter((x): x is string => x !== undefined);
  const attacks = which.length > 0 ? andList(which) : `${kind.length > 0 ? `${kind.join(' ')} ` : ''}attacks`;
  const limits = [
    c.NoShield ? 'without a shield' : undefined,
    c.CheckArmorCategory && c.NotArmorCategory.length > 0
      ? `out of ${orList(c.NotArmorCategory.map((a) => `${words(a)} armor`))}`
      : undefined,
  ].filter((x): x is string => x !== undefined);
  const bonus = typed(bonusOf(c.ArmorClassBonus, c.Value), c.Descriptor);
  return `${bonus} to AC against ${attacks}${limits.length > 0 ? `, ${limits.join(' and ')}` : ''}.`;
}

function rangeAttack(c: AttackTypeAttackBonus, data: CheckedData): string {
  const bonus = typed(bonusOf(c.AttackBonus, c.Value), c.Descriptor);
  const rolls = c.AllTypesExcept
    ? `attack rolls other than ${RANGE_WORDS[c.Type]}`
    : `${RANGE_WORDS[c.Type]} attack rolls`;
  return `${bonus} on ${rolls}${whileHolding(data, c.CheckFact, c.m_RequiredFact)}.`;
}

export const EQUIPMENT_LABELLED: ReadonlySet<string> = new Set([
  'AddStatBonusEquipment',
  'IncreaseStatEquipment',
  'WeaponEnhancementBonus',
  'ArmorEnhancementBonus',
  'MithralEnchantment',
]);

export const RANK_SCALED: ReadonlySet<string> = new Set([
  'ACBonusAgainstFactOwner',
  'AttackBonusAgainstFactOwner',
  'DamageBonusAgainstFactOwner',
  'SavingThrowBonusAgainstFact',
  'SavingThrowBonusAgainstDescriptor',
  'WeaponGroupAttackBonus',
  'WeaponGroupDamageBonus',
  'ManeuverDefenceBonus',
  'ArcaneSpellFailureIncrease',
  'Blindsense',
  'BuffAllSavesBonus',
  'AttackTypeAttackBonus',
  'AddDamageResistanceEnergy',
]);

function scalesWithRank(c: Component): boolean {
  if (c.$type === 'ManeuverBonus') return !(c as ManeuverBonus).IgnoreFactRank && !(c as ManeuverBonus).Mythic;
  return RANK_SCALED.has(c.$type);
}

export function labelOf(data: CheckedData, c: Component, ranks = 1): Label | undefined {
  const label = rawLabel(data, c);
  if (label === undefined) return undefined;
  const text = ranks > 1 && scalesWithRank(c) ? label.text.replace(/\.$/, `, per rank (up to ${ranks}).`) : label.text;
  return { role: label.role, text: sentence(text) };
}

function rawLabel(data: CheckedData, c: Component): Label | undefined {
  switch (c.$type) {
    case 'AddDamageResistanceEnergy': {
      const x = c as AddDamageResistanceEnergy;
      const n = amount(x.Value);
      return {
        role: 'resistance',
        text:
          n === undefined
            ? `Resistance to ${energy(x.Type)} that grows with level.`
            : `Resistance ${n} to ${energy(x.Type)}.`,
      };
    }
    case 'AddDamageResistancePhysical':
      return { role: 'resistance', text: physical(c as AddDamageResistancePhysical) };
    case 'AddEnergyDamageImmunity':
      return { role: 'immunity', text: `Immune to ${energy((c as AddEnergyDamageImmunity).EnergyType)} damage.` };
    case 'AddEnergyImmunity':
      return { role: 'immunity', text: `Immune to ${energy((c as AddEnergyImmunity).Type)} damage.` };
    case 'AddSpellResistance': {
      const x = c as AddSpellResistance;
      const n = amount(x.Value);
      const base = n === undefined ? 'Spell resistance that grows with level' : `Spell resistance ${n}`;
      return { role: 'resistance', text: `${base}${x.AddCR ? ' plus the challenge rating' : ''}.` };
    }
    case 'AddFortification': {
      const x = c as AddFortification;
      const n = x.UseContextValue ? amount(x.Value) : String(x.Bonus);
      return {
        role: 'resistance',
        text: `${n === undefined ? 'A' : `A ${n}%`} chance to ignore a critical hit or precision damage.`,
      };
    }
    case 'SavingThrowBonusAgainstDescriptor': {
      const x = c as SavingThrowBonusAgainstDescriptor;
      return {
        role: 'save',
        text: `${typed(bonusOf(x.Value, x.Bonus), x.ModifierDescriptor)} on saves against ${descriptorWords(x.SpellDescriptor)} effects.`,
      };
    }
    case 'SavingThrowBonusAgainstSchool': {
      const x = c as SavingThrowBonusAgainstSchool;
      return {
        role: 'save',
        text: `${typed(signed(x.Value), x.ModifierDescriptor)} on saves against ${x.School} spells.`,
      };
    }
    case 'BuffDescriptorImmunity': {
      const which = descriptorWords((c as BuffDescriptorImmunity).Descriptor);
      return which === '' ? undefined : { role: 'immunity', text: `Immune to ${which} effects.` };
    }
    case 'SpellImmunityToSpellDescriptor': {
      const which = descriptorWords((c as SpellImmunityToSpellDescriptor).Descriptor);
      return which === '' ? undefined : { role: 'immunity', text: `Immune to ${which} spells.` };
    }
    case 'AddConditionImmunity':
      return { role: 'immunity', text: `Immune to the ${condition((c as AddConditionImmunity).Condition)} condition.` };
    case 'AddImmunityToCriticalHits':
      return { role: 'immunity', text: 'Immune to critical hits.' };
    case 'AddImmunityToPrecisionDamage':
      return { role: 'immunity', text: 'Immune to precision damage, such as sneak attacks.' };
    case 'IncreaseSpellDescriptorDC': {
      const x = c as IncreaseSpellDescriptorDC;
      const what = x.SpellsOnly ? 'spells' : 'spells and abilities';
      return {
        role: 'bonus',
        text: `${signed(x.BonusDC)} to the save DC of ${descriptorWords(x.Descriptor)} ${what}.`,
      };
    }
    case 'IncreaseSpellSchoolDC': {
      const x = c as IncreaseSpellSchoolDC;
      return { role: 'bonus', text: `${signed(x.BonusDC)} to the save DC of ${x.School} spells.` };
    }
    case 'IncreaseAllSpellsDC': {
      const x = c as IncreaseAllSpellsDC;
      const what = x.SpellsOnly ? 'spells' : 'spells and abilities';
      return { role: 'bonus', text: `${bonusOf(0, x.Value)} to the save DC of all ${what}.` };
    }
    case 'SpellPenetrationBonus': {
      const x = c as SpellPenetrationBonus;
      return {
        role: 'bonus',
        text: `${typed(bonusOf(0, x.Value), x.Descriptor)} on caster level checks to overcome spell resistance${whileHolding(data, x.CheckFact, x.m_RequiredFact)}.`,
      };
    }
    case 'ConcentrationBonus': {
      const x = c as ConcentrationBonus;
      return {
        role: 'bonus',
        text: `${bonusOf(0, x.Value)} on concentration checks${whileHolding(data, x.CheckFact, x.m_RequiredFact)}.`,
      };
    }
    case 'IncreaseSpellDescriptorCasterLevel': {
      const x = c as IncreaseSpellDescriptorCasterLevel;
      const what = x.SpellsOnly ? 'spells' : 'spells and abilities';
      return {
        role: 'bonus',
        text: `${signed(x.BonusCasterLevel)} caster level for ${descriptorWords(x.Descriptor)} ${what}.`,
      };
    }
    case 'IncreaseSpellSchoolCasterLevel': {
      const x = c as IncreaseSpellSchoolCasterLevel;
      return { role: 'bonus', text: `${signed(x.BonusLevel)} caster level for ${x.School} spells.` };
    }
    case 'SpellSpecializationParametrized':
      return { role: 'bonus', text: '+2 caster level for the chosen spell.' };
    case 'DraconicBloodlineArcana': {
      const x = c as DraconicBloodlineArcana;
      const per = x.UseContextBonus ? amount(x.Value) : '1';
      const what = `${descriptorWords(x.SpellDescriptor)} ${x.SpellsOnly ? 'spells' : 'spells and abilities'}`;
      return {
        role: 'bonus',
        text:
          per === undefined
            ? `Extra damage on each damage die of ${what}, growing with level.`
            : `+${per} damage on each damage die of ${what}.`,
      };
    }
    case 'WeaponGroupAttackBonus': {
      const x = c as WeaponGroupAttackBonus;
      const bonus = x.multiplyByContext ? 'a bonus that grows with level' : typed(signed(x.AttackBonus), x.Descriptor);
      return { role: 'bonus', text: `${bonus} on attack rolls with ${GROUP_WORDS[x.WeaponGroup]}.` };
    }
    case 'WeaponGroupDamageBonus': {
      const x = c as WeaponGroupDamageBonus;
      return {
        role: 'bonus',
        text: `${typed(bonusOf(x.DamageBonus, x.AdditionalValue), x.Descriptor)} on damage rolls with ${GROUP_WORDS[x.WeaponGroup]}.`,
      };
    }
    case 'AttackBonusAgainstFactOwner': {
      const x = c as AttackBonusAgainstFactOwner;
      return {
        role: 'bonus',
        text: `${typed(bonusOf(x.AttackBonus, x.Bonus), x.Descriptor)} on attack rolls against ${against(data, x.m_CheckedFact, x.Not)}.`,
      };
    }
    case 'DamageBonusAgainstFactOwner': {
      const x = c as DamageBonusAgainstFactOwner;
      return {
        role: 'bonus',
        text: `${typed(bonusOf(x.DamageBonus, x.Bonus), x.Descriptor)} on damage rolls against ${against(data, x.m_CheckedFact)}.`,
      };
    }
    case 'ACBonusAgainstFactOwner': {
      const x = c as ACBonusAgainstFactOwner;
      const align = ALIGNMENT_WORDS[x.Alignment];
      const foes = against(data, x.m_CheckedFact, x.NoFact);
      return {
        role: 'bonus',
        text: `${typed(signed(x.Bonus), x.Descriptor)} to AC against ${align === '' ? foes : `${align} ${foes}`}.`,
      };
    }
    case 'WeaponTraining':
      return { role: 'bonus', text: 'Counts as weapon training, which raises the bonuses of the other trainings.' };
    case 'WeaponTypeDamageStatReplacement': {
      const x = c as WeaponTypeDamageStatReplacement;
      const hands = x.OnlyOneHanded ? ', with nothing in the off hand' : '';
      return {
        role: 'bonus',
        text: `Adds ${stat(x.Stat)} instead of Strength to damage with ${article(words(x.Category))}${hands}, when it is higher.`,
      };
    }
    case 'ManeuverBonus': {
      const x = c as ManeuverBonus;
      const bonus = x.Mythic ? 'half the mythic rank as a bonus' : typed(signed(x.Bonus), x.Descriptor);
      return { role: 'bonus', text: `${bonus} on ${maneuver(x.Type)} combat maneuver checks.` };
    }
    case 'ManeuverDefenceBonus': {
      const x = c as ManeuverDefenceBonus;
      const which = x.Type === 'None' ? 'all combat maneuvers' : maneuver(x.Type);
      return { role: 'bonus', text: `${typed(signed(x.Bonus), x.Descriptor)} to CMD against ${which}.` };
    }
    case 'WeaponFocusParametrized':
      return {
        role: 'bonus',
        text: '+1 on attack rolls with the chosen weapon, +2 with its mythic feat.',
      };
    case 'WeaponSpecializationParametrized':
      return {
        role: 'bonus',
        text: (c as WeaponSpecializationParametrized).Mythic
          ? 'Half the mythic rank as a bonus on damage with the chosen weapon.'
          : '+2 on damage with the chosen weapon.',
      };
    case 'ImprovedCriticalParametrized':
      return { role: 'bonus', text: 'Doubles the critical threat range of the chosen weapon.' };
    case 'Blindsense': {
      const x = c as Blindsense;
      return { role: 'bonus', text: `${x.Blindsight ? 'Blindsight' : 'Blindsense'} ${x.Range.m_Value} ft.` };
    }
    case 'BuffMovementSpeed': {
      const x = c as BuffMovementSpeed;
      const n = bonusOf(x.Value, x.ContextBonus);
      return {
        role: 'bonus',
        text: `${n.startsWith('a ') ? 'A speed bonus that grows with level' : `${n} ft. speed`}.`,
      };
    }
    case 'FavoredEnemy': {
      const x = c as FavoredEnemy;
      const foes = x.m_CheckedFacts.map((r) => factName(data, r)).filter((n): n is string => n !== undefined);
      return { role: 'bonus', text: `Favored enemy: ${foes.length === 0 ? 'certain foes' : andList(foes)}.` };
    }
    case 'FavoredTerrain':
      return { role: 'bonus', text: `Favored terrain: ${area((c as FavoredTerrain).Setting)}.` };
    case 'Evasion':
      return {
        role: 'save',
        text: `Evasion: no damage from an effect that allows a ${save((c as Evasion).SavingThrow)} save for half, when the save succeeds.`,
      };
    case 'ImprovedEvasion':
      return {
        role: 'save',
        text: `Improved evasion: half damage from an effect that allows a ${save((c as ImprovedEvasion).SavingThrow)} save for half, even when the save fails.`,
      };
    case 'BuffAllSavesBonus': {
      const x = c as BuffAllSavesBonus;
      return { role: 'save', text: `${typed(signed(x.Value), x.Descriptor)} on all saving throws.` };
    }
    case 'BuffAllSkillsBonus': {
      const x = c as BuffAllSkillsBonus;
      const n =
        x.Multiplier.ValueType === 'Simple' ? signed(x.Value * x.Multiplier.Value) : 'a bonus that grows with level';
      return { role: 'bonus', text: `${typed(n, x.Descriptor)} on all skill checks.` };
    }
    case 'ACBonusAgainstAttacks':
      return { role: 'bonus', text: acAgainstAttacks(c as ACBonusAgainstAttacks) };
    case 'AttackTypeAttackBonus':
      return { role: 'bonus', text: rangeAttack(c as AttackTypeAttackBonus, data) };
    case 'CMDBonusAgainstManeuvers': {
      const x = c as CMDBonusAgainstManeuvers;
      const which = x.Maneuvers.length === 0 ? 'all combat maneuvers' : orList(x.Maneuvers.map(maneuver));
      return { role: 'bonus', text: `${typed(bonusOf(0, x.Value), x.Descriptor)} to CMD against ${which}.` };
    }
    case 'AddImmunityToAbilityScoreDamage': {
      const x = c as AddImmunityToAbilityScoreDamage;
      const kind = x.Drain ? 'ability drain' : 'ability damage';
      const stats = x.StatTypes.length === 0 ? '' : ` to ${orList(x.StatTypes.map(stat))}`;
      return { role: 'immunity', text: `Immune to ${kind}${stats}.` };
    }
    case 'AddImmunityToEnergyDrain':
      return { role: 'immunity', text: 'Immune to energy drain and negative levels.' };
    case 'SavingThrowBonusAgainstFact': {
      const x = c as SavingThrowBonusAgainstFact;
      const align = ALIGNMENT_WORDS[x.Alignment];
      const from = against(data, x.m_CheckedFact, false, 'certain sources');
      return {
        role: 'save',
        text: `${typed(signed(x.Value), x.Descriptor)} on saves against ${align === '' ? from : `${align} ${from}`}.`,
      };
    }
    case 'ArcaneSpellFailureIncrease': {
      const x = c as ArcaneSpellFailureIncrease;
      const what = x.ToShield ? 'from shields' : 'from armor';
      return {
        role: 'bonus',
        text: `${signed(x.Bonus)}% arcane spell failure ${x.Universal ? 'from any source' : what}.`,
      };
    }
    case 'AddStatBonusEquipment':
    case 'IncreaseStatEquipment': {
      const x = c as Component & {
        readonly Descriptor: ModifierDescriptor;
        readonly Stat: StatType;
        readonly Value: number;
      };
      if (x.Stat === 'SneakAttack') return { role: 'bonus', text: `+${x.Value}d6 sneak attack damage.` };
      return { role: 'bonus', text: `${typed(signed(x.Value), x.Descriptor)} to ${stat(x.Stat)}.` };
    }
    case 'WeaponEnhancementBonus':
      return {
        role: 'bonus',
        text: `${signed((c as Component & { readonly EnhancementBonus: number }).EnhancementBonus)} enhancement bonus on attack and damage rolls with this weapon.`,
      };
    case 'ArmorEnhancementBonus':
      return {
        role: 'bonus',
        text: `${signed((c as Component & { readonly EnhancementValue: number }).EnhancementValue)} enhancement bonus to the AC this armor or shield gives.`,
      };
    case 'MithralEnchantment':
      return {
        role: 'bonus',
        text: 'Mithral: counts as one armor category lighter, heavy as medium and medium as light.',
      };
    case 'AddEnergyVulnerability':
      return {
        role: 'weakness',
        text: `Vulnerable to ${energy((c as AddEnergyVulnerability).Type)}: takes half again as much damage from it.`,
      };
    default:
      return undefined;
  }
}

export function labelsOf(data: CheckedData, guid: Guid, atOneRank = false): Label[] {
  const bp = data.blueprints.get(guid);
  const ranks = !atOneRank && bp !== undefined && 'Ranks' in bp && typeof bp.Ranks === 'number' ? bp.Ranks : 1;
  const seen = new Set<string>();
  return (bp?.Components ?? []).flatMap((c) => {
    const label = labelOf(data, c, ranks);
    if (label === undefined || seen.has(label.text)) return [];
    seen.add(label.text);
    return [label];
  });
}
