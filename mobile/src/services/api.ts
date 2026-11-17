import { config } from '../config';
import type {
  ApplyInput, BundleLineInput, Claim, ClaimInput, CoverOptions, DebitOrderState, MemberInput, Policy, Quote, QuoteMemberInput, Session,
  SupportRequest, User,
} from '../types';
import { KEYS, readJSON, removeKey, writeJSON } from './storage';

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
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const coverService = {
  options: () => request<CoverOptions>('/api/cover'),
  /** Live price. The server is authoritative; the app never calculates premiums itself. */
  quote: (items: BundleLineInput[], members: QuoteMemberInput[]) =>
    request<Quote>('/api/cover/quote', { method: 'POST', body: json({ items, members }) }),
};

export const policyService = {
  list: () => request<Policy[]>('/api/policies'),
  get: (id: string) => request<Policy>(`/api/policies/${id}`),
  apply: (input: ApplyInput) => request<Policy>('/api/policies', { method: 'POST', body: json(input) }),
  changeBundle: (policyId: string, items: BundleLineInput[]) =>
    request<Policy>(`/api/policies/${policyId}/bundle`, { method: 'POST', body: json({ items }) }),
  addMember: (policyId: string, m: MemberInput) =>
    request<Policy>(`/api/policies/${policyId}/members`, { method: 'POST', body: json(m) }),
  removeMember: (policyId: string, memberId: string) =>
    request<Policy>(`/api/policies/${policyId}/members/${memberId}`, { method: 'DELETE' }),
  /** Asks the backend to start debit order set-up. With no provider connected it says so; nothing is set up. */
  setUpDebitOrder: (policyId: string) => request<DebitOrderState>(`/api/policies/${policyId}/debit-order`, { method: 'POST' }),
};

export const claimService = {
  list: () => request<Claim[]>('/api/claims'),
  submit: (input: ClaimInput) => request<Claim>('/api/claims', { method: 'POST', body: json(input) }),
};

export const supportService = {
  submit: (r: SupportRequest) => request<void>('/api/support-requests', { method: 'POST', body: json(r) }),
};

export class AuthError extends Error {}

export interface RegisterInput {
  fullName: string;
  phone: string; // E.164
  email?: string;
  password: string;
}

export const authService = {
  async restore(): Promise<Session | null> {
    const s = await readJSON<Session | null>(KEYS.session, null);
    setAuthToken(s?.token ?? null);
    return s;
  },
  async register(input: RegisterInput): Promise<Session> {
    try {
      return await save(await request<Session>('/api/auth/register', { method: 'POST', body: json(input) }));
    } catch (e) {
      throw e instanceof ApiError ? new AuthError(e.message) : e;
    }
  },
  async signIn(phone: string, password: string): Promise<Session> {
    try {
      return await save(await request<Session>('/api/auth/login', { method: 'POST', body: json({ phone, password }) }));
    } catch (e) {
      throw e instanceof ApiError ? new AuthError(e.message) : e;
    }
  },
  async signOut() {
    setAuthToken(null);
    await removeKey(KEYS.session);
  },
  async updateProfile(user: User): Promise<User> {
    const updated = await request<User>('/api/me', { method: 'PUT', body: json({ fullName: user.fullName, email: user.email || null }) });
    const s = await readJSON<Session | null>(KEYS.session, null);
    if (s) await writeJSON(KEYS.session, { ...s, user: updated });
    return updated;
  },
};

async function save(s: Session) {
  setAuthToken(s.token);
  await writeJSON(KEYS.session, s);
  return s;
}
