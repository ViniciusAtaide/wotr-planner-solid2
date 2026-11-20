// R, the Refusal (guide §4; GLOSSARY.md "Refusal"; build ticket 04): why the game refuses a choice, worded true for
// this Build. W records each refusal as data (engine/walk/failure.ts); this is the only place its wording forms, so
// a wording change leaves every status as it was. The words are our own (ADR 0006): the game's display names, and
// nothing else of its text.
import { placeKey, slotKey, withPick, type Build, type Pick, type Place, type SlotId } from './build';
import type { CheckedData } from './data/load';
import { isShown, type Guid, type StatType } from './data/types';
import { buildGrantIndex, grantorKind, type GrantIndex, type GrantParam } from './grants';
import { conditionFacts } from './prerequisites';
import type { FailedRule, Rule, Unmet, Value } from './walk/failure';
import type { Unit } from './walk/unit';
import { pauseAt, walk } from './walk/walk';

/** One refused choice, worded: the rule's reason, and each unmet prerequisite. */
export interface Refusal {
  readonly rule: Rule;
  /** Why, in one sentence. */
  readonly text: string;
  /** Each prerequisite that didn't hold, in one sentence each, in the game's order. */
  readonly unmet: readonly string[];
}

/** What R reads besides the refusal: the data, G, and the character the refusal was judged on. */
export interface Wording {
  readonly data: CheckedData;
  readonly G: GrantIndex;
  readonly unit?: Unit;
}

/**
 * Words one refusal (a walk Failure, or a picker's closed option). The All group's unmet leaves are a line each; the
 * others (Any, ForcedTrue), of which one would do, share a line.
 */
export function refusal(w: Wording, failed: FailedRule): Refusal {
  const unmet = failed.unmet ?? [];
  const all = unmet.filter((u) => u.leaf.Group === 'All').map((u) => unmetText(w, u));
  const any = unmet.filter((u) => u.leaf.Group !== 'All').map((u) => unmetText(w, u).replace(/\.$/, ''));
  const either = any.length === 0 ? [] : any.length === 1 ? [`${any[0]}.`] : [`One of these: ${any.join('; ')}.`];
  return { rule: failed.rule, text: ruleText(w, failed), unmet: [...all, ...either] };
}

/** The note an option allowed only with the Gear counted carries (ADR 0002): the items it needs. */
export function gearNote(data: CheckedData, items: readonly Guid[]): string {
  return `Allowed only with the Gear counted: needs ${list(items.map((i) => nameOf(data, i)))}.`;
}

// ---- names -------------------------------------------------------------------------------------------------------

/** A blueprint's display name; one the game never names reads as its asset name, marked as internal (map 19). */
export function nameOf(data: CheckedData, guid: Guid | string): string {
  const bp = data.blueprints.get(guid);
  if (bp === undefined) return guid;
  return bp.name ?? `${bp.assetName} (internal)`;
}

/** `FooBar` as `foo bar`. */
const words = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2');

/** The skills whose names carry a subject in brackets. */
const BRACKETED: Readonly<Record<string, string>> = {
  KnowledgeArcana: 'Knowledge (Arcana)',
  KnowledgeWorld: 'Knowledge (World)',
  LoreNature: 'Lore (Nature)',
  LoreReligion: 'Lore (Religion)',
};

/** A stat's name: an ability, a skill, the base attack bonus or a save. */
export function statName(stat: StatType | string): string {
  if (stat === 'BaseAttackBonus') return 'base attack bonus';
  if (stat.startsWith('Save')) return stat.slice(4);
  if (stat.startsWith('Skill')) {
    const skill = stat.slice(5);
    return BRACKETED[skill] ?? words(skill);
  }
  return words(stat);
}

/** A grantor kind (G's `grantorKind`: a FeatureGroup or a blueprint type) as a noun. */
const KIND_NOUN: Readonly<Record<string, string>> = {
  Deities: 'deity',
  BloodLine: 'bloodline',
  BloodragerBloodline: 'bloodrager bloodline',
  ReplaceSpellbook: 'spellbook to advance',
  KineticBlast: 'kinetic blast',
  KineticElementalFocus: 'kinetic element',
  Feat: 'feat',
  DruidDomain: 'domain',
  Domain: 'domain',
  OracleRevelation: 'revelation',
  ShamanSpirit: 'spirit',
  BlueprintCharacterClass: 'class',
  BlueprintArchetype: 'archetype',
  BlueprintProgression: 'class feature',
  BlueprintFeature: 'feature',
  BlueprintFeatureSelection: 'feature',
};
const kindNoun = (kind: string) => KIND_NOUN[kind] ?? words(kind.replace(/^Blueprint/, '')).toLowerCase();

const article = (noun: string) => (/^[aeiou]/.test(noun) ? `an ${noun}` : `a ${noun}`);

/** Up to 3 names, then "and N more". */
function list(names: readonly string[]): string {
  const shown = names.slice(0, 3);
  const more = names.length - shown.length;
  const head = shown.length <= 1 ? (shown[0] ?? '') : `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}`;
  return more > 0 ? `${shown.join(', ')} and ${more} more` : head;
}

/**
 * A fact as a prerequisite names it (map 19): its display name; for a fact the player never sees, the one kind of
 * thing that grants it ("a deity that allows it (yours, Asmodeus, doesn't)"), else up to 3 grantors the Build can
 * reach, else its asset name marked as internal.
 */
function factName(w: Wording, fact: Guid): string {
  const bp = w.data.blueprints.get(fact);
  if (bp === undefined || isShown(bp)) return nameOf(w.data, fact);
  const byKind = w.G.namedGrantorsByKind(fact);
  const [kind] = [...byKind.keys()];
  // One kind of thing that is a FeatureGroup (deities, bloodlines…); a blueprint type says too little to word by.
  if (byKind.size === 1 && kind !== undefined && !kind.startsWith('Blueprint')) {
    const noun = kindNoun(kind);
    const yours =
      w.unit === undefined
        ? []
        : [...w.unit.facts()].filter((f) => {
            const held = w.data.blueprints.get(f.blueprint);
            return held !== undefined && isShown(held) && grantorKind(held) === kind;
          });
    const mine = yours.length === 0 ? '' : ` (yours, ${list(yours.map((f) => nameOf(w.data, f.blueprint)))}, doesn't)`;
    return `${article(noun)} that allows it${mine}`;
  }
  const grantors = [...byKind.values()].flat();
  if (grantors.length > 0) return `one of ${list(grantors.map((g) => nameOf(w.data, g)))}`;
  return nameOf(w.data, fact);
}

// ---- unmet prerequisites ------------------------------------------------------------------------------------------

const has = (u: Unmet) => (u.found === undefined ? '' : ` (yours: ${u.found})`);

/** One unmet leaf, worded for this Build: what it asks, and what the character has where it counts. */
export function unmetText(w: Wording, u: Unmet): string {
  const { leaf } = u;
  const n = leaf.names;
  const forbids = leaf.polarity === 'forbids';
  switch (n.kind) {
    case 'fact':
      return forbids ? `Not with ${factName(w, n.m_Feature)}.` : `Needs ${factName(w, n.m_Feature)}.`;
    case 'facts': {
      const names = list(n.m_Features.map((f) => factName(w, f)));
      if (forbids) return `Not with any of ${names}.`;
      return u.needed !== undefined && u.needed > 1
        ? `Needs ${u.needed} of ${names}${has(u)}.`
        : `Needs one of ${names}.`;
    }
    case 'classLevel':
      return forbids
        ? n.Level <= 1
          ? `Not with levels in ${nameOf(w.data, n.m_CharacterClass)}.`
          : `Needs fewer than ${n.Level} levels of ${nameOf(w.data, n.m_CharacterClass)}${has(u)}.`
        : `Needs ${nameOf(w.data, n.m_CharacterClass)} level ${n.Level}${has(u)}.`;
    case 'archetypeLevel':
      return forbids
        ? `Not with the ${nameOf(w.data, n.m_Archetype)} archetype.`
        : `Needs ${nameOf(w.data, n.m_Archetype)} level ${n.Level}${has(u)}.`;
    case 'stat':
      return `Needs ${statName(n.Stat)} ${n.Value}${has(u)}.`;
    case 'characterLevel':
      return `Needs character level ${n.Level}${has(u)}.`;
    case 'mythicLevel':
      return `Needs Mythic rank ${n.Level}${has(u)}.`;
    case 'alignment': {
      const allowed = typeof n.Alignment === 'number' ? `alignment mask ${n.Alignment}` : words(n.Alignment);
      const yours = w.unit?.alignment === undefined ? '' : ` (yours: ${words(w.unit.alignment)})`;
      return `Needs an alignment of ${allowed}${yours}.`;
    }
    case 'proficiency': {
      const items = list([
        ...n.ArmorProficiencies.map((a) => `${words(a)} armour`),
        ...n.WeaponProficiencies.map(words),
      ]);
      return forbids ? `Not when proficient with all of ${items}.` : `Needs proficiency with ${items}.`;
    }
    case 'casterType': {
      const type = n.IsArcane ? 'arcane' : 'divine';
      const spontaneous = n.OnlySpontaneous ? 'spontaneous ' : '';
      return n.RequiredSpellLevel === null
        ? `Needs ${type} spells.`
        : `Needs ${spontaneous}${type} spells of level ${n.RequiredSpellLevel}${has(u)}.`;
    }
    case 'classSpellLevel':
      return `Needs ${nameOf(w.data, n.m_CharacterClass)} spells of level ${n.RequiredSpellLevel}${has(u)}.`;
    case 'parametrizedFeature': {
      const param = n.ParameterType === 'SpellSchool' ? n.SpellSchool : words(n.WeaponCategory);
      return `Needs ${nameOf(w.data, n.m_Feature)} (${param}).`;
    }
    case 'weaponSubCategory':
      return `Needs ${nameOf(w.data, n.m_Feature)} with a weapon of the ${words(n.SubCategory).toLowerCase()} kind.`;
    case 'selectionPossible':
      return `Needs an option of ${nameOf(w.data, n.m_ThisFeature)} still open.`;
    case 'pet':
      return forbids ? `Not with a ${words(n.Type).toLowerCase()} pet.` : `Needs a ${words(n.Type).toLowerCase()} pet.`;
    case 'isPet':
      return forbids ? 'A pet can’t take it.' : 'Only a pet can take it.';
    case 'mainCharacter':
      return forbids ? 'Only a companion can take it.' : 'Only the main character can take it.';
    case 'story':
      return 'Needs a story event.';
    case 'spellsInSpellbook':
      return `Needs a spell for ${nameOf(w.data, n.m_SpellSpecializationFeat)}; feats taken for a spell aren't in the planner yet.`;
    case 'condition': {
      const facts = conditionFacts(n.Condition);
      return facts.length === 0
        ? 'Needs a condition the game checks.'
        : `Needs a condition on ${list(facts.map((f) => factName(w, f)))}.`;
    }
  }
}

// ---- rules ------------------------------------------------------------------------------------------------------

const v = (x: Value | undefined): string =>
  x === undefined ? '' : Array.isArray(x) ? x.map(String).join(', ') : typeof x === 'boolean' ? String(x) : String(x);

/** One rule's reason, worded with the values it compared. */
export function ruleText(w: Wording, f: FailedRule): string {
  const name = (x: Value | undefined) => (typeof x === 'string' ? nameOf(w.data, x) : v(x));
  switch (f.rule) {
    case 'SelectRace.Check':
      return 'Not a race.';
    case 'BlueprintRace.GetRestrictedByArchetype':
      return `An archetype of the Build needs another race: ${list((Array.isArray(f.found) ? f.found : []).map((a) => nameOf(w.data, String(a))))}.`;
    case 'SelectRaceStat.Check':
      return "This race doesn't let you choose the ability its +2 goes to.";
    case 'StatsDistribution.CanAdd':
      return typeof f.needed === 'number' && f.needed > 18
        ? `The point buy spends ${v(f.found)} points of ${v(f.needed)}.`
        : `A score goes no higher than ${v(f.needed)} in the point buy (this one: ${v(f.found)}).`;
    case 'StatsDistribution.CanRemove':
      return `A score goes no lower than ${v(f.needed)} in the point buy (this one: ${v(f.found)}).`;
    case 'SpendAttributePoint.Check':
      return 'An ability increase comes only at every fourth character level.';
    case 'SpendSkillPoint.Check:skill':
      return 'Not a skill.';
    case 'SpendSkillPoint.Check:ranks':
      return `A skill holds at most one rank per character level (${v(f.needed)} here).`;
    case 'SpendSkillPoint.Check:points':
      return 'No skill points left at this level.';
    case 'SelectClass.Check:IsMythic':
      return f.needed === true ? 'A Mythic rank takes a Mythic class.' : 'A character level takes a non-Mythic class.';
    case 'BlueprintCharacterClass.MeetsPrerequisites':
      return f.unmet?.length ? "The class's prerequisites aren't met." : 'The class is at its highest level.';
    case 'UnitProgressionData.MaxCharacterLevel':
      return `The character level stops at ${v(f.needed)}.`;
    case 'adr0003.rankOrder':
      return `Mythic ranks come in order: this one is taken at level ${v(f.found)}, before the rank before it (level ${v(f.needed)}).`;
    case 'map31.legendEndsAscensions':
      return 'After Legend, no Mythic rank follows.';
    case 'map31.devilFrom':
      return 'Devil is open only from the Aeon or the Azata.';
    case 'AddArchetype.Check':
      return 'Not an archetype of this class.';
    case 'UnitProgressionData.CanAddArchetype':
      return "It can't join this class's other archetypes, or the class is past its first level.";
    case 'BlueprintArchetype.MeetsPrerequisites':
      return "The archetype's prerequisites aren't met.";
    case 'LevelUpState.AddSelection':
      return 'No such slot opens here.';
    case 'SelectFeature.Check:filled':
      return 'The slot already holds a pick.';
    case 'BlueprintFeatureSelection.CanSelect:selection':
      return "This slot doesn't take a feature.";
    case 'BlueprintFeatureSelection.CanSelect:m_AllFeatures':
      return 'Not an option of this slot.';
    case 'BlueprintFeatureSelection.CanSelect:MeetsPrerequisites':
      return f.unmet?.length ? "Its prerequisites aren't met." : 'Already held at its highest rank.';
    case 'BlueprintFeatureSelection.CanSelect:Ranks':
      return `Already held at its highest rank (${v(f.found)} of ${v(f.needed)}).`;
    case 'BlueprintFeatureSelection.CanSelect:Mode':
      return f.needed === 'OnlyNew'
        ? 'This slot takes only a feature not yet held.'
        : 'This slot only raises a feature already held.';
    case 'NestedFeatureSelectionUtils.AllNestedFeaturesUnavailable':
      return 'None of its own options is open.';
    case 'BlueprintParametrizedFeature.CanSelect:Items':
      return 'Not a choice this feat offers.';
    case 'BlueprintParametrizedFeature.CanSelect:SpellSchool':
      return 'Needs a spell school.';
    case 'BlueprintParametrizedFeature.CanSelect:held':
      return 'Already taken for this choice.';
    case 'BlueprintParametrizedFeature.CanSelect:m_Prerequisite':
      return `Needs ${name(f.needed)} for the same choice.`;
    case 'BlueprintParametrizedFeature.CanSelect:RequireProficiency':
      return `Needs proficiency with ${words(v(f.needed))}.`;
    case 'BlueprintParametrizedFeature.CanSelect:Disabled':
      return `The game doesn't offer ${words(v(f.found))} for this feat.`;
    case 'BlueprintParametrizedFeature.CanSelect:IParamPrerequisite':
      return `${words(v(f.found))} isn't allowed here: the game asks for that weapon in hand.`;
    case 'BlueprintParametrizedFeature.CanSelect:HasNoSuchFeature':
      return 'Already held.';
    case 'BlueprintParametrizedFeature.CanSelect:MeetsPrerequisites':
      return "The choice's own prerequisites aren't met.";
    case 'BlueprintFeatureSelectMythicSpellbook.CanSelect:Items':
      return 'Not an option of this slot.';
    case 'BlueprintFeatureSelectMythicSpellbook.CanSelect:spellbook':
      return `Needs ${name(f.needed)}, which the character doesn't have.`;
    case 'BlueprintFeatureSelectMythicSpellbook.CanSelect:m_AllowedSpellbooks':
      return `${name(f.found)} can't take Mythic spells here.`;
    case 'data.unknownItem':
      return 'Not an item the planner holds.';
    case 'ItemEntity.CanBeEquippedBy':
      return "The character can't wear it.";
    case 'EquipmentSlot.IsItemSupported':
    case 'ArmorSlot.IsItemSupported':
      return "It doesn't go in this place.";
    case 'HandSlot.IsItemTypeSupported:shield':
      return 'A shield goes in the off hand.';
    case 'HandSlot.IsItemTypeSupported:type':
      return 'A hand holds a weapon or a shield.';
    case 'HandSlot.IsItemTypeSupported:oneHanded':
      return 'An off-hand weapon is one-handed.';
    case 'HandSlot.IsItemSupported:twoHanded':
      return 'A two-handed weapon leaves the off hand empty.';
    case 'EquipmentRestrictionClass.CanBeEquippedBy':
      return f.needed === 0
        ? 'Not with levels in the class the item forbids.'
        : 'Needs a level in the class the item asks for.';
    case 'EquipmentRestrictionHasAnyClassFromList.CanBeEquippedBy':
      return f.found === true
        ? 'Not with levels in the classes the item forbids.'
        : 'Needs a level in one of the classes the item asks for.';
    case 'EquipmentRestrictionAlignment.CanBeEquippedBy':
      return `Needs an alignment of ${words(v(f.needed))} (yours: ${words(v(f.found))}).`;
    case 'ItemEntityWeapon.CanBeEquippedInternal':
      return `Needs proficiency with ${words(v(f.needed))}.`;
    case 'ItemEntityArmor.CanBeEquippedInternal':
    case 'ItemEntityShield.CanBeEquippedInternal':
      return `Needs proficiency with ${words(v(f.needed)).toLowerCase()} armour.`;
    case 'map32.notAToggle':
      return 'Not an aspect that can be kept on.';
    case 'map32.notHeld':
      return "The character doesn't have this aspect.";
    case 'ActivatableAbility.TryStart':
      return `Its group holds ${v(f.needed)} aspect${f.needed === 1 ? '' : 's'} at a time.`;
  }
}

// ---- what a closed option would break, and where it opens ------------------------------------------------------

/** The picks a walk refuses, by slot key. */
function refusedPicks(data: CheckedData, build: Build, G: GrantIndex): ReadonlySet<string> {
  return new Set(
    walk(data, build, G)
      .failures.filter((f) => f.choice === 'pick' && f.slot !== undefined)
      .map((f) => slotKey(f.slot as SlotId)),
  );
}

/**
 * The later picks taking `pick` would break: those the walk refuses with it in its slot that it accepts now
 * (re-walking the Build with it swapped in). Worked out only when asked, for one option.
 */
export function breaks(data: CheckedData, build: Build, pick: Pick, G: GrantIndex = buildGrantIndex(data)): Pick[] {
  const before = refusedPicks(data, build, G);
  const swapped = withPick(build, pick);
  const after = refusedPicks(data, swapped, G);
  const own = slotKey(pick.slot);
  return swapped.picks.filter((p) => {
    const key = slotKey(p.slot);
    return key !== own && after.has(key) && !before.has(key);
  });
}

/**
 * The first later place where the option opens: the next slot of the same selection, in the Build's order, whose
 * walk paused there accepts it. Undefined when no later slot of this Build does.
 */
export function opensAt(
  data: CheckedData,
  build: Build,
  slot: SlotId,
  option: { readonly feature: Guid; readonly param?: GrantParam },
  G: GrantIndex = buildGrantIndex(data),
): Place | undefined {
  const slots = walk(data, build, G).slots;
  const at = slots.findIndex((s) => slotKey(s.id) === slotKey(slot));
  for (const later of slots.slice(at + 1)) {
    if (later.id.selection !== slot.selection || placeKey(later.id.place) === placeKey(slot.place)) continue;
    const paused = pauseAt(data, build, later.id, G);
    if (paused?.judge(option.feature, option.param) === undefined && paused !== undefined) return later.id.place;
  }
  return undefined;
}
