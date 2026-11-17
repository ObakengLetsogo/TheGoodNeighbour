import type { DeliveryWindowId } from '../types';

export const DELIVERY_WINDOWS: { id: DeliveryWindowId; label: string; hours: string }[] = [
  { id: 'morning', label: 'Morning', hours: '08:00 – 12:00' },
  { id: 'midday', label: 'Midday', hours: '12:00 – 15:00' },
  { id: 'afternoon', label: 'Afternoon', hours: '15:00 – 18:00' },
];

const pad = (n: number) => String(n).padStart(2, '0');
export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The next `count` days starting tomorrow, as local ISO dates. */
export function upcomingDates(count = 14): { iso: string; weekday: string; day: number; month: string }[] {
  const out = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({
      iso: toISODate(d),
      weekday: d.toLocaleDateString('en-ZA', { weekday: 'short' }),
      day: d.getDate(),
      month: d.toLocaleDateString('en-ZA', { month: 'short' }),
    });
  }
  return out;
}
