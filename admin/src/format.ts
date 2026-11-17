const NBSP = ' ';

/** 150000 -> "R1 500" (cents in, South African rand out). */
export function zar(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const rand = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const rem = abs % 100;
  return `${cents < 0 ? '-' : ''}R${rand}${rem ? `.${String(rem).padStart(2, '0')}` : ''}`;
}

export const dateShort = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
export const dateTime = (iso: string) => new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const displayPhone = (e164: string) => {
  const m = /^\+27(\d{2})(\d{3})(\d{4})$/.exec(e164);
  return m ? `+27 ${m[1]} ${m[2]} ${m[3]}` : e164;
};

export const label = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export const today = () => new Date().toLocaleDateString('en-CA'); // yyyy-mm-dd, local

export const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
