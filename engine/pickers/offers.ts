import { parentKey, slotKey } from '../build';
import type { CheckedData } from '../load';
import { isShown, refGuid, type Blueprint, type Guid, type Ref } from '../data';
import { pathSwitchClasses, type OpenedSlot } from '../walk';

export const NOT_MAIN_CHARACTER_MYTHICS: readonly Guid[] = [
  '530b6a79cb691c24ba99e1577b4beb6d',
  '53cb5892d19e4c4586c9dd4d6337d943',
];

export const BACKGROUNDS_BASE_SELECTION: Guid = 'f926dabeee7f8a54db8f2010b323383c';

function progressionRoot(data: CheckedData) {
  for (const bp of data.blueprints.values()) if (bp.$type === 'BlueprintRoot') return bp.Progression;
  return undefined;
}

function guidsOf(refs: readonly Ref[] | undefined): Guid[] {
  return (refs ?? []).map(refGuid).filter((g): g is Guid => g !== undefined);
}

function offered(data: CheckedData, guids: readonly Guid[], leaveOut: readonly Guid[] = []): Blueprint[] {
  const out: Blueprint[] = [];
  for (const guid of new Set(guids)) {
    const bp = data.blueprints.get(guid);
    if (bp !== undefined && isShown(bp) && !leaveOut.includes(bp.guid)) out.push(bp);
  }
  return out.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

export function offeredClasses(data: CheckedData): Blueprint[] {
  return offered(data, guidsOf(progressionRoot(data)?.m_CharacterClasses));
}

export function offeredMythicClasses(data: CheckedData): Blueprint[] {
  const root = progressionRoot(data);
  const legendChoice = guidsOf(root === undefined ? [] : [root.m_MythicLegenFake]);
  return offered(
    data,
    [...guidsOf(root?.m_CharacterMythics), ...pathSwitchClasses(data)],
    [...NOT_MAIN_CHARACTER_MYTHICS, ...legendChoice],
  );
}

export function mythicStartingClass(data: CheckedData): Guid | undefined {
  return refGuid(progressionRoot(data)?.m_MythicStartingClass);
}

export function offeredRaces(data: CheckedData): Blueprint[] {
  return offered(data, guidsOf(progressionRoot(data)?.m_CharacterRaces));
}

export function characterWideSlots(data: CheckedData, slots: readonly OpenedSlot[]): ReadonlySet<string> {
  const deity = refGuid(progressionRoot(data)?.m_DeitySelection);
  const wide = new Set<string>();
  for (const s of slots) {
    const own = s.source.kind === 'race' || s.id.selection === deity || s.id.selection === BACKGROUNDS_BASE_SELECTION;
    const parent = parentKey(s.id);
    if (own || (parent !== undefined && wide.has(parent))) wide.add(slotKey(s.id));
  }
  return wide;
}
