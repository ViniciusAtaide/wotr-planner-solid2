import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { readDataDir } from '~engine/data-dir';
import { loadData } from '~engine/load';

import { categoryOfTags, featCategory } from './feat-category';

const files = readDataDir(join(process.cwd(), 'data'));
const data = loadData(files.files, files.overrides);

describe("a feat's icon comes from the game's own feature tags", () => {
  test.each([
    ['PowerAttackFeature', '9972f33f977fc724c838e59641b2fca5', 'Weapon'],
    ['Toughness', 'd09b20029e9abfe4480b356c92095623', 'ArmourAndShield'],
    ['Outflank', '422dab7309e1ad343935f33a4d6e9f11', 'Teamwork'],
    ['ExtendSpellFeat', 'f180e72e4a9cbaa4da8be9bc958132ef', 'Magic'],
    ['PointBlankShot', '0da0c194d6e1d43419eb8d990b28e0ab', 'Ranged'],
    ['ImprovedTrip', '0f15c6f70d8fb2b49aa6cc24239cc5fa', 'CombatManoeuvres'],
    ['CraneStyleFeat', '0c17102f650d9044290922b0fad9132f', 'UnarmedCombat'],
    ['MountedCombat', 'f308a03bea0d69843a8ed0af003d47a9', 'MountedCombat'],
    ['IronWill', '175d1577bb6c9a04baf88eec99c66334', 'ArmourAndShield'],
  ])('%s %s is %s', (_, guid, category) => {
    expect(featCategory(data, guid)).toBe(category);
  });

  test('a feature the game gives no tags has no icon', () => {
    expect(featCategory(data, '7d300f497584d9245ac24c062dce0bd6')).toBeUndefined();
  });

  test('the first category that fits wins, and a feat with no tag is Miscellaneous', () => {
    expect(categoryOfTags([])).toBe('Miscellaneous');
    expect(categoryOfTags(['Skills'])).toBe('Skill');
    expect(categoryOfTags(['Attack', 'Melee', 'Ranged', 'ClassSpecific'])).toBe('Class');
  });
});
