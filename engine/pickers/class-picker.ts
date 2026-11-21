import type { Build, Place } from '../build';
import type { CheckedData } from '../load';
import { isShown, refGuid, type Blueprint, type Guid } from '../data';
import { buildGrantIndex, type GrantIndex } from '../grants';
import { pauseAtClass, type FailedRule, type PausedClassChoice, type Unit } from '../walk';
import { offeredClasses, offeredMythicClasses } from './offers';
import { namesInList } from './option-names';

export interface ArchetypeOption {
  readonly archetype: Guid;
  readonly closed?: FailedRule;
  readonly name?: string;
  readonly qualifier?: string;
}

export interface ClassOption {
  readonly class: Guid;
  readonly shown: boolean;
  readonly closed?: FailedRule;
  readonly name?: string;
  readonly qualifier?: string;
  readonly archetypes: readonly ArchetypeOption[];
}

export interface ClassPicker {
  readonly place: Place;
  readonly options: readonly ClassOption[];
  readonly unit: Unit;
}

function shownAt(cls: Blueprint, refusals: readonly FailedRule[]): boolean {
  if (cls.$type !== 'BlueprintCharacterClass' || cls.HideInUI) return false;
  return !cls.HideIfRestricted || !refusals.some((r) => r.rule === 'BlueprintCharacterClass.MeetsPrerequisites');
}

function archetypesOf(data: CheckedData, cls: Blueprint, paused: PausedClassChoice): ArchetypeOption[] {
  if (cls.$type !== 'BlueprintCharacterClass') return [];
  const archetypes = cls.m_Archetypes
    .map((r) => refGuid(r))
    .filter((g): g is Guid => g !== undefined)
    .filter((g) => {
      const bp = data.blueprints.get(g);
      return bp !== undefined && isShown(bp);
    });
  const names = namesInList(data, archetypes);
  return archetypes.map((archetype) => {
    const closed = paused.judgeArchetype(cls.guid, archetype);
    return { archetype, ...names.get(archetype), ...(closed && { closed }) };
  });
}

export function classPicker(
  data: CheckedData,
  build: Build,
  place: Place,
  G: GrantIndex = buildGrantIndex(data),
  rankLevel?: number,
): ClassPicker | undefined {
  const paused = pauseAtClass(data, build, place, G, rankLevel);
  if (paused === undefined) return undefined;
  const candidates = 'rank' in place ? offeredMythicClasses(data) : offeredClasses(data);
  const names = namesInList(
    data,
    candidates.map((c) => c.guid),
  );
  return {
    place,
    unit: paused.unit,
    options: candidates.map((c) => {
      const refusals = paused.judge(c.guid);
      const closed = refusals[0];
      return {
        class: c.guid,
        shown: shownAt(c, refusals),
        ...names.get(c.guid),
        ...(closed && { closed }),
        archetypes: archetypesOf(data, c, paused),
      };
    }),
  };
}
