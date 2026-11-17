import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BasketButton } from '../../src/components/BasketButton';
import { Button } from '../../src/components/Button';
import { Badge, Chip } from '../../src/components/Chip';
import { Icon } from '../../src/components/Icon';
import { ProductImage } from '../../src/components/ProductImage';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { EmptyState, LoadingState } from '../../src/components/States';
import { Stepper } from '../../src/components/Stepper';
import { Text } from '../../src/components/Text';
import { AVAILABILITY_LABEL, hasVariants, isPurchasable } from '../../src/lib/catalog';
import { formatZAR } from '../../src/lib/format';
import { useBasket } from '../../src/store/BasketContext';
import { useCatalog } from '../../src/store/CatalogContext';
import { useRecents } from '../../src/store/RecentsContext';
import { colors, radii, spacing } from '../../src/theme';

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, catalog } = useCatalog();
  const { addProduct } = useBasket();
  const { viewed } = useRecents();
  const product = catalog.products.find((p) => p.id === id);
  const category = catalog.categories.find((c) => c.id === product?.categoryId);

  const [variantId, setVariantId] = useState<string | undefined>();
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (product) {
      viewed(product.id);
      setVariantId((v) => v ?? product.variants?.[0]?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const variant = product?.variants?.find((v) => v.id === variantId);
  const unit = useMemo(() => {
    if (!product) return 0;
    const base = variant?.priceCents ?? product.priceCents;
    return base + (product.serviceOptions ?? []).filter((o) => optionIds.includes(o.id)).reduce((s, o) => s + o.priceCents, 0);
  }, [product, variant, optionIds]);

  if (status === 'loading') return <Screen><ScreenHeader /><LoadingState rows={2} /></Screen>;
  if (!product) {
    return (
      <Screen>
        <ScreenHeader />
        <EmptyState icon="package-variant-closed-remove" title="We can't find that product" message="It may have been removed or is no longer available." actionLabel="Back To Explore" onAction={() => router.replace('/(tabs)/explore')} />
      </Screen>
    );
  }

  const onRequest = product.availability === 'on_request';
  const effectiveAvail = variant?.availability ?? product.availability;
  const buyable = isPurchasable(effectiveAvail);

  const add = () => {
    addProduct(product, { variant, optionIds, quantity });
    setAdded(true);
  };

  const footer = onRequest ? (
    <Button label="Ask Us About This" icon="message-text-outline" onPress={() => router.push({ pathname: '/support/request', params: { topic: product.name } })} />
  ) : (
    <>
      <View style={styles.footRow}>
        <Stepper value={quantity} onChange={(n) => { setQuantity(n); setAdded(false); }} min={1} label="Quantity" />
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="eyebrow">Total</Text>
          <Text variant="price" style={{ fontSize: 22 }}>{formatZAR(unit * quantity)}</Text>
        </View>
      </View>
      {added ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color={colors.olive} accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>Added to your basket</Text>
          <Button label="View Basket" onPress={() => router.push('/basket')} />
        </View>
      ) : (
        <Button label="Add To Basket" icon="basket-plus-outline" onPress={add} disabled={!buyable} />
      )}
    </>
  );

  return (
    <Screen footer={footer}>
      <ScreenHeader right={<BasketButton />} />
      <ProductImage uri={product.imageUrl} icon={category?.icon ?? 'package-variant'} accent={category?.accent ?? 'olive'} height={200} label={`${product.name} image`} style={{ borderRadius: radii.lg }} />

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Badge label={category?.name ?? 'Product'} />
        <Text variant="displayM" accessibilityRole="header">{product.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Text variant="price" style={{ fontSize: 22 }}>{onRequest ? 'Price On Request' : formatZAR(variant?.priceCents ?? product.priceCents)}</Text>
          <Badge label={AVAILABILITY_LABEL[effectiveAvail]} color={effectiveAvail === 'limited' ? colors.warning : effectiveAvail === 'out_of_stock' ? colors.danger : colors.olive} />
        </View>
        <Text variant="body" style={{ marginTop: spacing.xs }}>{product.description}</Text>
      </View>

      {hasVariants(product) ? (
        <Block title={product.kind === 'livestock' ? 'Choose Size' : 'Choose Size'}>
          <View style={styles.wrap}>
            {product.variants!.map((v) => (
              <Chip key={v.id} label={`${v.label} · ${formatZAR(v.priceCents)}`} selected={v.id === variantId} onPress={() => { setVariantId(v.id); setAdded(false); }} disabled={v.availability === 'out_of_stock'} />
            ))}
          </View>
        </Block>
      ) : null}

      {product.includes?.length ? (
        <Block title="What's Included">
          {product.includes.map((i) => (
            <View key={i} style={styles.inc}><Icon name="check" size={16} color={colors.olive} /><Text variant="body">{i}</Text></View>
          ))}
        </Block>
      ) : null}

      {product.serviceOptions?.length ? (
        <Block title="Preparation Services" note="These are separate services and are not included in the animal's price. Availability depends on your delivery area and is confirmed by our team.">
          {product.serviceOptions.map((o) => {
            const on = optionIds.includes(o.id);
            return (
              <Pressable key={o.id} onPress={() => { setOptionIds((c) => (on ? c.filter((x) => x !== o.id) : [...c, o.id])); setAdded(false); }} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${o.name}, ${formatZAR(o.priceCents)} each`} style={[styles.option, on && { borderColor: colors.olive, backgroundColor: colors.oliveLight }]}>
                <Icon name={on ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={on ? colors.olive : colors.muted} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="cardTitle">{o.name}</Text>
                  <Text variant="bodyS">{o.description}</Text>
                </View>
                <Text variant="price">+{formatZAR(o.priceCents)}</Text>
              </Pressable>
            );
          })}
        </Block>
      ) : null}

      {product.deliveryInfo ? (
        <Block title="Delivery">
          <View style={styles.inc}><Icon name="truck-delivery-outline" size={20} color={colors.muted} /><Text variant="body" style={{ flex: 1 }}>{product.deliveryInfo}</Text></View>
        </Block>
      ) : null}
    </Screen>
  );
}

function Block({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
      <Text variant="section" accessibilityRole="header">{title}</Text>
      {note ? <Text variant="bodyS">{note}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  inc: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.card },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
