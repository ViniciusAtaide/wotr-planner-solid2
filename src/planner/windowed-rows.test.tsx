import { describe, expect, test } from 'vitest';

import { windowOf } from './WindowedRows';

describe('windowOf', () => {
  test('with no layout it renders every row', () => {
    expect(windowOf(0, 0, 0, 258)).toEqual({ start: 0, end: 258, row: 0 });
  });

  test('at the top it renders the rows in view plus the overscan below', () => {
    expect(windowOf(0, 507, 78, 258, 6)).toEqual({ start: 0, end: 13, row: 78 });
  });

  test('scrolled down it renders the overscan on both sides', () => {
    expect(windowOf(2000, 507, 78, 258, 6)).toEqual({ start: 19, end: 39, row: 78 });
  });

  test('at the bottom it stops at the last row', () => {
    expect(windowOf(19_617, 507, 78, 258, 6)).toEqual({ start: 245, end: 258, row: 78 });
  });
});
