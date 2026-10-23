import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCatalog } from '../lib/catalog';

const STALE_AFTER_MS = 5 * 60 * 1000;
const CatalogContext = createContext(null);

/** Loads the shop catalog once, and quietly refreshes it when a long-idle tab comes back. */
export function CatalogProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', products: [] });
  const loadedAt = useRef(0);

  const load = useCallback(signal => {
    fetchCatalog(signal)
      .then(products => {
        loadedAt.current = Date.now();
        setState({ status: 'ready', products });
      })
      .catch(error => {
        if (error.name === 'AbortError') return;
        // Keep showing the last good catalog if a background refresh fails.
        setState(previous => (previous.status === 'ready' ? previous : { status: 'error', products: [] }));
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - loadedAt.current > STALE_AFTER_MS) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const value = useMemo(() => ({ ...state, retry: () => { setState({ status: 'loading', products: [] }); load(); } }), [state, load]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export default function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return value;
}
