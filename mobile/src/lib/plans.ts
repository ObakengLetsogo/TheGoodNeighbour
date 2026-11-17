import type { Cents, MemberInput, MemberRule, MemberType, Plan } from '../types';
import { MEMBER_LABEL } from '../types';
import { ageOn } from './saId';

export function ruleFor(plan: Plan, type: MemberType): MemberRule | undefined {
  return plan.memberRules.find((r) => r.type === type);
}

/** Monthly total preview. The server prices the real application. */
export function monthlyTotal(plan: Plan, members: Pick<MemberInput, 'type'>[]): Cents {
  return (
    plan.premiumCents +
    members.reduce((sum, m) => sum + (ruleFor(plan, m.type)?.feeCents ?? 0), 0)
  );
}

/** Friendly eligibility message for adding someone, or null when they can be added. */
export function memberProblem(plan: Plan, type: MemberType, dobISO: string, existing: Pick<MemberInput, 'type'>[]): string | null {
  const rule = ruleFor(plan, type);
  if (!rule) return `This plan doesn't include ${MEMBER_LABEL[type].toLowerCase()} members.`;
  const age = ageOn(dobISO);
  if (age < 0) return 'That date of birth is in the future.';
  if (age < rule.minAge || age > rule.maxAge) return `${MEMBER_LABEL[type]} members must be between ${rule.minAge} and ${rule.maxAge} years old.`;
  if (existing.filter((m) => m.type === type).length >= rule.maxCount)
    return `This plan allows up to ${rule.maxCount} ${MEMBER_LABEL[type].toLowerCase()} ${rule.maxCount === 1 ? 'member' : 'members'}.`;
  return null;
}

export const DEBIT_DAYS = [1, 7, 15, 25] as const;
export const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
