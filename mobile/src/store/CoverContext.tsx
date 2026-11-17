import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { claimService, policyService } from '../services/api';
import type { ApplyInput, BundleLineInput, Claim, ClaimInput, MemberInput, Policy } from '../types';
import { useAuth } from './AuthContext';

/** The signed-in customer's policies and claims. */
interface CoverState {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  policies: Policy[];
  claims: Claim[];
  /** The policy that is still open (in review, approved or active), if any. */
  current?: Policy;
  refresh: () => Promise<void>;
  apply: (input: ApplyInput) => Promise<Policy>;
  changeBundle: (policyId: string, items: BundleLineInput[]) => Promise<Policy>;
  cancelCover: (policyId: string, reason?: string, note?: string) => Promise<Policy>;
  keepCover: (policyId: string) => Promise<Policy>;
  requestReinstate: (policyId: string, note?: string) => Promise<Policy>;
  addMember: (policyId: string, m: MemberInput) => Promise<void>;
  removeMember: (policyId: string, memberId: string) => Promise<void>;
  submitClaim: (input: ClaimInput) => Promise<Claim>;
}

const Ctx = createContext<CoverState | null>(null);
const OPEN = ['pending_review', 'approved', 'active'];

export function CoverProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<CoverState['status']>('loading');
  const [error, setError] = useState<string>();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([policyService.list(), claimService.list()]);
      setPolicies(p);
      setClaims(c);
      setError(undefined);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (user) {
      setStatus('loading');
      refresh();
    } else {
      setPolicies([]);
      setClaims([]);
    }
  }, [user, refresh]);

  const replace = (p: Policy) => setPolicies((all) => (all.some((x) => x.id === p.id) ? all.map((x) => (x.id === p.id ? p : x)) : [p, ...all]));

  const apply = useCallback(async (input: ApplyInput) => {
    const p = await policyService.apply(input);
    replace(p);
    return p;
  }, []);
  const changeBundle = useCallback(async (id: string, items: BundleLineInput[]) => {
    const p = await policyService.changeBundle(id, items);
    replace(p);
    return p;
  }, []);
  const cancelCover = useCallback(async (id: string, reason?: string, note?: string) => {
    const p = await policyService.requestCancel(id, reason, note);
    replace(p);
    return p;
  }, []);
  const keepCover = useCallback(async (id: string) => {
    const p = await policyService.keepCover(id);
    replace(p);
    return p;
  }, []);
  const requestReinstate = useCallback(async (id: string, note?: string) => {
    const p = await policyService.requestReinstate(id, note);
    replace(p);
    return p;
  }, []);
  const addMember = useCallback(async (id: string, m: MemberInput) => replace(await policyService.addMember(id, m)), []);
  const removeMember = useCallback(async (id: string, memberId: string) => replace(await policyService.removeMember(id, memberId)), []);
  const submitClaim = useCallback(async (input: ClaimInput) => {
    const c = await claimService.submit(input);
    setClaims((all) => [c, ...all]);
    return c;
  }, []);

  const current = policies.find((p) => OPEN.includes(p.status));
  const value = useMemo(
    () => ({ status, error, policies, claims, current, refresh, apply, changeBundle, cancelCover, keepCover, requestReinstate, addMember, removeMember, submitClaim }),
    [status, error, policies, claims, current, refresh, apply, changeBundle, cancelCover, keepCover, requestReinstate, addMember, removeMember, submitClaim],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCover() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCover must be used inside CoverProvider');
  return v;
}
