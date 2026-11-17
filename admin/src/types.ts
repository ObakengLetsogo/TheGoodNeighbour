/** Mirrors the backend's Dtos.java (staff endpoints). Money is integer cents (ZAR). */
export type PolicyStatus = 'pending_review' | 'approved' | 'active' | 'lapsed' | 'declined' | 'cancelled';
export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'declined' | 'paid';
export type MemberType = 'spouse' | 'child' | 'parent' | 'extended';

export interface Staff { id: string; email: string; fullName: string; role: string }
export interface Session { staff: Staff; token: string }
export interface Customer { id: string; fullName: string; phone: string; email?: string | null }
export interface Member { id: string; type: MemberType; fullName: string; idNumber?: string | null; dateOfBirth: string; feeCents: number; coverCents: number; status: string; coverStartsOn?: string | null }
export interface Payment { id: string; amountCents: number; paidOn: string; status: string; source: string; reference: string }
export interface Policy {
  id: string; reference: string; planId: string; planName: string; coverCents: number; status: PolicyStatus;
  holder: { name: string; idNumber?: string | null; dateOfBirth: string }; debitDay: number; monthlyTotalCents: number;
  mandateStatus: string; createdAt: string; startDate?: string | null; waitingEndsOn?: string | null; nextDebitDate?: string | null;
  members: Member[]; payments: Payment[];
}
export interface AdminPolicy { policy: Policy; customer: Customer | null }
export interface Claim {
  id: string; reference: string; policyId: string; policyReference: string; deceasedName: string; dateOfDeath: string;
  claimantName: string; claimantPhone: string; status: ClaimStatus; withinWaitingPeriod: boolean; staffNote?: string | null;
  createdAt: string; updatedAt: string;
}
export interface MemberRule { type: MemberType; feeCents: number; coverCents: number; maxCount: number; minAge: number; maxAge: number }
export interface Plan {
  id: string; name: string; description: string; coverCents: number; premiumCents: number; waitingPeriodDays: number;
  minAge: number; maxAge: number; accent: string; active: boolean; memberRules: MemberRule[];
}
export interface Dashboard { pendingReview: number; approvedAwaitingPayment: number; active: number; lapsed: number; openClaims: number; monthlyRecurringCents: number }
export interface AuditEvent { at: string; actor: string; action: string; entityType: string; entityId: string; detail: string }
