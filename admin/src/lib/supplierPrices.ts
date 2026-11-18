import type { BenefitItem } from '../types';

/**
 * Turns the filled-in quote sheet (docs/quote-sheet.csv) into the real cost of each thing we sell.
 * Pure functions, so they can be tested without a browser.
 */

export interface Quote {
  category: string;
  supplier: string;
  item: string;
  price: number;           // rand
  written: boolean;
}

/** A small CSV reader: quoted fields, commas and line breaks inside quotes, a leading byte-order mark. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

/** "R 1 250,50", "1,250.50", "1250" all become a number. Returns null when there is no usable price. */
export function parsePrice(raw: string): number | null {
  let s = (raw ?? '').replace(/[Rr\s ]/g, '');
  if (!s) return null;
  if (/,\d{1,2}$/.test(s) && !/\./.test(s)) s = s.replace(',', '.');      // decimal comma
  s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export interface Parsed { quotes: Quote[]; problems: string[] }

export function parseQuoteSheet(text: string): Parsed {
  const rows = parseCsv(text);
  const problems: string[] = [];
  if (rows.length < 2) return { quotes: [], problems: ['That file is empty.'] };
  const head = rows[0].map((h) => norm(h));
  const col = (name: string) => head.findIndex((h) => h.startsWith(name));
  const iCat = col('category'), iSup = col('supplier'), iItem = col('item'), iPrice = col('unit price'), iWrit = col('written');
  if (iCat < 0 || iItem < 0 || iPrice < 0) return { quotes: [], problems: ['This doesn\'t look like the quote sheet: it needs the Category, Item and Unit price columns.'] };
  const quotes: Quote[] = [];
  rows.slice(1).forEach((r, n) => {
    const raw = (r[iPrice] ?? '').trim();
    if (!raw) return;
    const price = parsePrice(raw);
    if (price == null) { problems.push(`Row ${n + 2} (${r[iItem]}): "${raw}" isn't a price.`); return; }
    quotes.push({ category: (r[iCat] ?? '').trim(), supplier: (r[iSup] ?? '').trim(), item: (r[iItem] ?? '').trim(), price, written: /^y/i.test((r[iWrit] ?? '').trim()) });
  });
  return { quotes, problems };
}

export interface Best { price: number; written: boolean; count: number; supplier: string }

/** The lowest price we have for each item. Prices in writing win over prices that aren't, because only those can be relied on. */
export function bestPrices(quotes: Quote[], category?: string): Map<string, Best> {
  const out = new Map<string, Best>();
  for (const q of quotes) {
    if (category && q.category.toLowerCase() !== category.toLowerCase()) continue;
    const key = norm(q.item);
    const cur = out.get(key);
    const count = (cur?.count ?? 0) + 1;
    const better = !cur || (q.written && !cur.written) || (q.written === cur.written && q.price < cur.price);
    out.set(key, better ? { price: q.price, written: q.written, count, supplier: q.supplier } : { ...cur!, count });
  }
  return out;
}

export interface LineCost { label: string; qty: number; unitPrice?: number; written?: boolean; missing: boolean }
export interface ItemCost {
  item: BenefitItem;
  lines: LineCost[];
  costRand: number | null;       // null until every part has a price
  missing: string[];
  allWritten: boolean;
}

const parseLine = (line: string) => {
  const m = /^(.*?)(?:\s*[×x]\s*(\d+))?$/.exec(line.trim());
  return { base: (m?.[1] ?? line).trim(), qty: m?.[2] ? Number(m[2]) : 1 };
};

/**
 * The cost of one of each catalogue item from the quotes: groceries from the price of every line of the hamper (plus our own delivery,
 * if quoted); livestock from the animal plus transport and paperwork, if quoted. Not complete until every part is priced.
 */
export function costItems(items: BenefitItem[], quotes: Quote[]): ItemCost[] {
  const groceries = bestPrices(quotes, 'Grocery');
  const stock = bestPrices(quotes, 'Livestock');
  const delivery = bestPrices(quotes, 'Delivery');
  const find = (m: Map<string, Best>, ...names: string[]) => names.map((n) => m.get(norm(n))).find(Boolean);
  const out: ItemCost[] = [];
  for (const item of items) {
    const lines: LineCost[] = [];
    if (item.kind === 'grocery') {
      for (const raw of item.contents) {
        const { base, qty } = parseLine(raw);
        const b = groceries.get(norm(base));
        lines.push(b ? { label: base, qty, unitPrice: b.price, written: b.written, missing: false } : { label: base, qty, missing: true });
      }
      const d = find(delivery, 'Our own delivery of a grocery hamper');
      if (d) lines.push({ label: 'Our own delivery', qty: 1, unitPrice: d.price, written: d.written, missing: false });
    } else {
      const name = /cow|cattle|ox|beef/i.test(item.name) ? ['Cow'] : ['Sheep'];
      const animal = find(stock, ...name);
      lines.push(animal ? { label: name[0], qty: 1, unitPrice: animal.price, written: animal.written, missing: false } : { label: name[0], qty: 1, missing: true });
      for (const extra of ['Livestock transport', 'Health certificate and movement permit']) {
        const e = find(stock, extra);
        if (e) lines.push({ label: extra, qty: 1, unitPrice: e.price, written: e.written, missing: false });
      }
    }
    const missing = lines.filter((l) => l.missing).map((l) => l.label);
    const priced = lines.filter((l) => !l.missing);
    out.push({
      item, lines, missing,
      costRand: missing.length === 0 && priced.length > 0 ? Math.round(priced.reduce((n, l) => n + l.unitPrice! * l.qty, 0) * 100) / 100 : null,
      allWritten: priced.every((l) => l.written),
    });
  }
  return out;
}

/** Margin on what the family receives, at shop prices, if it costs us `costRand`. */
export const marginPct = (valueCents: number, costRand: number) => (valueCents > 0 ? Math.round(((valueCents / 100 - costRand) / (valueCents / 100)) * 1000) / 10 : 0);
