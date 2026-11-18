import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { familyService } from '../services/api';
import type { Invitations, SharedPolicy } from '../types';
import { useAuth } from './AuthContext';

/** Plans other people own that this customer pays a share of, and invitations to join one. */
interface FamilyState {
  invitations: Invitations;
  shared: SharedPolicy[];
  loaded: boolean;
  refresh: () => Promise<void>;
  accept: (id: string) => Promise<void>;
  decline: (id: string) => Promise<void>;
  updateShare: (contributorId: string, percent: number) => Promise<void>;
  leave: (contributorId: string) => Promise<void>;
}

const NONE: Invitations = { needsVerification: false, items: [] };
const Ctx = createContext<FamilyState | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitations>(NONE);
  const [shared, setShared] = useState<SharedPolicy[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [i, s] = await Promise.all([familyService.invitations(), familyService.shared()]);
      setInvitations(i);
      setShared(s);
      setLoaded(true);
    } catch { /* stay quiet: this is a bonus screen, not worth an error */ }
  }, [user]);

  useEffect(() => {
    if (!user) { setInvitations(NONE); setShared([]); setLoaded(false); return; }
    refresh();
  }, [user, refresh]);

  const accept = useCallback(async (id: string) => { await familyService.accept(id); await refresh(); }, [refresh]);
  const decline = useCallback(async (id: string) => { await familyService.decline(id); await refresh(); }, [refresh]);
  const updateShare = useCallback(async (cid: string, percent: number) => { await familyService.updateShare(cid, percent); await refresh(); }, [refresh]);
  const leave = useCallback(async (cid: string) => { await familyService.leave(cid); await refresh(); }, [refresh]);

  const value = useMemo(() => ({ invitations, shared, loaded, refresh, accept, decline, updateShare, leave }), [invitations, shared, loaded, refresh, accept, decline, updateShare, leave]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFamily(): FamilyState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFamily must be used inside FamilyProvider');
  return v;
}
