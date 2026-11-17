/** Non-breaking space: keeps "R1 500" from wrapping mid-amount. */
const NBSP = ' ';

/** Format an amount in cents as South African rand, e.g. 150000 -> "R1 500". */
export function formatZAR(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const rand = Math.floor(abs / 100);
  const rem = abs % 100;
  const grouped = String(rand).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const decimals = rem === 0 ? '' : `.${String(rem).padStart(2, '0')}`;
  return `${negative ? '-' : ''}R${grouped}${decimals}`;
}

/** "Good morning" / "Good afternoon" / "Good evening" in SAST-agnostic local time. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function pluralise(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

// ---------- South African phone numbers ----------

/**
 * Normalises a South African mobile number to E.164 (+27XXXXXXXXX).
 * Accepts "082 123 4567", "0821234567", "+27 82 123 4567", "27821234567" or the national
 * digits only ("821234567"). Returns null when it can't be a valid SA mobile number.
 */
export function normaliseSAPhone(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+27')) digits = digits.slice(3);
  else if (digits.startsWith('0027')) digits = digits.slice(4);
  else if (digits.startsWith('27') && digits.length === 11) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.replace(/\D/g, '');
  // SA mobile numbers: 9 national digits starting 6, 7 or 8.
  if (!/^[678]\d{8}$/.test(digits)) return null;
  return `+27${digits}`;
}

/** "+27821234567" -> "+27 82 123 4567" */
export function displayPhone(e164: string): string {
  const m = /^\+27(\d{2})(\d{3})(\d{4})$/.exec(e164);
  return m ? `+27 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
