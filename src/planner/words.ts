import type { CheckedData } from '~engine/load';
import type { Guid } from '~engine/data';
import type { GrantParam } from '~engine/grants';
import { bareName, type ListName } from '~engine/pickers';
import { nameOf, statName } from '~engine/refusals';

export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

export function bareNameOf(data: CheckedData, guid: Guid): string {
  const bp = data.blueprints.get(guid);
  return (bp === undefined ? undefined : bareName(bp)) ?? nameOf(data, guid);
}

export function listedName(listed: ListName): string {
  return listed.qualifier === undefined ? listed.name : `${listed.name} (${listed.qualifier})`;
}

export function shownName(data: CheckedData, feature: Guid, param?: GrantParam, listed?: ListName): string {
  return withParam(data, listed === undefined ? bareNameOf(data, feature) : listedName(listed), param);
}

export function optionName(data: CheckedData, feature: Guid, param?: GrantParam): string {
  return withParam(data, nameOf(data, feature), param);
}

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

function withParam(data: CheckedData, name: string, param?: GrantParam): string {
  if (param === undefined) return name;
  if ('WeaponCategory' in param) return withValue(name, param.WeaponCategory.replace(/([a-z])([A-Z])/g, '$1 $2'));
  if ('SpellSchool' in param) return withValue(name, param.SpellSchool);
  if ('StatType' in param) return withValue(name, statName(param.StatType));
  return withValue(name, nameOf(data, param.Blueprint));
}
