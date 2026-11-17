/** South African ID helpers. The server validates again; this gives instant, friendly feedback. */

function luhn(digits: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** Date of birth encoded in a valid SA ID (ISO yyyy-mm-dd), or null when the number is not valid. */
export function dobFromSAId(id: string, today = new Date()): string | null {
  if (!/^\d{13}$/.test(id) || !luhn(id)) return null;
  const yy = Number(id.slice(0, 2));
  const year = yy <= today.getFullYear() % 100 ? 2000 + yy : 1900 + yy;
  const month = Number(id.slice(2, 4));
  const day = Number(id.slice(4, 6));
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

export function ageOn(dobISO: string, today = new Date()): number {
  const [y, m, d] = dobISO.split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

/** Valid calendar date from day/month/year parts, as ISO, or null. */
export function isoFromParts(day: string, month: string, year: string): string | null {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const y = Number(year), m = Number(month), d = Number(day);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}
