import {
  enchantmentsOf,
  guids,
  isShown,
  kindOf,
  progressionRootFields,
  refGuid,
  type ActionList,
  type Blueprint,
  type Component,
  type GrantAction,
  type GrantComponent,
  type Guid,
  type HasArmorFeatureUnlock,
  type MonkNoArmorAndMonkWeaponFeatureUnlock,
  type MonkNoArmorFeatureUnlock,
  type ParametrizedFeatureGrant,
  type Ref,
  type SpellSchool,
  type StatType,
  type WeaponCategory,
} from '../data';
import { blueprintRoot, type CheckedData } from '../load';

export const fieldGrantKinds = [
  'root',
  'classProgression',
  'classArchetype',
  'levelEntry',
  'archetypeAdd',
  'archetypeRemove',
  'selectionOption',
  'raceFeature',
  'ActivatableBuff',
  'itemEnchantment',
  'shieldPart',
] as const satisfies readonly GrantKind[];

export type FieldGrantKind = (typeof fieldGrantKinds)[number];

export type GrantKind =
  | 'root'
  | 'classProgression'
  | 'classArchetype'
  | 'levelEntry'
  | 'archetypeAdd'
  | 'archetypeRemove'
  | 'selectionOption'
  | 'raceFeature'
  | 'AddFacts'
  | 'AddFeatureOnClassLevel'
  | 'AddFeatureIfHasFact'
  | 'AddFeatureOnApply'
  | 'AddFeatureOnAlignment'
  | 'AddFeatureOnSkill'
  | 'AddParametrizedFeatures'
  | 'AddFeatureParametrized'
  | 'FactSinglify'
  | 'FactSinglifyRemove'
  | 'KensaiChosenWeapon'
  | 'ContextActionAddFeature'
  | 'AddFact'
  | 'ContextActionApplyBuff'
  | 'AbilityApplyFact'
  | 'GearUnlock'
  | 'BuffExtraEffects'
  | 'ActivatableBuff'
  | 'RemoveFeatureOnApply'
  | 'itemEnchantment'
  | 'shieldPart'
  | 'AddUnitFeatureEquipment'
  | 'AddUnitFactEquipment';

export type GrantParam =
  | { readonly WeaponCategory: WeaponCategory }
  | { readonly SpellSchool: SpellSchool }
  | { readonly StatType: StatType }
  | { readonly Blueprint: Guid };

export interface Grant {
  readonly grantor: Guid;
  readonly granted: Guid;
  readonly kind: GrantKind;
  readonly level?: number;
  readonly param?: GrantParam;
}

const REMOVAL_KINDS: ReadonlySet<GrantKind> = new Set([
  'archetypeRemove',
  'RemoveFeatureOnApply',
  'FactSinglifyRemove',
]);

export function removes(grant: Grant): boolean {
  return REMOVAL_KINDS.has(grant.kind);
}

export interface GrantIndex {
  grantorsOf(fact: Guid): readonly Grant[];
  grantsOf(entry: Guid): readonly Grant[];
  slotsOpenedBy(entry: Guid): readonly Guid[];
  climb(fact: Guid, stopAt: (grantor: Guid) => boolean, within?: ReadonlySet<Guid>): readonly Climbed[];
  namedGrantorsByKind(fact: Guid): ReadonlyMap<string, readonly Guid[]>;
}

export interface Climbed {
  readonly grantor: Guid;
  readonly depth: number;
  readonly level: number | undefined;
}

function paramOf(entry: ParametrizedFeatureGrant, feat: Blueprint | undefined): GrantParam | undefined {
  if (feat?.$type !== 'BlueprintParametrizedFeature') return undefined;
  switch (feat.ParameterType) {
    case 'WeaponCategory':
      return { WeaponCategory: entry.ParamWeaponCategory };
    case 'SpellSchool':
      return { SpellSchool: entry.ParamSpellSchool };
    case 'Skill':
      return { StatType: entry.Stat };
    default: {
      const guid = refGuid(entry.ParamObject);
      return guid === undefined ? undefined : { Blueprint: guid };
    }
  }
}

interface GrantCollector {
  readonly bp: Blueprint;
  readonly blueprints: CheckedData['blueprints'];
  add(refs: readonly (Ref | null)[] | null | undefined, kind: GrantKind, level?: number): void;
  addAt(granted: Guid, kind: GrantKind, param: GrantParam | undefined): void;
}

type Reader<T> = (value: T, out: GrantCollector) => void;
type Typed<K extends Blueprint['$type']> = Extract<Blueprint, { readonly $type: K }>;

const nothing: Reader<unknown> = () => {};

type WornItemType = Extract<Blueprint['$type'], `BlueprintItemEquipment${string}`>;

const typedItem: Reader<Typed<'BlueprintItemWeapon' | 'BlueprintItemArmor'>> = (bp, out) => {
  for (const g of enchantmentsOf(bp, out.blueprints)) out.addAt(g, 'itemEnchantment', undefined);
};

const wornItem: Reader<Typed<WornItemType>> = (bp, out) => out.add(bp.m_Enchantments, 'itemEnchantment');

const blueprintReaders: { readonly [K in Exclude<Blueprint['$type'], WornItemType>]: Reader<Typed<K>> } = {
  BlueprintRoot: (bp, out) => {
    for (const field of progressionRootFields) out.add([bp.Progression[field]].flat(), 'root');
    out.add([bp.m_DefaultPlayerCharacter], 'root');
  },
  BlueprintCharacterClass: (bp, out) => {
    out.add([bp.m_Progression], 'classProgression');
    out.add(bp.m_Archetypes, 'classArchetype');
  },
  BlueprintProgression: (bp, out) => {
    for (const e of bp.LevelEntries) out.add(e.m_Features, 'levelEntry', e.Level);
  },
  BlueprintArchetype: (bp, out) => {
    for (const e of bp.AddFeatures) out.add(e.m_Features, 'archetypeAdd', e.Level);
    for (const e of bp.RemoveFeatures) out.add(e.m_Features, 'archetypeRemove', e.Level);
  },
  BlueprintFeatureSelection: (bp, out) => out.add(bp.m_AllFeatures, 'selectionOption'),
  BlueprintRace: (bp, out) => out.add(bp.m_Features, 'raceFeature'),
  BlueprintActivatableAbility: (bp, out) => out.add([bp.m_Buff], 'ActivatableBuff'),
  BlueprintItemWeapon: typedItem,
  BlueprintItemArmor: typedItem,
  BlueprintItemShield: (bp, out) => out.add([bp.m_ArmorComponent, bp.m_WeaponComponent], 'shieldPart'),
  BlueprintFeature: nothing,
  BlueprintParametrizedFeature: nothing,
  BlueprintFeatureReplaceSpellbook: nothing,
  BlueprintFeatureSelectMythicSpellbook: nothing,
  BlueprintBuff: nothing,
  BlueprintAbility: nothing,
  BlueprintUnit: nothing,
  BlueprintEquipmentEnchantment: nothing,
  BlueprintWeaponEnchantment: nothing,
  BlueprintArmorEnchantment: nothing,
  BlueprintStatProgression: nothing,
  BlueprintSpellsTable: nothing,
  BlueprintSpellbook: nothing,
  BlueprintMythicsSettings: nothing,
  BlueprintWeaponType: nothing,
  BlueprintArmorType: nothing,
  BlueprintShieldType: nothing,
};

const gearUnlock: Reader<MonkNoArmorFeatureUnlock | MonkNoArmorAndMonkWeaponFeatureUnlock | HasArmorFeatureUnlock> = (
  c,
  out,
) => out.add([c.m_NewFact], 'GearUnlock');

const componentReaders: { readonly [K in GrantComponent['$type']]: Reader<Extract<GrantComponent, { $type: K }>> } = {
  AddFacts: (c, out) => out.add(c.m_Facts, 'AddFacts'),
  AddFeatureOnClassLevel: (c, out) =>
    out.add([c.m_Feature], 'AddFeatureOnClassLevel', c.BeforeThisLevel ? undefined : c.Level),
  AddFeatureIfHasFact: (c, out) => out.add([c.m_Feature], 'AddFeatureIfHasFact'),
  AddFeatureOnApply: (c, out) => out.add([c.m_Feature], 'AddFeatureOnApply'),
  RemoveFeatureOnApply: (c, out) => out.add([c.m_Feature], 'RemoveFeatureOnApply'),
  AddFeatureOnAlignment: (c, out) => out.add(c.m_Facts, 'AddFeatureOnAlignment'),
  AddFeatureOnSkill: (c, out) => out.add(c.m_Facts, 'AddFeatureOnSkill'),
  AddParametrizedFeatures: (c, out) => {
    for (const entry of c.m_Features) {
      const granted = refGuid(entry.m_Feature);
      if (granted !== undefined)
        out.addAt(granted, 'AddParametrizedFeatures', paramOf(entry, out.blueprints.get(granted)));
    }
  },
  AddFeatureParametrized: (_c, out) => {
    if (out.bp.$type !== 'BlueprintParametrizedFeature') return;
    for (const granted of guids(out.bp.BlueprintParameterVariants))
      out.addAt(granted, 'AddFeatureParametrized', { Blueprint: granted });
  },
  FactSinglify: (c, out) => {
    out.add(c.m_OldFacts, 'FactSinglifyRemove');
    out.add(c.m_NewFacts, 'FactSinglify');
  },
  KensaiChosenWeapon: (c, out) => out.add([c.m_Focus], 'KensaiChosenWeapon'),
  AddFactContextActions: (c, out) => actionGrants(c.Activated, out),
  ActivateTrigger: (c, out) => actionGrants(c.Actions, out),
  BuffExtraEffects: (c, out) => out.add([c.m_ExtraEffectBuff], 'BuffExtraEffects'),
  AbilityApplyFact: (c, out) => out.add(c.m_Facts, 'AbilityApplyFact'),
  MonkNoArmorFeatureUnlock: gearUnlock,
  MonkNoArmorAndMonkWeaponFeatureUnlock: gearUnlock,
  HasArmorFeatureUnlock: gearUnlock,
  AddUnitFeatureEquipment: (c, out) => out.add([c.m_Feature], 'AddUnitFeatureEquipment'),
  AddUnitFactEquipment: (c, out) => out.add([c.m_Blueprint], 'AddUnitFactEquipment'),
};

export const grantTypes: ReadonlySet<GrantComponent['$type']> = new Set(
  Object.keys(componentReaders) as GrantComponent['$type'][],
);

export function isGrant(component: Component): component is GrantComponent {
  return grantTypes.has(component.$type as GrantComponent['$type']);
}

function grantsFrom(bp: Blueprint, blueprints: CheckedData['blueprints']): Grant[] {
  const grants: Grant[] = [];
  const out: GrantCollector = {
    bp,
    blueprints,
    add(refs, kind, level) {
      for (const granted of guids(refs))
        grants.push({ grantor: bp.guid, granted, kind, ...(level === undefined ? {} : { level }) });
    },
    addAt(granted, kind, param) {
      grants.push({ grantor: bp.guid, granted, kind, ...(param && { param }) });
    },
  };
  if (kindOf[bp.$type] === 'items' && !Object.hasOwn(blueprintReaders, bp.$type))
    wornItem(bp as Typed<WornItemType>, out);
  else (blueprintReaders[bp.$type as keyof typeof blueprintReaders] as Reader<Blueprint>)(bp, out);
  for (const c of bp.Components) if (isGrant(c)) (componentReaders[c.$type] as Reader<GrantComponent>)(c, out);
  return grants;
}

const GRANT_ACTION_FIELDS = {
  ContextActionAddFeature: 'm_PermanentFeature',
  AddFact: 'm_Fact',
  ContextActionApplyBuff: 'm_Buff',
} as const satisfies { readonly [K in Exclude<GrantAction['$type'], 'Conditional'>]: string };

export interface ActionGrant {
  readonly granted: Guid;
  readonly rankFrom?: Guid;
}

export function actionGrant(type: string, action: object): ActionGrant | undefined {
  if (!Object.hasOwn(GRANT_ACTION_FIELDS, type)) return undefined;
  const fields = action as Readonly<Record<string, unknown>>;
  if (type === 'ContextActionApplyBuff' && fields.Permanent !== true) return undefined;
  const granted = refGuid(fields[GRANT_ACTION_FIELDS[type as keyof typeof GRANT_ACTION_FIELDS]]);
  if (granted === undefined) return undefined;
  const rankFrom = type === 'ContextActionAddFeature' ? refGuid(fields.m_SetRankFrom) : undefined;
  return { granted, ...(rankFrom !== undefined && { rankFrom }) };
}

function actionGrants(list: ActionList, out: GrantCollector): void {
  for (const a of list.Actions) {
    if (a.$type === 'Conditional') {
      actionGrants(a.IfTrue, out);
      actionGrants(a.IfFalse, out);
      continue;
    }
    const grant = actionGrant(a.$type, a);
    if (grant !== undefined) out.addAt(grant.granted, a.$type, undefined);
  }
}

export function reachableFromRoot(data: Pick<CheckedData, 'blueprints'>, G: GrantIndex): Set<Guid> {
  const root = blueprintRoot(data);
  return reach(G, root === undefined ? [] : [root.guid]);
}

export function reachableFromGear(data: Pick<CheckedData, 'blueprints'>, G: GrantIndex): Set<Guid> {
  return reach(
    G,
    [...data.blueprints.values()].filter((b) => kindOf[b.$type] === 'items').map((b) => b.guid),
  );
}

function reach(G: GrantIndex, start: readonly Guid[]): Set<Guid> {
  const seen = new Set<Guid>(start);
  const queue = [...seen];
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    for (const g of G.grantsOf(next)) {
      if (REMOVAL_KINDS.has(g.kind) || seen.has(g.granted)) continue;
      seen.add(g.granted);
      queue.push(g.granted);
    }
  }
  return seen;
}

export function grantorKind(bp: Blueprint | undefined): string {
  const groups = (bp as { Groups?: readonly string[] } | undefined)?.Groups;
  return groups?.find((g) => g !== 'None') ?? bp?.$type ?? 'unknown';
}

const SELECTION_TYPES: ReadonlySet<string> = new Set([
  'BlueprintFeatureSelection',
  'BlueprintFeatureSelectMythicSpellbook',
]);

export function buildGrantIndex(data: Pick<CheckedData, 'blueprints'>): GrantIndex {
  const byGrantor = new Map<Guid, Grant[]>();
  const byGranted = new Map<Guid, Grant[]>();
  for (const bp of data.blueprints.values()) {
    const grants = grantsFrom(bp, data.blueprints);
    if (grants.length === 0) continue;
    byGrantor.set(bp.guid, grants);
    for (const g of grants) {
      if (REMOVAL_KINDS.has(g.kind)) continue;
      let list = byGranted.get(g.granted);
      if (list === undefined) byGranted.set(g.granted, (list = []));
      list.push(g);
    }
  }

  const isSelection = (guid: Guid) => SELECTION_TYPES.has(data.blueprints.get(guid)?.$type ?? '');
  const shown = (guid: Guid) => {
    const bp = data.blueprints.get(guid);
    return bp !== undefined && isShown(bp);
  };

  let fromRoot: Set<Guid> | undefined;
  const index: GrantIndex = {
    grantorsOf: (fact) => byGranted.get(fact) ?? [],
    grantsOf: (entry) => byGrantor.get(entry) ?? [],
    slotsOpenedBy(entry) {
      const grants = byGrantor.get(entry) ?? [];
      return [
        ...new Set(grants.filter((g) => !REMOVAL_KINDS.has(g.kind) && isSelection(g.granted)).map((g) => g.granted)),
      ];
    },
    climb(fact, stopAt, within) {
      const reachable = within ?? (fromRoot ??= reachableFromRoot(data, index));
      const found: Climbed[] = [];
      const seen = new Set<Guid>([fact]);
      let frontier: { guid: Guid; level: number | undefined }[] = [{ guid: fact, level: undefined }];
      for (let depth = 1; frontier.length > 0; depth++) {
        const next: typeof frontier = [];
        for (const { guid, level } of frontier) {
          for (const g of byGranted.get(guid) ?? []) {
            if (seen.has(g.grantor) || !reachable.has(g.grantor)) continue;
            seen.add(g.grantor);
            const at = level ?? g.level;
            found.push({ grantor: g.grantor, depth, level: at });
            if (!stopAt(g.grantor)) next.push({ guid: g.grantor, level: at });
          }
        }
        frontier = next;
      }
      return found;
    },
    namedGrantorsByKind(fact) {
      const groups = new Map<string, Guid[]>();
      for (const { grantor } of index.climb(fact, shown)) {
        if (!shown(grantor)) continue;
        const kind = grantorKind(data.blueprints.get(grantor));
        let list = groups.get(kind);
        if (list === undefined) groups.set(kind, (list = []));
        list.push(grantor);
      }
      return groups;
    },
  };
  return index;
}
