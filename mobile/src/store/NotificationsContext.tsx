import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { notificationService } from '../services/api';
import type { Inbox } from '../types';
import { useAuth } from './AuthContext';
import { useCover } from './CoverContext';

/** The customer's in-app messages. Checked when the app opens, comes back to the front, and every minute while it is open. */
interface NotificationsState {
  inbox: Inbox;
  loaded: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const EMPTY: Inbox = { unread: 0, items: [] };
const Ctx = createContext<NotificationsState | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { refresh: refreshCover } = useCover();
  const [inbox, setInbox] = useState<Inbox>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const lastTop = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const next = await notificationService.list();
      setInbox(next);
      setLoaded(true);
      // A new message means something changed on a cover or claim, so bring those up to date too.
      const top = next.items[0]?.id ?? null;
      if (lastTop.current !== null && top !== lastTop.current) refreshCover().catch(() => {});
      lastTop.current = top;
    } catch { /* stay quiet: the inbox is not worth an error screen */ }
  }, [user, refreshCover]);

  useEffect(() => {
    if (!user) { setInbox(EMPTY); setLoaded(false); lastTop.current = null; return; }
    refresh();
    const timer = setInterval(refresh, 60_000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [user, refresh]);

  const markRead = useCallback(async (id: string) => {
    setInbox((i) => ({ unread: Math.max(0, i.unread - (i.items.find((n) => n.id === id && !n.read) ? 1 : 0)), items: i.items.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    try { await notificationService.markRead(id); } catch { refresh(); }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setInbox((i) => ({ unread: 0, items: i.items.map((n) => ({ ...n, read: true })) }));
    try { await notificationService.markAllRead(); } catch { refresh(); }
  }, [refresh]);

  const value = useMemo(() => ({ inbox, loaded, refresh, markRead, markAllRead }), [inbox, loaded, refresh, markRead, markAllRead]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotificationsState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNotifications must be used inside NotificationsProvider');
  return v;
}
