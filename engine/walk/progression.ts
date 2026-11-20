// A progression's level and its level entries (guide §2 "Progression and level"): BlueprintProgression.CalcLevel and
// ProgressionData.CalculateLevelEntries, ported onto the walk's character.
import {
  refGuid,
  type BlueprintArchetype,
  type BlueprintCharacterClass,
  type BlueprintProgression,
  type Guid,
  type LevelEntry,
} from '../data/types';
import type { Unit } from './unit';

/** Blueprints/Classes/BlueprintProgression.cs CalcLevel. */
export function calcLevel(unit: Unit, p: BlueprintProgression): number {
  const archetypes = p.m_Archetypes;
  if (p.m_Classes.length === 0 && archetypes.length === 0) return unit.characterLevel;
  let level = 0;
  for (const ref of p.m_FeaturesRankIncrease ?? []) level += unit.rank(refGuid(ref) ?? '');
  const listed = new Set(archetypes.map((a) => refGuid(a.m_Archetype)));
  // A listed class counts only when none of its archetypes is listed; then the listed archetypes count instead.
  const classCounts = (cls: Guid) => {
    const bp = unit.bp(cls) as BlueprintCharacterClass | undefined;
    return !(bp?.m_Archetypes ?? []).some((a) => listed.has(refGuid(a)));
  };
  for (const c of p.m_Classes) {
    const cls = refGuid(c.m_Class) ?? '';
    if (classCounts(cls)) level += Math.max(0, unit.classLevel(cls) + c.AdditionalLevel);
  }
  for (const a of archetypes) {
    const archetype = refGuid(a.m_Archetype);
    for (const c of unit.classes) {
      if (archetype !== undefined && c.archetypes.includes(archetype)) {
        level += Math.max(0, c.level + a.AdditionalLevel);
      }
    }
  }
  let other = 0;
  if (p.ForAllOtherClasses) {
    const listedClasses = new Set(p.m_Classes.map((c) => refGuid(c.m_Class)));
    for (const c of unit.classes) {
      if (listedClasses.has(c.class) || c.archetypes.some((a) => listed.has(a))) continue;
      other += c.level;
    }
  } else {
    for (const c of p.m_AlternateProgressionClasses) {
      const cls = refGuid(c.m_Class) ?? '';
      if (classCounts(cls)) other += Math.max(0, unit.classLevel(cls) + c.AdditionalLevel);
    }
  }
  if (p.AlternateProgressionType === 'Div2') level += Math.trunc(other / 2);
  return level;
}

/**
 * UnitLogic/ProgressionData.cs CalculateLevelEntries: each archetype merged into the progression level by level, its
 * removes taken out (one occurrence each) and its adds put in; an archetype's add at a level the progression lacks
 * becomes an entry of its own.
 */
export function levelEntries(
  unit: Unit,
  p: BlueprintProgression,
  archetypes: readonly Guid[],
): readonly { readonly Level: number; readonly features: readonly Guid[] }[] {
  const features = (e: LevelEntry) => e.m_Features.map((r) => refGuid(r)).filter((g): g is Guid => g !== undefined);
  const arch = archetypes
    .map((a) => unit.bp(a))
    .filter((a): a is BlueprintArchetype => a?.$type === 'BlueprintArchetype');
  if (arch.length === 0) return p.LevelEntries.map((e) => ({ Level: e.Level, features: features(e) }));
  const entry = (list: readonly LevelEntry[], level: number) => list.find((e) => e.Level === level);
  const out: { Level: number; features: Guid[] }[] = [];
  for (const e of p.LevelEntries) {
    const list = features(e);
    for (const a of arch) {
      const removes = entry(a.RemoveFeatures, e.Level);
      for (const g of removes === undefined ? [] : features(removes)) {
        const i = list.indexOf(g);
        if (i >= 0) list.splice(i, 1);
      }
      const adds = entry(a.AddFeatures, e.Level);
      if (adds !== undefined) list.push(...features(adds));
    }
    if (list.length > 0) out.push({ Level: e.Level, features: list });
  }
  const extra = new Map<number, Guid[]>();
  for (const a of arch) {
    for (const add of a.AddFeatures) {
      if (add.m_Features.length === 0 || out.some((e) => e.Level === add.Level)) continue;
      extra.set(add.Level, [...(extra.get(add.Level) ?? []), ...features(add)]);
    }
  }
  for (const [Level, list] of extra) out.push({ Level, features: list });
  return out.sort((a, b) => a.Level - b.Level);
}

/**
 * UnitLogic/ProgressionData.cs CanAddArchetype: at most one archetype that changes the spellbook, and every remove
 * still present in the merged entries.
 */
export function canAddArchetype(unit: Unit, p: BlueprintProgression, held: readonly Guid[], archetype: Guid): boolean {
  const a = unit.bp(archetype);
  if (a?.$type !== 'BlueprintArchetype') return false;
  const changesSpellbook = (x: BlueprintArchetype) => x.m_ReplaceSpellbook !== null || x.RemoveSpellbook;
  if (changesSpellbook(a) && held.some((h) => changesSpellbook(unit.bp(h) as BlueprintArchetype))) return false;
  const merged = levelEntries(unit, p, held);
  for (const remove of a.RemoveFeatures) {
    const present = merged.find((e) => e.Level === remove.Level)?.features ?? [];
    for (const ref of remove.m_Features) {
      const g = refGuid(ref);
      const want = remove.m_Features.filter((r) => r === ref).length;
      if (want > present.filter((x) => x === g).length) return false;
    }
  }
  return true;
}
