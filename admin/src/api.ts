import type { AdminPolicy, AuditEvent, BenefitItem, Claim, CoverConfig, CustomerRow, Dashboard, Herd, LegalDoc, LegalSummary, Session, Staff, SupportItem, WaitlistEntry } from './types';

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
  editMember: (id: string, memberId: string, patch: { fullName?: string; idNumber?: string; dateOfBirth?: string; relationship?: string }) =>
    request<AdminPolicy>(`/policies/${id}/members/${memberId}`, { method: 'PUT', body: JSON.stringify(patch) }),
  recordPayment: (id: string, amountCents: number, paidOn: string, reference: string) =>
    request<AdminPolicy>(`/policies/${id}/payments`, post({ amountCents, paidOn, reference })),
  claims: () => request<Claim[]>('/claims'),
  setClaimStatus: (id: string, status: string, note?: string) => request<Claim>(`/claims/${id}/status`, post({ status, note })),
  /** Fetches a claim document with the staff token and opens it in a new tab (the server audits each view). */
  openClaimDocument: async (claimId: string, docId: string) => {
    const token = tokenStore.get();
    const res = await fetch(`${BASE}/api/admin/claims/${claimId}/documents/${docId}/file`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new ApiError('Could not open that document.', res.status);
    const url = URL.createObjectURL(await res.blob());
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
  waitlist: () => request<WaitlistEntry[]>('/waitlist'),
  removeWaitlist: (id: string) => request<void>(`/waitlist/${id}`, { method: 'DELETE' }),
  cover: () => request<CoverConfig>('/cover'),
  updateCover: (c: CoverConfig) => request<CoverConfig>('/cover', { method: 'PUT', body: JSON.stringify(c) }),
  benefits: () => request<BenefitItem[]>('/benefits'),
  updateBenefit: (i: BenefitItem) => request<BenefitItem>(`/benefits/${i.id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: i.name, description: i.description, valueCents: i.valueCents, costCents: i.costCents, maxQty: i.maxQty, active: i.active, onFarm: i.kind === 'livestock' ? i.onFarm ?? 0 : null, contents: i.contents }),
  }),
  herd: () => request<Herd[]>('/herd'),
  support: () => request<SupportItem[]>('/support'),
  setSupportStatus: (id: string, status: string, note?: string) => request<SupportItem>(`/support/${id}/status`, post({ status, note })),
  customers: () => request<CustomerRow[]>('/customers'),
  legalList: () => request<LegalSummary[]>('/legal'),
  legal: (slug: string) => request<LegalDoc>(`/legal/${slug}`),
  updateLegal: (slug: string, title: string, body: string, draft: boolean) =>
    request<LegalDoc>(`/legal/${slug}`, { method: 'PUT', body: JSON.stringify({ title, body, draft }) }),
  audit: () => request<AuditEvent[]>('/audit'),
};
