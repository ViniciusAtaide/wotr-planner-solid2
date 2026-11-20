// Before the first paint: the theme the reader chose last time (src/components/ThemeToggle.tsx THEME_KEY), if storage
// allows. Without it the page stays on Worldwound, the dark first theme (<html data-theme="dark">).
try {
  var theme = localStorage.getItem('ww-theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch (e) {
  // No storage here: the page keeps the dark theme.
}
