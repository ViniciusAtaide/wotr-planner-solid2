import { placeKey, type Build } from '../build';
import type { CheckedData } from '../load';
import type { Guid } from '../data';
import type { Gold } from '../gold';
import { paramKey, type Walk } from '../walk';

export const ALIASES: Readonly<Record<string, readonly string[]>> = {
  'Bypass Epic DR': ['Bypass Epic Damage Reduction'],
  'Metamagic (Bolstered)': ['Metamagic (Bolster Spell)'],
  'Metamagic (Heighten)': ['Metamagic (Heighten Spell)'],
  'Draconic Bloodline Arcana': ['Draconic Bloodline Arcana — Bronze'],
  'Dragon Resistances I': ['Dragon Resistances'],
  'Dragon Resistances II': ['Dragon Resistances'],
  'Dragon Resistances III': ['Dragon Resistances'],
  'Soul of the Fey (Power of Wyrms)': ['Soul of the Fey', 'Power of Wyrms (Bronze)'],
  'Second Bloodline - Bronze Dragon': ['Second Bloodline', 'Draconic Bloodline — Bronze'],
  'Extra Mythic Ability - Abundant Casting': ['Extra Mythic Ability', 'Abundant Casting'],
  'Extra Mythic Ability - Greater Enduring Spells': ['Extra Mythic Ability', 'Greater Enduring Spells'],
  'Life-Bonding Friendship (Shake It Off)': ['Life-Bonding Friendship', 'Shake It Off'],
  'Life-Bonding Friendship (Allied Spellcaster)': ['Life-Bonding Friendship', 'Allied Spellcaster'],
  'Life-Bonding Friendship (Shield Wall)': ['Life-Bonding Friendship', 'Shield Wall'],
  'Menacing Style - Intimidating Prowess': ['Combat Style Feat', 'Menacing', 'Intimidating Prowess'],
  'Menacing Style - Shatter Defenses': ['Combat Style Feat', 'Menacing', 'Shatter Defenses'],
  'Menacing Style - Dreadful Carnage': ['Combat Style Feat', 'Menacing', 'Dreadful Carnage'],
  'Studied Target +1': ['Studied Target'],
  'Studied Target +2': ['Studied Target'],
  'Studied Target +3': ['Studied Target'],
  'Studied Target +4': ['Studied Target'],
  '+1d6 sneak': ['Sneak Attack'],
  'Mythic Shield Focus': ['Shield Focus (Mythic)'],
  'Summon Hamadryads': ['Summon Hamadryad'],
  'Improved Critical - Battleaxe': ['Improved Critical'],
  'Improved Critical (Mythic) - Battleaxe': ['Improved Critical (Mythic)'],
  'Spell Focus - Evocation': ['Spell Focus'],
  'Greater Spell Focus - Evocation': ['Greater Spell Focus'],
  'Spell Focus (Mythic) - Evocation': ['Spell Focus (Mythic)'],
  'Expanded Arsenal - Enchantment': ['Expanded Arsenal (Magic School)'],
  'Finesse Training - Light Shield': ['Finesse Training (Light Shield)'],
  'Elemental Focus - Electricity': ['Elemental Focus', 'Elemental Focus — Electricity'],
  'Resist Electricity': ['Resist Energy'],
  'Skill Focus (Mobility)': ['Skill Focus — Mobility'],
};

export function namesFor(item: string): readonly string[] {
  const out = [item, ...(ALIASES[item] ?? [])];
  const dash = item.lastIndexOf(' - ');
  if (dash > 0) {
    const [name, value] = [item.slice(0, dash), item.slice(dash + 3)];
    out.push(`${name} — ${value}`, `${name} (${value})`);
  }
  return out;
}

export function matchesName(written: string, allowed: readonly string[]): boolean {
  return allowed.some((a) => written === a || (written.startsWith(`${a} (`) && written.endsWith(')')));
}

export function itemsOf(line: string): readonly string[] {
  const inner = line.startsWith('(') && line.endsWith(')') ? line.slice(1, -1) : line;
  return inner.split(';').map((s) => s.trim());
}

export interface Disagreement {
  readonly build: string;
  readonly place: string;
  readonly line: string;
  readonly what: string;
}

export interface Gap {
  readonly build: string;
  readonly place: string;
  readonly line: string;
  readonly ticket: string;
  readonly why: string;
}

function timeline(build: Build): string[] {
  const out: string[] = [];
  const ranks = build.ranks ?? [];
  let r = 0;
  for (let l = 1; l <= build.levels.length; l++) {
    out.push(`L${l}`);
    while (r < ranks.length && (ranks[r]?.level ?? 0) <= l) out.push(`M${++r}`);
  }
  while (r < ranks.length) out.push(`M${++r}`);
  return out;
}

const SECOND_BLOODLINE = '3cf2ab2c320b73347a7c21cf0d0995bd';

export function compare(data: CheckedData, gold: Gold, walk: Walk): Disagreement[] {
  const out: Disagreement[] = [];
  const say = (place: string, line: string, what: string) => out.push({ build: gold.name, place, line, what });
  const name = (g: Guid) => data.blueprints.get(g)?.name;
  const order = timeline(gold.build);
  const secondAt = walk.gains.find((g) => g.fact === SECOND_BLOODLINE);
  const secondKey = secondAt === undefined ? undefined : placeKey(secondAt.place);

  for (const f of walk.failures) {
    const subject = f.subject === undefined ? f.choice : (name(f.subject) ?? f.subject);
    say(placeKey(f.place), `refused: ${subject}`, `${f.rule}${f.unmet?.length ? ` (${f.unmet.length} unmet)` : ''}`);
  }

  for (const p of gold.places) {
    const key = placeKey(p.place);
    const levelOrRank =
      'level' in p.place ? gold.build.levels[p.place.level - 1] : gold.build.ranks?.[p.place.rank - 1];
    const archetypes =
      levelOrRank === undefined ? [] : (gold.build.classChoices?.[levelOrRank.class]?.archetypes ?? []);
    const classNames = [levelOrRank?.class, ...archetypes].map((g) => (g === undefined ? undefined : name(g)));
    if (!classNames.includes(p.class)) say(key, p.class, `the Build's class here is ${classNames.join(' / ')}`);

    for (const l of p.lines) {
      let at = key;
      if (l.secondBloodline) {
        if (secondKey === undefined) {
          say(key, l.line, 'no Mythic rank takes the Second Bloodline');
          continue;
        }
        if (order.indexOf(secondKey) > order.indexOf(key)) at = secondKey;
      }
      const allowed = itemsOf(l.line).flatMap(namesFor);
      for (const e of l.expect) {
        if ('increase' in e) {
          const level = 'level' in p.place ? gold.build.levels[p.place.level - 1] : undefined;
          if (level?.increase !== e.increase) say(key, l.line, `the Build raises ${level?.increase ?? 'nothing'} here`);
          continue;
        }
        const n = name(e.fact);
        if (n === undefined || !matchesName(n, allowed)) {
          say(key, l.line, `${e.fact} is named ${n ?? 'nothing'}, which the line doesn't name or alias`);
        }
        const gained = walk.gains.some(
          (g) =>
            placeKey(g.place) === at &&
            g.fact === e.fact &&
            (e.param === undefined || paramKey(g.param) === paramKey(e.param)),
        );
        if (!gained) say(key, l.line, `${n ?? e.fact} is not gained at ${at}`);
      }
    }
  }
  return out;
}

export function unexplained(disagreements: readonly Disagreement[], gaps: readonly Gap[]): string[] {
  const covers = (g: Gap, d: Disagreement) => g.build === d.build && g.place === d.place && g.line === d.line;
  const out = disagreements
    .filter((d) => !gaps.some((g) => covers(g, d)))
    .map((d) => `${d.build} ${d.place}: ${d.line}: ${d.what}`);
  for (const g of gaps) {
    if (!disagreements.some((d) => covers(g, d))) {
      out.push(`${g.build} ${g.place}: ${g.line}: listed as a gap (${g.ticket}) but now agrees: delete its entry`);
    }
  }
  return out;
}
