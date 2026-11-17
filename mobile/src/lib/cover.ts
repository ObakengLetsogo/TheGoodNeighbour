import type { CoverOptions, MemberInput, Relationship, RelationshipRule } from '../types';
import { RELATIONSHIP_LABEL } from '../types';
import { ageOn } from './saId';

export const ruleFor = (o: CoverOptions, r: Relationship): RelationshipRule | undefined => o.relationships.find((x) => x.relationship === r);

/** A member's monthly fee is the main member's price times their relationship's multiplier (the server uses the same rule). */
export const feeFor = (baseMonthlyCents: number, multiplierBps: number) => Math.round((baseMonthlyCents * multiplierBps) / 10000);

/** Friendly eligibility problem for adding someone, or null. The server checks again. */
export function memberProblem(o: CoverOptions, r: Relationship, dobISO: string, existing: Pick<MemberInput, 'relationship'>[]): string | null {
  const rule = ruleFor(o, r);
  if (!rule) return `A ${RELATIONSHIP_LABEL[r].toLowerCase()} can't be added to a cover.`;
  if (existing.length >= o.maxMembers) return `A cover can have up to ${o.maxMembers} family members.`;
  const age = ageOn(dobISO);
  if (age < 0) return 'That date of birth is in the future.';
  if (age < rule.minAge || age > rule.maxAge) return `A ${RELATIONSHIP_LABEL[r].toLowerCase()} must be between ${rule.minAge} and ${rule.maxAge} years old to join.`;
  if (existing.filter((m) => m.relationship === r).length >= rule.maxCount)
    return `A cover can include up to ${rule.maxCount} ${RELATIONSHIP_LABEL[r].toLowerCase()}${rule.maxCount === 1 ? '' : 's'}.`;
  return null;
}

export const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

export const months = (days: number) => (days >= 28 && days % 30 === 0 ? `${days / 30} month${days === 30 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'}`);
