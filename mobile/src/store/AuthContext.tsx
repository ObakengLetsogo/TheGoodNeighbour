import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService, type RegisterInput } from '../services/api';
import { KEYS, readJSON, writeJSON } from '../services/storage';
import type { User } from '../types';

interface AuthState {
  ready: boolean;
  user: User | null;
  /** Whether the welcome screen has been seen. */
  onboarded: boolean;
  completeOnboarding: () => void;
  register: (input: RegisterInput) => Promise<void>;
  signIn: (phone: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, 'fullName' | 'email'>>) => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    (async () => {
      const [session, seen] = await Promise.all([authService.restore(), readJSON<boolean>(KEYS.onboarded, false)]);
      setUser(session?.user ?? null);
      setOnboarded(seen);
      setReady(true);
    })();
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboarded(true);
    writeJSON(KEYS.onboarded, true);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const s = await authService.register(input);
    setUser(s.user);
  }, []);

  const signIn = useCallback(async (phone: string, password: string) => {
    const s = await authService.signIn(phone, password);
    setUser(s.user);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<User, 'fullName' | 'email'>>) => {
      if (!user) return;
      setUser(await authService.updateProfile({ ...user, ...patch }));
    },
    [user],
  );

  const value = useMemo(
    () => ({ ready, user, onboarded, completeOnboarding, register, signIn, signOut, updateProfile }),
    [ready, user, onboarded, completeOnboarding, register, signIn, signOut, updateProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
