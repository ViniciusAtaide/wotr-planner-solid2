const OWN_HASHCHANGE_MS = 1000;

let pending = 0;
let holders = 0;
let landed: number | undefined;
let listening = false;
const waiting: (() => void)[] = [];
const settledHooks = new Set<() => void>();
const userPops = new Set<() => void>();

function settle(): void {
  for (const run of waiting.splice(0)) run();
  for (const hook of settledHooks) hook();
}

function onPopstate(): void {
  if (pending > 0) {
    pending -= 1;
    landed = Date.now();
    if (pending === 0) settle();
    return;
  }
  if (userPops.size === 0) return;
  landed = Date.now();
  for (const pop of userPops) pop();
  settle();
}

function listen(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('popstate', onPopstate);
}

export function ownsDialogEntry(): boolean {
  return (history.state as { choiceDialog?: boolean } | null)?.choiceDialog === true;
}

export function holdDialogEntry(): void {
  listen();
  holders += 1;
  afterHistorySettles(() => {
    if (holders > 0 && !ownsDialogEntry()) history.pushState({ choiceDialog: true }, '');
  });
}

export function releaseDialogEntry(popped: boolean): void {
  holders = Math.max(0, holders - 1);
  if (popped) return;
  setTimeout(() => {
    if (holders > 0 || pending > 0 || !ownsDialogEntry()) return;
    pending += 1;
    history.back();
  }, 0);
}

export function afterHistorySettles(run: () => void): void {
  if (pending > 0) waiting.push(run);
  else run();
}

export function onHistorySettled(hook: () => void): () => void {
  listen();
  settledHooks.add(hook);
  return () => settledHooks.delete(hook);
}

export function onUserPop(pop: () => void): () => void {
  listen();
  userPops.add(pop);
  return () => userPops.delete(pop);
}

export function isOwnHashChange(): boolean {
  const last = landed;
  if (last === undefined) return false;
  landed = undefined;
  return Date.now() - last <= OWN_HASHCHANGE_MS;
}

export function historyIdle(): boolean {
  return pending === 0;
}
