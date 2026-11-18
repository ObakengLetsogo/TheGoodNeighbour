/**
 * Typed API contracts. These mirror the backend (Dtos.java). Money is integer cents (ZAR); dates are
 * ISO yyyy-mm-dd strings; timestamps are ISO instants.
 */
export type Cents = number;

export type Relationship = 'spouse' | 'child' | 'parent' | 'parent_in_law' | 'grandparent' | 'sibling' | 'other';
export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  parent_in_law: 'Parent-In-Law',
  grandparent: 'Grandparent',
  sibling: 'Sibling',
  other: 'Other Family',
};

export interface RelationshipRule {
  relationship: Relationship;
  multiplierBps: number;
  minAge: number;
  maxAge: number;
  coverEndAge: number;
  maxCount: number;
}

/** Something that can go in a bundle. monthlyCents is what one unit adds to the main member's monthly price. */
export interface BenefitItem {
  id: string;
  kind: 'grocery' | 'livestock';
  name: string;
  description: string;
  unitLabel: string;
  valueCents: Cents;
  monthlyCents: Cents;
  maxQty: number;
  groupId?: string | null;
  contents: string[];
  available: boolean;
}

export interface AgeBand {
  fromAge: number;
  toAge: number;
  multiplierBps: number;
}

export interface CoverOptions {
  items: BenefitItem[];
  relationships: RelationshipRule[];
  ageBands: AgeBand[];
  minBundleValueCents: Cents;
  mainMinAge: number;
  mainMaxAge: number;
  maxMembers: number;
  naturalWaitingDays: number;
  accidentalWaitingDays: number;
  upgradeWaitingDays: number;
  lapseAfterMissedPayments: number;
  reinstateWithinDays: number;
  escalationCapPercent: number;
  debitDays: number[];
}

export interface BundleLineInput {
  itemId: string;
  quantity: number;
}

export interface BundleLine {
  itemId: string;
  kind: 'grocery' | 'livestock';
  name: string;
  quantity: number;
  valueCents: Cents;
  monthlyCents: Cents;
  contents: string[];
}

/** One person's price: the reference base x their relationship % x their age %. role is "you" for the main member. */
export interface PersonQuote {
  role: 'you' | Relationship;
  age?: number | null;
  relationshipBps: number;
  ageBps: number;
  feeCents: Cents;
}

export interface Quote {
  valid: boolean;
  problems: string[];
  lines: BundleLine[];
  bundleValueCents: Cents;
  /** The reference monthly price (bundle cost x base rate) before anyone's relationship or age is applied. */
  baseMonthlyCents: Cents;
  main: PersonQuote;
  members: PersonQuote[];
  totalMonthlyCents: Cents;
}

export interface QuoteMemberInput {
  relationship: Relationship;
  dateOfBirth?: string;
}

export type PolicyStatus = 'pending_review' | 'approved' | 'active' | 'lapsed' | 'declined' | 'cancelled';

export interface Member {
  id: string;
  relationship: Relationship;
  fullName: string;
  /** Masked: only the last four digits. */
  idNumber?: string | null;
  dateOfBirth: string;
  feeCents: Cents;
  status: string;
  coverStartsOn?: string | null;
  age: number;
  relationshipBps: number;
  ageBps: number;
}

export interface Payment {
  id: string;
  amountCents: Cents;
  paidOn: string;
  status: 'collected' | 'failed' | 'reversed';
  source: 'provider' | 'manual';
  reference: string;
}

/** What the family is owed. An upgrade only counts after its waiting period, so earlier versions are kept. */
export interface BundleVersion {
  version: number;
  effectiveFrom: string;
  upgradeWaitingEndsOn?: string | null;
  bundleValueCents: Cents;
  baseMonthlyCents: Cents;
  lines: BundleLine[];
}

export interface Policy {
  id: string;
  reference: string;
  status: PolicyStatus;
  holder: { name: string; idNumber?: string | null; dateOfBirth: string };
  debitDay: number;
  monthlyTotalCents: Cents;
  baseMonthlyCents: Cents;
  mainFeeCents: Cents;
  mainAgeBps: number;
  holderAge: number;
  mandateStatus: 'not_set_up' | 'pending_customer_approval' | 'active' | 'rejected';
  createdAt: string;
  startDate?: string | null;
  waitingEndsOn?: string | null;
  nextDebitDate?: string | null;
  bundle: BundleVersion;
  bundleHistory: BundleVersion[];
  members: Member[];
  payments: Payment[];
  termsVersion?: number | null;
  privacyVersion?: number | null;
  consentAt?: string | null;
  lapsedAt?: string | null;
  /** The last day a lapsed cover can be reinstated without applying again. */
  reinstateUntil?: string | null;
  cancelledAt?: string | null;
  cancelRequestedAt?: string | null;
  reinstateRequestedAt?: string | null;
  withinCoolingOff: boolean;
}

export interface MemberInput {
  relationship: Relationship;
  fullName: string;
  idNumber?: string;
  dateOfBirth: string;
}

export interface ApplyInput {
  items: BundleLineInput[];
  holderIdNumber: string;
  debitDay: number;
  members: MemberInput[];
  acceptedTermsVersion: number;
  acceptedPrivacyVersion: number;
}

export interface DebitOrderState {
  state: 'not_configured' | 'pending_customer_approval';
  message: string;
}

export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'declined' | 'delivered';
export type CauseOfDeath = 'natural' | 'accidental';

export interface Delivery {
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  instructions?: string | null;
}

export type ClaimDocumentType = 'death_certificate' | 'deceased_id' | 'other';
export const DOCUMENT_LABEL: Record<ClaimDocumentType, string> = {
  death_certificate: 'Death Certificate',
  deceased_id: "Deceased's ID",
  other: 'Other Document',
};

export interface ClaimDocument {
  id: string;
  type: ClaimDocumentType;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface Claim {
  id: string;
  reference: string;
  policyId: string;
  policyReference: string;
  deceasedName: string;
  dateOfDeath: string;
  causeOfDeath: CauseOfDeath;
  claimantName: string;
  claimantPhone: string;
  status: ClaimStatus;
  withinWaitingPeriod: boolean;
  overAgeLimit: boolean;
  staffNote?: string | null;
  delivery: Delivery;
  bundle: BundleVersion;
  documents: ClaimDocument[];
  /** Document types still needed before the claim can be approved. */
  missingDocuments: ClaimDocumentType[];
  /** When we plan to deliver (yyyy-mm-dd), set by our team once the claim is approved. */
  deliveryDate?: string | null;
  deliveryWindow?: 'morning' | 'afternoon' | 'day' | null;
  deliveryNote?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimInput {
  policyId: string;
  memberId?: string;
  dateOfDeath: string;
  causeOfDeath: CauseOfDeath;
  claimantName: string;
  claimantPhone: string;
  delivery: Delivery;
}

export interface User {
  id: string;
  fullName: string;
  phone: string; // E.164
  email?: string | null;
  phoneVerified: boolean;
  notifyClaims: boolean;
  notifyPayments: boolean;
  notifyNews: boolean;
}

export interface Me {
  user: User;
  /** Whether SMS codes can be delivered. When false, phone verification and SMS password reset are unavailable. */
  smsEnabled: boolean;
}

export interface LegalSummary {
  slug: string;
  title: string;
  version: number;
  draft: boolean;
}

export interface LegalDoc extends LegalSummary {
  body: string;
  updatedAt: string;
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

export const PROVINCES = ['Gauteng', 'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'KwaZulu-Natal', 'Eastern Cape', 'Northern Cape', 'Western Cape'];

export interface AppNotification {
  id: string;
  category: 'cover' | 'payment' | 'claim';
  title: string;
  body: string;
  refType?: 'policy' | 'claim' | null;
  refId?: string | null;
  read: boolean;
  createdAt: string;
}
export interface Inbox { unread: number; items: AppNotification[] }
