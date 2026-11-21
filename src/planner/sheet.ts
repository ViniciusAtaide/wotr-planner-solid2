import type { GearPlace } from '~engine/build';
import type { Guid } from '~engine/data';
import { nameOf, statName } from '~engine/refusals';
import { ATTRIBUTES } from '~engine/walk';

import {
  characterLine,
  characterPicksLine,
  classLevelAt,
  levelLine,
  pickNames,
  rankNumbersAt,
  slotsAt,
  type TrailView,
} from './trail-state';

const SHORT_NAMES: Readonly<Record<string, string>> = {
  Strength: 'STR',
  Dexterity: 'DEX',
  Constitution: 'CON',
  Intelligence: 'INT',
  Wisdom: 'WIS',
  Charisma: 'CHA',
};

export function buildSheet(t: TrailView): string {
  const { data, build } = t;
  const lines = [
    characterLine(data, build),
    `${ATTRIBUTES.map((a) => `${SHORT_NAMES[a] ?? a} ${t.walk.unit.permanent(a)}`).join(' · ')}${build.countGear === true ? ' (Gear counted)' : ''}`,
  ];
  const picks = characterPicksLine(t);
  if (picks !== '') lines.push(picks);
  for (const [i, l] of build.levels.entries()) {
    const level = i + 1;
    const skills = Object.entries(l.skills ?? {})
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([s, n]) => `${statName(s)} ${n}`)
      .join(', ');
    const archetype = classLevelAt(build, level) === 1 ? build.classChoices?.[l.class]?.archetypes[0] : undefined;
    const parts = [
      `${nameOf(data, l.class)} ${classLevelAt(build, level)}${archetype === undefined ? '' : ` (${nameOf(data, archetype)})`}`,
      levelLine(t, level),
      skills,
    ].filter((p) => p !== '');
    lines.push(`Level ${level}: ${parts.join(' · ')}`);
    for (const rank of rankNumbersAt(build, level)) {
      const r = build.ranks?.[rank - 1];
      if (r === undefined) continue;
      const rankPicks = pickNames(t, slotsAt(t, { rank }));
      lines.push(`Mythic rank ${rank} at level ${r.level}: ${[nameOf(data, r.class), ...rankPicks].join(' · ')}`);
    }
  }
  const worn = (Object.entries(build.gear ?? {}) as [GearPlace, Guid | undefined][]).flatMap(([place, item]) =>
    item === undefined ? [] : [`${place.replace(/([a-z])([A-Z])/g, '$1 $2')}: ${nameOf(data, item)}`],
  );
  if (worn.length > 0) lines.push(`Gear: ${worn.join(' · ')}`);
  return lines.join('\n');
}
