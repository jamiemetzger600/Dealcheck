import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query. SSR-safe (defaults to false when window is undefined).
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export const MOBILE_MAX_WIDTH_PX = 767;

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`);
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}

export function useOrientation() {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  return { isPortrait, isLandscape };
}

/** Start of local calendar day as ISO string (for daily deck filter). */
export function startOfLocalDayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
