import {
  refGuid,
  type BlueprintArchetype,
  type BlueprintCharacterClass,
  type BlueprintSpellbook,
  type BlueprintSpellsTable,
  type Guid,
  type SkipLevelsForSpellProgression,
} from '../data';
import type { Unit } from './unit';

export const spellbookTypes = ['AddSpellbookLevel', 'SkipLevelsForSpellProgression', 'IsAlchemistSpellbook'] as const;

export interface SpellbookData {
  base: number;
  mythic: number;
  merged: boolean;
}

export function demand(unit: Unit, spellbook: Guid): SpellbookData {
  let data = unit.spellbooks.get(spellbook);
  if (data === undefined) unit.spellbooks.set(spellbook, (data = { base: 0, mythic: 0, merged: false }));
  return data;
}

export function classSpellbook(unit: Unit, cls: Guid, archetypes: readonly Guid[]): Guid | undefined {
  let spellbook = refGuid((unit.bp(cls) as BlueprintCharacterClass | undefined)?.m_Spellbook);
  for (const a of archetypes) {
    const archetype = unit.bp(a) as BlueprintArchetype | undefined;
    if (archetype?.RemoveSpellbook) spellbook = undefined;
    else if (archetype?.m_ReplaceSpellbook) spellbook = refGuid(archetype.m_ReplaceSpellbook);
  }
  return spellbook;
}

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

function count(table: BlueprintSpellsTable, classLevel: number, spellLevel: number): number {
  if (classLevel < 0 || spellLevel < 0) return -1;
  const entry = table.Levels[classLevel] ?? table.Levels.at(-1);
  return entry === undefined || entry.Count.length <= spellLevel ? -1 : (entry.Count[spellLevel] ?? -1);
}

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

export function hasCasterType(unit: Unit, arcane: boolean): boolean {
  return unit.classes.some((c) => {
    const bp = c.spellbook === undefined ? undefined : (unit.bp(c.spellbook) as BlueprintSpellbook | undefined);
    return bp !== undefined && bp.IsArcane === arcane;
  });
}

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

export function classSpellLevel(unit: Unit, cls: Guid): number | undefined {
  const spellbook = unit.classData(cls)?.spellbook;
  return spellbook === undefined ? undefined : maxSpellLevel(unit, spellbook);
}
