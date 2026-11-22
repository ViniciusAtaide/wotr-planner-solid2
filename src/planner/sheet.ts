import { nameOf, statName } from '~engine/refusals';
import { ATTRIBUTES, SKILL_ATTRIBUTE } from '~engine/walk';

import { PLACES, placeWords } from './GearStep';
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
    const ranks: Readonly<Record<string, number | undefined>> = l.skills ?? {};
    const skills = Object.keys(SKILL_ATTRIBUTE)
      .flatMap((s) => ((ranks[s] ?? 0) > 0 ? [`${statName(s)} ${ranks[s]}`] : []))
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
  const worn = PLACES.flatMap((place) => {
    const item = build.gear?.[place];
    return item === undefined ? [] : [`${placeWords(place)}: ${nameOf(data, item)}`];
  });
  if (worn.length > 0) lines.push(`Gear: ${worn.join(' · ')}`);
  return lines.join('\n');
}
