import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { accountService, authService, setAuthToken, type RegisterInput } from '../services/api';
import { KEYS, readJSON, writeJSON } from '../services/storage';
import type { User } from '../types';

interface AuthState {
  ready: boolean;
  user: User | null;
  /** Whether SMS codes can be delivered (so the phone can be verified). */
  smsEnabled: boolean;
  /** Reloads the profile from the server. */
  refresh: () => Promise<void>;
  /** Use after the server changes the profile (verification, new number, preferences). */
  setUser: (u: User) => void;
  /** Changes the password and keeps this device signed in. */
  changePassword: (current: string, next: string) => Promise<void>;
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
  const [smsEnabled, setSmsEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const [session, seen] = await Promise.all([authService.restore(), readJSON<boolean>(KEYS.onboarded, false)]);
      setUser(session?.user ?? null);
      setOnboarded(seen);
      setReady(true);
      if (session) accountService.me().then((m) => { setUser(m.user); setSmsEnabled(m.smsEnabled); }).catch(() => {});
    })();
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboarded(true);
    writeJSON(KEYS.onboarded, true);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const s = await authService.register(input);
    setUser(s.user);
    accountService.me().then((m) => { setUser(m.user); setSmsEnabled(m.smsEnabled); }).catch(() => {});
  }, []);

  const signIn = useCallback(async (phone: string, password: string) => {
    const s = await authService.signIn(phone, password);
    setUser(s.user);
    accountService.me().then((m) => { setUser(m.user); setSmsEnabled(m.smsEnabled); }).catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const m = await accountService.me();
    setUser(m.user);
    setSmsEnabled(m.smsEnabled);
  }, []);

  const changePassword = useCallback(async (current: string, next: string) => {
    const s = await accountService.changePassword(current, next);
    setAuthToken(s.token);
    setUser(s.user);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<User, 'fullName' | 'email'>>) => {
      if (!user) return;
      setUser(await authService.updateProfile({ ...user, ...patch }));
    },
    [user],
  );

  const value = useMemo(
    () => ({ ready, user, smsEnabled, refresh, setUser, changePassword, onboarded, completeOnboarding, register, signIn, signOut, updateProfile }),
    [ready, user, smsEnabled, refresh, changePassword, onboarded, completeOnboarding, register, signIn, signOut, updateProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
