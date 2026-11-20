// Gear names (map ticket 29, build tickets 02f and 02g): items a Build can equip that share a display name are told
// apart, item by item, by the first rule that sets each apart:
//   1. twins collapse into one choice, offered as the lowest GUID (`CheckedData.twins`, engine/data/twins.ts);
//   2. the Mythic path or class an `EquipmentRestriction*` requires: "The Bound of Possibility (Aeon)";
//   3. the item's own facts: its slot ("ring"), then its weapon or armour type's name ("Battleaxe"; for a shield, its
//      bash weapon's, "Spiked Heavy Shield"), then its enhancement bonus ("+3"), then its type and enhancement bonus
//      together, where neither tells it apart alone ("Bardiche +3");
//   4. a `"change": "name"` override, our own words with its reason.
// One item in a group stays bare when every other label is distinct. A part worn only with another item (a shield's
// armour half or bash weapon, a double weapon's second end) isn't one a Build equips, so it joins no group.
import { enchantmentsOf, itemType, shieldArmor, shieldWeapon } from '~engine/data/items';
import type { CheckedData } from '~engine/data/load';
import { equippableItems } from '~engine/data/twins';
import {
  kindOf,
  refGuid,
  type ArmorEnhancementBonus,
  type Blueprint,
  type Guid,
  type Override,
  type Ref,
  type WeaponEnhancementBonus,
} from '~engine/data/types';
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

/** What can settle an item's name in its group. `twin` is an item that collapses into another. */
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

/** The component types Gear names read (rule 3's enhancement bonus); no area of the walk reads them. */
export const gearNameTypes = ['WeaponEnhancementBonus', 'ArmorEnhancementBonus'] as const;

export interface GearMember {
  readonly guid: Guid;
  /** What settled it, or `undefined` while it is open. */
  readonly source: GearSource | undefined;
  /** The qualifier written after the name; for a twin, the one it collapses into has it. */
  readonly qualifier: string | undefined;
  /** For a twin: the item the pickers offer in its place. */
  readonly twinOf?: Guid;
}

export interface GearGroup {
  readonly name: string;
  readonly members: readonly GearMember[];
}

export interface GearNames {
  readonly groups: readonly GearGroup[];
  /** The written name of every qualified item, a twin's included: `<name> (<qualifier>)`. */
  readonly names: ReadonlyMap<Guid, string>;
  /** Written names that items a Build can equip still share, apart from twins. */
  readonly collisions: ReadonlyMap<string, readonly Guid[]>;
  /** Item name overrides that don't apply where rules 1–3 fail, or that collide. */
  readonly problems: readonly string[];
}

/** The word for an item's slot (rule 3): its kind's word (`kindWords`). */
const slotWords: { readonly [K in Blueprint['$type']]?: string } = Object.fromEntries(
  Object.entries(kindWords).filter(([t]) => kindOf[t as Blueprint['$type']] === 'items'),
);

/** Qualifies the shared names of the items a Build can equip. Only the `name` overrides on items are read. */
export function qualifyGear(
  data: Pick<CheckedData, 'blueprints' | 'twins'>,
  overrides: readonly Override[],
): GearNames {
  const bp = (guid: Guid) => data.blueprints.get(guid)!;
  // Only qualify.ts reports a target named by more than one (`repeated`).
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

/** Rule 1: each twin collapses into the item the pickers offer in its place. */
function twinStep(group: Group<GearSource>, twins: ReadonlyMap<Guid, Guid>): void {
  for (const g of group.left) {
    const offered = twins.get(g);
    if (offered !== undefined) settle(group, g, { source: 'twin', qualifier: undefined, twinOf: offered });
  }
}

/**
 * A qualifier the name already says ("Heavy Shield +1 (Heavy Shield)") tells nothing: that item stays bare instead,
 * when it is the only one and none is bare yet.
 */
function repeatStaysBare(group: Group<GearSource>): void {
  const repeats = [...group.settled].filter(([, s]) => s.qualifier !== undefined && group.name.includes(s.qualifier));
  if (repeats.length === 1 && !hasBare(group))
    group.settled.set(repeats[0]![0], { source: 'bare', qualifier: undefined });
}

/** The facts rules 2 and 3 read off an item. */
function itemFacts(data: Pick<CheckedData, 'blueprints'>) {
  const name = (ref: unknown) => {
    const guid = refGuid(ref);
    return guid === undefined ? undefined : shownName(data, guid);
  };
  /** Rule 2: the classes or Mythic paths an item's restrictions require, by their shown names. */
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
  /**
   * An item's weapon or armour type's name (items.ts `itemType`); a shield's is its bash weapon's, else its armour
   * half's.
   */
  const typeName = (item: Blueprint): string | undefined => {
    if (item.$type === 'BlueprintItemShield') {
      const p = shieldWeapon(item, data.blueprints) ?? shieldArmor(item, data.blueprints);
      return p === undefined ? undefined : typeName(p);
    }
    const type = itemType(item, data.blueprints);
    return type === undefined ? undefined : shownName(data, type.guid);
  };
  /** The components of an item's enchantments, as the game collects them (items.ts `enchantmentsOf`). */
  const enchantmentComponents = (item: Blueprint) =>
    enchantmentsOf(item, data.blueprints).flatMap((g) => data.blueprints.get(g)?.Components ?? []);
  /**
   * An item's enhancement bonus, as Designers/GameHelper.cs reads it: a weapon's from GetWeaponEnhancementBonus (the
   * highest that doesn't stack, plus those that do, up to 5), an armour's from GetArmorEnhancementBonus (the highest),
   * and a shield's from its armour half (GetItemEnhancementBonus). None when it is 0.
   */
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
