import {
  enchantmentsOf,
  itemType,
  shieldArmor,
  shieldWeapon,
  equippableItems,
  kindOf,
  refGuid,
  type ArmorEnhancementBonus,
  type Blueprint,
  type Guid,
  type Override,
  type Ref,
  type WeaponEnhancementBonus,
} from '~engine/data';
import type { CheckedData } from '~engine/load';
import {
  candidatePass,
  collisionsOf,
  compare,
  hasBare,
  kindWords,
  nameOverridesOf,
  only,
  qualifyGroups,
  runSteps,
  settle,
  shownName,
  unusedOverrideProblems,
  type Group,
} from './name-groups';

export const gearSources = [
  'twin',
  'restriction',
  'slot',
  'type',
  'enhancement',
  'type and enhancement',
  'override',
  'bare',
] as const;

export type GearSource = (typeof gearSources)[number];

export const gearNameTypes = ['WeaponEnhancementBonus', 'ArmorEnhancementBonus'] as const;

export interface GearMember {
  readonly guid: Guid;
  readonly source: GearSource | undefined;
  readonly qualifier: string | undefined;
  readonly twinOf?: Guid;
}

export interface GearGroup {
  readonly name: string;
  readonly members: readonly GearMember[];
}

export interface GearNames {
  readonly groups: readonly GearGroup[];
  readonly names: ReadonlyMap<Guid, string>;
  readonly collisions: ReadonlyMap<string, readonly Guid[]>;
  readonly problems: readonly string[];
}

const slotWords: { readonly [K in Blueprint['$type']]?: string } = Object.fromEntries(
  Object.entries(kindWords).filter(([t]) => kindOf[t as Blueprint['$type']] === 'items'),
);

export function qualifyGear(
  data: Pick<CheckedData, 'blueprints' | 'twins'>,
  overrides: readonly Override[],
): GearNames {
  const bp = (guid: Guid) => data.blueprints.get(guid)!;
  const { byTarget: nameOverrides } = nameOverridesOf(overrides, data, true);
  const facts = itemFacts(data);
  const problems: string[] = [];
  const consumed = new Set<Guid>();
  const equippable = equippableItems(data.blueprints).map((b) => b.guid);
  const { groups, names } = qualifyGroups<GearSource>({
    guids: equippable,
    bp,
    order: compare,
    steps: (group) => {
      twinStep(group, data.twins);
      runSteps(group, [
        () => candidatePass(group, 'restriction', (g) => only(facts.restriction(bp(g)))),
        () => candidatePass(group, 'slot', (g) => only(slotWords[bp(g).$type])),
        () => candidatePass(group, 'type', (g) => only(facts.typeName(bp(g)))),
        () => candidatePass(group, 'enhancement', (g) => only(facts.enhancement(bp(g)))),
        () => candidatePass(group, 'type and enhancement', (g) => only(facts.typeAndEnhancement(bp(g)))),
      ]);
    },
    nameOverrides,
    consumed,
    problems,
    last: repeatStaysBare,
  });
  problems.push(
    ...unusedOverrideProblems(nameOverrides, consumed, groups, data, 'no other item a Build can equip shares its name'),
  );
  const offered = equippable.filter((g) => !data.twins.has(g));
  const collisions = collisionsOf(offered, (g) => names.get(g) ?? bp(g).name!);
  return { groups, names, collisions, problems };
}

function twinStep(group: Group<GearSource>, twins: ReadonlyMap<Guid, Guid>): void {
  for (const g of group.left) {
    const offered = twins.get(g);
    if (offered !== undefined) settle(group, g, { source: 'twin', qualifier: undefined, twinOf: offered });
  }
}

function repeatStaysBare(group: Group<GearSource>): void {
  const repeats = [...group.settled].filter(([, s]) => s.qualifier !== undefined && group.name.includes(s.qualifier));
  if (repeats.length === 1 && !hasBare(group))
    group.settled.set(repeats[0]![0], { source: 'bare', qualifier: undefined });
}

function itemFacts(data: Pick<CheckedData, 'blueprints'>) {
  const name = (ref: unknown) => {
    const guid = refGuid(ref);
    return guid === undefined ? undefined : shownName(data, guid);
  };
  const restriction = (item: Blueprint) => {
    const names = new Set<string>();
    for (const c of item.Components) {
      if (c.$type !== 'EquipmentRestrictionClass' && c.$type !== 'EquipmentRestrictionHasAnyClassFromList') continue;
      const r = c as unknown as { Not: boolean; m_Class?: Ref; m_Classes?: readonly Ref[] };
      if (r.Not) continue;
      for (const ref of [r.m_Class, ...(r.m_Classes ?? [])]) {
        const n = name(ref);
        if (n !== undefined) names.add(n);
      }
    }
    return names.size === 0 ? undefined : [...names].sort().join(' or ');
  };
  const typeName = (item: Blueprint): string | undefined => {
    if (item.$type === 'BlueprintItemShield') {
      const p = shieldWeapon(item, data.blueprints) ?? shieldArmor(item, data.blueprints);
      return p === undefined ? undefined : typeName(p);
    }
    const type = itemType(item, data.blueprints);
    return type === undefined ? undefined : shownName(data, type.guid);
  };
  const enchantmentComponents = (item: Blueprint) =>
    enchantmentsOf(item, data.blueprints).flatMap((g) => data.blueprints.get(g)?.Components ?? []);
  const bonus = (item: Blueprint): number => {
    if (item.$type === 'BlueprintItemShield') {
      const armor = shieldArmor(item, data.blueprints);
      return armor === undefined ? 0 : bonus(armor);
    }
    const components = enchantmentComponents(item);
    if (item.$type === 'BlueprintItemWeapon') {
      const weapon = components.filter((c): c is WeaponEnhancementBonus => c.$type === 'WeaponEnhancementBonus');
      const highest = Math.max(0, ...weapon.filter((c) => !c.Stack).map((c) => c.EnhancementBonus));
      const stacked = weapon.filter((c) => c.Stack).reduce((sum, c) => sum + c.EnhancementBonus, 0);
      return highest < 5 ? Math.min(highest + stacked, 5) : highest;
    }
    if (item.$type === 'BlueprintItemArmor') {
      const armor = components.filter((c): c is ArmorEnhancementBonus => c.$type === 'ArmorEnhancementBonus');
      return Math.max(0, ...armor.map((c) => c.EnhancementValue));
    }
    return 0;
  };
  const enhancement = (item: Blueprint) => {
    const n = bonus(item);
    return n === 0 ? undefined : `+${n}`;
  };
  const typeAndEnhancement = (item: Blueprint) => {
    const t = typeName(item);
    const e = enhancement(item);
    return t === undefined || e === undefined ? undefined : `${t} ${e}`;
  };
  return { restriction, typeName, enhancement, typeAndEnhancement };
}
