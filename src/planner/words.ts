import type { CheckedData } from '~engine/load';
import type { Guid } from '~engine/data';
import type { GrantParam } from '~engine/grants';
import { nameOf, statName } from '~engine/refusals';

export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

export function optionName(data: CheckedData, feature: Guid, param?: GrantParam): string {
  const name = nameOf(data, feature);
  if (param === undefined) return name;
  if ('WeaponCategory' in param) return `${name} (${param.WeaponCategory.replace(/([a-z])([A-Z])/g, '$1 $2')})`;
  if ('SpellSchool' in param) return `${name} (${param.SpellSchool})`;
  if ('StatType' in param) return `${name} (${statName(param.StatType)})`;
  return `${name} (${nameOf(data, param.Blueprint)})`;
}
