import type { ClaimStatus, PolicyStatus } from '../types';

export const POLICY_STATUS_LABEL: Record<PolicyStatus, string> = {
  pending_review: 'Application Received',
  approved: 'Approved',
  active: 'Cover Active',
  lapsed: 'Lapsed',
  declined: 'Not Approved',
  cancelled: 'Cancelled',
};

/** Plain-language explanation shown on the policy screen. Never implies cover before it exists. */
export const POLICY_STATUS_MESSAGE: Record<PolicyStatus, string> = {
  pending_review: "We've received your application. It's being reviewed, and you're not covered yet. We'll let you know as soon as there's news.",
  approved: "Your application is approved. Cover starts once your first monthly payment has been received.",
  active: 'Your cover is active.',
  lapsed: 'Your cover has lapsed because a payment was missed. You may be able to reinstate it, see below.',
  declined: "We weren't able to approve this application. Please contact us if you'd like to talk it through.",
  cancelled: 'This plan has been cancelled.',
};

export const POLICY_STEPS = ['Application Received', 'Approved', 'First Payment Received', 'Cover Active'];

export function policyStep(s: PolicyStatus): number {
  switch (s) {
    case 'pending_review': return 0;
    case 'approved': return 1;
    default: return 3;
  }
}

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  submitted: 'Claim Received',
  under_review: 'Under Review',
  approved: 'Approved',
  declined: 'Not Approved',
  delivered: 'Provisions Delivered',
};
export const CLAIM_STEPS = ['Claim Received', 'Under Review', 'Approved', 'Provisions Delivered'];
export function claimStep(s: ClaimStatus): number {
  return { submitted: 0, under_review: 1, approved: 2, delivered: 3, declined: 1 }[s];
}
