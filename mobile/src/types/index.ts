/**
 * Typed API contracts. These mirror the backend (Dtos.java). Money is integer cents (ZAR); dates are
 * ISO yyyy-mm-dd strings; timestamps are ISO instants.
 */
import type { AccentName } from '../theme';

export type Cents = number;

export type MemberType = 'spouse' | 'child' | 'parent' | 'extended';
export const MEMBER_TYPES: MemberType[] = ['spouse', 'child', 'parent', 'extended'];
export const MEMBER_LABEL: Record<MemberType, string> = {
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  extended: 'Extended Family',
};

export interface MemberRule {
  type: MemberType;
  feeCents: Cents;
  coverCents: Cents;
  maxCount: number;
  minAge: number;
  maxAge: number;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  coverCents: Cents;
  premiumCents: Cents;
  waitingPeriodDays: number;
  minAge: number;
  maxAge: number;
  accent: AccentName;
  active: boolean;
  memberRules: MemberRule[];
}

export type PolicyStatus = 'pending_review' | 'approved' | 'active' | 'lapsed' | 'declined' | 'cancelled';

export interface Member {
  id: string;
  type: MemberType;
  fullName: string;
  /** Masked: only the last four digits. */
  idNumber?: string | null;
  dateOfBirth: string;
  feeCents: Cents;
  coverCents: Cents;
  status: string;
  coverStartsOn?: string | null;
}

export interface Payment {
  id: string;
  amountCents: Cents;
  paidOn: string;
  status: 'collected' | 'failed' | 'reversed';
  source: 'provider' | 'manual';
  reference: string;
}

export interface Policy {
  id: string;
  reference: string;
  planId: string;
  planName: string;
  coverCents: Cents;
  status: PolicyStatus;
  holder: { name: string; idNumber?: string | null; dateOfBirth: string };
  debitDay: number;
  monthlyTotalCents: Cents;
  mandateStatus: 'not_set_up' | 'pending_customer_approval' | 'active' | 'rejected';
  createdAt: string;
  startDate?: string | null;
  waitingEndsOn?: string | null;
  nextDebitDate?: string | null;
  members: Member[];
  payments: Payment[];
}

export interface MemberInput {
  type: MemberType;
  fullName: string;
  idNumber?: string;
  dateOfBirth: string;
}

export interface ApplyInput {
  planId: string;
  holderIdNumber: string;
  debitDay: number;
  members: MemberInput[];
}

export interface DebitOrderState {
  state: 'not_configured' | 'pending_customer_approval';
  message: string;
}

export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'declined' | 'paid';

export interface Claim {
  id: string;
  reference: string;
  policyId: string;
  policyReference: string;
  deceasedName: string;
  dateOfDeath: string;
  claimantName: string;
  claimantPhone: string;
  status: ClaimStatus;
  withinWaitingPeriod: boolean;
  staffNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimInput {
  policyId: string;
  memberId?: string;
  dateOfDeath: string;
  claimantName: string;
  claimantPhone: string;
}

export interface User {
  id: string;
  fullName: string;
  phone: string; // E.164
  email?: string | null;
}

export interface Session {
  user: User;
  token: string;
}

export interface SupportRequest {
  kind: 'policy_enquiry' | 'claim_enquiry' | 'problem';
  reference?: string;
  message: string;
  contactPhone: string;
}
