// The gold builds (GLOSSARY.md "Gold build"; map tickets 14 and 19): two real players' write-ups, Jack-in-the-Green
// and the Enforcer, which the user knows work in the game. Each is converted once into a GUID-keyed fixture: the
// Build that reproduces it, and every write-up line beside the facts it names. The walk must gain each line's facts at
// the line's level or rank; a refusal is never the write-up's fault; and known gaps are listed, each with its ticket,
// and the list can only shrink.
//
// The write-ups and their hand conversion are the Rust planner's (`~/code/wotr-planner/libs/seeds/tests/game_data/
// gold/`, its ticket 160). The rules for reading them are carried over from its `gold.rs`: label prefixes dropped, a
// bracketed line is the second bloodline's, gained at its level or at the Second Bloodline's rank when that comes later.
import { placeKey, type Build, type Pick, type Place } from '../build';
import type { CheckedData } from '../data/load';
import type { Attribute, Guid, StatType } from '../data/types';
import type { GrantParam } from '../grants';
import { paramKey } from '../walk/unit';
import type { Walk } from '../walk/walk';

/** One thing a line says is gained there: a fact (at its parameter), or an ability increase. */
export type Expect = { readonly fact: Guid; readonly param?: GrantParam } | { readonly increase: Attribute };

export interface GoldLine {
  /** The write-up's own words, label prefix dropped. */
  readonly line: string;
  readonly expect: readonly Expect[];
  /** The bracket mark: the second bloodline's, gained at its level or the Second Bloodline's rank, the later. */
  readonly secondBloodline?: true;
}

export interface GoldPlace {
  readonly place: Place;
  /** The write-up's class (its archetype's name, when it has one) or Mythic path for this level or rank. */
  readonly class: string;
  readonly lines: readonly GoldLine[];
}

export interface Gold {
  readonly name: string;
  readonly build: Build;
  readonly start: {
    readonly race: string;
    readonly background: string;
    /** The level-1 scores, racial modifiers included. */
    readonly attributes: Readonly<Record<Attribute, number>>;
    readonly skills: readonly StatType[];
    /** The alignments the write-up allows. */
    readonly alignments: NonNullable<Build['alignment']>[];
  };
  readonly places: readonly GoldPlace[];
}

// Helpers the fixtures are written with.

export function pick(place: Place, selection: Guid, index: number, feature: Guid, param?: GrantParam): Pick {
  return { slot: { place, selection, index }, feature, ...(param && { param }) };
}

/** A line whose facts are all gained at its place. */
export function facts(line: string, ...guids: Guid[]): GoldLine {
  return { line, expect: guids.map((fact) => ({ fact })) };
}

/** A line naming a parametrized feat at one parameter. */
export function withParam(line: string, fact: Guid, param: GrantParam): GoldLine {
  return { line, expect: [{ fact, param }] };
}

/** An ability increase ("+1 Strength", "Charisma +1"). */
export function increase(line: string, attribute: Attribute): GoldLine {
  return { line, expect: [{ increase: attribute }] };
}

/** A bracketed line: the second bloodline's. */
export function second(line: string, ...guids: Guid[]): GoldLine {
  return { ...facts(line, ...guids), secondBloodline: true };
}

/**
 * The write-up's spellings the game's display names spell otherwise, each with the names it may stand for. A line
 * "Name - Value" also matches "Name — Value" and "Name (Value)" without an entry here, and a name matches whatever
 * qualifier the importer writes after it (`matchesName`), so no entry spells one out.
 */
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
  // The bracket names the superpower's teamwork feat, at its first rank and its second.
  'Life-Bonding Friendship (Shake It Off)': ['Life-Bonding Friendship', 'Shake It Off'],
  'Life-Bonding Friendship (Allied Spellcaster)': ['Life-Bonding Friendship', 'Allied Spellcaster'],
  'Life-Bonding Friendship (Shield Wall)': ['Life-Bonding Friendship', 'Shield Wall'],
  // The slayer's combat style is the ranger's Menacing style, taken through a Combat Style Feat talent.
  'Menacing Style - Intimidating Prowess': ['Combat Style Feat', 'Menacing', 'Intimidating Prowess'],
  'Menacing Style - Shatter Defenses': ['Combat Style Feat', 'Menacing', 'Shatter Defenses'],
  'Menacing Style - Dreadful Carnage': ['Combat Style Feat', 'Menacing', 'Dreadful Carnage'],
  // The level-up names each step of Studied Target and of the sneak dice: a rank of the one feature.
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

/** The display names a line's item may stand for: itself, its "Name - Value" forms, and its aliases. */
export function namesFor(item: string): readonly string[] {
  const out = [item, ...(ALIASES[item] ?? [])];
  const dash = item.lastIndexOf(' - ');
  if (dash > 0) {
    const [name, value] = [item.slice(0, dash), item.slice(dash + 3)];
    out.push(`${name} — ${value}`, `${name} (${value})`);
  }
  return out;
}

/**
 * Whether a blueprint's written name is one a line allows: the name itself, or the name with the qualifier the
 * importer writes after a shared name ("Menacing (Ranger 6)", map ticket 27). The fixture's GUID says which blueprint
 * it is, so the line need only name it bare, and a change to the qualifier rules leaves the gold builds alone.
 */
export function matchesName(written: string, allowed: readonly string[]): boolean {
  return allowed.some((a) => written === a || (written.startsWith(`${a} (`) && written.endsWith(')')));
}

/** A line's items: a bracketed line holds several, split at its semicolons. */
export function itemsOf(line: string): readonly string[] {
  const inner = line.startsWith('(') && line.endsWith(')') ? line.slice(1, -1) : line;
  return inner.split(';').map((s) => s.trim());
}

/** A gold line the walk disagrees with, or a check of the Build's start. */
export interface Disagreement {
  readonly build: string;
  /** The place key (`L3`, `M2`), or `start`. */
  readonly place: string;
  readonly line: string;
  readonly what: string;
}

/** A disagreement known today: a bug or an unbuilt part of the planner, never the write-up's fault. */
export interface Gap {
  readonly build: string;
  readonly place: string;
  readonly line: string;
  /** The ticket that closes it. */
  readonly ticket: string;
  readonly why: string;
}

/** The order of every place a Build walks: each level, then the ranks placed at it. */
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

/** Every way the walk of a gold Build disagrees with its write-up. */
export function compare(data: CheckedData, gold: Gold, walk: Walk): Disagreement[] {
  const out: Disagreement[] = [];
  const say = (place: string, line: string, what: string) => out.push({ build: gold.name, place, line, what });
  const name = (g: Guid) => data.blueprints.get(g)?.name;
  const order = timeline(gold.build);
  const secondAt = walk.gains.find((g) => g.fact === SECOND_BLOODLINE);
  const secondKey = secondAt === undefined ? undefined : placeKey(secondAt.place);

  // A refusal is never the write-up's fault: every failure of the walk is a disagreement.
  for (const f of walk.failures) {
    const subject = f.subject === undefined ? f.choice : (name(f.subject) ?? f.subject);
    say(placeKey(f.place), `refused: ${subject}`, `${f.rule}${f.unmet?.length ? ` (${f.unmet.length} unmet)` : ''}`);
  }

  for (const p of gold.places) {
    const key = placeKey(p.place);
    // The level's or rank's class, by its archetype's name when it has one.
    const choice = 'level' in p.place ? gold.build.levels[p.place.level - 1] : gold.build.ranks?.[p.place.rank - 1];
    const archetypes = choice === undefined ? [] : (gold.build.classChoices?.[choice.class]?.archetypes ?? []);
    const classNames = [choice?.class, ...archetypes].map((g) => (g === undefined ? undefined : name(g)));
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

/** The disagreements no gap covers, and the gaps that cover none (they now agree, so their entry goes). */
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
