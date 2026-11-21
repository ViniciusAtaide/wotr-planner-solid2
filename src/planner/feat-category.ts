import type { Guid } from '~engine/data';
import type { CheckedData } from '~engine/load';
import { featureTags, type FeatureTag } from '~engine/pickers';

import type { FeatCategory } from '../design';

export function categoryOfTags(tags: readonly FeatureTag[]): FeatCategory {
  const has = (...wanted: FeatureTag[]) => wanted.some((w) => tags.includes(w));
  if (has('Teamwork')) return 'Teamwork';
  if (has('Mounted')) return 'MountedCombat';
  if (has('Style')) return 'UnarmedCombat';
  if (has('CombatManeuver')) return 'CombatManoeuvres';
  if (has('Magic', 'Metamagic')) return 'Magic';
  if (has('ClassSpecific')) return 'Class';
  if (has('Ranged') && !has('Melee')) return 'Ranged';
  if (has('Attack', 'Damage', 'Melee', 'Critical', 'Ranged')) return 'Weapon';
  if (has('Skills')) return 'Skill';
  if (has('Defense', 'SavingThrows')) return 'ArmourAndShield';
  return 'Miscellaneous';
}

export function featCategory(data: CheckedData, feature: Guid): FeatCategory | undefined {
  const tags = featureTags(data, feature);
  return tags === undefined ? undefined : categoryOfTags(tags);
}
