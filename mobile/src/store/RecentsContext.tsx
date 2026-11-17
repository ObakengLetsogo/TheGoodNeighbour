import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KEYS, readJSON, writeJSON } from '../services/storage';

const LIMIT = 8;
const Ctx = createContext<{ ids: string[]; viewed: (id: string) => void } | null>(null);

export function RecentsProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    readJSON<string[]>(KEYS.recents, []).then(setIds);
  }, []);
  const viewed = useCallback((id: string) => {
    setIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, LIMIT);
      writeJSON(KEYS.recents, next);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ ids, viewed }), [ids, viewed]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecents() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRecents must be used inside RecentsProvider');
  return v;
}
