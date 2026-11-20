// Spellbooks as prerequisite gates (guide §7 "Spellbooks, as gates"; spells themselves are phase 2). A class's
// spellbook is ClassData.Spellbook; its levels come from ApplySpellbook at each class level and from
// AddSpellbookLevel; the caster prerequisites read its MaxSpellLevel. Paths are under
// decompiled/Assembly-CSharp/Kingmaker/.
import {
  refGuid,
  type BlueprintArchetype,
  type BlueprintCharacterClass,
  type BlueprintSpellbook,
  type BlueprintSpellsTable,
  type Guid,
  type SkipLevelsForSpellProgression,
} from '../data/types';
import type { Unit } from './unit';

/** The component types this area reads. */
export const spellbookTypes = ['AddSpellbookLevel', 'SkipLevelsForSpellProgression', 'IsAlchemistSpellbook'] as const;

/** UnitLogic/Spellbook.cs: the counters a spellbook keeps. */
export interface SpellbookData {
  /** m_BaseLevelInternal. */
  base: number;
  /** m_MythicLevelInternal. */
  mythic: number;
  /** m_Type is Mythic: a Mythic spell list joined it (AddSpecialList). */
  merged: boolean;
}

/** UnitDescriptor.DemandSpellbook: the spellbook's counters, made on first use. */
export function demand(unit: Unit, spellbook: Guid): SpellbookData {
  let data = unit.spellbooks.get(spellbook);
  if (data === undefined) unit.spellbooks.set(spellbook, (data = { base: 0, mythic: 0, merged: false }));
  return data;
}

/** UnitLogic/ClassData.cs constructor and AddArchetype: the class's spellbook, which an archetype removes or replaces. */
export function classSpellbook(unit: Unit, cls: Guid, archetypes: readonly Guid[]): Guid | undefined {
  let spellbook = refGuid((unit.bp(cls) as BlueprintCharacterClass | undefined)?.m_Spellbook);
  for (const a of archetypes) {
    const archetype = unit.bp(a) as BlueprintArchetype | undefined;
    if (archetype?.RemoveSpellbook) spellbook = undefined;
    else if (archetype?.m_ReplaceSpellbook) spellbook = refGuid(archetype.m_ReplaceSpellbook);
  }
  return spellbook;
}

/**
 * UnitLogic/Class/LevelUp/Actions/ApplySpellbook.cs Apply, with Spellbook.AddLevelFromClass: a class level raises the
 * class's spellbook, except at the levels its SkipLevelsForSpellProgression lists. A non-Mythic class adds a base
 * level; a Mythic class raises a Mythic spellbook to the Mythic rank (twice it, for a standalone one).
 */
export function applySpellbook(unit: Unit, cls: Guid, classLevel: number): void {
  const bp = unit.bp(cls) as BlueprintCharacterClass | undefined;
  const skip = bp?.Components.find((c) => c.$type === 'SkipLevelsForSpellProgression') as
    | SkipLevelsForSpellProgression
    | undefined;
  if (bp === undefined || skip?.Levels.includes(classLevel)) return;
  const spellbook = unit.classData(cls)?.spellbook;
  if (spellbook === undefined) return;
  const data = demand(unit, spellbook);
  if (!bp.IsMythic) {
    data.base++;
    return;
  }
  const standalone = (unit.bp(spellbook) as BlueprintSpellbook | undefined)?.IsMythic === true;
  if (standalone) data.base = Math.max(data.base, unit.mythicLevel * 2);
  else if (data.merged) data.mythic = Math.max(data.mythic, unit.mythicLevel);
}

/** BlueprintSpellsTable.GetCount: -1 off the table; a level past its end reads the last entry. */
function count(table: BlueprintSpellsTable, classLevel: number, spellLevel: number): number {
  if (classLevel < 0 || spellLevel < 0) return -1;
  const entry = table.Levels[classLevel] ?? table.Levels.at(-1);
  return entry === undefined || entry.Count.length <= spellLevel ? -1 : (entry.Count[spellLevel] ?? -1);
}

/**
 * Spellbook.MaxSpellLevel (GetMaxSpellLevel): the highest spell level its SpellsPerDay table gives at the caster level.
 * CasterLevel is BaseLevel, which the table's last level caps and CasterLevelModifier shifts, plus the Mythic share,
 * none while the rank is 3 or less and the last Mythic class has DontAddCasterLevels (GetMythicLevelForCasterLevel).
 * EnableSpellLevel10 is a Mythic ability's in-play flag and no gate asks for level 10, so it is left out.
 */
export function maxSpellLevel(unit: Unit, spellbook: Guid): number {
  const bp = unit.bp(spellbook) as BlueprintSpellbook | undefined;
  const table = unit.bp(refGuid(bp?.m_SpellsPerDay) ?? '') as BlueprintSpellsTable | undefined;
  if (bp === undefined || table === undefined) return -1;
  const data = demand(unit, spellbook);
  const maxCasterLevel = table.Levels.length - 1;
  const base = Math.max(0, Math.min(maxCasterLevel, data.base + bp.CasterLevelModifier));
  const lastMythic =
    unit.lastMythicClass === undefined ? undefined : (unit.bp(unit.lastMythicClass) as BlueprintCharacterClass);
  const mythicShare = unit.mythicLevel <= 3 && lastMythic?.DontAddCasterLevels ? 0 : data.mythic;
  const casterLevel = base + mythicShare;
  for (let level = 10; level >= 0; level--) if (count(table, casterLevel, level) >= 0) return level;
  return -1;
}

/** PrerequisiteCasterType.CheckInternal: some class's spellbook is arcane (or divine). */
export function hasCasterType(unit: Unit, arcane: boolean): boolean {
  return unit.classes.some((c) => {
    const bp = c.spellbook === undefined ? undefined : (unit.bp(c.spellbook) as BlueprintSpellbook | undefined);
    return bp !== undefined && bp.IsArcane === arcane;
  });
}

/**
 * PrerequisiteCasterTypeSpellLevel.GetCasterTypeSpellLevel: the best MaxSpellLevel among the classes' spellbooks of
 * the caster type, leaving out the alchemist's (IsAlchemistSpellbook) and Mythic ones, spontaneous only when asked;
 * undefined when there is none.
 */
export function casterTypeSpellLevel(unit: Unit, arcane: boolean, onlySpontaneous: boolean): number | undefined {
  let best: number | undefined;
  for (const c of unit.classes) {
    const bp = c.spellbook === undefined ? undefined : (unit.bp(c.spellbook) as BlueprintSpellbook | undefined);
    if (bp === undefined || bp.IsArcane !== arcane || bp.IsMythic || (onlySpontaneous && !bp.Spontaneous)) continue;
    if (bp.Components.some((x) => x.$type === 'IsAlchemistSpellbook')) continue;
    best = Math.max(best ?? 0, maxSpellLevel(unit, bp.guid));
  }
  return best;
}

/** PrerequisiteClassSpellLevel.GetClassSpellLevel: the class's spellbook's MaxSpellLevel; undefined without one. */
export function classSpellLevel(unit: Unit, cls: Guid): number | undefined {
  const spellbook = unit.classData(cls)?.spellbook;
  return spellbook === undefined ? undefined : maxSpellLevel(unit, spellbook);
}
