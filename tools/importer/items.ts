// The sourced items (map ticket 12): the equipment blueprints the dump traces to a source in play. The dump records a
// source as a reference from a container or a giving action to the item; the item itself carries no "obtainable" flag.
// The method, and every source below, is the research's (.scratch/wotr-planner/research/obtainable-items.md, "How to
// redo the count"), which counted 3,397 on this dump.
import { kindOf, references, refGuid, type Guid } from '~engine/data/types';
import type { DumpIndex } from './import';

/** What the research counted: the import fails when the sourced count strays further than `TOLERANCE` from it. */
export const RESEARCH_COUNT = 3397;
const TOLERANCE = 34;

/** The equipment types: weapon, armour, shield and the eleven worn slots, as `kindOf` files them under `items`. */
export const EQUIPMENT_TYPES: ReadonlySet<string> = new Set(
  Object.entries(kindOf)
    .filter(([, kind]) => kind === 'items')
    .map(([type]) => type),
);

/** A hidden item (Finnean's base) gives its forms (ItemPolymorph) when a source gives it, though it is no equipment. */
const HIDDEN_ITEM = 'BlueprintHiddenItem';

/** Where the dump says an item comes from: the research's labels. */
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

/** The blueprints whose dialogues, quests and DLC rewards give items through a scripted action. */
const SCRIPT_HOLDERS: ReadonlySet<string> = new Set([
  'BlueprintCue',
  'BlueprintAnswer',
  'BlueprintEtude',
  'BlueprintDialog',
  'ActionsHolder',
  'CommandAction',
  'BlueprintFeature',
]);

/**
 * A companion's body slots and starting inventory (BlueprintUnit): what the companion joins with. Additional limbs
 * are natural weapons, so they are left out. `m_EmptyHandWeapon` is kept, as the research did: the one item it brings
 * in, WeaponEmptyHand 20375b5a0c9243d45966bd72c690ab74, is dropped by its override file, as map ticket 12's hand-kept
 * list says, and `naturalWeapons` holds the import to that.
 */
const COMPANION_GEAR =
  /^m_(PrimaryHand|SecondaryHand|PrimaryHandAlternative\d|SecondaryHandAlternative\d|Armor|Shirt|Belt|Head|Glasses|Feet|Gloves|Neck|Ring1|Ring2|Wrist|Shoulders|EmptyHandWeapon|StartingInventory)$/;

export interface ItemSourcing {
  /** The blueprints whose JSON `source` reads: items, weapon types, and whatever names an item, a table or a unit. */
  readonly want: ReadonlySet<Guid>;
  /** The sourced equipment items, each with its sources. */
  source(json: ReadonlyMap<Guid, Record<string, unknown>>): Map<Guid, Set<ItemSource>>;
}

/** Prepares the sourcing from the dump index: which blueprints it reads, and which tables something references. */
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
      // Only the blueprints `want` names matter; each one's references are walked once.
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
      // Companions: the units a Recruit, RecruitInactive or ExchangeRecruits action names.
      const companions = new Set<Guid>();
      // Midnight Isles tables that give at play time: BlueprintDungeonRoot.m_Loot, DungeonAddLootToVendor on a unit,
      // and the island rewards a BlueprintDungeonExpedition names. The filter lists only drive the editor.
      const liveDungeon = new Set<Guid>();
      for (const g of walked.keys()) {
        for (const { enclosing, field, to } of refsOf(g)) {
          if (/^(Recruit|RecruitInactive)$/.test(enclosing) && field === 'm_CompanionBlueprint') companions.add(to);
          if (enclosing === 'ExchangeRecruits' && field === 'm_NewUnit') companions.add(to);
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
            companion: companions.has(g),
            liveDungeon: liveDungeon.has(g),
          });
          if (source !== undefined) give(to, source);
        }
      }

      // Forms and parts count when their parent does: an ItemPolymorph's forms, a double weapon's second end, and a
      // shield's armour half and bash weapon.
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

      // Hidden items are no equipment.
      for (const g of sources.keys()) if (!EQUIPMENT_TYPES.has(typeOf(g))) sources.delete(g);
      return sources;
    },
  };
}

/**
 * The source a reference gives its item from, by the referring blueprint's type, the object around the reference
 * and the field, or `undefined` for a reference that doesn't give (a check, a removal, a body weapon, a cutscene, a
 * developer preset or a save migration). `live` says something references the referring blueprint.
 */
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

/**
 * The held items whose weapon type is natural: never Gear, since a natural weapon is never looted
 * (Items/ItemEntityWeapon.cs IsLootable). Map ticket 12 drops each through the hand-kept list, so the import fails on
 * any one no `remove` override drops.
 */
export function naturalWeapons(items: Iterable<Guid>, json: ReadonlyMap<Guid, Record<string, unknown>>): Guid[] {
  return [...items].filter((g) => {
    const type = refGuid(json.get(g)?.m_Type);
    return type !== undefined && json.get(type)?.m_IsNatural === true;
  });
}

/** The import problem when the sourced count strays from the research's, or `undefined`. */
export function checkSourcedCount(count: number): string | undefined {
  if (Math.abs(count - RESEARCH_COUNT) <= TOLERANCE) return undefined;
  return `the dump traces ${count} equipment items to a source, but the research counted ${RESEARCH_COUNT}; investigate before writing (obtainable-items.md)`;
}
