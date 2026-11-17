/** Mirrors the backend's Dtos.java (staff endpoints). Money is integer cents (ZAR). */
export type PolicyStatus = 'pending_review' | 'approved' | 'active' | 'lapsed' | 'declined' | 'cancelled';
export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'declined' | 'delivered';
export type Relationship = 'spouse' | 'child' | 'parent' | 'parent_in_law' | 'grandparent' | 'sibling' | 'other';

export interface Staff { id: string; email: string; fullName: string; role: string }
export interface Session { staff: Staff; token: string }
export interface Customer { id: string; fullName: string; phone: string; email?: string | null }
export interface Member { id: string; relationship: Relationship; fullName: string; idNumber?: string | null; dateOfBirth: string; feeCents: number; status: string; coverStartsOn?: string | null }
export interface Payment { id: string; amountCents: number; paidOn: string; status: string; source: string; reference: string }
export interface BundleLine { itemId: string; kind: string; name: string; quantity: number; valueCents: number; monthlyCents: number; contents: string[] }
export interface BundleVersion { version: number; effectiveFrom: string; upgradeWaitingEndsOn?: string | null; bundleValueCents: number; baseMonthlyCents: number; lines: BundleLine[] }
export interface Policy {
  id: string; reference: string; status: PolicyStatus; holder: { name: string; idNumber?: string | null; dateOfBirth: string };
  debitDay: number; monthlyTotalCents: number; baseMonthlyCents: number; mandateStatus: string; createdAt: string;
  startDate?: string | null; waitingEndsOn?: string | null; nextDebitDate?: string | null;
  bundle: BundleVersion; bundleHistory: BundleVersion[]; members: Member[]; payments: Payment[];
}
export interface AdminPolicy { policy: Policy; customer: Customer | null }
export interface Delivery { recipientName: string; recipientPhone: string; addressLine: string; suburb: string; city: string; province: string; postalCode: string; instructions?: string | null }
export interface Claim {
  id: string; reference: string; policyId: string; policyReference: string; deceasedName: string; dateOfDeath: string;
  causeOfDeath: 'natural' | 'accidental'; claimantName: string; claimantPhone: string; status: ClaimStatus;
  withinWaitingPeriod: boolean; overAgeLimit: boolean; staffNote?: string | null; delivery: Delivery; bundle: BundleVersion;
  createdAt: string; updatedAt: string;
}
export interface RelationshipRule { relationship: Relationship; multiplierBps: number; minAge: number; maxAge: number; coverEndAge: number; maxCount: number }
export interface CoverConfig {
  baseRateBps: number; minBundleValueCents: number; naturalWaitingDays: number; accidentalWaitingDays: number; upgradeWaitingDays: number;
  mainMinAge: number; mainMaxAge: number; mainCoverEndAge: number; maxMembers: number; maxCommitmentMultiple: number;
  lapseAfterMissedPayments: number; reinstateWithinDays: number; escalationCapBps: number; relationships: RelationshipRule[];
}
export interface BenefitItem {
  id: string; kind: 'grocery' | 'livestock'; name: string; description: string; unitLabel: string; valueCents: number; costCents: number;
  maxQty: number; groupId?: string | null; active: boolean; onFarm?: number | null; contents: string[];
}
export interface Herd { itemId: string; name: string; onFarm: number; promised: number; capacity: number; remaining: number }
export interface Dashboard { pendingReview: number; approvedAwaitingPayment: number; active: number; lapsed: number; openClaims: number; monthlyRecurringCents: number }
export interface AuditEvent { at: string; actor: string; action: string; entityType: string; entityId: string; detail: string }
