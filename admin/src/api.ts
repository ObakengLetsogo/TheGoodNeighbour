import type { AdminPolicy, AuditEvent, Claim, Dashboard, Plan, Session, Staff } from './types';

const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const TOKEN_KEY = 'tgn.admin.token';

/** Kept in sessionStorage: it is cleared when the tab closes, and the server expires it after 12 hours. */
export const tokenStore = {
  get: () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string) => { try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } },
  clear: () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

let onUnauthorised: () => void = () => {};
export const setUnauthorisedHandler = (fn: () => void) => { onUnauthorised = fn; };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/admin${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Can't reach the TGN server. Check your connection and try again.", 0);
  }
  if (res.status === 401 && path !== '/auth/login') { tokenStore.clear(); onUnauthorised(); }
  if (!res.ok) {
    let message = 'Something went wrong. Please try again.';
    try { const b = await res.json(); if (typeof b?.message === 'string') message = b.message; } catch { /* ignore */ }
    throw new ApiError(message, res.status);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  login: (email: string, password: string) => request<Session>('/auth/login', post({ email, password })),
  me: () => request<Staff>('/me'),
  dashboard: () => request<Dashboard>('/dashboard'),
  policies: (status?: string) => request<AdminPolicy[]>(`/policies${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  policy: (id: string) => request<AdminPolicy>(`/policies/${id}`),
  setPolicyStatus: (id: string, status: string, note?: string) => request<AdminPolicy>(`/policies/${id}/status`, post({ status, note })),
  recordPayment: (id: string, amountCents: number, paidOn: string, reference: string) =>
    request<AdminPolicy>(`/policies/${id}/payments`, post({ amountCents, paidOn, reference })),
  claims: () => request<Claim[]>('/claims'),
  setClaimStatus: (id: string, status: string, note?: string) => request<Claim>(`/claims/${id}/status`, post({ status, note })),
  plans: () => request<Plan[]>('/plans'),
  updatePlan: (p: Plan) => request<Plan>(`/plans/${p.id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: p.name, description: p.description, coverCents: p.coverCents, premiumCents: p.premiumCents,
      waitingPeriodDays: p.waitingPeriodDays, minAge: p.minAge, maxAge: p.maxAge, active: p.active, memberRules: p.memberRules }),
  }),
  audit: () => request<AuditEvent[]>('/audit'),
};
