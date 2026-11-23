import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, within } from '@solidjs/testing-library';
import { describe, expect, test } from 'vitest';

import { LICENCE_PATH, Shell } from './Shell';

describe('the shell header', () => {
  test('names the app in full, with "WP" ready for phones and the full name as its accessible name', () => {
    render(() => (
      <Shell home="/">
        <main>Page</main>
      </Shell>
    ));
    const link = screen.getByRole('link', { name: 'Worldwound Planner' });
    expect(link.querySelector('.app-header__full')?.textContent).toBe('Worldwound Planner');
    expect(link.querySelector('.app-header__short')?.textContent).toBe('WP');
    expect(link.querySelector('.app-header__short')).toHaveAttribute('aria-hidden', 'true');
  });

  test('keeps a centre slot that a page fills, such as the Build’s name', () => {
    render(() => (
      <Shell home="/">
        <main>Page</main>
      </Shell>
    ));
    const slot = document.getElementById('app-header-center');
    expect(slot?.closest('header')).not.toBeNull();
    expect(slot?.previousElementSibling?.matches('.app-header__name')).toBe(true);
  });
});

describe('the shell footer', () => {
  test('credits the game mechanics and links the Open Game License the site serves', () => {
    const { container } = render(() => (
      <Shell home="/">
        <main>Page</main>
      </Shell>
    ));
    const footer = within(container).getByRole('contentinfo');
    expect(footer).toHaveTextContent('Open Game Content from Pathfinder: Wrath of the Righteous');
    expect(footer).toHaveTextContent('Owlcat Games');
    expect(footer).toHaveTextContent('Paizo');
    const link = within(footer).getByRole('link', { name: 'Open Game License v1.0a' });
    expect(link).toHaveAttribute('href', LICENCE_PATH);
  });

  test('the licence file holds the licence and its Section 15, with Owlcat’s line and ours', () => {
    const licence = readFileSync(join(process.cwd(), 'public/open-game-license.txt'), 'utf8');
    for (const needle of [
      'OPEN GAME LICENSE Version 1.0a',
      '14. Reformation:',
      '15. COPYRIGHT NOTICE',
      'Open Game License v 1.0a Copyright 2000, Wizards of the Coast, Inc.',
      'Pathfinder: Wrath of the Righteous CRPG Reference Document,© 2020, Owlcat Games LTD',
      'WotR Planner, a build planner',
      'the game mechanics in `data/`',
    ]) {
      expect(licence).toContain(needle);
    }
  });
});
