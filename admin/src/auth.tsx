import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setUnauthorisedHandler, tokenStore } from './api';
import type { Staff } from './types';

interface AuthState { staff: Staff | null; ready: boolean; login: (e: string, p: string) => Promise<void>; logout: () => void }
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnauthorisedHandler(() => setStaff(null));
    if (!tokenStore.get()) { setReady(true); return; }
    api.me().then(setStaff).catch(() => tokenStore.clear()).finally(() => setReady(true));
  }, []);

  const login = async (email: string, password: string) => {
    const s = await api.login(email, password);
    tokenStore.set(s.token);
    setStaff(s.staff);
  };
  const logout = () => { tokenStore.clear(); setStaff(null); };
  return <Ctx.Provider value={{ staff, ready, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
