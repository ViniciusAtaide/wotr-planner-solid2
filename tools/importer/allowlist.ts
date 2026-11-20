// The allowlist (guide §3 point 1, ADR 0005): each `$type` the engine reads, the fields kept of it, and a citation
// to the decompiled method that reads them. The importer keeps nothing else. Every entry is tied to its TypeScript
// type in engine/data/types.ts: its specs must name every field of that type and match each field's type, or it fails
// to compile.
//
// Citations are relative to decompiled/Assembly-CSharp/Kingmaker/ at WrathDecompiled 6ce4a6b, as
// `<file> <method> (<the kept fields it reads>)`. Every kept field appears in some citation's list, and the A tests
// (allowlist.test.ts) check that the cited method exists and reads it.
import {
  kindOf,
  type AddStatBonusEquipment,
  type AddUnitFactEquipment,
  type AddUnitFeatureEquipment,
  type BlueprintArmorEnchantment,
  type BlueprintArmorType,
  type BlueprintEquipmentEnchantment,
  type BlueprintItemArmor,
  type BlueprintItemEquipmentBelt,
  type BlueprintItemEquipmentFeet,
  type BlueprintItemEquipmentGlasses,
  type BlueprintItemEquipmentGloves,
  type BlueprintItemEquipmentHead,
  type BlueprintItemEquipmentNeck,
  type BlueprintItemEquipmentRing,
  type BlueprintItemEquipmentShirt,
  type BlueprintItemEquipmentShoulders,
  type BlueprintItemEquipmentWrist,
  type BlueprintItemShield,
  type BlueprintItemWeapon,
  type BlueprintShieldType,
  type BlueprintUnit,
  type BlueprintWeaponEnchantment,
  type BlueprintWeaponType,
  type EquipmentRestrictionAlignment,
  type EquipmentRestrictionClass,
  type EquipmentRestrictionHasAnyClassFromList,
  type EquipmentRestrictionMainPlayer,
  type IgnoreArmorGroupComponent,
  type IncreaseStatEquipment,
  type MithralEnchantment,
  type WeaponEnhancementBonus,
  type ArmorEnhancementBonus,
  type Ref,
  type BlueprintActivatableAbility,
  type BuffExtraEffects,
  type AbilityApplyFact,
  type BlueprintAbility,
  type HasArmorFeatureUnlock,
  type MonkNoArmorAndMonkWeaponFeatureUnlock,
  type MonkNoArmorFeatureUnlock,
  type ActivateTrigger,
  type ActionList,
  type AddFactContextActions,
  type BlueprintBuff,
  type GrantAction,
  type AddMechanicsFeature,
  type BlueprintMythicsSettings,
  type BlueprintRoot,
  type AddPet,
  type ArmorProficiencyGroup,
  type ClassLevelsForPrerequisites,
  type Condition,
  type FeatureGroup,
  type IntEvaluator,
  type PrerequisiteAlignment,
  type PrerequisiteAnySpellsInSpellbook,
  type PrerequisiteArchetypeLevel,
  type PrerequisiteCasterType,
  type PrerequisiteCasterTypeSpellLevel,
  type PrerequisiteCharacterLevel,
  type PrerequisiteClassLevel,
  type PrerequisiteClassSpellLevel,
  type PrerequisiteCondition,
  type PrerequisiteConditionForWeaponCategory,
  type PrerequisiteEtude,
  type PrerequisiteFeaturesFromList,
  type PrerequisiteFullStatValue,
  type PrerequisiteNotProficient,
  type PrerequisiteIsPet,
  type PrerequisiteMainCharacter,
  type PrerequisiteMythicLevel,
  type PrerequisiteNoArchetype,
  type PrerequisiteNoClassLevel,
  type PrerequisiteParametrizedFeature,
  type PrerequisiteParametrizedWeaponSubcategory,
  type PrerequisitePet,
  type PrerequisitePlayerHasFeature,
  type PrerequisiteProficiency,
  type PrerequisiteSelectionPossible,
  type PrerequisiteStatValue,
  type ReplaceStatForPrerequisites,
  type UnitEvaluator,
  type WeaponCategory,
  type AddFacts,
  type AddFeatureIfHasFact,
  type AddFeatureOnApply,
  type AddFeatureOnClassLevel,
  type AddFeatureOnAlignment,
  type AddFeatureOnSkill,
  type AddFeatureParametrized,
  type AddParametrizedFeatures,
  type FactSinglify,
  type KensaiChosenWeapon,
  type AddClassSkill,
  type AddBackgroundClassSkill,
  type AddSkillPointPerCharacterLevel,
  type AddProficiencies,
  type AddBackgroundWeaponProficiency,
  type AddBackgroundArmorProficiency,
  type AddSpellbookLevel,
  type SkipLevelsForSpellProgression,
  type IsAlchemistSpellbook,
  type IncreaseActivatableAbilityGroupSize,
  type AddContextStatBonus,
  type ContextRankConfig,
  type ReplaceStatBaseAttribute,
  type AddStatBonus,
  type AddStatBonusIfHasFact,
  type ContextValue,
  type ModifierDescriptor,
  type NoSelectionIfAlreadyHasFeature,
  type Blueprint,
  type BlueprintArchetype,
  type BlueprintBase,
  type BlueprintCharacterClass,
  type BlueprintFeature,
  type BlueprintFeatureReplaceSpellbook,
  type BlueprintFeatureSelection,
  type BlueprintFeatureSelectMythicSpellbook,
  type BlueprintParametrizedFeature,
  type BlueprintProgression,
  type BlueprintRace,
  type BlueprintSpellbook,
  type BlueprintSpellsTable,
  type BlueprintStatProgression,
  type Component,
  type Kind,
  type PrerequisiteFeature,
  type PrerequisiteNoFeature,
  type RemoveFeatureOnApply,
  type StatType,
} from '~engine/data/types';
import { actionGrant } from '~engine/grants';
import {
  bool,
  flagsOf,
  lazy,
  num,
  poly,
  heldRefs,
  enumOf,
  int,
  list,
  orDefault,
  orNull,
  ref,
  refOrNull,
  struct,
  shortType,
  keepFields,
  type AnySpec,
  type Fields,
  type NotKept,
  type Spec,
  type Variant,
} from './spec';

/** The text field that holds a blueprint's display name, or `null` for a type the game never names. */
export type NameField = 'm_DisplayName' | 'm_DisplayNameText' | 'LocalizedName' | 'Name' | 'm_TypeNameText' | null;

/**
 * What module A (allowlist.test.ts) asks of an entry besides its kept fields: every field its cited methods read is
 * kept, or listed here. A nested field is named by its path (`Value.ValueShared`).
 */
interface Unkept {
  /** Fields a cited method reads that the engine doesn't need, each with why. */
  readonly notKept?: Readonly<Record<string, NotKept>>;
  /**
   * Fields a cited method reads that the engine needs and no area reads yet, each with the area that will. An entry
   * leaves when its area lands.
   */
  readonly awaiting?: Readonly<Record<string, string>>;
}

export interface BlueprintEntry extends Unkept {
  readonly role: 'blueprint';
  readonly type: Blueprint['$type'];
  readonly kind: Kind;
  readonly name: NameField;
  readonly fields: Readonly<Record<string, AnySpec>>;
  readonly cite: readonly string[];
}

export interface ComponentEntry extends Unkept {
  readonly role: 'component';
  readonly type: string;
  readonly fields: Readonly<Record<string, AnySpec>>;
  /**
   * Reference fields that must name a blueprint the planner holds. A grant of an ability, a buff or nothing (null),
   * or a grant conditioned on an ability or buff, is not one the planner models: the importer drops the component and
   * counts it in the report.
   */
  readonly requiresHeld?: readonly string[];
  /** Whether the kept component still says anything; when not, it is dropped and counted (an empty action tree). */
  readonly keepIf?: (kept: Record<string, unknown>) => boolean;
  /** A reason to drop the dump component before it is read (a trigger behind an unmodelled condition), or none. */
  readonly preFilter?: (raw: Record<string, unknown>) => string | undefined;
  readonly cite: readonly string[];
}

export type AllowEntry = BlueprintEntry | ComponentEntry;

type Own<T, Base> = Omit<T, keyof Base>;

function blueprint<T extends Blueprint>(
  entry: {
    type: T['$type'];
    name: NameField;
    fields: Fields<Own<T, BlueprintBase>>;
    cite: readonly string[];
  } & Unkept,
): BlueprintEntry {
  return { role: 'blueprint', kind: kindOf[entry.type], ...entry } as BlueprintEntry;
}

function component<T extends Component>(
  entry: {
    type: T['$type'];
    fields: Fields<Own<T, Component>>;
    requiresHeld?: readonly (keyof Own<T, Component>)[];
    keepIf?: (kept: T) => boolean;
    preFilter?: (raw: Record<string, unknown>) => string | undefined;
    cite: readonly string[];
  } & Unkept,
): ComponentEntry {
  return { role: 'component', ...entry } as ComponentEntry;
}

/** The kinds a `BlueprintFeatureReference` can name: every kept subclass of BlueprintFeature. */
const FEATURE: Kind[] = ['features', 'selections', 'progressions', 'races'];

/**
 * The kinds a `BlueprintUnitFactReference` can name among those the planner holds: features, and the buffs, abilities
 * and toggles held as Grant carriers.
 */
const FACT: Kind[] = [...FEATURE, 'buffs', 'abilities', 'activatables'];

/** Kingmaker/EntitySystem/Stats/StatType.cs, every member. */
const statType: Spec<StatType> = enumOf(
  'Unknown',
  'HitPoints',
  'TemporaryHitPoints',
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
  'BaseAttackBonus',
  'AdditionalAttackBonus',
  'AdditionalDamage',
  'AttackOfOpportunityCount',
  'AC',
  'AdditionalCMB',
  'AdditionalCMD',
  'SaveFortitude',
  'SaveWill',
  'SaveReflex',
  'SkillMobility',
  'SkillAthletics',
  'SkillPersuasion',
  'SkillThievery',
  'SkillLoreNature',
  'SkillPerception',
  'SkillStealth',
  'SkillUseMagicDevice',
  'SkillLoreReligion',
  'SkillKnowledgeWorld',
  'SkillKnowledgeArcana',
  'CheckBluff',
  'CheckDiplomacy',
  'CheckIntimidate',
  'Initiative',
  'Speed',
  'SneakAttack',
  'Reach',
  'DamageNonLethal',
  'BonusCasterLevel',
);

/** The citation for the fields every prerequisite shares. */
const PREREQUISITE =
  'Blueprints/Classes/BlueprintFeature.cs MeetsPrerequisites (Group, CheckInProgression, IsFeatureSelectionWhiteList)';

/** The fields every prerequisite shares (Blueprints/Classes/Prerequisites/Prerequisite.cs). */
const prerequisite = {
  Group: enumOf('All', 'Any', 'ForcedTrue'),
  CheckInProgression: bool,
  // Many prerequisites' JSON omits it; the C# field has no initializer, so the game loads false.
  IsFeatureSelectionWhiteList: orDefault(bool, false),
};

/** Kingmaker/Enums/ModifierDescriptor.cs, every member. */
const modifierDescriptor: Spec<ModifierDescriptor> = enumOf(
  'None',
  'Racial',
  'Dodge',
  'Competence',
  'Armor',
  'Shield',
  'Alchemical',
  'Circumstance',
  'Deflection',
  'Enhancement',
  'ArmorEnhancement',
  'ShieldEnhancement',
  'Inherent',
  'Insight',
  'Luck',
  'Morale',
  'NaturalArmor',
  'NaturalArmorEnhancement',
  'Profane',
  'Sacred',
  'Size',
  'Trait',
  'Resistance',
  'FearPenalty',
  'NegativeEnergyPenalty',
  'UntypedStackable',
  'DexterityBonus',
  'ConstitutionBonus',
  'Fatigued',
  'Crippled',
  'Feat',
  'StatDamage',
  'StatDrain',
  'Focus',
  'ShieldFocus',
  'Difficulty',
  'BaseStatBonus',
  'Penalty',
  'ArmorFocus',
  'Cooking',
  'Polymorph',
  'Helpless',
  'Encumbrance',
  'FavoredEnemy',
  'Other',
  'Prone',
  'Mythic',
  'DemonBonus',
  'Rage',
  'UniqueItem',
  'LockpickersKit',
  'FavouredClassBonus',
  'NaturalArmorForm',
  'Anomaly',
  'DLC',
  'WeaponTraining',
  'MasterShapeshifter',
  'SelfBonus',
  'Haste',
);

/** Kingmaker/UnitLogic/Mechanics/ContextValueType.cs. */
const contextValueType = enumOf(
  'Simple',
  'Rank',
  'Shared',
  'CasterProperty',
  'TargetProperty',
  'CasterCustomProperty',
  'TargetCustomProperty',
  'AbilityParameter',
  'CasterNamedProperty',
  'TargetNamedProperty',
  'ContextProperty',
  'CasterBuffRank',
  'TargetBuffRank',
);

/** Kingmaker/UnitLogic/Mechanics/ContextValue.cs: its type and its constant (`Calculate` returns `Value` for Simple). */
const contextValue: Spec<ContextValue> = struct({ ValueType: contextValueType, Value: int });

/**
 * The ContextValue fields `Calculate` reads only for a ValueType other than Simple and Rank, the two a kept Racial
 * bonus uses (engine/walk/unit.ts `contextValue`), as `notKept` entries under the struct field `at`.
 */
function otherValueTypes(at: string, fields: readonly string[]): Record<string, NotKept> {
  const reason = 'ContextValue.Calculate reads it only for a ValueType other than Simple and Rank';
  const holds = (raw: Record<string, unknown>) =>
    ['Simple', 'Rank'].includes(String((raw[at] as { ValueType?: unknown } | null)?.ValueType));
  return Object.fromEntries(fields.map((f) => [`${at}.${f}`, { reason, holds }]));
}

/** Kingmaker/UnitLogic/ActivatableAbilities/ActivatableAbilityGroup.cs. */
const activatableAbilityGroup = enumOf(
  'None',
  'BardicPerformance',
  'StyleStrike',
  'DivineWeaponProperty',
  'ArcaneWeaponProperty',
  'TrueMagus',
  'Judgment',
  'DebilitatingStrike',
  'CriticalFeat',
  'BarbarianStance',
  'MetamagicRod',
  'MagicArrows',
  'MagicBolts',
  'ChangeShape',
  'SerpentsFang',
  'RingOfCircumstances',
  'DuelistCripplingCritical',
  'WizardDivinationAura',
  'CombatStyle',
  'Wings',
  'TransmutationPhysicalEnhancement',
  'FormInfusion',
  'SubstanceInfusion',
  'ShroudOfWaterMode',
  'ElementalOverflow',
  'GatherPower',
  'HellknightEnchantment',
  'SpiritWeaponProperty',
  'AzataMythicPerformance',
  'AeonGaze',
  'MagicalItems',
  'SacredWeaponProperty',
  'SacredArmorProperty',
  'HunterAnimalFocus',
  'CombatManeuverStrike',
  'FeralTransformation',
  'DrovierAspect',
  'ChangeShapeKitsune',
  'MasterHealingTechnique',
  'ArcaneArmorProperty',
  'DemonMinorAspect',
  'DemonMajorAspect',
  'RagingTactician',
  'WitheringLife',
  'SpellDance',
  'NumerianWeapon',
  'PowerAttack',
  'RobeSourceOfDividingPower',
  'ShifterAspect',
  'ShifterChimeraAspect',
  'ShiftersFury',
  'Familiar',
  'RingOfAroden',
  'EnergizedWildShape',
  'Rage',
  'GhostRiderLifeLink',
  'SorcerousClawsProperty',
  'SacredWordProperty',
  'Manifestation',
);

/** Kingmaker/UnitLogic/Mechanics/AbilityRankType.cs. */
const abilityRankType = enumOf(
  'Default',
  'DamageDice',
  'DamageBonus',
  'ProjectilesCount',
  'DamageDiceAlternative',
  'StatBonus',
  'SpeedBonus',
);

/** A ContextValue whose Rank reads the fact's ContextRankConfig of the same AbilityRankType (ContextValue.Calculate). */
const rankedContextValue = struct({
  ValueType: contextValueType,
  Value: int,
  // Older components omit it; the C# field has no initializer, so the game loads Default.
  ValueRank: orDefault(abilityRankType, 'Default'),
});

/** Kingmaker/UnitLogic/Mechanics/Components/ContextRankProgression.cs. */
const contextRankProgression = enumOf(
  'AsIs',
  'Div2',
  'OnePlusDiv2',
  'StartPlusDivStep',
  'DivStep',
  'OnePlusDivStep',
  'MultiplyByModifier',
  'HalfMore',
  'BonusValue',
  'DelayedStartPlusDivStep',
  'StartPlusDoubleDivStep',
  'Div2PlusStep',
  'Custom',
  'DoublePlusBonusValue',
  'SquaredValue',
);

/** Kingmaker/Blueprints/Classes/FeatureGroup.cs, every member. */
const featureGroup: Spec<FeatureGroup> = enumOf(
  'None',
  'Feat',
  'CombatFeat',
  'WizardFeat',
  'Domain',
  'FinesseTraining',
  'RagePower',
  'RogueTalent',
  'FavoriteEnemy',
  'Discovery',
  'WeaponTraining',
  'Racial',
  'Trait',
  'SpecialistSchool',
  'OppositionSchool',
  'BloodLine',
  'FavoriteTerrain',
  'RangerStyle',
  'DefensivePower',
  'Mercy',
  'MagusArcana',
  'EldritchScionArcana',
  'StyleFeat',
  'TeamworkFeat',
  'Deities',
  'ChannelEnergy',
  'KiPowers',
  'ScaledFistKiPowers',
  'ExoticWeaponProficiency',
  'VivisectionistDiscovery',
  'ThassilonianSpellbook',
  'ArcaneTricksterSpellbook',
  'EldritchKnightSpellbook',
  'DragonDiscipleSpellbook',
  'DraconicBloodlineSelection',
  'MysticTheurgeArcaneSpellbook',
  'MysticTheurgeDivineSpellbook',
  'CreatureType',
  'AnimalCompanion',
  'DruidDomain',
  'BlightDruidDomain',
  'ClericSecondaryDomain',
  'AasimarHeritage',
  'RangerBond',
  'DruidBond',
  'TieflingHeritage',
  'KineticBlast',
  'KineticBlastInfusion',
  'KineticWildTalent',
  'KineticElementalFocus',
  'WitchHex',
  'WitchPatron',
  'Familiar',
  'OracleCurse',
  'ShamanHex',
  'ShamanSpirit',
  'MythicFeat',
  'MythicAbility',
  'OracleMystery',
  'OracleRevelation',
  'BloodragerBloodline',
  'MythicTrick1',
  'MythicTrick2',
  'MythicTrick3',
  'SkeletalChampion',
  'ImprovedSwordOfHeaven',
  'GreaterSwordOfHeaven',
  'ArcanistExploit',
  'DemonicAspect',
  'SelectMythicSpellbook',
  'AzataSuperpowerAbilities',
  'MountedCombatFeat',
  'WarpriestBlessing',
  'TerrainDominance',
  'SlayerTalent',
  'HellknightSigniferSpellbook',
  'EnlightenedPhilosopherMystery',
  'DivineHerbalistMystery',
  'UndergroundChemistDiscovery',
  'BackgroundSelection',
  'DhampirHeritage',
  'OreadHeritage',
  'KitsuneHeritage',
  'AngelMythcHalo',
  'DemonMajorAspect',
  'LichUniqueAbility',
  'LichSkeletalUpgrade',
  'MythicAdditionalProgressions',
  'DemonLordAspect',
  'TricksterFeat',
  'ReplaceSpellbook',
  'HalfOrcHeritage',
  'SeparatistSecondaryDomain',
  'DeceiverWay',
);

/** Kingmaker/Enums/WeaponCategory.cs, every member. */
const weaponCategory: Spec<WeaponCategory> = enumOf(
  'UnarmedStrike',
  'Dagger',
  'LightMace',
  'PunchingDagger',
  'Sickle',
  'Club',
  'HeavyMace',
  'Shortspear',
  'Greatclub',
  'Longspear',
  'Quarterstaff',
  'Spear',
  'Trident',
  'Dart',
  'LightCrossbow',
  'HeavyCrossbow',
  'Javelin',
  'Sling',
  'Handaxe',
  'Kukri',
  'LightHammer',
  'LightPick',
  'Shortsword',
  'Starknife',
  'WeaponLightShield',
  'SpikedLightShield',
  'Battleaxe',
  'Flail',
  'HeavyPick',
  'Longsword',
  'Rapier',
  'Scimitar',
  'Warhammer',
  'WeaponHeavyShield',
  'SpikedHeavyShield',
  'EarthBreaker',
  'Falchion',
  'Glaive',
  'Greataxe',
  'Greatsword',
  'HeavyFlail',
  'Scythe',
  'Shortbow',
  'Longbow',
  'Kama',
  'Nunchaku',
  'Sai',
  'Siangham',
  'BastardSword',
  'DuelingSword',
  'DwarvenWaraxe',
  'Estoc',
  'Falcata',
  'Tongi',
  'ElvenCurvedBlade',
  'Fauchard',
  'HandCrossbow',
  'LightRepeatingCrossbow',
  'HeavyRepeatingCrossbow',
  'Shuriken',
  'SlingStaff',
  'Touch',
  'Ray',
  'Bomb',
  'Bite',
  'Claw',
  'Gore',
  'OtherNaturalWeapons',
  'Bardiche',
  'DoubleSword',
  'DoubleAxe',
  'Urgrosh',
  'HookedHammer',
  'KineticBlast',
  'ThrowingAxe',
  'Tail',
  'Hoof',
  'Talon',
  'Tentacle',
  'Sting',
  'Slam',
  'Spike',
  'Wing',
  'SawtoothSabre',
);

/** Blueprints/Items/Armors/ArmorProficiencyGroup.cs, every member. */
const armorProficiencyGroup: Spec<ArmorProficiencyGroup> = enumOf(
  'None',
  'Light',
  'Medium',
  'Heavy',
  'Buckler',
  'LightShield',
  'HeavyShield',
  'TowerShield',
  'LightBarding',
  'MediumBarding',
  'HeavyBarding',
);

const petType = enumOf('AnimalCompanion', 'MythicSkeletalChampion', 'AzataHavocDragon', 'Clone', 'NightHag');

/** Kingmaker/Enums/AlignmentMaskType.cs, every member. */
const alignmentMask = flagsOf(
  'LawfulGood',
  'NeutralGood',
  'ChaoticGood',
  'LawfulNeutral',
  'TrueNeutral',
  'ChaoticNeutral',
  'LawfulEvil',
  'NeutralEvil',
  'ChaoticEvil',
  'Good',
  'Evil',
  'Lawful',
  'Chaotic',
  'Any',
  'None',
);

/** Blueprints/Items/Weapons/WeaponFighterGroupFlags.cs, every member. */
const weaponFighterGroupFlags = flagsOf(
  'None',
  'Axes',
  'BladesHeavy',
  'BladesLight',
  'Bows',
  'Crossbows',
  'Double',
  'Flails',
  'Hammers',
  'Monk',
  'Natural',
  'Polearms',
  'Spears',
  'Thrown',
  'Close',
);

const weaponSubCategory = enumOf(
  'None',
  'Ranged',
  'Melee',
  'Finessable',
  'Thrown',
  'Natural',
  'Knives',
  'Monk',
  'TwoHanded',
  'Light',
  'Simple',
  'Martial',
  'Exotic',
  'OneHandedPiercing',
  'Disabled',
  'OneHandedSlashing',
  'Metal',
);

const featureParameterType = enumOf(
  'Custom',
  'SpellSpecialization',
  'WeaponCategory',
  'SpellSchool',
  'LearnSpell',
  'Skill',
  'FeatureSelection',
);

/** Kingmaker/Blueprints/Classes/Spells/SpellSchool.cs. */
const spellSchool = enumOf(
  'None',
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
  'Universalist',
);

/** The unit a condition looks at: each evaluator's `GetValueInternal` returns it. */
const unitEvaluator: Spec<UnitEvaluator> = poly<UnitEvaluator>({
  PlayerCharacter: {
    fields: {},
    cite: ['Designers/EventConditionActionSystem/Evaluators/PlayerCharacter.cs GetValueInternal'],
  },
  ContextTargetUnit: {
    fields: {},
    cite: ['Designers/EventConditionActionSystem/Evaluators/ContextTargetUnit.cs GetValueInternal'],
  },
  FactOwner: { fields: {}, cite: ['Designers/EventConditionActionSystem/Evaluators/FactOwner.cs GetValueInternal'] },
});

const intEvaluator: Spec<IntEvaluator> = poly<IntEvaluator>({
  IntConstant: {
    fields: { Value: int },
    cite: ['Designers/EventConditionActionSystem/Evaluators/IntConstant.cs GetValueInternal (Value)'],
  },
});

/** Every condition's `Not`, which ElementsSystem/Condition.cs `Check` reads around the variant's `CheckCondition`. */
const NOT = 'ElementsSystem/Condition.cs Check (Not)';

/** A story condition keeps only `Not`: the planner treats it as met (map ticket 21), so what it checks isn't kept. */
function storyFields(...fields: string[]): Record<string, NotKept> {
  return Object.fromEntries(
    fields.map((f) => [f, 'a story condition, which the planner treats as met (map ticket 21)']),
  );
}

/** A condition tree (map ticket 20). Each variant keeps the fields its `CheckCondition` reads. */
const condition: Spec<Condition> = poly<Condition>({
  OrAndLogic: {
    fields: { Not: bool, ConditionsChecker: lazy(() => conditionsChecker) },
    cite: [NOT, 'Designers/EventConditionActionSystem/Conditions/OrAndLogic.cs CheckCondition (ConditionsChecker)'],
  },
  ContextConditionHasFact: {
    fields: { Not: bool, m_Fact: ref(...FACT) },
    cite: [NOT, 'UnitLogic/Mechanics/Conditions/ContextConditionHasFact.cs CheckCondition (m_Fact)'],
  },
  HasFact: {
    fields: { Not: bool, Unit: unitEvaluator, m_Fact: ref(...FACT) },
    cite: [NOT, 'Designers/EventConditionActionSystem/Conditions/HasFact.cs CheckCondition (Unit, m_Fact)'],
  },
  ContextConditionCharacterClass: {
    fields: { Not: bool, CheckCaster: bool, m_Class: ref('classes'), MinLevel: int },
    cite: [
      NOT,
      'UnitLogic/Mechanics/Conditions/ContextConditionCharacterClass.cs CheckCondition (CheckCaster, m_Class, MinLevel)',
    ],
  },
  UnitClass: {
    fields: {
      Not: bool,
      Unit: unitEvaluator,
      m_Class: ref('classes'),
      LimitMinLevel: bool,
      MinLevel: orNull(intEvaluator),
      // Some conditions' JSON omits them; LimitMaxLevel has no initializer, so the game loads false and no evaluator.
      LimitMaxLevel: orDefault(bool, false),
      MaxLevel: orDefault(orNull(intEvaluator), null),
    },
    cite: [
      NOT,
      'Designers/EventConditionActionSystem/Conditions/UnitClass.cs CheckCondition (Unit, m_Class, LimitMinLevel, MinLevel, LimitMaxLevel, MaxLevel)',
    ],
  },
  IsUnitMythicLevel: {
    fields: {
      Not: bool,
      Unit: unitEvaluator,
      CheckMinLevel: bool,
      MinLevel: orNull(intEvaluator),
      CheckMaxLevel: bool,
      MaxLevel: orNull(intEvaluator),
    },
    cite: [
      NOT,
      'Designers/EventConditionActionSystem/Conditions/IsUnitMythicLevel.cs CheckCondition (Unit, CheckMinLevel, MinLevel, CheckMaxLevel, MaxLevel)',
    ],
  },
  ContextConditionBuffRank: {
    fields: { Not: bool, UseFactInsteadBuff: bool, Fact: refOrNull(...FACT), RankValue: contextValue },
    cite: [
      NOT,
      'UnitLogic/Mechanics/Conditions/ContextConditionBuffRank.cs CheckCondition (UseFactInsteadBuff, Fact, RankValue)',
    ],
    notKept: {
      Buff: {
        reason: 'every kept condition sets UseFactInsteadBuff, so CheckCondition reads its Fact',
        holds: (raw) => raw.UseFactInsteadBuff === true,
      },
    },
  },
  ContextConditionIsMainCharacter: {
    fields: { Not: bool },
    cite: [NOT, 'UnitLogic/Mechanics/Conditions/ContextConditionIsMainCharacter.cs CheckCondition'],
  },
  ContextConditionIsWeaponEquipped: {
    fields: {
      Not: bool,
      // Older conditions' JSON omits the next four; none has an initializer, so the game loads false and PrimaryHand.
      JustCheckEmptyHand: orDefault(bool, false),
      BothHandsAreEmpty: orDefault(bool, false),
      CheckSlot: orDefault(bool, false),
      Slot: orDefault(enumOf('PrimaryHand', 'SecondaryHand', 'AdditionalLimbs'), 'PrimaryHand'),
      CheckWeaponRangeType: bool,
      CheckWeaponCategory: bool,
      RangeType: enumOf(
        'Melee',
        'Ranged',
        'Touch',
        'Normal',
        'MeleeNormal',
        'RangedNormal',
        'MeleeTouch',
        'RangedTouch',
      ),
      Category: weaponCategory,
      CheckOnCaster: bool,
    },
    cite: [
      NOT,
      'UnitLogic/Mechanics/Conditions/ContextConditionIsWeaponEquipped.cs CheckCondition (JustCheckEmptyHand, BothHandsAreEmpty, CheckSlot, Slot, CheckWeaponRangeType, CheckWeaponCategory, CheckOnCaster)',
      'UnitLogic/Mechanics/Conditions/ContextConditionIsWeaponEquipped.cs CheckWeapon (CheckWeaponRangeType, CheckWeaponCategory, RangeType, Category)',
    ],
  },
  EtudeStatus: {
    fields: { Not: bool },
    cite: [NOT, 'Designers/EventConditionActionSystem/Conditions/EtudeStatus.cs CheckCondition'],
    notKept: storyFields('m_Etude', 'NotStarted', 'Started', 'Playing', 'CompletionInProgress', 'Completed'),
  },
  CompanionInParty: {
    fields: { Not: bool },
    cite: [NOT, 'Designers/EventConditionActionSystem/Conditions/CompanionInParty.cs CheckCondition'],
    notKept: storyFields(
      'm_companion',
      'MatchWhenActive',
      'MatchWhenDetached',
      'MatchWhenRemote',
      'MatchWhenDead',
      'MatchWhenEx',
    ),
  },
  IsCampaign: {
    fields: { Not: bool },
    cite: [NOT, 'Designers/EventConditionActionSystem/Conditions/IsCampaign.cs CheckCondition'],
    notKept: storyFields('m_BlueprintCampaign'),
  },
});

/** The actions G counts as grants (`actionGrant`), each with the fields its `RunAction` reads that are kept. */
const grantActionVariants: {
  readonly [K in Exclude<GrantAction['$type'], 'Conditional'>]: Variant<
    Fields<Omit<Extract<GrantAction, { $type: K }>, '$type'>>
  >;
} = {
  ContextActionAddFeature: {
    fields: {
      m_PermanentFeature: ref(...FEATURE),
      // Older actions' JSON omits it; the field has no initializer, so the game loads null.
      m_SetRankFrom: orDefault(refOrNull(...FEATURE), null),
    },
    cite: ['UnitLogic/Mechanics/Actions/ContextActionAddFeature.cs RunAction (m_PermanentFeature, m_SetRankFrom)'],
  },
  AddFact: {
    fields: { Unit: unitEvaluator, m_Fact: ref(...FACT) },
    cite: ['Designers/EventConditionActionSystem/Actions/AddFact.cs RunAction (Unit, m_Fact)'],
  },
  ContextActionApplyBuff: {
    fields: { m_Buff: ref('buffs'), Permanent: bool },
    cite: [
      'UnitLogic/Mechanics/Actions/ContextActionApplyBuff.cs RunAction (m_Buff)',
      'UnitLogic/Mechanics/Actions/ContextActionApplyBuff.cs CalculateDuration (Permanent)',
    ],
    notKept: {
      ...Object.fromEntries(
        ['SameDuration', 'UseDurationSeconds', 'DurationSeconds', 'DurationValue'].map((f) => [
          f,
          {
            reason:
              'G counts only a permanent buff as a grant (actionGrant), and CalculateDuration gives it no duration',
            holds: (raw: Record<string, unknown>) => raw.Permanent === true,
          },
        ]),
      ),
      IsFromSpell: 'whether a dispel can end the buff, which is play, not a Build',
      IsNotDispelable: 'whether a dispel can end the buff, which is play, not a Build',
      AsChild:
        'it ends the buff with the buff whose actions applied it, as every grant ends with its source in the walk',
      NotLinkToAreaEffect: 'an area effect, which is play, not a Build',
      IgnoreParentContext: "the context's caster and values, which a grant's held fact doesn't need",
      name: "a different object's name (mechanicsContext.AssociatedBlueprint.name, in an error message)",
    },
  },
};

/** The grant actions, each kept by its variant. */
const grantAction = poly<Exclude<GrantAction, { $type: 'Conditional' }>>(grantActionVariants);

/** `Conditional`, the one action a grant list keeps around grants: its branches, run by its conditions. */
const conditionalVariant: Variant<Fields<Omit<Extract<GrantAction, { $type: 'Conditional' }>, '$type'>>> = {
  fields: {
    ConditionsChecker: lazy(() => conditionsChecker),
    IfTrue: lazy(() => grantActions),
    IfFalse: lazy(() => grantActions),
  },
  cite: ['Designers/EventConditionActionSystem/Actions/Conditional.cs RunAction (ConditionsChecker, IfTrue, IfFalse)'],
};

/**
 * An action list holding only grants (map ticket 23): `Conditional` and the actions G counts as grants (`actionGrant`)
 * of a blueprint the planner holds. Every other action, a grant of something the planner doesn't hold, and a
 * Conditional left with no grants are dropped and counted.
 */
const grantActions: Spec<ActionList> = {
  describe: 'an action list of grants (an object with Actions)',
  variants: { ...grantAction.variants, Conditional: conditionalVariant },
  keep(raw, at, ctx) {
    const actions = (raw as { Actions?: unknown } | null)?.Actions;
    if (!Array.isArray(actions)) {
      ctx.problems.push(`${at}: expected an action list, found ${JSON.stringify(raw)}`);
      return { Actions: [] };
    }
    const kept: GrantAction[] = [];
    for (const [i, action] of actions.entries()) {
      const a = action as Record<string, unknown>;
      const type = shortType(a?.$type);
      const here = `${at}.Actions[${i}]`;
      // A grant action is dropped when what it grants isn't held, so it names nothing (KeepContext.names).
      const grantCtx = { ...ctx, names: undefined };
      if (type === 'Conditional') {
        // Branches first: a Conditional whose branches grant nothing is dropped, conditions unread.
        const { IfTrue, IfFalse } = conditionalVariant.fields;
        const branches = keepFields({ IfTrue, IfFalse }, a, here, ctx);
        const unmodelled = unmodelledCondition(a.ConditionsChecker);
        if (branches.IfTrue.Actions.length + branches.IfFalse.Actions.length === 0) {
          ctx.droppedPart('Conditional (action)');
        } else if (unmodelled !== undefined) {
          ctx.droppedPart(`Conditional on ${unmodelled} (grant not modelled)`);
        } else {
          const { ConditionsChecker } = keepFields(
            { ConditionsChecker: conditionalVariant.fields.ConditionsChecker },
            a,
            here,
            ctx,
            type,
          );
          kept.push({ $type: 'Conditional', ConditionsChecker, ...branches });
        }
      } else {
        const grant = actionGrant(type, a);
        if (grant === undefined || ctx.heldKind(grant.granted) === undefined) {
          ctx.droppedPart(`${type} (action)`);
          continue;
        }
        kept.push(grantAction.keep(a, here, grantCtx));
      }
    }
    return { Actions: kept };
  },
};

/** The condition types the condition spec models: its variants. */
const MODELLED_CONDITIONS: ReadonlySet<string> = new Set(Object.keys(condition.variants!));

/**
 * The first condition type in a dump ConditionsChecker that the condition spec doesn't model (a shared value, the
 * difficulty), or `undefined`. A grant behind one is dropped and counted, so the report shows what the walk can't see.
 */
function unmodelledCondition(checker: unknown): string | undefined {
  for (const c of ((checker as { Conditions?: unknown[] } | null)?.Conditions ?? []) as Record<string, unknown>[]) {
    const type = shortType(c?.$type);
    if (type === 'OrAndLogic') {
      const inner = unmodelledCondition(c.ConditionsChecker);
      if (inner !== undefined) return inner;
    } else if (!MODELLED_CONDITIONS.has(type)) return type;
  }
  return undefined;
}

/** Kingmaker/ElementsSystem/ConditionsChecker.cs Check: all (And) or any (Or) of its conditions. */
const conditionsChecker = struct({ Operation: enumOf('And', 'Or'), Conditions: list(condition) });

/** A list of Blueprints/Classes/LevelEntry.cs: the features granted (or, in RemoveFeatures, removed) at a level. */
const levelEntries = list(struct({ Level: int, m_Features: list(ref(...FEATURE)) }));

/** An item's own enchantments: only those the planner holds (they carry a kept component) are kept. */
const enchantments = heldRefs('enchantments');

/** The citation for an item's own enchantments, read with its type's (BlueprintItem.CollectEnchantments). */
const WORN_SLOT = 'Items/Slots/EquipmentSlot.cs IsItemSupported';

/** A worn item: its place is its `$type`, and its enchantments are its own. */
function worn<T extends Blueprint & { m_Enchantments: readonly Ref[] }>(type: T['$type']): BlueprintEntry {
  return blueprint<T>({
    type,
    name: 'm_DisplayNameText',
    fields: { m_Enchantments: enchantments } as Fields<Own<T, BlueprintBase>>,
    cite: [
      WORN_SLOT,
      'Blueprints/Items/Equipment/BlueprintItemEquipmentSimple.cs CollectEnchantments (m_Enchantments)',
    ],
  });
}

/** The weapon and armour types' shared enchantment list (BlueprintWeaponType, BlueprintArmorType `Enchantments`). */
const ARMOR_TYPE_FIELDS = {
  m_ProficiencyGroup: armorProficiencyGroup,
  m_IsArmor: bool,
  m_Enchantments: enchantments,
};
const ARMOR_TYPE_CITE = [
  'Items/ItemEntityArmor.cs CanBeEquippedInternal (m_ProficiencyGroup)',
  'Items/ItemEntityShield.cs CanBeEquippedInternal (m_ProficiencyGroup)',
  'UnitLogic/ActivatableAbilities/Restrictions/RestrictionsHelper.cs CheckHasArmor (m_IsArmor)',
  'Blueprints/Items/Armors/BlueprintArmorType.cs Enchantments (m_Enchantments)',
];

/**
 * Items (map ticket 12) and what ticket 03's Gear checks read: each item's place, its weapon or armour type, its
 * restrictions, and the enchantments that give a stat bonus counted toward prerequisites (ADR 0002) or a fact.
 */
const itemEntries: readonly AllowEntry[] = [
  blueprint<BlueprintItemWeapon>({
    type: 'BlueprintItemWeapon',
    name: 'm_DisplayNameText',
    fields: {
      m_Type: ref('itemtypes'),
      m_Enchantments: enchantments,
      Double: bool,
      m_SecondWeapon: refOrNull('items'),
    },
    cite: [
      'Items/Slots/HandSlot.cs IsItemTypeSupported',
      'Items/ItemEntityWeapon.cs CanTakeOneHand (Double)',
      'Items/ItemEntityWeapon.cs ItemEntityWeapon (Double, m_SecondWeapon)',
      'Blueprints/Items/Weapons/BlueprintItemWeapon.cs CollectEnchantments (m_Type, m_Enchantments)',
    ],
  }),
  blueprint<BlueprintItemArmor>({
    type: 'BlueprintItemArmor',
    name: 'm_DisplayNameText',
    fields: { m_Type: ref('itemtypes'), m_Enchantments: enchantments },
    cite: [
      'Items/Slots/ArmorSlot.cs IsItemSupported',
      'Blueprints/Items/Armors/BlueprintItemArmor.cs CollectEnchantments (m_Type, m_Enchantments)',
    ],
  }),
  blueprint<BlueprintItemShield>({
    type: 'BlueprintItemShield',
    name: 'm_DisplayNameText',
    fields: { m_ArmorComponent: ref('items'), m_WeaponComponent: refOrNull('items') },
    cite: [
      'Items/Slots/HandSlot.cs IsItemTypeSupported',
      'Blueprints/Items/Shields/BlueprintItemShield.cs CollectEnchantments (m_ArmorComponent, m_WeaponComponent)',
    ],
  }),
  worn<BlueprintItemEquipmentHead>('BlueprintItemEquipmentHead'),
  worn<BlueprintItemEquipmentGlasses>('BlueprintItemEquipmentGlasses'),
  worn<BlueprintItemEquipmentNeck>('BlueprintItemEquipmentNeck'),
  worn<BlueprintItemEquipmentShoulders>('BlueprintItemEquipmentShoulders'),
  worn<BlueprintItemEquipmentShirt>('BlueprintItemEquipmentShirt'),
  worn<BlueprintItemEquipmentBelt>('BlueprintItemEquipmentBelt'),
  worn<BlueprintItemEquipmentWrist>('BlueprintItemEquipmentWrist'),
  worn<BlueprintItemEquipmentGloves>('BlueprintItemEquipmentGloves'),
  worn<BlueprintItemEquipmentFeet>('BlueprintItemEquipmentFeet'),
  worn<BlueprintItemEquipmentRing>('BlueprintItemEquipmentRing'),
  blueprint<BlueprintWeaponType>({
    type: 'BlueprintWeaponType',
    name: 'm_TypeNameText',
    fields: {
      Category: weaponCategory,
      m_IsNatural: bool,
      m_IsMonk: bool,
      m_IsTwoHanded: bool,
      m_AttackType: enumOf('Melee', 'Touch', 'Ranged', 'RangedTouch'),
      m_FighterGroupFlags: weaponFighterGroupFlags,
      m_Enchantments: enchantments,
    },
    cite: [
      'Items/ItemEntityWeapon.cs CanBeEquippedInternal (Category)',
      'Items/ItemEntityWeapon.cs IsLootable (m_IsNatural)',
      'Designers/Mechanics/Buffs/MonkNoArmorAndMonkWeaponFeatureUnlock.cs CheckEligibility (m_IsMonk)',
      'Items/ItemEntityWeapon.cs CanTakeOneHand (m_IsTwoHanded, m_AttackType)',
      'Blueprints/Items/Weapons/BlueprintWeaponType.cs FighterGroup (m_FighterGroupFlags)',
      'Blueprints/Items/Weapons/BlueprintWeaponType.cs Enchantments (m_Enchantments)',
    ],
  }),
  blueprint<BlueprintArmorType>({
    type: 'BlueprintArmorType',
    name: 'm_TypeNameText',
    fields: ARMOR_TYPE_FIELDS,
    cite: ARMOR_TYPE_CITE,
  }),
  blueprint<BlueprintShieldType>({
    type: 'BlueprintShieldType',
    name: 'm_TypeNameText',
    fields: ARMOR_TYPE_FIELDS,
    cite: ARMOR_TYPE_CITE,
  }),
  blueprint<BlueprintEquipmentEnchantment>({
    type: 'BlueprintEquipmentEnchantment',
    name: null,
    fields: {},
    cite: ['Blueprints/Items/Equipment/BlueprintItemEquipmentSimple.cs CollectEnchantments'],
  }),
  blueprint<BlueprintWeaponEnchantment>({
    type: 'BlueprintWeaponEnchantment',
    name: null,
    fields: {},
    cite: ['Blueprints/Items/Weapons/BlueprintItemWeapon.cs CollectEnchantments'],
  }),
  blueprint<BlueprintArmorEnchantment>({
    type: 'BlueprintArmorEnchantment',
    name: null,
    fields: {},
    cite: ['Blueprints/Items/Armors/BlueprintItemArmor.cs CollectEnchantments'],
  }),
  component<AddStatBonusEquipment>({
    type: 'AddStatBonusEquipment',
    fields: { Descriptor: enumOf('Enhancement'), Stat: statType, Value: int },
    preFilter: notEnhancement,
    cite: [
      'Designers/Mechanics/EquipmentEnchants/AddStatBonusEquipment.cs OnTurnOn (Descriptor, Stat, Value)',
      'EntitySystem/Stats/ModifiableValue.cs IsPermanent',
    ],
  }),
  component<IncreaseStatEquipment>({
    type: 'IncreaseStatEquipment',
    fields: { Descriptor: enumOf('Enhancement'), Stat: statType, Value: int },
    preFilter: notEnhancement,
    cite: ['Designers/Mechanics/EquipmentEnchants/IncreaseStatEquipment.cs OnTurnOn (Descriptor, Stat, Value)'],
  }),
  component<AddUnitFeatureEquipment>({
    type: 'AddUnitFeatureEquipment',
    fields: { m_Feature: ref(...FEATURE) },
    requiresHeld: ['m_Feature'],
    cite: ['Designers/Mechanics/EquipmentEnchants/AddUnitFeatureEquipment.cs OnActivate (m_Feature)'],
  }),
  component<AddUnitFactEquipment>({
    type: 'AddUnitFactEquipment',
    fields: { m_Blueprint: ref(...FACT) },
    requiresHeld: ['m_Blueprint'],
    cite: ['Designers/Mechanics/EquipmentEnchants/AddUnitFactEquipment.cs OnActivate (m_Blueprint)'],
  }),
  // An item's enhancement bonus (map ticket 29's rule 3, as amended by build ticket 02g): Gear names tell items of
  // one name apart by it, as Finnean's stages (+1, +3, +5).
  component<WeaponEnhancementBonus>({
    type: 'WeaponEnhancementBonus',
    fields: { EnhancementBonus: int, Stack: bool },
    cite: ['Designers/GameHelper.cs GetWeaponEnhancementBonus (EnhancementBonus, Stack)'],
  }),
  component<ArmorEnhancementBonus>({
    type: 'ArmorEnhancementBonus',
    fields: { EnhancementValue: int },
    cite: ['Designers/GameHelper.cs GetArmorEnhancementBonus (EnhancementValue)'],
  }),
  component<MithralEnchantment>({
    type: 'MithralEnchantment',
    fields: {},
    cite: ['Items/ItemEntityArmor.cs IsMithral', 'Items/ItemEntityArmor.cs ArmorType'],
  }),
  component<IgnoreArmorGroupComponent>({
    type: 'IgnoreArmorGroupComponent',
    fields: {},
    cite: ['Items/ItemEntityArmor.cs CanBeEquippedInternal'],
  }),
  component<EquipmentRestrictionClass>({
    type: 'EquipmentRestrictionClass',
    fields: { m_Class: ref('classes'), Not: bool },
    cite: ['Blueprints/Items/Components/EquipmentRestrictionClass.cs CanBeEquippedBy (m_Class, Not)'],
  }),
  component<EquipmentRestrictionHasAnyClassFromList>({
    type: 'EquipmentRestrictionHasAnyClassFromList',
    fields: { Not: bool, m_Classes: list(ref('classes')) },
    cite: ['Blueprints/Items/Components/EquipmentRestrictionHasAnyClassFromList.cs CanBeEquippedBy (Not, m_Classes)'],
  }),
  component<EquipmentRestrictionAlignment>({
    type: 'EquipmentRestrictionAlignment',
    fields: { Alignment: alignmentMask },
    cite: ['Blueprints/Items/Components/EquipmentRestrictionAlignment.cs CanBeEquippedBy (Alignment)'],
  }),
  component<EquipmentRestrictionMainPlayer>({
    type: 'EquipmentRestrictionMainPlayer',
    fields: {},
    cite: ['Blueprints/Items/Components/EquipmentRestrictionMainPlayer.cs CanBeEquippedBy'],
  }),
];

/** Drops an item stat bonus that never counts toward a prerequisite: only `Enhancement` is permanent (ADR 0002). */
function notEnhancement(raw: Record<string, unknown>): string | undefined {
  return raw.Descriptor === 'Enhancement' ? undefined : `${shortType(raw.$type)} (not Enhancement)`;
}

export const allowlist: readonly AllowEntry[] = [
  blueprint<BlueprintCharacterClass>({
    type: 'BlueprintCharacterClass',
    name: 'LocalizedName',
    fields: {
      SkillPoints: int,
      HitDie: enumOf('Zero', 'One', 'D2', 'D3', 'D4', 'D6', 'D8', 'D10', 'D12', 'D20', 'D100'),
      PrestigeClass: bool,
      IsMythic: bool,
      // Some classes' JSON omits these two; both C# fields have no initializer, so the game loads false.
      DontAddCasterLevels: orDefault(bool, false),
      m_IsHigherMythic: orDefault(bool, false),
      m_BaseAttackBonus: ref('tables'),
      m_FortitudeSave: ref('tables'),
      m_ReflexSave: ref('tables'),
      m_WillSave: ref('tables'),
      m_Progression: ref('progressions'),
      m_Spellbook: refOrNull('spellbooks'),
      ClassSkills: list(statType),
      m_Archetypes: list(ref('archetypes')),
    },
    cite: [
      'Blueprints/Classes/BlueprintCharacterClass.cs MeetsPrerequisites (PrestigeClass, IsMythic)',
      'UnitLogic/Class/LevelUp/Actions/AddArchetype.cs Check (m_Archetypes)',
      'Blueprints/Classes/BlueprintCharacterClass.cs GetHitDie (HitDie)',
      'Blueprints/Classes/BlueprintCharacterClass.cs IsHigherMythic (m_IsHigherMythic)',
      'UnitLogic/Class/LevelUp/Actions/ApplyClassMechanics.cs ApplyBaseStats (m_BaseAttackBonus, m_FortitudeSave, m_ReflexSave, m_WillSave)',
      'UnitLogic/Class/LevelUp/Actions/ApplyClassMechanics.cs ApplyClassSkills (ClassSkills)',
      'UnitLogic/Class/LevelUp/Actions/ApplyClassMechanics.cs Apply (m_Progression)',
      'UnitLogic/Class/LevelUp/Actions/ApplySpellbook.cs Apply (m_Spellbook)',
      'UnitLogic/ClassData.cs CalcSkillPoints (SkillPoints)',
      'UnitLogic/Spellbook.cs GetMythicLevelForCasterLevel (DontAddCasterLevels)',
    ],
  }),
  blueprint<BlueprintArchetype>({
    type: 'BlueprintArchetype',
    name: 'LocalizedName',
    fields: {
      AddFeatures: levelEntries,
      RemoveFeatures: levelEntries,
      m_ReplaceSpellbook: refOrNull('spellbooks'),
      RemoveSpellbook: bool,
      m_BaseAttackBonus: refOrNull('tables'),
      m_FortitudeSave: refOrNull('tables'),
      m_ReflexSave: refOrNull('tables'),
      m_WillSave: refOrNull('tables'),
      ReplaceClassSkills: bool,
      ClassSkills: list(statType),
      AddSkillPoints: int,
    },
    cite: [
      'UnitLogic/ProgressionData.cs CalculateLevelEntries (AddFeatures)',
      'Blueprints/Classes/BlueprintArchetype.cs GetAddEntry (AddFeatures)',
      'Blueprints/Classes/BlueprintArchetype.cs GetRemoveEntry (RemoveFeatures)',
      'UnitLogic/ProgressionData.cs CanAddArchetype (m_ReplaceSpellbook, RemoveSpellbook, RemoveFeatures)',
      'UnitLogic/ClassData.cs AddArchetype (m_ReplaceSpellbook, RemoveSpellbook)',
      'UnitLogic/ClassData.cs BaseAttackBonus (m_BaseAttackBonus)',
      'UnitLogic/ClassData.cs FortitudeSave (m_FortitudeSave)',
      'UnitLogic/ClassData.cs ReflexSave (m_ReflexSave)',
      'UnitLogic/ClassData.cs WillSave (m_WillSave)',
      'UnitLogic/Class/LevelUp/Actions/ApplyClassMechanics.cs ApplyClassSkills (ReplaceClassSkills, ClassSkills)',
      'UnitLogic/ClassData.cs CalcSkillPoints (AddSkillPoints)',
    ],
  }),
  blueprint<BlueprintRoot>({
    type: 'BlueprintRoot',
    name: null,
    fields: {
      Progression: struct({
        m_FeatsProgression: ref('progressions'),
        m_BasicFeatSelection: ref('selections'),
        m_CharacterClasses: list(ref('classes')),
        m_MythicStartingClass: ref('classes'),
        m_MythicLegenFake: ref('classes'),
        m_MythicLegen: ref('classes'),
        m_CharacterMythics: list(ref('classes')),
        m_CharacterRaces: list(ref('races')),
        m_DeitySelection: ref('selections'),
      }),
      SystemMechanics: struct({
        m_BasicFeatSelection: ref('selections'),
        m_MythicFeatSelection: ref('selections'),
        m_MythicAbilitySelection: ref('selections'),
      }),
      m_BlueprintMythicsSettingsReference: ref('settings'),
      m_DefaultPlayerCharacter: ref('units'),
    },
    cite: [
      'UnitLogic/UnitProgressionData.cs UnitProgressionData (Progression, m_FeatsProgression)',
      'Blueprints/Root/ProgressionRoot.cs AvailableCharacterClasses (m_CharacterClasses)',
      'Blueprints/Root/ProgressionRoot.cs AvailableCharacterMythics (m_CharacterMythics)',
      'UI/MVVM/_VM/CharGen/Phases/Race/CharGenRacePhaseVM.cs CharGenRacePhaseVM (m_CharacterRaces)',
      'UnitLogic/UnitProgressionData.cs AddClassLevel (m_MythicStartingClass)',
      'UnitLogic/Class/LevelUp/LevelUpController.cs Commit (m_MythicLegenFake)',
      'UnitLogic/Class/LevelUp/LevelUpController.cs GetEffectiveLevel (m_MythicLegen)',
      'UnitLogic/Class/LevelUp/FeatureSelectionState.cs HasLevelupPlan (m_DeitySelection)',
      'Blueprints/Classes/AddClassLevels.cs PerformSelections (m_BasicFeatSelection)',
      'Blueprints/Classes/Selection/BlueprintFeatureSelection.cs IsIgnorePrerequisites (SystemMechanics)',
      'Blueprints/Root/BlueprintRoot.cs MythicsSettings (m_BlueprintMythicsSettingsReference)',
      'Blueprints/Root/BlueprintRoot.cs DefaultPlayerCharacter (m_DefaultPlayerCharacter)',
    ],
    notKept: {
      'Progression.m_XPTable':
        "GetEffectiveLevel reads a unit's level off its experience; a Build places its levels itself (ADR 0003)",
      'Progression.m_LegendXPTable':
        "GetEffectiveLevel reads a Legend's level off its experience; a Build places its levels itself (ADR 0003)",
      CharGen: "CharGenRacePhaseVM reads only UIStrings.CharGen, the screen's text, not BlueprintRoot.CharGen",
      name: "PerformSelections reads only a selection's asset name, for a log message",
    },
  }),
  blueprint<BlueprintUnit>({
    type: 'BlueprintUnit',
    name: null,
    fields: {},
    cite: ['UnitLogic/FactLogic/AddFacts.cs UpdateFacts'],
  }),
  blueprint<BlueprintMythicsSettings>({
    type: 'BlueprintMythicsSettings',
    name: null,
    fields: { CharcaterLevelRestrictions: list(int) },
    cite: [
      'DialogSystem/Blueprints/BlueprintMythicsSettings.cs GetCharacterLevelRestriction (CharcaterLevelRestrictions)',
    ],
  }),
  blueprint<BlueprintBuff>({
    type: 'BlueprintBuff',
    name: 'm_DisplayName',
    // Kingmaker/UnitLogic/Buffs/Blueprints/StackingType.cs, less Rank: a buff stacking by Rank raises its rank
    // (Buff.AddRank) up to its Ranks, which no kept buff needs, so a kept Rank buff fails the import.
    fields: { Stacking: enumOf('Replace', 'Prolong', 'Ignore', 'Stack', 'Poison', 'Summ') },
    cite: [
      'UnitLogic/FactLogic/AddFacts.cs UpdateFacts',
      'UnitLogic/Buffs/BuffCollection.cs PrepareFactForAttach (Stacking)',
    ],
  }),
  blueprint<BlueprintAbility>({
    type: 'BlueprintAbility',
    name: 'm_DisplayName',
    fields: {},
    cite: ['UnitLogic/Abilities/Components/AbilityApplyFact.cs Apply'],
  }),
  blueprint<BlueprintActivatableAbility>({
    type: 'BlueprintActivatableAbility',
    name: 'm_DisplayName',
    fields: {
      m_Buff: ref('buffs'),
      Group: activatableAbilityGroup,
      WeightInGroup: int,
    },
    cite: [
      'UnitLogic/ActivatableAbilities/ActivatableAbility.cs ReapplyBuff (m_Buff)',
      'UnitLogic/ActivatableAbilities/ActivatableAbility.cs TryStart (Group, WeightInGroup)',
    ],
  }),
  blueprint<BlueprintStatProgression>({
    type: 'BlueprintStatProgression',
    name: null,
    fields: { Bonuses: list(int) },
    cite: ['Blueprints/Classes/BlueprintStatProgression.cs GetBonus (Bonuses)'],
  }),
  blueprint<BlueprintSpellbook>({
    type: 'BlueprintSpellbook',
    name: 'Name',
    fields: {
      IsMythic: bool,
      m_SpellsPerDay: ref('tables'),
      Spontaneous: bool,
      CasterLevelModifier: int,
      IsArcane: bool,
    },
    cite: [
      'Blueprints/Classes/Spells/BlueprintSpellbook.cs MaxSpellLevel (m_SpellsPerDay)',
      'UnitLogic/Spellbook.cs BaseLevel (CasterLevelModifier)',
      'Blueprints/Classes/Prerequisites/PrerequisiteCasterTypeSpellLevel.cs GetCasterTypeSpellLevel (IsArcane, IsMythic, Spontaneous)',
      'Blueprints/Classes/Prerequisites/PrerequisiteCasterType.cs CheckInternal (IsArcane)',
    ],
    notKept: { m_CharacterClass: "GetCasterTypeSpellLevel reads the class data's CharacterClass, not the spellbook's" },
  }),
  blueprint<BlueprintSpellsTable>({
    type: 'BlueprintSpellsTable',
    name: null,
    fields: { Levels: list(struct({ Count: list(int) })) },
    cite: ['Blueprints/Classes/Spells/BlueprintSpellsTable.cs GetCount (Levels, Count)'],
  }),
  blueprint<BlueprintProgression>({
    type: 'BlueprintProgression',
    name: 'm_DisplayName',
    fields: {
      Groups: list(featureGroup),
      Ranks: int,
      HideInUI: bool,
      LevelEntries: levelEntries,
      m_Classes: list(struct({ m_Class: ref('classes'), AdditionalLevel: int })),
      m_Archetypes: list(struct({ m_Archetype: ref('archetypes'), AdditionalLevel: int })),
      ForAllOtherClasses: bool,
      m_AlternateProgressionClasses: list(struct({ m_Class: ref('classes'), AdditionalLevel: int })),
      AlternateProgressionType: enumOf('Div2', 'Full'),
      GiveFeaturesForPreviousLevels: bool,
      m_ExclusiveProgression: refOrNull('classes'),
      m_FeaturesRankIncrease: orNull(list(ref(...FEATURE))),
    },
    cite: [
      'UnitLogic/Feature.cs Hidden (HideInUI)',
      'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs IsDeity (Groups)',
      'Blueprints/Classes/BlueprintProgression.cs CalcLevel (m_Classes, AdditionalLevel, m_Archetypes, ForAllOtherClasses, m_AlternateProgressionClasses, AlternateProgressionType, m_FeaturesRankIncrease)',
      'UnitLogic/Class/LevelUp/Actions/LevelUpHelper.cs UpdateProgression (GiveFeaturesForPreviousLevels, m_ExclusiveProgression)',
      'UnitLogic/ProgressionData.cs CalculateLevelEntries (LevelEntries)',
      'UnitLogic/ProgressionData.cs GetLevelEntry (Level)',
      'Blueprints/Classes/LevelEntry.cs Features (m_Features)',
      'UnitLogic/Feature.cs AddRank (Ranks)',
    ],
  }),
  blueprint<BlueprintFeatureSelection>({
    type: 'BlueprintFeatureSelection',
    name: 'm_DisplayName',
    fields: {
      Groups: list(featureGroup),
      Ranks: int,
      HideInUI: bool,
      m_AllFeatures: list(ref(...FEATURE)),
      Mode: enumOf('Default', 'OnlyNew', 'OnlyRankUp'),
      Group: featureGroup,
      IgnorePrerequisites: bool,
      // Some selections' JSON omits it; the C# field has no initializer, so the game loads false.
      ExceptWhiteListed: orDefault(bool, false),
      Obligatory: bool,
    },
    cite: [
      'UnitLogic/Feature.cs Hidden (HideInUI)',
      'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs IsDeity (Groups)',
      'Blueprints/Classes/Selection/BlueprintFeatureSelection.cs CanSelect (m_AllFeatures, Mode, IgnorePrerequisites, ExceptWhiteListed)',
      'Blueprints/Classes/Selection/BlueprintFeatureSelection.cs GetGroup (Group)',
      'Blueprints/Classes/Selection/BlueprintFeatureSelection.cs IsObligatory (Obligatory)',
      'UnitLogic/Feature.cs AddRank (Ranks)',
    ],
    notKept: {
      m_Features:
        "CanSelect reads the unit's Progression.Features and IsDeity the prerequisite's Features, not this field",
    },
  }),
  blueprint<BlueprintFeature>({
    type: 'BlueprintFeature',
    name: 'm_DisplayName',
    fields: { Groups: list(featureGroup), Ranks: int, HideInUI: bool },
    cite: [
      'UnitLogic/Feature.cs Hidden (HideInUI)',
      'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs IsDeity (Groups)',
      'Blueprints/Classes/BlueprintFeature.cs MeetsPrerequisites (Ranks)',
    ],
  }),
  blueprint<BlueprintParametrizedFeature>({
    type: 'BlueprintParametrizedFeature',
    name: 'm_DisplayName',
    fields: {
      Groups: list(featureGroup),
      Ranks: int,
      HideInUI: bool,
      ParameterType: enumOf(
        'Custom',
        'SpellSpecialization',
        'WeaponCategory',
        'SpellSchool',
        'LearnSpell',
        'Skill',
        'FeatureSelection',
      ),
      WeaponSubCategory: enumOf(
        'None',
        'Ranged',
        'Melee',
        'Finessable',
        'Thrown',
        'Natural',
        'Knives',
        'Monk',
        'TwoHanded',
        'Light',
        'Simple',
        'Martial',
        'Exotic',
        'OneHandedPiercing',
        'Disabled',
        'OneHandedSlashing',
        'Metal',
      ),
      RequireProficiency: bool,
      m_Prerequisite: refOrNull('features'),
      HasNoSuchFeature: bool,
      // Some feats' JSON omits it; the C# field has no initializer, so the game loads false.
      IgnoreParameterFeaturePrerequisites: orDefault(bool, false),
      BlueprintParameterVariants: orNull(heldRefs(...FEATURE)),
    },
    cite: [
      'UnitLogic/Feature.cs Hidden (HideInUI)',
      'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs IsDeity (Groups)',
      'Blueprints/Classes/BlueprintFeature.cs MeetsPrerequisites (Ranks)',
      'Blueprints/Classes/Selection/BlueprintParametrizedFeature.cs CanSelect (ParameterType, RequireProficiency, m_Prerequisite, HasNoSuchFeature, IgnoreParameterFeaturePrerequisites)',
      'Blueprints/Classes/Selection/BlueprintParametrizedFeature.cs ExtractSelectionItems (ParameterType, BlueprintParameterVariants)',
      'Blueprints/Classes/Selection/BlueprintParametrizedFeature.cs ExtractItemsWeaponCategory (WeaponSubCategory)',
    ],
  }),
  blueprint<BlueprintFeatureReplaceSpellbook>({
    type: 'BlueprintFeatureReplaceSpellbook',
    name: 'm_DisplayName',
    fields: { Groups: list(featureGroup), Ranks: int, HideInUI: bool, m_Spellbook: ref('spellbooks') },
    cite: [
      'UnitLogic/Feature.cs Hidden (HideInUI)',
      'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs IsDeity (Groups)',
      'Blueprints/Classes/BlueprintFeature.cs MeetsPrerequisites (Ranks)',
      'UnitLogic/Class/LevelUp/Actions/SelectFeature.cs GetReplaceSpellbook (m_Spellbook)',
    ],
  }),
  blueprint<BlueprintFeatureSelectMythicSpellbook>({
    type: 'BlueprintFeatureSelectMythicSpellbook',
    name: 'm_DisplayName',
    fields: { Groups: list(featureGroup), Ranks: int, HideInUI: bool, m_AllowedSpellbooks: list(ref('spellbooks')) },
    cite: [
      'UnitLogic/Feature.cs Hidden (HideInUI)',
      'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs IsDeity (Groups)',
      'Blueprints/Classes/BlueprintFeature.cs MeetsPrerequisites (Ranks)',
      'Blueprints/Classes/BlueprintFeatureSelectMythicSpellbook.cs CanSelect (m_AllowedSpellbooks)',
    ],
  }),
  blueprint<BlueprintRace>({
    type: 'BlueprintRace',
    name: 'm_DisplayName',
    fields: {
      Groups: list(featureGroup),
      Ranks: int,
      HideInUI: bool,
      m_Features: list(ref(...FEATURE)),
      SelectableRaceStat: bool,
    },
    cite: [
      'UnitLogic/Feature.cs Hidden (HideInUI)',
      'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs IsDeity (Groups)',
      'Blueprints/Classes/BlueprintFeature.cs MeetsPrerequisites (Ranks)',
      'UnitLogic/Class/LevelUp/Actions/SelectRace.cs Apply (m_Features, SelectableRaceStat)',
    ],
    notKept: { Size: "SelectRace.Apply sets the unit's size, which no prerequisite, grant or Gear check reads" },
  }),
  component<NoSelectionIfAlreadyHasFeature>({
    type: 'NoSelectionIfAlreadyHasFeature',
    fields: { AnyFeatureFromSelection: bool, m_Features: list(ref(...FEATURE)) },
    cite: [
      'Blueprints/Classes/Selection/BlueprintFeatureSelection.cs IsSelectionProhibited (AnyFeatureFromSelection, m_Features)',
    ],
  }),
  component<AddFacts>({
    type: 'AddFacts',
    fields: {
      m_Facts: heldRefs(...FACT),
      HasDifficultyRequirements: bool,
      InvertDifficultyRequirements: bool,
      MinDifficulty: enumOf('Custom', 'Story', 'Casual', 'Normal', 'Daring', 'Core', 'Hard', 'Unfair'),
    },
    cite: [
      'UnitLogic/FactLogic/AddFacts.cs UpdateFacts (m_Facts)',
      'UnitLogic/FactLogic/AddFacts.cs IsRestrictedByDifficulty (HasDifficultyRequirements, InvertDifficultyRequirements, MinDifficulty)',
    ],
    notKept: {
      CasterLevel: 'sets the caster level the granted facts are cast at, not whether they are held',
      DoNotRestoreMissingFacts: 'decides only whether loading a save restores facts gone missing',
    },
  }),
  component<AddFeatureOnClassLevel>({
    type: 'AddFeatureOnClassLevel',
    fields: {
      // Null means the character level (ReplaceCasterLevelOfAbility.CalculateClassLevel).
      m_Class: refOrNull('classes'),
      Level: int,
      m_Feature: ref(...FEATURE),
      BeforeThisLevel: bool,
      m_AdditionalClasses: orNull(list(ref('classes'))),
      m_Archetypes: orNull(list(ref('archetypes'))),
    },
    requiresHeld: ['m_Feature'],
    cite: [
      'Designers/Mechanics/Facts/AddFeatureOnClassLevel.cs IsFeatureShouldBeApplied (m_Class, Level, BeforeThisLevel, m_AdditionalClasses, m_Archetypes)',
      'Designers/Mechanics/Facts/AddFeatureOnClassLevel.cs Apply (m_Feature)',
    ],
  }),
  component<AddFeatureIfHasFact>({
    type: 'AddFeatureIfHasFact',
    fields: { m_CheckedFact: ref(...FACT), m_Feature: ref(...FACT), Not: bool },
    requiresHeld: ['m_CheckedFact', 'm_Feature'],
    cite: ['Designers/Mechanics/Facts/AddFeatureIfHasFact.cs Apply (m_CheckedFact, m_Feature, Not)'],
  }),
  component<AddFeatureOnApply>({
    type: 'AddFeatureOnApply',
    fields: { m_Feature: ref(...FEATURE) },
    cite: ['Designers/Mechanics/Facts/AddFeatureOnApply.cs OnActivate (m_Feature)'],
  }),
  component<RemoveFeatureOnApply>({
    type: 'RemoveFeatureOnApply',
    fields: { m_Feature: ref(...FACT) },
    requiresHeld: ['m_Feature'],
    cite: ['Designers/Mechanics/Facts/RemoveFeatureOnApply.cs OnActivate (m_Feature)'],
  }),
  component<AddFeatureOnAlignment>({
    type: 'AddFeatureOnAlignment',
    fields: {
      Alignment: enumOf('None', 'Neutral', 'Good', 'Evil', 'Lawful', 'Chaotic'),
      m_Facts: heldRefs(...FACT),
    },
    // Most grant only buffs and toggles the planner doesn't hold; with none left, the component grants nothing.
    keepIf: (kept) => kept.m_Facts.length > 0,
    cite: ['Designers/Mechanics/Facts/AddFeatureOnAlignment.cs OnActivate (Alignment, m_Facts)'],
  }),
  component<AddFeatureOnSkill>({
    type: 'AddFeatureOnSkill',
    fields: { StatType: statType, MinimalStat: int, m_Facts: heldRefs(...FACT) },
    keepIf: (kept) => kept.m_Facts.length > 0,
    cite: [
      'Designers/Mechanics/Facts/AddFeatureOnSkill.cs OnActivate (StatType, MinimalStat, m_Facts)',
      'Designers/Mechanics/Facts/AddFeatureOnSkill.cs HandleUnitGainLevel (StatType, MinimalStat, m_Facts)',
    ],
  }),
  component<AddParametrizedFeatures>({
    type: 'AddParametrizedFeatures',
    fields: {
      m_Features: list(
        struct({
          m_Feature: ref('features'),
          ParamObject: refOrNull(...FEATURE),
          ParamSpellSchool: spellSchool,
          ParamWeaponCategory: weaponCategory,
          Stat: statType,
        }),
      ),
    },
    cite: [
      'UnitLogic/FactLogic/AddParametrizedFeatures.cs OnActivate (m_Features)',
      'UnitLogic/FactLogic/AddParametrizedFeatures.cs Feature (m_Feature)',
      'UnitLogic/FactLogic/AddParametrizedFeatures.cs Param (ParamObject, ParamSpellSchool, ParamWeaponCategory, Stat)',
    ],
  }),
  component<AddFeatureParametrized>({
    type: 'AddFeatureParametrized',
    fields: {},
    cite: ['Designers/Mechanics/Facts/AddFeatureParametrized.cs OnActivate'],
  }),
  component<FactSinglify>({
    type: 'FactSinglify',
    fields: { m_OldFacts: heldRefs(...FACT), m_NewFacts: heldRefs(...FACT) },
    // Most only swap abilities the planner doesn't hold; with nothing left, the component says nothing.
    keepIf: (kept) => kept.m_OldFacts.length + kept.m_NewFacts.length > 0,
    cite: ['Designers/Mechanics/Facts/FactSinglify.cs OnActivate (m_OldFacts, m_NewFacts)'],
  }),
  component<KensaiChosenWeapon>({
    type: 'KensaiChosenWeapon',
    fields: { m_Focus: ref('features') },
    cite: ['Designers/Mechanics/Facts/KensaiChosenWeapon.cs OnActivate (m_Focus)'],
  }),
  // Ticket 03's class skills, skill points and proficiencies areas.
  component<AddClassSkill>({
    type: 'AddClassSkill',
    fields: { Skill: statType },
    cite: ['UnitLogic/FactLogic/AddClassSkill.cs OnTurnOn (Skill)'],
  }),
  component<AddBackgroundClassSkill>({
    type: 'AddBackgroundClassSkill',
    fields: { Skill: statType },
    cite: ['UnitLogic/FactLogic/AddBackgroundClassSkill.cs OnTurnOn (Skill)'],
  }),
  component<AddSkillPointPerCharacterLevel>({
    type: 'AddSkillPointPerCharacterLevel',
    fields: {},
    cite: ['UnitLogic/FactLogic/AddSkillPointPerCharacterLevel.cs HandleUnitCalculateSkillPointsOnLevelup'],
  }),
  component<AddProficiencies>({
    type: 'AddProficiencies',
    fields: {
      m_RaceRestriction: refOrNull('races'),
      ArmorProficiencies: orNull(list(armorProficiencyGroup)),
      WeaponProficiencies: orNull(list(weaponCategory)),
    },
    cite: [
      'UnitLogic/FactLogic/AddProficiencies.cs OnTurnOn (m_RaceRestriction, ArmorProficiencies, WeaponProficiencies)',
    ],
  }),
  component<AddBackgroundWeaponProficiency>({
    type: 'AddBackgroundWeaponProficiency',
    fields: { Proficiency: weaponCategory },
    cite: ['UnitLogic/FactLogic/AddBackgroundWeaponProficiency.cs OnTurnOn (Proficiency)'],
  }),
  component<AddBackgroundArmorProficiency>({
    type: 'AddBackgroundArmorProficiency',
    fields: { Proficiency: armorProficiencyGroup },
    cite: ['UnitLogic/FactLogic/AddBackgroundArmorProficiency.cs OnTurnOn (Proficiency)'],
  }),
  // Ticket 03's aspects kept on (map 32): how many toggles of a group can be on at once.
  component<IncreaseActivatableAbilityGroupSize>({
    type: 'IncreaseActivatableAbilityGroupSize',
    fields: { Group: activatableAbilityGroup },
    cite: ['UnitLogic/FactLogic/IncreaseActivatableAbilityGroupSize.cs OnTurnOn (Group)'],
  }),
  // Ticket 03's spellbook area: spellbooks as prerequisite gates.
  component<AddSpellbookLevel>({
    type: 'AddSpellbookLevel',
    fields: { m_Spellbook: ref('spellbooks') },
    cite: ['Designers/Mechanics/Facts/AddSpellbookLevel.cs OnActivate (m_Spellbook)'],
  }),
  component<SkipLevelsForSpellProgression>({
    type: 'SkipLevelsForSpellProgression',
    fields: { Levels: list(int) },
    cite: ['UnitLogic/Class/LevelUp/Actions/ApplySpellbook.cs Apply (Levels)'],
  }),
  component<IsAlchemistSpellbook>({
    type: 'IsAlchemistSpellbook',
    fields: {},
    cite: ['Blueprints/Classes/Prerequisites/PrerequisiteCasterTypeSpellLevel.cs GetCasterTypeSpellLevel'],
  }),
  // Ticket 03's ability-score area: the Racial bonuses a stat prerequisite counts.
  component<AddContextStatBonus>({
    type: 'AddContextStatBonus',
    fields: {
      Descriptor: enumOf('Racial'),
      Stat: statType,
      Multiplier: int,
      Value: rankedContextValue,
      // Older components omit both; the C# fields have no initializer, so the game loads false and 0.
      HasMinimal: orDefault(bool, false),
      Minimal: orDefault(int, 0),
    },
    preFilter: (raw) => (raw.Descriptor === 'Racial' ? undefined : 'AddContextStatBonus (not Racial)'),
    cite: [
      'UnitLogic/FactLogic/AddContextStatBonus.cs OnTurnOn (Descriptor, Stat, HasMinimal, Minimal)',
      'UnitLogic/FactLogic/AddContextStatBonus.cs CalculateBaseValue (Value, Multiplier)',
      'UnitLogic/Mechanics/ContextValue.cs Calculate (ValueType, Value, ValueRank)',
      'EntitySystem/Stats/ModifiableValue.cs IsPermanent',
    ],
    notKept: {
      Restrictions: {
        reason: 'every kept component has none (no getters), which always passes',
        holds: (raw) => {
          const r = raw.Restrictions as { Property?: { Getters?: unknown[] } } | undefined | null;
          return r == null || (r.Property?.Getters ?? []).length === 0;
        },
      },
      ...otherValueTypes('Value', [
        'ValueShared',
        'Property',
        'm_CustomProperty',
        'm_AbilityParameter',
        'PropertyName',
      ]),
    },
  }),
  component<ContextRankConfig>({
    type: 'ContextRankConfig',
    fields: {
      m_Type: abilityRankType,
      m_BaseValueType: enumOf('ClassLevel', 'FeatureList'),
      m_Class: heldRefs('classes'),
      m_FeatureList: heldRefs(...FEATURE),
      m_ExceptClasses: bool,
      m_Progression: contextRankProgression,
      m_StartLevel: int,
      m_StepLevel: int,
      m_CustomProgression: list(struct({ BaseValue: int, ProgressionValue: int })),
      m_UseMin: bool,
      m_Min: int,
      m_UseMax: bool,
      m_Max: int,
    },
    preFilter: (raw) =>
      raw.m_BaseValueType === 'ClassLevel' || raw.m_BaseValueType === 'FeatureList'
        ? undefined
        : 'ContextRankConfig (a base type no Racial bonus uses)',
    cite: [
      'UnitLogic/Mechanics/Components/ContextRankConfig.cs Type (m_Type)',
      'UnitLogic/Mechanics/Components/ContextRankConfig.cs GetBaseValue (m_BaseValueType, m_Class, m_ExceptClasses, m_FeatureList)',
      'UnitLogic/Mechanics/Components/ContextRankConfig.cs ApplyProgression (m_Progression, m_StartLevel, m_StepLevel, m_CustomProgression)',
      'UnitLogic/Mechanics/Components/ContextRankConfig.cs ApplyMinMax (m_UseMin, m_Min, m_UseMax, m_Max)',
    ],
    notKept: {
      ...Object.fromEntries(
        [
          'useArmorBaseAc',
          'useArmorBonusAc',
          'useArmorFocusAc',
          'userShieldBaseAc',
          'useShieldBonusAc',
          'useShieldFocusAc',
          'm_OnlyFromItems',
          'm_OnlyForItemTypes',
          'm_ItemsTypes',
          'm_ArmorTypes',
          'm_Feature',
          'm_Stat',
          'm_SpecificModifier',
          'm_Buff',
          'm_BuffRankMultiplier',
          'Archetype',
          'm_CustomProperty',
          'm_CustomPropertyList',
          'm_DisableRankBonus',
        ].map((f) => [
          f,
          'GetBaseValue reads it only for a base type other than ClassLevel and FeatureList, which preFilter drops',
        ]),
      ),
      m_AffectedByIntensifiedMetamagic: 'ApplyMinMax reads it only for a spell cast with Intensified Spell',
    },
  }),
  component<ReplaceStatBaseAttribute>({
    type: 'ReplaceStatBaseAttribute',
    fields: {
      TargetStat: statType,
      BaseAttributeReplacement: enumOf('Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'),
      // Some components omit it; the C# field has no initializer, so the game loads false.
      ReplaceIfHigher: orDefault(bool, false),
    },
    cite: [
      'UnitLogic/FactLogic/ReplaceStatBaseAttribute.cs ReplaceStat (TargetStat, BaseAttributeReplacement, ReplaceIfHigher)',
    ],
    notKept: {
      ReplaceMod: {
        reason: 'every kept component takes the attribute as is (AsIs, the default), as the walk does',
        holds: (raw) => raw.ReplaceMod === undefined || raw.ReplaceMod === 'AsIs',
      },
    },
  }),
  component<PrerequisitePlayerHasFeature>({
    type: 'PrerequisitePlayerHasFeature',
    fields: { ...prerequisite, m_Feature: ref(...FEATURE) },
    cite: [PREREQUISITE, 'Blueprints/Classes/Prerequisites/PrerequisitePlayerHasFeature.cs CheckInternal (m_Feature)'],
  }),
  component<PrerequisiteFeaturesFromList>({
    type: 'PrerequisiteFeaturesFromList',
    fields: {
      ...prerequisite,
      m_Features: list(ref(...FEATURE)),
      // Many lists' JSON omits it; the C# field has no initializer, so the game loads false.
      m_RestrictIfNot: orDefault(bool, false),
      Amount: int,
    },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteFeaturesFromList.cs CheckInternal (m_Features, m_RestrictIfNot, Amount)',
    ],
  }),
  component<PrerequisiteClassLevel>({
    type: 'PrerequisiteClassLevel',
    fields: {
      ...prerequisite,
      m_CharacterClass: ref('classes'),
      Level: int,
      // Many components' JSON omits it; the C# field has no initializer, so the game loads false.
      Not: orDefault(bool, false),
    },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteClassLevel.cs CheckInternal (Level, Not)',
      'Blueprints/Classes/Prerequisites/PrerequisiteClassLevel.cs GetClassLevel (m_CharacterClass)',
    ],
  }),
  component<PrerequisiteNoClassLevel>({
    type: 'PrerequisiteNoClassLevel',
    fields: { ...prerequisite, m_CharacterClass: ref('classes') },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteNoClassLevel.cs CheckInternal (m_CharacterClass)',
    ],
  }),
  component<PrerequisiteArchetypeLevel>({
    type: 'PrerequisiteArchetypeLevel',
    fields: { ...prerequisite, m_CharacterClass: ref('classes'), m_Archetype: ref('archetypes'), Level: int },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteArchetypeLevel.cs CheckInternal (Level)',
      'Blueprints/Classes/Prerequisites/PrerequisiteArchetypeLevel.cs GetArchetypeLevel (m_CharacterClass, m_Archetype)',
    ],
  }),
  component<PrerequisiteNoArchetype>({
    type: 'PrerequisiteNoArchetype',
    fields: { ...prerequisite, m_CharacterClass: ref('classes'), m_Archetype: ref('archetypes') },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteNoArchetype.cs CheckInternal (m_CharacterClass, m_Archetype)',
    ],
  }),
  component<PrerequisiteStatValue>({
    type: 'PrerequisiteStatValue',
    fields: { ...prerequisite, Stat: statType, Value: int },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteStatValue.cs CheckUnit (Value)',
      'Blueprints/Classes/Prerequisites/PrerequisiteStatValue.cs GetStatValue (Stat)',
    ],
  }),
  component<PrerequisiteFullStatValue>({
    type: 'PrerequisiteFullStatValue',
    fields: { ...prerequisite, Stat: statType, Value: int },
    cite: [
      PREREQUISITE,
      'Designers/Mechanics/Prerequisites/PrerequisiteFullStatValue.cs CheckUnit (Value)',
      'Designers/Mechanics/Prerequisites/PrerequisiteFullStatValue.cs GetFullStatValue (Stat)',
    ],
  }),
  component<PrerequisiteCharacterLevel>({
    type: 'PrerequisiteCharacterLevel',
    fields: { ...prerequisite, Level: int },
    cite: [PREREQUISITE, 'Blueprints/Classes/Prerequisites/PrerequisiteCharacterLevel.cs CheckInternal (Level)'],
  }),
  component<PrerequisiteMythicLevel>({
    type: 'PrerequisiteMythicLevel',
    fields: { ...prerequisite, Level: int },
    cite: [PREREQUISITE, 'Blueprints/Classes/Prerequisites/PrerequisiteMythicLevel.cs CheckInternal (Level)'],
  }),
  component<PrerequisiteAlignment>({
    type: 'PrerequisiteAlignment',
    fields: {
      ...prerequisite,
      // Some components' JSON omits these two; neither C# field has an initializer, so the game loads false.
      IngorePrerequisiteCheck: orDefault(bool, false),
      Alignment: alignmentMask,
      ArchetypeAlignment: orDefault(bool, false),
    },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteAlignment.cs CheckInternal (IngorePrerequisiteCheck, Alignment, ArchetypeAlignment)',
    ],
  }),
  component<PrerequisiteProficiency>({
    type: 'PrerequisiteProficiency',
    fields: {
      ...prerequisite,
      ArmorProficiencies: orNull(list(armorProficiencyGroup)),
      WeaponProficiencies: orNull(list(weaponCategory)),
    },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteProficiency.cs CheckInternal (ArmorProficiencies, WeaponProficiencies)',
    ],
  }),
  component<PrerequisiteNotProficient>({
    type: 'PrerequisiteNotProficient',
    fields: {
      ...prerequisite,
      ArmorProficiencies: orNull(list(armorProficiencyGroup)),
      WeaponProficiencies: orNull(list(weaponCategory)),
    },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteNotProficient.cs CheckInternal (ArmorProficiencies, WeaponProficiencies)',
    ],
  }),
  component<PrerequisiteCasterType>({
    type: 'PrerequisiteCasterType',
    fields: { ...prerequisite, IsArcane: bool },
    cite: [PREREQUISITE, 'Blueprints/Classes/Prerequisites/PrerequisiteCasterType.cs CheckInternal (IsArcane)'],
  }),
  component<PrerequisiteCasterTypeSpellLevel>({
    type: 'PrerequisiteCasterTypeSpellLevel',
    fields: { ...prerequisite, IsArcane: bool, OnlySpontaneous: bool, RequiredSpellLevel: int },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteCasterTypeSpellLevel.cs CheckInternal (RequiredSpellLevel)',
      'Blueprints/Classes/Prerequisites/PrerequisiteCasterTypeSpellLevel.cs GetCasterTypeSpellLevel (IsArcane, OnlySpontaneous)',
    ],
  }),
  component<PrerequisiteClassSpellLevel>({
    type: 'PrerequisiteClassSpellLevel',
    fields: { ...prerequisite, m_CharacterClass: ref('classes'), RequiredSpellLevel: int },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteClassSpellLevel.cs CheckInternal (RequiredSpellLevel)',
      'Blueprints/Classes/Prerequisites/PrerequisiteClassSpellLevel.cs GetClassSpellLevel (m_CharacterClass)',
    ],
  }),
  component<PrerequisiteParametrizedFeature>({
    type: 'PrerequisiteParametrizedFeature',
    fields: {
      ...prerequisite,
      m_Feature: ref('features'),
      ParameterType: featureParameterType,
      WeaponCategory: weaponCategory,
      SpellSchool: spellSchool,
    },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteParametrizedFeature.cs CheckInternal (m_Feature)',
      'Blueprints/Classes/Prerequisites/PrerequisiteParametrizedFeature.cs CheckFeature (WeaponCategory, SpellSchool)',
      'Blueprints/Classes/Prerequisites/PrerequisiteParametrizedFeature.cs IsParameterSpellSchool (ParameterType)',
    ],
    notKept: {
      m_Spell: 'CheckFeature reads it only for a spell parameter; spell-parametrized feats are out of v1 (map 22)',
    },
  }),
  component<PrerequisiteParametrizedWeaponSubcategory>({
    type: 'PrerequisiteParametrizedWeaponSubcategory',
    fields: { ...prerequisite, m_Feature: ref('features'), SubCategory: weaponSubCategory },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteParametrizedWeaponSubcategory.cs CheckInternal (m_Feature)',
      'Blueprints/Classes/Prerequisites/PrerequisiteParametrizedWeaponSubcategory.cs CheckFeature (SubCategory)',
    ],
  }),
  component<PrerequisiteSelectionPossible>({
    type: 'PrerequisiteSelectionPossible',
    fields: { ...prerequisite, m_ThisFeature: ref('selections') },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteSelectionPossible.cs CheckInternal (m_ThisFeature)',
    ],
  }),
  component<PrerequisitePet>({
    type: 'PrerequisitePet',
    fields: { ...prerequisite, Type: petType, NoCompanion: bool },
    cite: [PREREQUISITE, 'Blueprints/Classes/Prerequisites/PrerequisitePet.cs CheckInternal (Type, NoCompanion)'],
  }),
  component<PrerequisiteIsPet>({
    type: 'PrerequisiteIsPet',
    fields: { ...prerequisite, Not: bool },
    cite: [PREREQUISITE, 'Blueprints/Classes/Prerequisites/PrerequisiteIsPet.cs CheckInternal (Not)'],
  }),
  component<PrerequisiteMainCharacter>({
    type: 'PrerequisiteMainCharacter',
    fields: { ...prerequisite, Companion: bool },
    cite: [PREREQUISITE, 'Blueprints/Classes/Prerequisites/PrerequisiteMainCharacter.cs CheckInternal (Companion)'],
  }),
  component<PrerequisiteEtude>({
    type: 'PrerequisiteEtude',
    fields: { ...prerequisite },
    cite: [PREREQUISITE, 'Blueprints/Classes/Prerequisites/PrerequisiteEtude.cs CheckInternal'],
    notKept: {
      Etude: 'story state, which a Build always meets (map 21)',
      NotPlaying: 'story state, which a Build always meets (map 21)',
    },
  }),
  component<PrerequisiteAnySpellsInSpellbook>({
    type: 'PrerequisiteAnySpellsInSpellbook',
    fields: { ...prerequisite, m_SpellSpecializationFeat: ref('features') },
    cite: [
      PREREQUISITE,
      'Blueprints/Classes/Prerequisites/PrerequisiteAnySpellsInSpellbook.cs CheckInternal (m_SpellSpecializationFeat)',
    ],
  }),
  component<PrerequisiteCondition>({
    type: 'PrerequisiteCondition',
    fields: { ...prerequisite, Condition: condition },
    cite: [PREREQUISITE, 'Blueprints/Classes/Prerequisites/PrerequisiteCondition.cs CheckInternal (Condition)'],
  }),
  component<PrerequisiteConditionForWeaponCategory>({
    type: 'PrerequisiteConditionForWeaponCategory',
    fields: { m_WeaponCategories: list(weaponCategory), m_Condition: condition },
    cite: [
      'Blueprints/Classes/Prerequisites/PrerequisiteConditionForWeaponCategory.cs CanBeSelected (m_WeaponCategories, m_Condition)',
    ],
  }),
  component<ClassLevelsForPrerequisites>({
    type: 'ClassLevelsForPrerequisites',
    fields: {
      m_FakeClass: ref('classes'),
      m_ActualClass: ref('classes'),
      m_ForSelection: refOrNull('selections'),
      Modifier: num,
      Summand: int,
    },
    cite: [
      'Blueprints/Classes/Prerequisites/PrerequisiteClassLevel.cs GetClassLevel (m_FakeClass, m_ActualClass, m_ForSelection, Modifier, Summand)',
    ],
  }),
  component<ReplaceStatForPrerequisites>({
    type: 'ReplaceStatForPrerequisites',
    fields: {
      OldStat: statType,
      Policy: enumOf('NewStat', 'ClassLevel', 'ClassLevelStacking', 'SpecificNumber', 'Summand', 'MagusBaseAttack'),
      NewStat: statType,
      m_CharacterClass: refOrNull('classes'),
      SpecificNumber: int,
    },
    cite: [
      'Blueprints/Classes/Prerequisites/PrerequisiteStatValue.cs GetStatValue (OldStat)',
      'Designers/Mechanics/Facts/ReplaceStatForPrerequisites.cs ResultStat (Policy, NewStat, m_CharacterClass, SpecificNumber)',
    ],
  }),
  component<AddPet>({
    type: 'AddPet',
    fields: { Type: petType },
    cite: ['Blueprints/Classes/Prerequisites/PrerequisitePet.cs CheckInternal (Type)'],
  }),
  component<AddFactContextActions>({
    type: 'AddFactContextActions',
    fields: { Activated: grantActions },
    keepIf: (c) => c.Activated.Actions.length > 0,
    cite: ['UnitLogic/Mechanics/Components/AddFactContextActions.cs OnActivate (Activated)'],
  }),
  component<ActivateTrigger>({
    type: 'ActivateTrigger',
    fields: { Actions: grantActions, Conditions: conditionsChecker },
    preFilter: (raw) => {
      const unmodelled = unmodelledCondition(raw.Conditions);
      return unmodelled === undefined ? undefined : `ActivateTrigger on ${unmodelled} (grant not modelled)`;
    },
    keepIf: (c) => c.Actions.Actions.length > 0,
    cite: ['Designers/EventConditionActionSystem/Events/ActivateTrigger.cs Trigger (Conditions, Actions)'],
    notKept: {
      m_Once: {
        reason: 'it stops the actions from running again, and every kept trigger may run again',
        holds: (raw) => raw.m_Once !== true,
      },
    },
  }),
  component<BuffExtraEffects>({
    type: 'BuffExtraEffects',
    fields: {
      m_CheckedBuff: refOrNull('buffs'),
      m_ExtraEffectBuff: ref('buffs'),
      // PrimalistRagePowersFeature's component omits it; the C# field has no initializer, so the game loads none.
      m_ExceptionFact: orDefault(refOrNull(...FACT), null),
    },
    requiresHeld: ['m_ExtraEffectBuff'],
    cite: [
      'Designers/Mechanics/Facts/BuffExtraEffects.cs CheckAndReapply (m_ExtraEffectBuff, m_ExceptionFact)',
      'Designers/Mechanics/Facts/BuffExtraEffects.cs CheckHadPrerequiredBuff (m_CheckedBuff)',
    ],
    notKept: {
      // Map 32 (amended) keeps it like m_CheckedBuff, but every component that sets it is dropped: its extra buff
      // grants nothing a Build holds (requiresHeld), as for ShapeshiftersHelmEnchantment and the cantrip features.
      // `holds` fails the import if a kept component ever sets it, so it is allowlisted then.
      m_CheckedBuffList: {
        reason: 'no kept BuffExtraEffects sets it: each that does has an extra buff that grants nothing a Build holds',
        holds: (raw) => !Array.isArray(raw.m_CheckedBuffList) || raw.m_CheckedBuffList.length === 0,
      },
    },
  }),
  component<AbilityApplyFact>({
    type: 'AbilityApplyFact',
    fields: { m_Restriction: enumOf('CasterHasNoFact', 'CasterHasFact'), m_Facts: heldRefs(...FACT) },
    keepIf: (c) => c.m_Facts.length > 0,
    cite: [
      'UnitLogic/Abilities/Components/AbilityApplyFact.cs IsAbilityRestrictionPassed (m_Restriction)',
      'UnitLogic/Abilities/AbilityData.cs GetConversions (m_Facts)',
    ],
  }),
  component<MonkNoArmorFeatureUnlock>({
    type: 'MonkNoArmorFeatureUnlock',
    fields: { m_NewFact: ref(...FACT) },
    requiresHeld: ['m_NewFact'],
    cite: ['Designers/Mechanics/Buffs/MonkNoArmorFeatureUnlock.cs NewFact (m_NewFact)'],
  }),
  component<MonkNoArmorAndMonkWeaponFeatureUnlock>({
    type: 'MonkNoArmorAndMonkWeaponFeatureUnlock',
    fields: {
      m_NewFact: ref(...FACT),
      IsZenArcher: orDefault(bool, false),
      // Only the Zen Archer's components set it; the C# field has no initializer, so the game loads none.
      m_BowWeaponTypes: orDefault(list(ref('itemtypes')), []),
      IsSohei: orDefault(bool, false),
    },
    requiresHeld: ['m_NewFact'],
    cite: [
      'Designers/Mechanics/Buffs/MonkNoArmorAndMonkWeaponFeatureUnlock.cs NewFact (m_NewFact)',
      'Designers/Mechanics/Buffs/MonkNoArmorAndMonkWeaponFeatureUnlock.cs CheckEligibility (IsZenArcher, IsSohei, m_BowWeaponTypes)',
    ],
  }),
  component<HasArmorFeatureUnlock>({
    type: 'HasArmorFeatureUnlock',
    fields: {
      m_NewFact: ref(...FACT),
      // Some components' JSON omits these four; none has an initializer, so the game loads false and 0 (no flag).
      FilterByBlueprintArmorTypes: orDefault(bool, false),
      // Some components' JSON omits it too; the game loads no types. A null entry matches no armour.
      m_BlueprintArmorTypes: orDefault(list(refOrNull('itemtypes')), []),
      FilterByArmorProficiencyGroup: orDefault(bool, false),
      m_ArmorProficiencyGroupEntries: orDefault<string | number>(
        flagsOf(
          'None',
          'Light',
          'Medium',
          'Heavy',
          'Buckler',
          'LightShield',
          'HeavyShield',
          'TowerShield',
          'LightBarding',
          'MediumBarding',
          'HeavyBarding',
        ),
        0,
      ),
      m_DisableWhenHasShield: orDefault(bool, false),
    },
    requiresHeld: ['m_NewFact'],
    cite: [
      'Designers/Mechanics/Buffs/HasArmorFeatureUnlock.cs AddFact (m_NewFact)',
      'Designers/Mechanics/Buffs/HasArmorFeatureUnlock.cs CheckEligibility (FilterByBlueprintArmorTypes, m_BlueprintArmorTypes, FilterByArmorProficiencyGroup, m_ArmorProficiencyGroupEntries, m_DisableWhenHasShield)',
    ],
  }),
  ...itemEntries,
  component<AddMechanicsFeature>({
    type: 'AddMechanicsFeature',
    fields: {
      m_Feature: enumOf(
        'Invalid',
        'Infusion',
        'LingeringPerformance',
        'Manyshot',
        'ShieldBash',
        'RangedLegerdemain',
        'WandMastery',
        'JudgmentSwitch',
        'EldritchWandMastery',
        'SoloTactics',
        'CannotBeFlanked',
        'Pounce',
        'NaturalSpell',
        'DoubleSlice',
        'ImmunityToArmorSpeedPenalty',
        'KnifeMaster',
        'FrighteningThug',
        'Ferocity',
        'HalfOrcFerocity',
        'QuickenPerformance1',
        'QuickenPerformance2',
        'ImprovedUnarmedStrike',
        'IterativeNaturalAttacks',
        'InfusedCurative',
        'ScrollMastery',
        'CompletelyImpatient',
        'Endurance',
        'HandOfMagusDan',
        'SingingSteel',
        'MakeKnowledgeCheckUntrained',
        'ImmunityToMediumArmorSpeedPenalty',
        'DuelistNoRetreat',
        'SwordlordWeaponProwess',
        'DuelingMastery',
        'DuelistRiposte',
        'PrimalMagicEssence',
        'ShatterDefenses',
        'WeaponFinesse',
        'EffortlessDualWielding',
        'ExtendPotion',
        'GetUpWithoutAttackOfOpportunity',
        'HellknightFearsomeness',
        'Flying',
        'IsUntargetable',
        'Immortality',
        'AllowDyingCondition',
        'HasRend',
        'ResurrectOnRest',
        'IsIgnoredByCombat',
        'SpellCastingForbidden',
        'ExAndSuAbilitiesForbidden',
        'MagicItemsForbidden',
        'RotationForbidden',
        'Hidden',
        'PointBlankRange',
        'SnapShot',
        'ImprovedSnapShot',
        'GreaterSnapShot',
        'Blinking',
        'InevitableAttacks',
        'AlwaysChance',
        'ThrowElixir',
        'TricksterAthleticsSavingThrows',
        'TricksterAthleticsD20',
        'TricksterMobilityFastMovement',
        'TricksterMobilityAttackOfOpportunity',
        'TricksterUseMagicDeviceCasterLevelBoost',
        'TricksterUseMagicDeviceUnlimitedWands',
        'MythicHardToKill',
        'TricksterPersuasionParalyze',
        'MythicAbilitiesAsMoveAction',
        'MythicFullAttackAfterMoveAction',
        'MythicFullLevelToCR',
        'MythicReduceResistances',
        'PowerfulChange',
        'ImprovedPowerfulChange',
        'ShareTransmutation',
        'ImprovedShareTransmutation',
        'FavoriteMetamagicEmpower',
        'FavoriteMetamagicMaximize',
        'FavoriteMetamagicQuicken',
        'FavoriteMetamagicReach',
        'FavoriteMetamagicExtend',
        'MasterShapeshifter',
        'CombatHealer',
        'FervorQuickenedSpell',
        'FastPotion',
        'FlawlessAttacks',
        'DisableAutoSpottingInStealthByAllies',
        'MythicDemonNaturalAttacksNoSecondary',
        'AzataFavorableMagic',
        'EnableSneakAttackForBombs',
        'ReduceSecondaryNaturalAttackPenalty',
        'PolymorphSpellcasting',
        'LegendaryHero',
        'FavoriteMetamagicSelective',
        'TricksterIgnoreFeatPrerequisites',
        'TricksterSelfCoupDeGrace',
        'SuppressedManyshot',
        'SharePersonalSpellsWithPets',
        'FavoriteMetamagicBolstered',
        'EnableSpellLevel10',
        'DisengageWithoutAttackOfOpportunity',
        'ActualFactsInspectionAllowed',
        'ForbidOwnAreaEffects',
        'ImmunityToEncumbranceSpeedPenalty',
        'FavoriteMetamagicPersistent',
        'FavoriteMetamagicPiercing',
        'FavoriteMetamagicIntensified',
        'FakeEnhancement',
        'AdvancedFakeEnhancement',
        'FighterOnHandedGrip',
        'FoolMagicFeature',
        'DomainsByIntelligence',
      ),
    },
    cite: ['UnitLogic/FactLogic/AddMechanicsFeature.cs OnTurnOn (m_Feature)'],
  }),
  component<AddStatBonus>({
    type: 'AddStatBonus',
    fields: { Descriptor: modifierDescriptor, Stat: statType, Value: int, ScaleByBasicAttackBonus: bool },
    cite: ['UnitLogic/FactLogic/AddStatBonus.cs OnTurnOn (Descriptor, Stat, Value, ScaleByBasicAttackBonus)'],
  }),
  component<AddStatBonusIfHasFact>({
    type: 'AddStatBonusIfHasFact',
    fields: {
      Descriptor: modifierDescriptor,
      Stat: statType,
      Value: rankedContextValue,
      InvertCondition: bool,
      RequireAllFacts: bool,
      m_CheckedFacts: list(ref(...FACT)),
    },
    cite: [
      'Designers/Mechanics/Buffs/AddStatBonusIfHasFact.cs ShouldApplyBonus (InvertCondition, RequireAllFacts, m_CheckedFacts)',
      'Designers/Mechanics/Buffs/AddStatBonusIfHasFact.cs Update (Descriptor, Stat, Value)',
      'UnitLogic/Mechanics/ContextValue.cs Calculate (ValueType, Value, ValueRank)',
    ],
    notKept: otherValueTypes('Value', [
      'ValueShared',
      'Property',
      'm_CustomProperty',
      'm_AbilityParameter',
      'PropertyName',
    ]),
  }),
  component<PrerequisiteFeature>({
    type: 'PrerequisiteFeature',
    fields: { ...prerequisite, m_Feature: ref(...FEATURE) },
    cite: ['Blueprints/Classes/Prerequisites/PrerequisiteFeature.cs CheckInternal (m_Feature)', PREREQUISITE],
  }),
  component<PrerequisiteNoFeature>({
    type: 'PrerequisiteNoFeature',
    fields: { ...prerequisite, m_Feature: ref(...FEATURE) },
    cite: ['Blueprints/Classes/Prerequisites/PrerequisiteNoFeature.cs CheckInternal (m_Feature)', PREREQUISITE],
  }),
];
