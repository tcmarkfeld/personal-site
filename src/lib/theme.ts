import { useSyncExternalStore } from 'react';
import { playSound } from '@/lib/uiSounds';

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
  playSound(dark ? 'lightsOff' : 'lightsOn');
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
  // Mobile Safari reads the top edge's color (html's background, since the fade
  // has no background color) on repaint and misses a theme change. Dropping the
  // fixed fade for a frame makes it read the new color.
  const edges = document.querySelectorAll<HTMLElement>('.edge-fade');
  edges.forEach((edge) => (edge.style.display = 'none'));
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      edges.forEach((edge) => (edge.style.display = '')),
    ),
  );
}
