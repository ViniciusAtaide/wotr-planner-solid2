import { fileURLToPath } from 'node:url';
import { abilityScores, type Build, type LevelUp } from '../build';
import { loadData, type CheckedData } from '../load';
import { readDataDir } from '../data-dir';
import type { Blueprint, BlueprintFeature, BlueprintFeatureSelection, Component, Guid, StatType } from '../data';
import { buildGrantIndex, type GrantIndex } from '../grants';

const files = readDataDir(fileURLToPath(new URL('../../data', import.meta.url)));
export const data = loadData(files.files, files.overrides);
export const G = buildGrantIndex(data);

export const HUMAN = '0a5d473ead98b0646b94495af250fdc4';
export const FIGHTER = '48ac8db94d5de7645906c7d0ad3bcfbd';
export const FIGHTER_FEAT_SELECTION = '41c8486641f7d6d4283ca9dae4147a9f';
export const BASIC_FEAT_SELECTION = '247a4068296e8be42890143f451b4b45';
export const DODGE = '97e216dbb46ae3c4faef90cf6bbe6fd5';
export const DEX_BELT = 'b6af4c1834999e74497b41588d1071cd';
export const CHA_HEADBAND = 'a3e8e907908ca7a40ac6da78e70bf33d';

export const scores = (s: Partial<Record<'Strength' | 'Dexterity' | 'Charisma', number>> = {}) =>
  abilityScores({
    Strength: 10,
    Dexterity: 10,
    Constitution: 10,
    Intelligence: 10,
    Wisdom: 10,
    Charisma: 10,
    ...s,
  });

export const levels = (cls: Guid, n: number, extra: Partial<LevelUp> = {}): LevelUp[] =>
  Array.from({ length: n }, () => ({ class: cls, ...extra }));
export const build = (b: Partial<Build>): Build => ({ race: HUMAN, levels: [], picks: [], ...b });

export const ref = (guid: Guid): `!bp_${string}` => `!bp_${guid}`;

export function withBlueprints(...blueprints: Blueprint[]): { readonly data: CheckedData; readonly G: GrantIndex } {
  const map = new Map(data.blueprints);
  for (const bp of blueprints) map.set(bp.guid, bp);
  const changed = { ...data, blueprints: map };
  return { data: changed, G: buildGrantIndex(changed) };
}

export function feature(guid: Guid, assetName: string, components: readonly Component[]): BlueprintFeature {
  const dodge = data.blueprints.get(DODGE) as BlueprintFeature;
  return { ...dodge, guid, assetName, name: assetName, Components: components };
}

export function withOptions(selection: Guid, ...options: Guid[]): BlueprintFeatureSelection {
  const bp = data.blueprints.get(selection) as BlueprintFeatureSelection;
  return { ...bp, m_AllFeatures: [...bp.m_AllFeatures, ...options.map(ref)] };
}

export const needsStat = (Stat: StatType, Value: number): Component =>
  ({
    $type: 'PrerequisiteStatValue',
    Group: 'All',
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    Stat,
    Value,
  }) as Component;

export const needsFact = (fact: Guid): Component =>
  ({
    $type: 'PrerequisiteFeature',
    Group: 'All',
    CheckInProgression: false,
    IsFeatureSelectionWhiteList: false,
    m_Feature: ref(fact),
  }) as Component;

export const addFacts = (...facts: Guid[]): Component =>
  ({
    $type: 'AddFacts',
    m_Facts: facts.map(ref),
    HasDifficultyRequirements: false,
    InvertDifficultyRequirements: false,
    MinDifficulty: 'Story',
  }) as Component;
