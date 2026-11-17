import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { coverService } from '../services/api';
import type { CoverOptions } from '../types';

interface OptionsState {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  options?: CoverOptions;
  reload: () => void;
}

const Ctx = createContext<OptionsState | null>(null);

/** The cover catalogue and rules (what can go in a bundle, who can be added, waiting periods). */
export function OptionsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<OptionsState['status']>('loading');
  const [error, setError] = useState<string>();
  const [options, setOptions] = useState<CoverOptions>();

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setOptions(await coverService.options());
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

  const value = useMemo(() => ({ status, error, options, reload: load }), [status, error, options, load]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOptions() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOptions must be used inside OptionsProvider');
  return v;
}
