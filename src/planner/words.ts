// Names for the planner's surfaces: game names (ADR 0006) and the planner's own words, never the game's text.
import type { CheckedData } from '~engine/data/load';
import type { Guid } from '~engine/data/types';
import type { GrantParam } from '~engine/grants';
import { nameOf, statName } from '~engine/refusals';

/** "1st", "2nd", "3rd", "4th"… */
export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

/** An option's name: the feature's game name, with its parameter's when it takes one. */
export function optionName(data: CheckedData, feature: Guid, param?: GrantParam): string {
  const name = nameOf(data, feature);
  if (param === undefined) return name;
  if ('WeaponCategory' in param) return `${name} (${param.WeaponCategory.replace(/([a-z])([A-Z])/g, '$1 $2')})`;
  if ('SpellSchool' in param) return `${name} (${param.SpellSchool})`;
  if ('StatType' in param) return `${name} (${statName(param.StatType)})`;
  return `${name} (${nameOf(data, param.Blueprint)})`;
}
