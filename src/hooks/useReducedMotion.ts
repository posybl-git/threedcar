'use client';

import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/** True when the user asked the OS for reduced motion. Live-updates. */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Non-hook read for use inside frame loops / event handlers. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia(query).matches;
}
