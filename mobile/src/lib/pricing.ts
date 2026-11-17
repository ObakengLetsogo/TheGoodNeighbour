import type { BasketLine, BasketPackage, BasketState, BasketTotals, Cents, PricedLine, PricedPackage } from '../types';

export function unitTotal(line: Pick<BasketLine, 'unitPriceCents' | 'serviceOptions'>): Cents {
  return line.unitPriceCents + line.serviceOptions.reduce((s, o) => s + o.priceCents, 0);
}

export interface PricedBasket {
  lines: PricedLine[];
  packages: PricedPackage[];
  totals: BasketTotals;
}

/**
 * Pure basket pricing. Package savings apply to the lines of each customised package, and the
 * customer's edits (quantities, additions) are included in that subtotal, so the saving always
 * reflects what is actually in the basket. The server re-prices every order independently.
 */
export function priceBasket(state: BasketState, deliveryCents: Cents | null): PricedBasket {
  const lines: PricedLine[] = state.lines.map((l) => ({ ...l, lineTotalCents: unitTotal(l) * l.quantity }));

  const packages: PricedPackage[] = state.packages.map((p: BasketPackage) => {
    const subtotalCents = lines
      .filter((l) => l.packageInstanceId === p.instanceId)
      .reduce((s, l) => s + l.lineTotalCents, 0);
    return { ...p, subtotalCents, savingCents: Math.round((subtotalCents * p.discountBps) / 10000) };
  });

  const itemsCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const packageSavingCents = packages.reduce((s, p) => s + p.savingCents, 0);
  const subtotalCents = itemsCents - packageSavingCents;
  return {
    lines,
    packages,
    totals: {
      itemsCents,
      packageSavingCents,
      subtotalCents,
      deliveryCents,
      totalCents: deliveryCents == null ? null : subtotalCents + deliveryCents,
    },
  };
}

export function basketCount(state: BasketState): number {
  return state.lines.reduce((s, l) => s + l.quantity, 0);
}
