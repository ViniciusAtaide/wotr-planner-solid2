import { describe, expect, it } from 'vitest';
import { FIELD_DEFAULTS } from '~engine/compact';
import { fieldDefaults } from './field-defaults';

describe('the compact document field defaults', () => {
  it('are exactly the allowlist specs’ defaults; run `bun tools/importer/field-defaults.ts` after changing the allowlist', () => {
    expect(FIELD_DEFAULTS).toEqual(fieldDefaults());
  });
});
