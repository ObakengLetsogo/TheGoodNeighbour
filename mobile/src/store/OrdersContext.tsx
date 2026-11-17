import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { orderService } from '../services';
import type { NewOrderInput, Order } from '../types';
import { useAuth } from './AuthContext';

interface OrdersState {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  orders: Order[];
  refresh: () => Promise<void>;
  place: (input: NewOrderInput) => Promise<Order>;
}

const Ctx = createContext<OrdersState | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<OrdersState['status']>('loading');
  const [error, setError] = useState<string>();
  const [orders, setOrders] = useState<Order[]>([]);

  const refresh = useCallback(async () => {
    try {
      setOrders(await orderService.listOrders());
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
      setOrders([]);
    }
  }, [user, refresh]);

  const place = useCallback(
    async (input: NewOrderInput) => {
      const order = await orderService.placeOrder(input);
      setOrders((o) => [order, ...o]);
      return order;
    },
    [],
  );

  const value = useMemo(() => ({ status, error, orders, refresh, place }), [status, error, orders, refresh, place]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrders() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOrders must be used inside OrdersProvider');
  return v;
}
