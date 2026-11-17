import { config } from '../config';
import type { NewOrderInput, Order, Session, User } from '../types';
import {
  AuthError, type AuthService, type Catalog, type CatalogService, type OrderService, type RegisterInput,
  type SupportService,
} from './contracts';
import { KEYS, readJSON, removeKey, writeJSON } from './storage';
import type { SupportRequest } from '../types';

let authToken: string | null = null;
export const setAuthToken = (t: string | null) => {
  authToken = t;
};

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${config.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("We couldn't reach TGN. Please check your connection and try again.", 0);
  }
  if (!res.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const body = await res.json();
      if (typeof body?.message === 'string') message = body.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export class HttpCatalogService implements CatalogService {
  getCatalog() {
    return request<Catalog>('/api/catalog');
  }
}

export class HttpOrderService implements OrderService {
  placeOrder(input: NewOrderInput) {
    return request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(input) });
  }
  listOrders() {
    return request<Order[]>('/api/orders');
  }
  async getOrder(id: string) {
    try {
      return await request<Order>(`/api/orders/${id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  }
}

export class HttpAuthService implements AuthService {
  async restore() {
    const s = await readJSON<Session | null>(KEYS.session, null);
    setAuthToken(s?.token ?? null);
    return s;
  }
  private async save(s: Session) {
    setAuthToken(s.token);
    await writeJSON(KEYS.session, s);
    return s;
  }
  async register(input: RegisterInput) {
    try {
      return await this.save(await request<Session>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) }));
    } catch (e) {
      throw e instanceof ApiError ? new AuthError(e.message) : e;
    }
  }
  async signIn(phone: string, password: string) {
    try {
      return await this.save(await request<Session>('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }));
    } catch (e) {
      throw e instanceof ApiError ? new AuthError(e.message) : e;
    }
  }
  async signOut() {
    setAuthToken(null);
    await removeKey(KEYS.session);
  }
  updateProfile(user: User) {
    return request<User>('/api/me', { method: 'PUT', body: JSON.stringify(user) });
  }
}

export class HttpSupportService implements SupportService {
  async submit(r: SupportRequest) {
    await request('/api/support-requests', { method: 'POST', body: JSON.stringify(r) });
    return { delivered: true };
  }
}
