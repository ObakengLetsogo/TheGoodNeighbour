/** Mirrors the backend's Dtos.java (staff endpoints). Money is integer cents (ZAR). */
export type PolicyStatus = 'pending_review' | 'approved' | 'active' | 'lapsed' | 'declined' | 'cancelled';
export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'declined' | 'delivered';
export type Relationship = 'spouse' | 'child' | 'parent' | 'parent_in_law' | 'grandparent' | 'sibling' | 'other';

export interface Staff { id: string; email: string; fullName: string; role: string }
export interface Session { staff: Staff; token: string }
export interface Customer { id: string; fullName: string; phone: string; email?: string | null; phoneVerified?: boolean }
export interface Member { id: string; relationship: Relationship; fullName: string; idNumber?: string | null; dateOfBirth: string; feeCents: number; status: string; coverStartsOn?: string | null; age: number; relationshipBps: number; ageBps: number }
export interface Payment { id: string; amountCents: number; paidOn: string; status: string; source: string; reference: string; paidBy?: string | null }
export interface Contributor { id: string; name: string; phone?: string | null; status: 'invited' | 'active'; shareBps: number; shareCents: number; paidThisMonthCents: number }
export interface BundleLine { itemId: string; kind: string; name: string; quantity: number; valueCents: number; monthlyCents: number; contents: string[] }
export interface BundleVersion { version: number; effectiveFrom: string; upgradeWaitingEndsOn?: string | null; bundleValueCents: number; baseMonthlyCents: number; lines: BundleLine[] }
export interface Policy {
  id: string; reference: string; status: PolicyStatus; holder: { name: string; idNumber?: string | null; dateOfBirth: string };
  debitDay: number; monthlyTotalCents: number; baseMonthlyCents: number; mainFeeCents: number; mainAgeBps: number; holderAge: number; mandateStatus: string; createdAt: string;
  startDate?: string | null; waitingEndsOn?: string | null; nextDebitDate?: string | null;
  bundle: BundleVersion; bundleHistory: BundleVersion[]; members: Member[]; payments: Payment[];
  termsVersion?: number | null; privacyVersion?: number | null; consentAt?: string | null;
  lapsedAt?: string | null; reinstateUntil?: string | null; cancelledAt?: string | null;
  cancelRequestedAt?: string | null; reinstateRequestedAt?: string | null; withinCoolingOff: boolean;
  contributors: Contributor[]; ownerShareBps: number; ownerShareCents: number; ownerPaidThisMonthCents: number;
}
export interface AdminPolicy { policy: Policy; customer: Customer | null }
export interface Delivery { recipientName: string; recipientPhone: string; addressLine: string; suburb: string; city: string; province: string; postalCode: string; instructions?: string | null }
export type ClaimDocumentType = 'death_certificate' | 'deceased_id' | 'other';
export interface ClaimDocument { id: string; type: ClaimDocumentType; fileName: string; contentType: string; sizeBytes: number; uploadedAt: string }
export interface Claim {
  id: string; reference: string; policyId: string; policyReference: string; deceasedName: string; dateOfDeath: string;
  causeOfDeath: 'natural' | 'accidental'; claimantName: string; claimantPhone: string; status: ClaimStatus;
  withinWaitingPeriod: boolean; overAgeLimit: boolean; staffNote?: string | null; delivery: Delivery; bundle: BundleVersion;
  documents: ClaimDocument[]; missingDocuments: ClaimDocumentType[];
  deliveryDate?: string | null; deliveryWindow?: 'morning' | 'afternoon' | 'day' | null; deliveryNote?: string | null; deliveredAt?: string | null;
  createdAt: string; updatedAt: string;
}
export interface AgeBand { fromAge: number; toAge: number; multiplierBps: number }
export interface RelationshipRule { relationship: Relationship; multiplierBps: number; minAge: number; maxAge: number; coverEndAge: number; maxCount: number }
export interface CoverConfig {
  baseRateBps: number; minBundleValueCents: number; naturalWaitingDays: number; accidentalWaitingDays: number; upgradeWaitingDays: number;
  mainMinAge: number; mainMaxAge: number; mainCoverEndAge: number; maxMembers: number; maxCommitmentMultiple: number;
  lapseAfterMissedPayments: number; reinstateWithinDays: number; escalationCapBps: number; coolingOffDays: number; relationships: RelationshipRule[]; ageBands: AgeBand[];
}
export interface BenefitItem {
  id: string; kind: 'grocery' | 'livestock'; name: string; description: string; unitLabel: string; valueCents: number; costCents: number;
  maxQty: number; groupId?: string | null; active: boolean; onFarm?: number | null; contents: string[];
}
export interface Herd { itemId: string; name: string; onFarm: number; promised: number; capacity: number; remaining: number }
export interface Dashboard { pendingReview: number; approvedAwaitingPayment: number; active: number; lapsed: number; openClaims: number; monthlyRecurringCents: number; cancellationRequests: number; reinstatementRequests: number }
export interface AuditEvent { at: string; actor: string; action: string; entityType: string; entityId: string; detail: string }
export interface SupportItem {
  id: string; kind: string; reference?: string | null; message: string; contactPhone: string; status: 'open' | 'in_progress' | 'resolved';
  staffNote?: string | null; createdAt: string; customer: Customer | null;
}
export interface CustomerRow {
  id: string; fullName: string; phone: string; email?: string | null; phoneVerified: boolean; createdAt: string;
  policyId?: string | null; policyReference?: string | null; policyStatus?: string | null;
}
export interface LegalSummary { slug: string; title: string; version: number; draft: boolean }
export interface LegalDoc extends LegalSummary { body: string; updatedAt: string }

export interface WaitlistEntry { id: string; firstName: string; phone?: string | null; email?: string | null; province?: string | null; createdAt: string }

export interface CollectionRow {
  policyId: string; reference: string; holderName: string; phone: string; monthlyCents: number; debitDay: number; nextDebitDate?: string | null;
  paymentsReceived: number; missed: number; oldestUnpaidSince?: string | null; owedCents: number; shouldLapse: boolean; dueSoon: boolean;
}
export interface Collections { rows: CollectionRow[]; active: number; behind: number; shouldLapse: number; dueSoon: number; owedCents: number; dueSoonCents: number; lapseAfter: number }
