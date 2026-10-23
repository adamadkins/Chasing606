import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

// A deliberately small client-side router: History API navigation, hash
// scrolling, and scroll restoration for back/forward. Real <a href> links keep
// working without it (open in new tab, no JS, crawlers).

const RouterContext = createContext(null);
const SCROLL_KEY = 'chasing606-scroll';

export const normalizePath = path => path.replace(/\/+$/, '') || '/';

const readLocation = () => ({ path: normalizePath(window.location.pathname), search: window.location.search, hash: window.location.hash });

const isInternal = href => typeof href === 'string' && href.startsWith('/') && !href.startsWith('//');

function loadScrollPositions() {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveScrollPositions(positions) {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(positions));
  } catch {
    // Storage can be unavailable (private mode); scroll restoration is optional.
  }
}

const entryKey = () => window.history.state?.key ?? 'initial';

function scrollToTarget(hash) {
  const id = decodeURIComponent(hash.slice(1));
  const target = id && document.getElementById(id);
  if (target) target.scrollIntoView();
  else window.scrollTo({ top: 0, behavior: 'instant' });
}

export function Router({ children }) {
  const [location, setLocation] = useState(readLocation);
  const navigationType = useRef('initial');
  const positions = useRef(null);

  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    positions.current = loadScrollPositions();
    // Give the first entry a key like every entry we create ourselves.
    if (!window.history.state?.key) window.history.replaceState({ key: 'initial' }, '');
    const remember = () => {
      positions.current[entryKey()] = window.scrollY;
      saveScrollPositions(positions.current);
    };
    const onPopState = () => {
      // Entries without our key come from the browser following a plain #anchor link,
      // which has already scrolled to the right place.
      navigationType.current = window.history.state?.key ? 'pop' : 'anchor';
      setLocation(readLocation());
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('pagehide', remember);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('pagehide', remember);
    };
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    const url = new URL(to, window.location.origin);
    if (url.origin !== window.location.origin) {
      window.location.assign(url.href);
      return;
    }
    if (!replace && positions.current) {
      positions.current[entryKey()] = window.scrollY;
      saveScrollPositions(positions.current);
    }
    const state = { key: Math.random().toString(36).slice(2) };
    window.history[replace ? 'replaceState' : 'pushState'](state, '', url.pathname + url.search + url.hash);
    navigationType.current = replace ? 'replace' : 'push';
    setLocation(readLocation());
  }, []);

  // After the new page renders: restore, jump to a #hash, or start at the top.
  useLayoutEffect(() => {
    const type = navigationType.current;
    if (type === 'anchor') { navigationType.current = 'settled'; return; }
    const saved = positions.current?.[entryKey()];
    if (type === 'pop' || type === 'initial') {
      if (saved !== undefined && !(type === 'initial' && location.hash)) window.scrollTo({ top: saved, behavior: 'instant' });
      else if (location.hash) scrollToTarget(location.hash);
      else window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (location.hash) {
      scrollToTarget(location.hash);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    navigationType.current = 'settled';
  }, [location]);

  const value = useMemo(() => ({ ...location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const value = useContext(RouterContext);
  if (!value) throw new Error('useRouter must be used inside <Router>');
  return value;
}

/** Drop-in <a> that navigates client-side for same-site paths. */
export function Link({ href, onClick, children, ...rest }) {
  const { navigate } = useRouter();
  const handleClick = event => {
    onClick?.(event);
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (event.defaultPrevented || event.button !== 0 || modified || rest.target === '_blank' || !isInternal(href)) return;
    event.preventDefault();
    navigate(href);
  };
  return <a href={href} onClick={handleClick} {...rest}>{children}</a>;
}
