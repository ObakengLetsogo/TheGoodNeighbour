import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Badge, Chip } from '../../src/components/Chip';
import { Icon } from '../../src/components/Icon';
import { Input } from '../../src/components/Input';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { EmptyState, LoadingState } from '../../src/components/States';
import { Stepper } from '../../src/components/Stepper';
import { TotalsBlock } from '../../src/components/Summary';
import { Text } from '../../src/components/Text';
import { hasVariants, isPurchasable, lineFromProduct } from '../../src/lib/catalog';
import { formatZAR } from '../../src/lib/format';
import { priceBasket, unitTotal } from '../../src/lib/pricing';
import { useBasket } from '../../src/store/BasketContext';
import { useCatalog } from '../../src/store/CatalogContext';
import { accents, colors, radii, spacing } from '../../src/theme';
import type { BasketLine, Product } from '../../src/types';

interface Editable {
  uid: string;
  productId: string;
  variantId?: string;
  optionIds: string[];
  quantity: number;
  optional: boolean;
}

let uidCounter = 0;
const uid = () => `l${++uidCounter}`;

export default function PackageCustomiser() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, catalog } = useCatalog();
  const { addPackage } = useBasket();
  const pkg = catalog.packages.find((p) => p.id === id);
  const byId = useMemo(() => new Map(catalog.products.map((p) => [p.id, p])), [catalog.products]);

  const [lines, setLines] = useState<Editable[] | null>(null);
  const [instructions, setInstructions] = useState('');
  const [extraCat, setExtraCat] = useState<string>('livestock');
  const instanceId = useMemo(() => `${id}-${Date.now()}`, [id]);

  // Initialise editable lines from the package definition once the catalogue is available.
  const current: Editable[] = useMemo(() => {
    if (lines) return lines;
    if (!pkg) return [];
    return pkg.lines
      .filter((l) => {
        const p = byId.get(l.productId);
        return p && isPurchasable(p.availability);
      })
      .map((l) => ({ uid: uid(), productId: l.productId, variantId: l.variantId ?? byId.get(l.productId)?.variants?.[0]?.id, optionIds: [], quantity: l.quantity, optional: l.optional }));
  }, [lines, pkg, byId]);

  const update = (u: string, patch: Partial<Editable>) => setLines(current.map((l) => (l.uid === u ? { ...l, ...patch } : l)));
  const remove = (u: string) => setLines(current.filter((l) => l.uid !== u));

  const toBasketLines = (): BasketLine[] => {
    const merged = new Map<string, BasketLine>();
    for (const e of current) {
      const p = byId.get(e.productId);
      if (!p || e.quantity < 1) continue;
      const line = lineFromProduct(p, { variant: p.variants?.find((v) => v.id === e.variantId), optionIds: e.optionIds, quantity: e.quantity, packageInstanceId: instanceId });
      const ex = merged.get(line.key);
      merged.set(line.key, ex ? { ...ex, quantity: ex.quantity + line.quantity } : line);
    }
    return [...merged.values()];
  };

  const basketLines = toBasketLines();
  const priced = useMemo(
    () => priceBasket({ lines: basketLines, packages: pkg ? [{ instanceId, packageId: pkg.id, name: pkg.name, discountBps: pkg.discountBps }] : [] }, null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, pkg],
  );

  if (status === 'loading') return <Screen><ScreenHeader /><LoadingState rows={3} /></Screen>;
  if (!pkg) {
    return (
      <Screen>
        <ScreenHeader />
        <EmptyState icon="package-variant-closed-remove" title="We can't find that package" message="It may have been updated or removed." actionLabel="Back Home" onAction={() => router.replace('/(tabs)')} />
      </Screen>
    );
  }

  const a = accents[pkg.accent];
  const present = new Set(current.map((l) => l.productId));
  const extras = catalog.products.filter((p) => p.categoryId === extraCat && isPurchasable(p.availability) && p.kind !== 'service');
  const addExtra = (p: Product) => {
    const existing = current.find((l) => l.productId === p.id && l.variantId === (p.variants?.[0]?.id) && l.optionIds.length === 0);
    if (existing) return update(existing.uid, { quantity: existing.quantity + 1 });
    setLines([...current, { uid: uid(), productId: p.id, variantId: p.variants?.[0]?.id, optionIds: [], quantity: 1, optional: true }]);
  };

  const confirm = () => {
    addPackage(pkg, basketLines, instructions.trim() || undefined);
    router.replace('/basket');
  };

  const footer = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text variant="eyebrow">Package Total</Text>
          <Text variant="price" style={{ fontSize: 22 }} accessibilityLiveRegion="polite">{formatZAR(priced.totals.subtotalCents)}</Text>
        </View>
        {priced.totals.packageSavingCents > 0 ? <Badge label={`You save ${formatZAR(priced.totals.packageSavingCents)}`} color={colors.olive} bg={colors.oliveLight} /> : null}
      </View>
      <Button label="Add Package To Basket" icon="basket-plus-outline" onPress={confirm} disabled={basketLines.length === 0} />
    </>
  );

  return (
    <Screen footer={footer}>
      <ScreenHeader />
      <View style={[styles.hero, { backgroundColor: a.tint }]}>
        <View style={[styles.blob, { backgroundColor: a.main }]} />
        {pkg.accommodates ? <Badge label={`${pkg.accommodates} · guide only`} bg={colors.card} /> : null}
        <Text variant="displayM" accessibilityRole="header">{pkg.name}</Text>
        <Text variant="body" color={colors.inkSoft}>{pkg.description}</Text>
        <Text variant="bodyS" color={colors.inkSoft}>Make it yours: change quantities, add more, or remove what you don't need. The price updates as you go.</Text>
      </View>

      <Text variant="section" style={{ marginTop: spacing.xl, marginBottom: spacing.md }} accessibilityRole="header">What's In Your Package</Text>
      {current.length === 0 ? (
        <EmptyState icon="basket-outline" title="Your package is empty" message="Add something from below to build it up." />
      ) : (
        <View style={{ gap: spacing.md }}>
          {current.map((l) => {
            const p = byId.get(l.productId);
            if (!p) return null;
            const variant = p.variants?.find((v) => v.id === l.variantId);
            const unit = unitTotal(lineFromProduct(p, { variant, optionIds: l.optionIds }));
            return (
              <View key={l.uid} style={styles.line}>
                <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="cardTitle">{p.name}</Text>
                    <Text variant="bodyS">{formatZAR(unit)} each{l.optional ? '' : ' · included'}</Text>
                  </View>
                  <Stepper value={l.quantity} min={l.optional ? 0 : 1} label={p.name} onChange={(n) => (n === 0 ? remove(l.uid) : update(l.uid, { quantity: n }))} />
                </View>
                {hasVariants(p) ? (
                  <View style={styles.wrap}>
                    {p.variants!.map((v) => <Chip key={v.id} label={v.label} selected={v.id === l.variantId} onPress={() => update(l.uid, { variantId: v.id })} />)}
                  </View>
                ) : null}
                {p.serviceOptions?.map((o) => {
                  const on = l.optionIds.includes(o.id);
                  return (
                    <View key={o.id} style={styles.optRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="label" color={colors.inkSoft}>{o.name} · +{formatZAR(o.priceCents)} each</Text>
                        <Text variant="bodyS">Optional. Confirmed by our team for your area.</Text>
                      </View>
                      <Switch value={on} onValueChange={(v) => update(l.uid, { optionIds: v ? [...l.optionIds, o.id] : l.optionIds.filter((x) => x !== o.id) })} trackColor={{ true: colors.olive, false: colors.fill }} thumbColor={colors.white} accessibilityLabel={`${o.name} for ${p.name}`} />
                    </View>
                  );
                })}
                {l.optional ? (
                  <Pressable onPress={() => remove(l.uid)} accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`} style={styles.removeBtn}>
                    <Icon name="close" size={14} color={colors.muted} />
                    <Text variant="bodyS">Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <Text variant="section" style={{ marginTop: spacing.xl }} accessibilityRole="header">Add More</Text>
      <Text variant="bodyS" style={{ marginTop: 4, marginBottom: spacing.md }}>Need another sheep, a cow or extra hampers? Add them here.</Text>
      <View style={styles.wrap}>
        {catalog.categories.map((c) => <Chip key={c.id} label={c.name} selected={extraCat === c.id} onPress={() => setExtraCat(c.id)} />)}
      </View>
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {extras.length === 0 ? <Text variant="bodyS">Nothing available in this category right now.</Text> : extras.map((p) => (
          <View key={p.id} style={styles.extra}>
            <View style={{ flex: 1 }}>
              <Text variant="cardTitle" numberOfLines={1}>{p.name}</Text>
              <Text variant="bodyS">{hasVariants(p) ? 'From ' : ''}{formatZAR(p.variants?.length ? Math.min(...p.variants.map((v) => v.priceCents)) : p.priceCents)}{present.has(p.id) ? ' · in package' : ''}</Text>
            </View>
            <Button label="Add" icon="plus" size="small" fullWidth={false} variant="secondary" onPress={() => addExtra(p)} />
          </View>
        ))}
      </View>

      <Text variant="section" style={{ marginTop: spacing.xl, marginBottom: spacing.md }} accessibilityRole="header">Special Instructions</Text>
      <Input label="Anything we should know?" optional value={instructions} onChangeText={setInstructions} multiline placeholder="e.g. Please call before delivering the livestock." />

      <Text variant="section" style={{ marginTop: spacing.xl, marginBottom: spacing.md }} accessibilityRole="header">Order Summary</Text>
      <View style={styles.summary}>
        {priced.lines.map((l) => (
          <View key={l.key} style={styles.sumRow}>
            <Text variant="body" style={{ flex: 1 }}>{l.quantity} × {l.productName}{l.variantLabel ? ` (${l.variantLabel})` : ''}{l.serviceOptions.length ? ` + ${l.serviceOptions.map((o) => o.name).join(', ')}` : ''}</Text>
            <Text variant="body">{formatZAR(l.lineTotalCents)}</Text>
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />
        <TotalsBlock totals={priced.totals} />
        <Text variant="bodyS" style={{ marginTop: spacing.sm }}>Delivery is added at checkout, based on where it is going.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm, overflow: 'hidden', alignItems: 'flex-start' },
  blob: { position: 'absolute', width: 190, height: 190, borderRadius: radii.pill, opacity: 0.12, right: -60, top: -70 },
  line: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background, borderRadius: radii.sm, padding: spacing.md },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 32 },
  extra: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  summary: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  sumRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
});
