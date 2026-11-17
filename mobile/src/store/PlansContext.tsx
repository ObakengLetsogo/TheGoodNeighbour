import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { planService } from '../services/api';
import type { Plan } from '../types';

interface PlansState {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  plans: Plan[];
  reload: () => void;
}

const Ctx = createContext<PlansState | null>(null);

export function PlansProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PlansState['status']>('loading');
  const [error, setError] = useState<string>();
  const [plans, setPlans] = useState<Plan[]>([]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setPlans(await planService.list());
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

  const value = useMemo(() => ({ status, error, plans, reload: load }), [status, error, plans, load]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlans() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlans must be used inside PlansProvider');
  return v;
}
