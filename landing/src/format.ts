const NBSP = ' ';

/** 5016 cents -> "R50.16"; whole amounts drop the decimals ("R5 000"). */
export function formatZAR(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const rand = Math.floor(abs / 100);
  const rem = abs % 100;
  const grouped = String(rand).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${cents < 0 ? '-' : ''}R${grouped}${rem === 0 ? '' : `.${String(rem).padStart(2, '0')}`}`;
}

export const pct = (bps: number) => `${Math.round(bps / 100)}%`;
export const months = (days: number) => (days >= 28 && days % 30 === 0 ? `${days / 30} month${days === 30 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'}`);
export const monthsAdj = (days: number) => (days >= 28 && days % 30 === 0 ? `${days / 30}-month` : `${days}-day`);

/** A date of birth that makes someone exactly `age` today (their birthday was yesterday). */
export function dobForAge(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Normalises a South African mobile number to E.164 (+27XXXXXXXXX), or null when it can't be one. */
export function normaliseSAPhone(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+27')) digits = digits.slice(3);
  else if (digits.startsWith('0027')) digits = digits.slice(4);
  else if (digits.startsWith('27') && digits.length === 11) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.replace(/\D/g, '');
  return /^[678]\d{8}$/.test(digits) ? `+27${digits}` : null;
}

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

export const PROVINCES = ['Gauteng', 'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'KwaZulu-Natal', 'Eastern Cape', 'Northern Cape', 'Western Cape'];
