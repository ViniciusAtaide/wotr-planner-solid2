import { createSignal, onSettled } from 'solid-js';

import Button from './design/Button';

/** Where the chosen theme is remembered. Document.tsx reads it before the first paint. */
export const THEME_KEY = 'ww-theme';

type Theme = 'dark' | 'light';

/**
 * The header's theme switch (design system: Worldwound, dark, is first; Parchment is its light twin). It sets
 * `data-theme` on <html> and remembers the choice; storage that throws (a private window) only loses the memory.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = createSignal<Theme>('dark');
  onSettled(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  });
  const toggle = () => {
    const next: Theme = theme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // No storage here: the theme still switches for this page.
    }
  };
  return (
    <Button variant="ghost" onClick={toggle}>
      {theme() === 'dark' ? 'Parchment theme' : 'Worldwound theme'}
    </Button>
  );
}
