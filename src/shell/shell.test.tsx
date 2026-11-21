import { render, screen } from '@solidjs/testing-library';
import { describe, expect, test } from 'vitest';

import { Shell } from './Shell';

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
