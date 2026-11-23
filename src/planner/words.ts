import type { CheckedData } from '~engine/load';
import type { Guid } from '~engine/data';
import type { GrantParam } from '~engine/grants';
import { bareName, type ListName } from '~engine/pickers';
import { nameOf, paramWords } from '~engine/refusals';

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
  return paramWords(data, listed === undefined ? bareNameOf(data, feature) : listedName(listed), param);
}

export function optionName(data: CheckedData, feature: Guid, param?: GrantParam): string {
  return paramWords(data, nameOf(data, feature), param);
}
