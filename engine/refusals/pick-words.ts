import { parentKey, slotKey, type Build, type Pick, type SlotId } from '../build';
import type { CheckedData } from '../load';
import type { GrantParam } from '../grants';
import { bareNameOf, nameOf, statName } from './refusals';

const PLACEHOLDER = /^(magic school|school|weapon|weapon category|ability|ability score|skill)$/i;

export function qualifiedName(name: string): { readonly base: string; readonly qualifier: string | undefined } {
  const found = /^(.*\S) \(([^()]*)\)$/.exec(name);
  return found === null ? { base: name, qualifier: undefined } : { base: found[1] ?? name, qualifier: found[2] };
}

export function withValue(name: string, value: string): string {
  const { base, qualifier } = qualifiedName(name);
  if (qualifier === undefined) return `${name} (${value})`;
  return PLACEHOLDER.test(qualifier) ? `${base} (${value})` : `${name} — ${value}`;
}

export function paramWords(data: CheckedData, name: string, param?: GrantParam): string {
  if (param === undefined) return name;
  if ('WeaponCategory' in param) return withValue(name, param.WeaponCategory.replace(/([a-z])([A-Z])/g, '$1 $2'));
  if ('SpellSchool' in param) return withValue(name, param.SpellSchool);
  if ('StatType' in param) return withValue(name, statName(param.StatType));
  return withValue(name, nameOf(data, param.Blueprint));
}

const SHARED_WORDS = ['Selection', 'Feat', 'Bloodline'] as const;

function withoutPrefix(text: string, prefix: string): string | undefined {
  if (text.startsWith(`${prefix} (`) && text.endsWith(')')) return text.slice(prefix.length + 2, -1);
  for (const join of [' — ', ' - ', ': '])
    if (text.startsWith(`${prefix}${join}`)) return text.slice(prefix.length + join.length);
  return undefined;
}

function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
}

function withoutParentWords(child: string, parent: string, base: string): string {
  const known = new Set(wordsOf(parent));
  const parts = child.split(' ');
  let led = 0;
  while (led < parts.length && known.has(parts[led]?.toLowerCase() ?? '')) led += 1;
  const lead = new Set(parts.slice(0, led).map((w) => w.toLowerCase()));
  const coversBase = wordsOf(base).every((w) => lead.has(w));
  return led === 0 || led === parts.length || !coversBase ? child : parts.slice(led).join(' ');
}

function flattened(text: string): string {
  return text
    .replace(/^\(([^()]*)\)/, '$1')
    .replace(/\s*\(([^()]*)\)/g, ' — $1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function nestedLabel(parent: string, child: string): string {
  const shown = parent.replace(/ selection$/i, '');
  const { base } = qualifiedName(shown);
  const bare = withoutPrefix(child, parent) ?? withoutPrefix(child, shown) ?? withoutPrefix(child, base);
  const own =
    bare ??
    withoutParentWords(
      SHARED_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(parent))
        .reduce((text, w) => text.replace(new RegExp(`\\s*\\b${w}\\b`, 'gi'), ''), child)
        .replace(/\s{2,}/g, ' ')
        .trim(),
      shown,
      base,
    );
  return withValue(shown, flattened(own === '' ? child : own));
}

export function pickName(data: CheckedData, pick: Pick): string {
  return paramWords(data, bareNameOf(data, pick.feature), pick.param);
}

export function slotWords(data: CheckedData, build: Build, slot: SlotId): string {
  const label = bareNameOf(data, slot.selection).replace(/ selection$/i, '');
  if (slot.from === undefined || slot.from !== build.race) return label;
  const selection = data.blueprints.get(slot.selection);
  const human = data.blueprints.get(build.race)?.name === 'Human';
  if (human && selection?.$type === 'BlueprintFeatureSelection' && selection.Group === 'Feat')
    return 'Human bonus feat';
  return /^feats?$/i.test(label) ? 'Bonus feat' : label;
}

export function pickWords(data: CheckedData, build: Build, pick: Pick, among: readonly Pick[]): string {
  const key = parentKey(pick.slot);
  const parent = key === undefined ? undefined : among.find((p) => slotKey(p.slot) === key);
  if (parent === undefined) return pickName(data, pick);
  return `${slotWords(data, build, parent.slot)}: ${nestedLabel(pickName(data, parent), pickName(data, pick))}`;
}
