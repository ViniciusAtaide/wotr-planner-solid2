// The generic filter (guide §3 points 1 and 3, module I): one dump blueprint in, its allowlisted fields and
// components out, in the game's own shape and field names. There is no per-area code here: a new field is a new
// allowlist line and a rerun.
import { refGuid, type Guid } from '~engine/data/types';
import type { BlueprintEntry, ComponentEntry } from './allowlist';
import { checkNotKept, keepFields, shortType, type KeepContext } from './spec';

/** A blueprint as the dump has it, parsed. */
export interface RawBlueprint {
  readonly guid: Guid;
  readonly assetName: string;
  /** The dump's class name, without its type GUID. */
  readonly type: string;
  readonly json: Record<string, unknown>;
}

export interface FilterContext extends KeepContext {
  /** Counts a component dropped because a field in its `requiresHeld` names a blueprint the planner doesn't hold. */
  readonly droppedComponent: (type: string) => void;
  /** Counts a component the allowlist doesn't list, by its class name. */
  readonly unlisted: (type: string, owner: Guid) => void;
}

export { shortType };

/** The kept form of one blueprint: `$type`, identity, display name, allowlisted fields and allowlisted components. */
export function keepBlueprint(
  raw: RawBlueprint,
  entry: BlueprintEntry,
  components: ReadonlyMap<string, ComponentEntry>,
  name: string | undefined,
  ctx: FilterContext,
): Record<string, unknown> {
  const at = `${raw.assetName} ${raw.guid}`;
  const kept: Record<string, unknown> = {
    $type: raw.type,
    guid: raw.guid,
    assetName: raw.assetName,
    ...keepFields(entry.fields, raw.json, at, ctx, entry.type),
  };
  if (name !== undefined) kept.name = name;
  checkNotKept(entry.notKept, raw.json, at, ctx);

  const keptComponents: Record<string, unknown>[] = [];
  const rawComponents = raw.json.Components;
  if (!Array.isArray(rawComponents)) ctx.problems.push(`${at}: Components is not a list`);
  else {
    for (const [i, c] of rawComponents.entries()) {
      const type = shortType((c as Record<string, unknown> | null)?.$type);
      const allowed = components.get(type);
      if (allowed === undefined) {
        ctx.unlisted(type, raw.guid);
        continue;
      }
      const fields = c as Record<string, unknown>;
      const preDrop = allowed.preFilter?.(fields);
      if (preDrop !== undefined) {
        ctx.droppedPart(preDrop);
        continue;
      }
      const unheld = (allowed.requiresHeld ?? []).find((field) => {
        if (fields[field] === null) return true;
        const guid = refGuid(fields[field]);
        return guid !== undefined && ctx.heldKind(guid) === undefined;
      });
      if (unheld !== undefined) {
        ctx.droppedComponent(type);
        continue;
      }
      // A `requiresHeld` field drops the component when its target isn't held, so it names nothing (KeepContext.names).
      const required = new Set((allowed.requiresHeld ?? []).map((field) => refGuid(fields[field])));
      const names = ctx.names;
      const fieldCtx =
        required.size === 0 || names === undefined
          ? ctx
          : { ...ctx, names: (guid: Guid) => required.has(guid) || names(guid) };
      const kept = {
        $type: type,
        ...keepFields(allowed.fields, c, `${at}: Components[${i}] ${type}`, fieldCtx, type),
      };
      if (allowed.keepIf !== undefined && !allowed.keepIf(kept)) {
        ctx.droppedComponent(type);
        continue;
      }
      checkNotKept(allowed.notKept, fields, `${at}: Components[${i}] ${type}`, ctx);
      keptComponents.push(kept);
    }
  }
  kept.Components = keptComponents;
  return kept;
}
