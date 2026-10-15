import { useSyncExternalStore } from 'react';
import type { WeatherEffect } from '@/lib/useStPeteWeather';

export type Sky = 'live' | WeatherEffect;

type SiteState = {
  menu: boolean;
  sky: Sky;
  sound: boolean;
};

let state: SiteState = {
  menu: false,
  sky: 'live',
  sound: false,
};
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function setSiteState(patch: Partial<SiteState>) {
  state = { ...state, ...patch };
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
