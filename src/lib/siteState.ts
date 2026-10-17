import { useSyncExternalStore } from 'react';
import type { WeatherEffect } from '@/lib/useStPeteWeather';

export type Sky = 'live' | WeatherEffect;

type SiteState = {
  menu: boolean;
  sky: Sky;
  sound: boolean;
  // Interface sounds (drawers, navigation); on unless the visitor muted them.
  uiSound: boolean;
};

let state: SiteState = {
  menu: false,
  sky: 'live',
  sound: false,
  uiSound: readUiSound(),
};

function readUiSound() {
  try {
    return window.localStorage.getItem('site-ui-sound') !== 'off';
  } catch {
    // No storage (private window, or build-time rendering): keep the default.
    return true;
  }
}
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function setSiteState(patch: Partial<SiteState>) {
  state = { ...state, ...patch };
  if ('uiSound' in patch) {
    try {
      window.localStorage.setItem(
        'site-ui-sound',
        state.uiSound ? 'on' : 'off',
      );
    } catch {
      // The choice still applies for this visit.
    }
  }
  listeners.forEach((listener) => listener());
}

export function getSiteState() {
  return state;
}

export function useSiteState() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export const menuShortcut = /Mac|iPhone|iPad/.test(navigator.userAgent)
  ? '⌘K'
  : 'Ctrl K';
