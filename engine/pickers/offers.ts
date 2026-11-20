import type { CheckedData } from '../load';
import { isShown, refGuid, type Blueprint, type Guid, type Ref } from '../data';

export const NOT_MAIN_CHARACTER_MYTHICS: readonly Guid[] = [
  '530b6a79cb691c24ba99e1577b4beb6d',
  '53cb5892d19e4c4586c9dd4d6337d943',
];

function progressionRoot(data: CheckedData) {
  for (const bp of data.blueprints.values()) if (bp.$type === 'BlueprintRoot') return bp.Progression;
  return undefined;
}

function offered(data: CheckedData, refs: readonly Ref[], leaveOut: readonly Guid[] = []): Blueprint[] {
  const out: Blueprint[] = [];
  for (const ref of refs) {
    const guid = refGuid(ref);
    const bp = guid === undefined ? undefined : data.blueprints.get(guid);
    if (bp !== undefined && isShown(bp) && !leaveOut.includes(bp.guid)) out.push(bp);
  }
  return out.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

export function offeredClasses(data: CheckedData): Blueprint[] {
  return offered(data, progressionRoot(data)?.m_CharacterClasses ?? []);
}

export function offeredMythicClasses(data: CheckedData): Blueprint[] {
  return offered(data, progressionRoot(data)?.m_CharacterMythics ?? [], NOT_MAIN_CHARACTER_MYTHICS);
}

export function offeredRaces(data: CheckedData): Blueprint[] {
  return offered(data, progressionRoot(data)?.m_CharacterRaces ?? []);
}
