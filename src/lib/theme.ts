import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

export function useDarkTheme() {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme === 'dark',
    // Build-time rendering has no document; the page script picks the theme.
    () => false,
  );
}

export function setDarkTheme(dark: boolean) {
  const theme = dark ? 'dark' : 'light';
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  try {
    window.localStorage.setItem('site-theme', theme);
  } catch {
    // Private windows can block storage; the theme still applies.
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#0e0e0e' : '#fbfbfb');
  // Mobile Safari picks its top bar color from the fixed edge strip when it
  // first appears and keeps it after the color changes. Dropping the strip for
  // a frame makes Safari read it again in the new theme.
  const edges = document.querySelectorAll<HTMLElement>('.edge-fade');
  edges.forEach((edge) => (edge.style.display = 'none'));
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      edges.forEach((edge) => (edge.style.display = '')),
    ),
  );
}
