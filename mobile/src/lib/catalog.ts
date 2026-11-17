import type { Availability, BasketLine, Category, PackageDef, Product, ProductQuery, Variant } from '../types';

export function isPurchasable(a: Availability): boolean {
  return a === 'in_stock' || a === 'limited';
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  in_stock: 'In Stock',
  limited: 'Limited Availability',
  on_request: 'On Request',
  out_of_stock: 'Unavailable',
};

/** Lowest price a product can be bought at (its cheapest variant, or the base price). */
export function fromPrice(p: Product): number {
  if (p.variants?.length) return Math.min(...p.variants.map((v) => v.priceCents));
  return p.priceCents;
}

export function hasVariants(p: Product): boolean {
  return !!p.variants && p.variants.length > 1;
}

export function queryProducts(products: Product[], categories: Category[], q: ProductQuery): Product[] {
  const groupOf = new Map(categories.map((c) => [c.id, c.group]));
  const term = q.search?.trim().toLowerCase();
  let out = products.filter((p) => {
    if (q.categoryId && p.categoryId !== q.categoryId) return false;
    if (q.group && groupOf.get(p.categoryId) !== q.group) return false;
    if (q.availableOnly && !isPurchasable(p.availability)) return false;
    if (term && !`${p.name} ${p.description} ${(p.tags ?? []).join(' ')}`.toLowerCase().includes(term)) return false;
    return true;
  });
  switch (q.sort) {
    case 'price_asc':
      out = [...out].sort((a, b) => fromPrice(a) - fromPrice(b));
      break;
    case 'price_desc':
      out = [...out].sort((a, b) => fromPrice(b) - fromPrice(a));
      break;
    case 'name':
      out = [...out].sort((a, b) => a.name.localeCompare(b.name));
      break;
  }
  return out;
}

export function makeLineKey(productId: string, variantId?: string, optionIds: string[] = [], packageInstanceId?: string) {
  return [productId, variantId ?? '-', [...optionIds].sort().join('+') || '-', packageInstanceId ?? '-'].join('|');
}

export function lineFromProduct(
  product: Product,
  opts: { variant?: Variant; optionIds?: string[]; quantity?: number; packageInstanceId?: string } = {},
): BasketLine {
  const variant = opts.variant ?? (product.variants?.length === 1 ? product.variants[0] : undefined);
  const optionIds = opts.optionIds ?? [];
  return {
    key: makeLineKey(product.id, variant?.id, optionIds, opts.packageInstanceId),
    productId: product.id,
    productName: product.name,
    kind: product.kind,
    categoryId: product.categoryId,
    variantId: variant?.id,
    variantLabel: variant?.label,
    unitLabel: product.unitLabel,
    unitPriceCents: variant?.priceCents ?? product.priceCents,
    serviceOptions: (product.serviceOptions ?? [])
      .filter((o) => optionIds.includes(o.id))
      .map((o) => ({ id: o.id, name: o.name, priceCents: o.priceCents })),
    quantity: opts.quantity ?? 1,
    packageInstanceId: opts.packageInstanceId,
  };
}

/** Resolve a package's default lines against the live catalogue. Unavailable products are skipped. */
export function packageDefaultLines(pkg: PackageDef, products: Product[], instanceId: string): BasketLine[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: BasketLine[] = [];
  for (const l of pkg.lines) {
    const product = byId.get(l.productId);
    if (!product || !isPurchasable(product.availability)) continue;
    const variant = product.variants?.find((v) => v.id === l.variantId);
    lines.push(lineFromProduct(product, { variant, quantity: l.quantity, packageInstanceId: instanceId }));
  }
  return lines;
}

export function packagePriceCents(pkg: PackageDef, products: Product[]): { itemsCents: number; totalCents: number } {
  const lines = packageDefaultLines(pkg, products, 'preview');
  const itemsCents = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  return { itemsCents, totalCents: itemsCents - Math.round((itemsCents * pkg.discountBps) / 10000) };
}
