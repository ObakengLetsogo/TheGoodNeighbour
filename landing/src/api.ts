/** Talks to the TGN backend. Everything here is optional: the page reads fine if the API is unreachable. */
const ENV = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
const BASE = ENV || (import.meta.env.DEV ? 'http://localhost:8080' : '');

export type Relationship = 'spouse' | 'child' | 'parent' | 'parent_in_law' | 'grandparent' | 'sibling' | 'other';
export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  spouse: 'Spouse', child: 'Child', parent: 'Parent', parent_in_law: 'Parent-In-Law', grandparent: 'Grandparent', sibling: 'Sibling', other: 'Other Family',
};

export interface Item {
  id: string; kind: 'grocery' | 'livestock'; name: string; description: string; unitLabel: string;
  valueCents: number; monthlyCents: number; maxQty: number; contents: string[]; available: boolean;
}
export interface RelationshipRule { relationship: Relationship; multiplierBps: number; minAge: number; maxAge: number; coverEndAge: number; maxCount: number }
export interface Cover {
  items: Item[]; relationships: RelationshipRule[]; minBundleValueCents: number; mainMinAge: number; mainMaxAge: number; maxMembers: number;
  naturalWaitingDays: number; accidentalWaitingDays: number; upgradeWaitingDays: number; lapseAfterMissedPayments: number; reinstateWithinDays: number;
  escalationCapPercent: number; coolingOffDays: number;
}
export interface PersonQuote { role: string; age?: number | null; relationshipBps: number; ageBps: number; feeCents: number }
export interface Quote { valid: boolean; problems: string[]; bundleValueCents: number; baseMonthlyCents: number; main: PersonQuote; members: PersonQuote[]; totalMonthlyCents: number }
export interface LegalDoc { slug: string; title: string; body: string; version: number; draft: boolean; updatedAt: string }

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE) throw new ApiError('offline', 0);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  } catch {
    throw new ApiError("We couldn't reach TGN. Please check your connection and try again.", 0);
  }
  if (!res.ok) {
    let message = 'Something went wrong. Please try again.';
    try { const b = await res.json(); if (typeof b?.message === 'string') message = b.message; } catch { /* ignore */ }
    throw new ApiError(message, res.status);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

let coverPromise: Promise<Cover> | null = null;
/** The live catalogue and rules, fetched once. */
export const getCover = () => (coverPromise ??= request<Cover>('/api/cover').catch((e) => { coverPromise = null; throw e; }));

export const getQuote = (items: { itemId: string; quantity: number }[], members: { relationship: string; dateOfBirth: string }[], holderDateOfBirth: string, signal?: AbortSignal) =>
  request<Quote>('/api/cover/quote', { method: 'POST', body: JSON.stringify({ items, members, holderDateOfBirth }), signal });

export const getLegal = (slug: string) => request<LegalDoc>(`/api/legal/${slug}`);

export interface WaitlistInput { firstName: string; phone?: string; email?: string; province?: string; consent: boolean; website?: string }
export const joinWaitlist = (input: WaitlistInput) => request<void>('/api/waitlist', { method: 'POST', body: JSON.stringify(input) });

export const apiAvailable = !!BASE;
