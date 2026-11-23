import { slotKey, type Build, type SlotId } from '~engine/build';
import type { Engine } from '~engine/mcp';
import type { LinkReason } from '~engine/refusals';

import { reducePlanner, type PlannerAction, type PlannerState } from './planner-state';

export type { LinkReason };

export type Selection =
  | { readonly kind: 'slot'; readonly slot: SlotId }
  | { readonly kind: 'level'; readonly level: number }
  | { readonly kind: 'increase'; readonly level: number }
  | { readonly kind: 'skills'; readonly level: number }
  | { readonly kind: 'rank'; readonly rank: number }
  | { readonly kind: 'gear' }
  | { readonly kind: 'scores' }
  | { readonly kind: 'race' };

export type LinkOn = 'load' | 'paste';

export type LinkStatus =
  | { readonly kind: 'ok' }
  | { readonly kind: 'didNotOpen'; readonly on: LinkOn; readonly reason: LinkReason };

export interface WorkspaceState {
  readonly selection: Selection | undefined;
  readonly link: LinkStatus;
}

export type WorkspaceAction =
  | { readonly kind: 'select'; readonly selection: Selection | undefined }
  | { readonly kind: 'linkOpened' }
  | { readonly kind: 'linkFailed'; readonly on: LinkOn; readonly reason: LinkReason }
  | { readonly kind: 'dismissLink' };

export const LINK_OK: LinkStatus = { kind: 'ok' };

export function workspaceAt(link: LinkStatus): WorkspaceState {
  return { selection: undefined, link };
}

export function sameSelection(a: Selection | undefined, b: Selection | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  switch (a.kind) {
    case 'slot':
      return b.kind === 'slot' && slotKey(a.slot) === slotKey(b.slot);
    case 'level':
    case 'increase':
    case 'skills':
      return b.kind === a.kind && a.level === b.level;
    case 'rank':
      return b.kind === 'rank' && a.rank === b.rank;
    case 'gear':
    case 'scores':
    case 'race':
      return a.kind === b.kind;
  }
}

export function resolve(
  selection: Selection | undefined,
  build: Build,
  slots: readonly SlotId[],
): Selection | undefined {
  if (selection === undefined) return undefined;
  switch (selection.kind) {
    case 'slot': {
      const key = slotKey(selection.slot);
      return slots.some((s) => slotKey(s) === key) ? selection : undefined;
    }
    case 'level':
    case 'increase':
    case 'skills':
      return selection.level >= 1 && selection.level <= build.levels.length ? selection : undefined;
    case 'rank':
      return selection.rank >= 1 && selection.rank <= (build.ranks?.length ?? 0) ? selection : undefined;
    case 'gear':
    case 'scores':
    case 'race':
      return selection;
  }
}

export function reduceWorkspace(s: WorkspaceState, a: WorkspaceAction): WorkspaceState {
  switch (a.kind) {
    case 'select':
      return { ...s, selection: a.selection };
    case 'linkOpened':
      return s.link.kind === 'ok' && s.selection === undefined ? s : { ...s, link: LINK_OK, selection: undefined };
    case 'dismissLink':
      return s.link.kind === 'ok' ? s : { ...s, link: LINK_OK };
    case 'linkFailed':
      return { ...s, link: { kind: 'didNotOpen', on: a.on, reason: a.reason } };
  }
}

export interface Page {
  readonly workspace: WorkspaceState;
  readonly planner: PlannerState;
}

export type PageAction =
  | Exclude<WorkspaceAction, { readonly kind: 'linkOpened' }>
  | { readonly kind: 'linkOpened'; readonly build: Build }
  | { readonly kind: 'planner'; readonly action: PlannerAction };

export function reducePage(engine: Engine, page: Page, a: PageAction): Page {
  switch (a.kind) {
    case 'planner':
      return { ...page, planner: reducePlanner(engine, page.planner, a.action) };
    case 'linkOpened':
      return {
        ...page,
        workspace: reduceWorkspace(page.workspace, { kind: 'linkOpened' }),
        planner: reducePlanner(engine, page.planner, { kind: 'replace', build: a.build }),
      };
    default: {
      const workspace = reduceWorkspace(page.workspace, a);
      return workspace === page.workspace ? page : { ...page, workspace };
    }
  }
}
