import { slotKey, type Build, type SlotId } from '~engine/build';
import type { Engine } from '~engine/mcp';
import type { LinkReason } from '~engine/refusals';

import { reducePlanner, type PlannerAction, type PlannerState, type Session } from './planner-state';

export type { LinkReason };

export type Selection =
  | { readonly kind: 'slot'; readonly slot: SlotId }
  | { readonly kind: 'level'; readonly level: number }
  | { readonly kind: 'increase'; readonly level: number }
  | { readonly kind: 'skills'; readonly level: number }
  | { readonly kind: 'rank'; readonly rank: number }
  | { readonly kind: 'gear' }
  | { readonly kind: 'scores' };

export type Side = 'first' | 'second';
export type Layout = 'one' | 'both';

export type View =
  | { readonly kind: 'single' }
  | { readonly kind: 'forked'; readonly layout: Layout; readonly side: Side };

export type LinkOn = 'load' | 'paste';

export type LinkStatus =
  | { readonly kind: 'ok' }
  | { readonly kind: 'didNotOpen'; readonly on: LinkOn; readonly reason: LinkReason };

export interface WorkspaceState {
  readonly view: View;
  readonly selection: Selection | undefined;
  readonly link: LinkStatus;
}

export type WorkspaceAction =
  | { readonly kind: 'select'; readonly selection: Selection | undefined; readonly side?: Side }
  | { readonly kind: 'show'; readonly layout: Layout; readonly side: Side }
  | { readonly kind: 'fork' }
  | { readonly kind: 'close' }
  | { readonly kind: 'linkOpened' }
  | { readonly kind: 'linkFailed'; readonly on: LinkOn; readonly reason: LinkReason }
  | { readonly kind: 'dismissLink' };

export const SINGLE: View = { kind: 'single' };
export const LINK_OK: LinkStatus = { kind: 'ok' };

export function workspaceAt(build: Build, link: LinkStatus): WorkspaceState {
  return { view: SINGLE, selection: undefined, link };
}

export function edited(view: View): Side {
  return view.kind === 'single' ? 'first' : view.side;
}

export function shown(view: View, phone: boolean): readonly Side[] {
  if (view.kind === 'single') return ['first'];
  return view.layout === 'both' && !phone ? ['first', 'second'] : [view.side];
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
      return selection;
  }
}

export function reduceWorkspace(s: WorkspaceState, a: WorkspaceAction, editing: Session['kind']): WorkspaceState {
  const confirming = editing === 'confirming';
  switch (a.kind) {
    case 'select':
      if (a.side === undefined || s.view.kind === 'single' || a.side === s.view.side) {
        return { ...s, selection: a.selection };
      }
      return confirming ? s : { ...s, selection: a.selection, view: { ...s.view, side: a.side } };
    case 'show':
      if (s.view.kind !== 'forked' || (confirming && a.side !== s.view.side)) return s;
      return { ...s, view: { kind: 'forked', layout: a.layout, side: a.side } };
    case 'fork':
      return s.view.kind !== 'single' || confirming
        ? s
        : { ...s, view: { kind: 'forked', layout: 'both', side: 'second' } };
    case 'close':
      return s.view.kind !== 'forked' || confirming ? s : { ...s, view: SINGLE };
    case 'linkOpened':
    case 'dismissLink':
      return s.link.kind === 'ok' ? s : { ...s, link: LINK_OK };
    case 'linkFailed':
      return { ...s, link: { kind: 'didNotOpen', on: a.on, reason: a.reason } };
  }
}

export interface Page {
  readonly workspace: WorkspaceState;
  readonly first: PlannerState;
  readonly second: PlannerState;
}

export type PageAction =
  | Exclude<WorkspaceAction, { readonly kind: 'linkOpened' }>
  | { readonly kind: 'linkOpened'; readonly build: Build }
  | { readonly kind: 'planner'; readonly action: PlannerAction };

function withPlanner(page: Page, side: Side, planner: PlannerState): Page {
  return side === 'first' ? { ...page, first: planner } : { ...page, second: planner };
}

export function editingOf(page: Page): Session['kind'] {
  return page[edited(page.workspace.view)].session.kind;
}

export function reducePage(engine: Engine, page: Page, a: PageAction): Page {
  const editing = editingOf(page);
  switch (a.kind) {
    case 'planner': {
      const side = edited(page.workspace.view);
      return withPlanner(page, side, reducePlanner(engine, page[side], a.action));
    }
    case 'fork': {
      const workspace = reduceWorkspace(page.workspace, a, editing);
      if (workspace === page.workspace) return page;
      return {
        ...page,
        workspace,
        second: reducePlanner(engine, page.second, { kind: 'reset', build: page.first.present }),
      };
    }
    case 'close': {
      const workspace = reduceWorkspace(page.workspace, a, editing);
      if (workspace === page.workspace) return page;
      return { ...page, workspace, first: page[edited(page.workspace.view)] };
    }
    case 'linkOpened': {
      const workspace = reduceWorkspace(page.workspace, { kind: 'linkOpened' }, editing);
      const side = edited(workspace.view);
      return withPlanner(
        { ...page, workspace },
        side,
        reducePlanner(engine, page[side], { kind: 'replace', build: a.build }),
      );
    }
    default: {
      const workspace = reduceWorkspace(page.workspace, a, editing);
      return workspace === page.workspace ? page : { ...page, workspace };
    }
  }
}
