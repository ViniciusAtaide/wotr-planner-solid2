import { describe, expect, it } from 'vitest';
import { grantCoverageProblems, grantsAppliedElsewhere, readerProblems } from './coverage';
import { fieldGrantKinds, grantTypes } from '../grants';
import { appliedFieldGrants, appliedGrantTypes } from './walk';

describe('who applies the grants G reads', () => {
  const indexed = new Set<string>([...grantTypes, ...fieldGrantKinds]);
  const applied = new Set<string>([...appliedGrantTypes, ...appliedFieldGrants]);

  it("the walk, or a module listed with its reason, for G's grant components and its blueprints' own fields", () => {
    expect(grantCoverageProblems(indexed, applied, grantsAppliedElsewhere)).toEqual([]);
  });

  it('fails when the walk stops applying a field grant nothing lists', () => {
    const without = new Set([...applied].filter((k) => k !== 'shieldPart'));
    expect(grantCoverageProblems(indexed, without, grantsAppliedElsewhere)).toEqual([
      'shieldPart: G reads it, but neither the walk nor a listed module applies it',
    ]);
  });

  it('fails when G reads a grant type that neither the walk nor a listed module applies', () => {
    const indexed = new Set<string>([...grantTypes, 'AddFeatureToPet']);
    expect(grantCoverageProblems(indexed, appliedGrantTypes, grantsAppliedElsewhere)).toEqual([
      'AddFeatureToPet: G reads it, but neither the walk nor a listed module applies it',
    ]);
  });

  it('fails on a listing the walk has made stale', () => {
    const elsewhere = new Map([...grantsAppliedElsewhere, ['AddFacts', 'stale']]);
    expect(grantCoverageProblems(grantTypes, appliedGrantTypes, elsewhere)).toEqual([
      'AddFacts: listed as applied elsewhere, but the walk applies it',
    ]);
  });
});

describe('readerProblems', () => {
  const readers = new Map([
    ['P', ['PrerequisiteFeature']],
    ['G', ['AddFacts', 'AddPet']],
    ['walk: ability scores', ['AddPet', 'AddStatBonus']],
  ]);

  it('finds a type nobody reads, a type read twice, and a reader set holding a type the allowlist drops', () => {
    expect(readerProblems(['PrerequisiteFeature', 'AddFacts', 'AddPet', 'AddFeatureToPet'], readers)).toEqual([
      'AddPet: read by more than one of G, walk: ability scores',
      'AddFeatureToPet: allowlisted, but no module reads it',
      "AddStatBonus: walk: ability scores lists it, but the allowlist doesn't keep it",
    ]);
  });
});
