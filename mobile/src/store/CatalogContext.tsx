import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { catalogService, type Catalog } from '../services';

interface CatalogState {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  catalog: Catalog;
  reload: () => void;
}

const empty: Catalog = { categories: [], products: [], packages: [], deliveryZones: [] };
const Ctx = createContext<CatalogState | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CatalogState['status']>('loading');
  const [error, setError] = useState<string>();
  const [catalog, setCatalog] = useState<Catalog>(empty);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setCatalog(await catalogService.getCatalog());
      setError(undefined);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(() => ({ status, error, catalog, reload: load }), [status, error, catalog, load]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCatalog must be used inside CatalogProvider');
  return v;
}
