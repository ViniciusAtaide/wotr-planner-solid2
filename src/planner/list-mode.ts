import type { Step } from './trail-state';

export type ListMode = 'inline' | 'modal';

export const LIST_MODE_KEY = 'wotr.choiceLists';

export function readListMode(storage: () => Storage | undefined): ListMode {
  try {
    return storage()?.getItem(LIST_MODE_KEY) === 'modal' ? 'modal' : 'inline';
  } catch {
    return 'inline';
  }
}

export function writeListMode(storage: () => Storage | undefined, mode: ListMode): boolean {
  try {
    storage()?.setItem(LIST_MODE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}

export function browserStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function isListStep(step: Step, levels: number): boolean {
  switch (step.kind) {
    case 'slot':
    case 'race':
    case 'level':
    case 'rank':
    case 'mythic':
    case 'gear':
      return true;
    case 'nextLevel':
      return levels === 0;
    case 'alignment':
    case 'scores':
    case 'increase':
    case 'skills':
    case 'complete':
      return false;
  }
}
