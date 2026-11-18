import { config } from '../config';
import type {
  Invitations, SharedPolicy, AppNotification, Inbox, ApplyInput, BundleLineInput, Claim, ClaimDocument, ClaimDocumentType, ClaimInput, CoverOptions, DebitOrderState, LegalDoc, LegalSummary, Me, MemberInput, Policy, Quote,
  QuoteMemberInput, Session, SupportRequest, User,
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
  quote: (items: BundleLineInput[], members: QuoteMemberInput[], holderDateOfBirth?: string, coverMainMember = true) =>
    request<Quote>('/api/cover/quote', { method: 'POST', body: json({ items, members, holderDateOfBirth, coverMainMember }) }),
};

export const policyService = {
  list: () => request<Policy[]>('/api/policies'),
  get: (id: string) => request<Policy>(`/api/policies/${id}`),
  apply: (input: ApplyInput) => request<Policy>('/api/policies', { method: 'POST', body: json(input) }),
  /** Before cover starts this cancels at once; afterwards it asks staff to cancel. */
  requestCancel: (policyId: string, reason?: string, note?: string) =>
    request<Policy>(`/api/policies/${policyId}/cancel-request`, { method: 'POST', body: json({ reason, note }) }),
  keepCover: (policyId: string) => request<Policy>(`/api/policies/${policyId}/cancel-request`, { method: 'DELETE' }),
  requestReinstate: (policyId: string, note?: string) =>
    request<Policy>(`/api/policies/${policyId}/reinstate-request`, { method: 'POST', body: json({ note }) }),
  changeBundle: (policyId: string, items: BundleLineInput[]) =>
    request<Policy>(`/api/policies/${policyId}/bundle`, { method: 'POST', body: json({ items }) }),
  addMember: (policyId: string, m: MemberInput) =>
    request<Policy>(`/api/policies/${policyId}/members`, { method: 'POST', body: json(m) }),
  /** Only what is sent is changed. The server decides what may be changed once cover has started. */
  editMember: (policyId: string, memberId: string, patch: Partial<Pick<MemberInput, 'fullName' | 'idNumber' | 'dateOfBirth' | 'relationship'>>) =>
    request<Policy>(`/api/policies/${policyId}/members/${memberId}`, { method: 'PUT', body: json(patch) }),
  removeMember: (policyId: string, memberId: string) =>
    request<Policy>(`/api/policies/${policyId}/members/${memberId}`, { method: 'DELETE' }),
  /** Asks the backend to start debit order set-up. With no provider connected it says so; nothing is set up. */
  setUpDebitOrder: (policyId: string) => request<DebitOrderState>(`/api/policies/${policyId}/debit-order`, { method: 'POST' }),
};

export const claimService = {
  list: () => request<Claim[]>('/api/claims'),
  submit: (input: ClaimInput) => request<Claim>('/api/claims', { method: 'POST', body: json(input) }),
  /** Uploads one file. On web `file` is a Blob; on phones it is a { uri, name, type } descriptor. */
  uploadDocument: async (claimId: string, type: ClaimDocumentType, file: { uri: string; name: string; type: string; blob?: Blob }) => {
    const form = new FormData();
    form.append('type', type);
    if (file.blob) form.append('file', file.blob, file.name);
    else form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    let res: Response;
    try {
      // No Content-Type header: fetch adds the multipart boundary itself.
      res = await fetch(`${config.apiBaseUrl}/api/claims/${claimId}/documents`, { method: 'POST', body: form, headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
    } catch {
      throw new ApiError("We couldn't reach TGN. Please check your connection and try again.", 0);
    }
    if (!res.ok) {
      let message = 'We could not upload that file. Please try again.';
      try { const b = await res.json(); if (typeof b?.message === 'string') message = b.message; } catch { /* ignore */ }
      throw new ApiError(res.status === 413 ? 'That file is too big. Please use one under 5 MB.' : message, res.status);
    }
    return (await res.json()) as ClaimDocument;
  },
  setChoice: (claimId: string, choice: 'bundle' | 'cash') => request<Claim>(`/api/claims/${claimId}/choice`, { method: 'PUT', body: json({ choice }) }),
  removeDocument: (claimId: string, docId: string) => request<void>(`/api/claims/${claimId}/documents/${docId}`, { method: 'DELETE' }),
};

export const supportService = {
  submit: (r: SupportRequest) => request<void>('/api/support-requests', { method: 'POST', body: json(r) }),
};

export const legalService = {
  list: () => request<LegalSummary[]>('/api/legal'),
  get: (slug: string) => request<LegalDoc>(`/api/legal/${slug}`),
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
  /** Starts a password reset: sends a code by SMS. Always answers the same, whether or not the number has an account. */
  requestPasswordReset: (phone: string) => request<{ message: string }>('/api/auth/password-reset/request', { method: 'POST', body: json({ phone }) }),
  confirmPasswordReset: (phone: string, code: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/password-reset/confirm', { method: 'POST', body: json({ phone, code, newPassword }) }),
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

export const familyService = {
  /** The owner invites someone to share the cost. Returns the updated plan. */
  invite: (policyId: string, input: { name: string; phone: string; sharePercent: number }) =>
    request<Policy>(`/api/policies/${policyId}/contributors`, { method: 'POST', body: json(input) }),
  removeContributor: (policyId: string, contributorId: string) => request<Policy>(`/api/policies/${policyId}/contributors/${contributorId}`, { method: 'DELETE' }),
  invitations: () => request<Invitations>('/api/me/invitations'),
  accept: (id: string) => request<SharedPolicy>(`/api/me/invitations/${id}/accept`, { method: 'POST' }),
  decline: (id: string) => request<void>(`/api/me/invitations/${id}/decline`, { method: 'POST' }),
  shared: () => request<SharedPolicy[]>('/api/me/shared-policies'),
  updateShare: (contributorId: string, sharePercent: number) => request<SharedPolicy>(`/api/me/shared-policies/${contributorId}/share`, { method: 'PUT', body: json({ sharePercent }) }),
  leave: (contributorId: string) => request<void>(`/api/me/shared-policies/${contributorId}/leave`, { method: 'POST' }),
};

export const notificationService = {
  list: () => request<Inbox>('/api/me/notifications'),
  markRead: (id: string) => request<void>(`/api/me/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => request<void>('/api/me/notifications/read-all', { method: 'POST' }),
};
export type { AppNotification };

export const accountService = {
  me: async (): Promise<Me> => {
    const me = await request<Me>('/api/me');
    const s = await readJSON<Session | null>(KEYS.session, null);
    if (s) await writeJSON(KEYS.session, { ...s, user: me.user });
    return me;
  },
  /** Changing the password signs every other device out and hands this one a fresh session. */
  changePassword: async (currentPassword: string, newPassword: string): Promise<Session> =>
    save(await request<Session>('/api/me/password', { method: 'POST', body: json({ currentPassword, newPassword }) })),
  startVerification: () => request<{ message: string }>('/api/me/phone-verification/start', { method: 'POST' }),
  confirmVerification: (code: string) => request<Me>('/api/me/phone-verification/confirm', { method: 'POST', body: json({ code }) }),
  startPhoneChange: (phone: string) => request<{ message: string }>('/api/me/phone/start', { method: 'POST', body: json({ phone }) }),
  confirmPhoneChange: (newPhone: string, code: string) => request<Me>('/api/me/phone/confirm', { method: 'POST', body: json({ newPhone, code }) }),
  setNotifications: (claims: boolean, payments: boolean, news: boolean) =>
    request<User>('/api/me/notifications', { method: 'PUT', body: json({ claims, payments, news }) }),
  signOutEverywhere: () => request<{ message: string }>('/api/me/sign-out-all', { method: 'POST' }),
  deleteAccount: (password: string) => request<{ state: 'deleted' | 'requested'; message: string }>('/api/me/delete', { method: 'POST', body: json({ password }) }),
};

async function save(s: Session) {
  setAuthToken(s.token);
  await writeJSON(KEYS.session, s);
  return s;
}
