import { kindOf, references, refGuid, type Guid } from '~engine/data';
import type { DumpIndex } from './import';

export const RESEARCH_COUNT = 3397;
const TOLERANCE = 34;

export const EQUIPMENT_TYPES: ReadonlySet<string> = new Set(
  Object.entries(kindOf)
    .filter(([, kind]) => kind === 'items')
    .map(([type]) => type),
);

const HIDDEN_ITEM = 'BlueprintHiddenItem';

export type ItemSource =
  | 'chest'
  | 'vendor'
  | 'unit loot'
  | 'scripted'
  | 'crusade'
  | 'random-encounter trash'
  | 'start kit'
  | 'companion gear'
  | 'Midnight Isles'
  | 'form or part';

const LOOT_TABLES: ReadonlySet<string> = new Set([
  'BlueprintSharedVendorTable',
  'BlueprintUnitLoot',
  'BlueprintDungeonLoot',
  'BlueprintDungeonIslandRewardLoot',
  'TrashLootSettings',
]);

const SCRIPT_HOLDERS: ReadonlySet<string> = new Set([
  'BlueprintCue',
  'BlueprintAnswer',
  'BlueprintEtude',
  'BlueprintDialog',
  'ActionsHolder',
  'CommandAction',
  'BlueprintFeature',
]);

const COMPANION_GEAR =
  /^m_(PrimaryHand|SecondaryHand|PrimaryHandAlternative\d|SecondaryHandAlternative\d|Armor|Shirt|Belt|Head|Glasses|Feet|Gloves|Neck|Ring1|Ring2|Wrist|Shoulders|EmptyHandWeapon|StartingInventory)$/;

export interface ItemSourcing {
  readonly want: ReadonlySet<Guid>;
  source(json: ReadonlyMap<Guid, Record<string, unknown>>): Map<Guid, Set<ItemSource>>;
}

export function itemSourcing(index: DumpIndex): ItemSourcing {
  const typeOf = (g: Guid) => index.types.get(g) ?? '';
  const isItem = (g: Guid) => EQUIPMENT_TYPES.has(typeOf(g)) || typeOf(g) === HIDDEN_ITEM;
  const referenced = new Set<Guid>();
  const unitsWithItems = new Set<Guid>();
  for (const [from, targets] of index.refs) {
    for (const t of targets) if (t !== from) referenced.add(t);
    if (typeOf(from) === 'BlueprintUnit' && targets.some(isItem)) unitsWithItems.add(from);
  }
  const want = new Set<Guid>();
  for (const [from, targets] of index.refs) {
    const type = typeOf(from);
    if (isItem(from) || type === 'BlueprintWeaponType') want.add(from);
    else if (targets.some((t) => isItem(t) || LOOT_TABLES.has(typeOf(t)) || unitsWithItems.has(t))) want.add(from);
  }

  return {
    want,
    source(json) {
      const walked = new Map<Guid, readonly { enclosing: string; field: string; to: Guid }[]>();
      for (const g of want) {
        if (!json.has(g)) continue;
        const found = [...references(json.get(g), '', '', typeOf(g))];
        walked.set(
          g,
          found.map((r) => ({ enclosing: r.enclosing ?? typeOf(g), field: r.field, to: r.guid })),
        );
      }
      const refsOf = (g: Guid) => walked.get(g) ?? [];
      const recruitedCompanions = new Set<Guid>();
      const liveDungeon = new Set<Guid>();
      for (const g of walked.keys()) {
        for (const { enclosing, field, to } of refsOf(g)) {
          if (/^(Recruit|RecruitInactive)$/.test(enclosing) && field === 'm_CompanionBlueprint')
            recruitedCompanions.add(to);
          if (enclosing === 'ExchangeRecruits' && field === 'm_NewUnit') recruitedCompanions.add(to);
          if (typeOf(g) === 'BlueprintDungeonRoot' && field === 'm_Loot') liveDungeon.add(to);
          if (enclosing === 'DungeonAddLootToVendor') liveDungeon.add(to);
          if (typeOf(g) === 'BlueprintDungeonExpedition' && typeOf(to) === 'BlueprintDungeonIslandRewardLoot')
            liveDungeon.add(to);
        }
      }

      const sources = new Map<Guid, Set<ItemSource>>();
      const give = (item: Guid, source: ItemSource) => {
        let set = sources.get(item);
        if (set === undefined) sources.set(item, (set = new Set()));
        set.add(source);
      };
      for (const g of walked.keys()) {
        const type = typeOf(g);
        for (const { enclosing, field, to } of refsOf(g)) {
          if (!isItem(to)) continue;
          const source = sourceOf(type, enclosing, field, {
            live: referenced.has(g),
            companion: recruitedCompanions.has(g),
            liveDungeon: liveDungeon.has(g),
          });
          if (source !== undefined) give(to, source);
        }
      }

      const queue = [...sources.keys()];
      for (let g = queue.pop(); g !== undefined; g = queue.pop()) {
        for (const { enclosing, field, to } of refsOf(g)) {
          const part =
            (enclosing === 'ItemPolymorph' && field === 'm_PolymorphItems') ||
            field === 'm_SecondWeapon' ||
            field === 'm_WeaponComponent' ||
            field === 'm_ArmorComponent';
          if (!part || !isItem(to)) continue;
          if (!sources.has(to)) queue.push(to);
          give(to, 'form or part');
        }
      }

      for (const g of sources.keys()) if (!EQUIPMENT_TYPES.has(typeOf(g))) sources.delete(g);
      return sources;
    },
  };
}

function sourceOf(
  type: string,
  enclosing: string,
  field: string,
  is: { readonly live: boolean; readonly companion: boolean; readonly liveDungeon: boolean },
): ItemSource | undefined {
  if (type === 'BlueprintLoot' && field === 'm_Item') return 'chest';
  if (type === 'BlueprintSharedVendorTable' && field === 'm_Item' && is.live) {
    if (/^(LootItemsPackFixed|LootItemsPackFixedAndNotInPlayerInitialInventory|LootRandomItem)$/.test(enclosing))
      return 'vendor';
  }
  if (type === 'BlueprintUnitLoot' && field === 'm_Item' && is.live) {
    if (enclosing === 'LootItemsPackFixed' || enclosing === 'LootRandomItem') return 'unit loot';
  }
  const giving =
    (enclosing === 'AddItemToPlayer' && field === 'm_ItemToGive') ||
    (enclosing === 'AddItemsToCollection' && field === 'm_Item') ||
    (enclosing === 'AddPremiumReward' && field === 'Items');
  if (giving && SCRIPT_HOLDERS.has(type)) return 'scripted';
  if (enclosing === 'AddItemToPlayer' && field === 'm_ItemToGive') {
    if (type === 'BlueprintCrusadeEvent' || type === 'BlueprintKingdomProject') return 'crusade';
  }
  if (type === 'BlueprintKingdomEvent' && enclosing === 'KingdomActionGiveLoot') return 'crusade';
  if (type === 'BlueprintGlobalMapPoint' && field === 'm_Item') return 'crusade';
  if (type === 'TrashLootSettings' && field === 'Items' && is.live) return 'random-encounter trash';
  if ((type === 'BlueprintCharacterClass' || type === 'BlueprintArchetype') && field === 'm_StartingItems')
    return 'start kit';
  if (enclosing === 'AddStartingEquipment' && field === 'm_BasicItems') return 'start kit';
  if (type === 'BlueprintUnit' && enclosing === 'BlueprintUnit' && is.companion && COMPANION_GEAR.test(field))
    return 'companion gear';
  if (/^(BlueprintDungeonLoot|BlueprintDungeonIslandRewardLoot)$/.test(type) && field === 'm_Items' && is.liveDungeon)
    return 'Midnight Isles';
  return undefined;
}

export function naturalWeapons(items: Iterable<Guid>, json: ReadonlyMap<Guid, Record<string, unknown>>): Guid[] {
  return [...items].filter((g) => {
    const type = refGuid(json.get(g)?.m_Type);
    return type !== undefined && json.get(type)?.m_IsNatural === true;
  });
}

export function checkSourcedCount(count: number): string | undefined {
  if (Math.abs(count - RESEARCH_COUNT) <= TOLERANCE) return undefined;
  return `the dump traces ${count} equipment items to a source, but the research counted ${RESEARCH_COUNT}; investigate before writing (obtainable-items.md)`;
}
