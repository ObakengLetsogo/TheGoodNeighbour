import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BasketButton } from '../../src/components/BasketButton';
import { Button } from '../../src/components/Button';
import { CategoryTile } from '../../src/components/CategoryTile';
import { Badge } from '../../src/components/Chip';
import { Icon } from '../../src/components/Icon';
import { LogoMark } from '../../src/components/Logo';
import { PackageCard } from '../../src/components/PackageCard';
import { ProductCard } from '../../src/components/ProductCard';
import { Screen, SectionHeader } from '../../src/components/Screen';
import { ErrorState, LoadingState } from '../../src/components/States';
import { EditorialHeading, Text } from '../../src/components/Text';
import { formatZAR, greeting } from '../../src/lib/format';
import { useBasket } from '../../src/store/BasketContext';
import { useCatalog } from '../../src/store/CatalogContext';
import { useOrders } from '../../src/store/OrdersContext';
import { useRecents } from '../../src/store/RecentsContext';
import { accents, colors, radii, spacing } from '../../src/theme';
import { ORDER_STATUS_LABEL } from '../../src/types';
import { config } from '../../src/config';

export default function Home() {
  const { width } = useWindowDimensions();
  const { status, catalog, reload, error } = useCatalog();
  const { orders } = useOrders();
  const { ids: recentIds } = useRecents();
  const { basket } = useBasket();

  const gutter = spacing.lg;
  const cardW = Math.min(310, width - gutter * 2 - 28);
  const tileW = (width - gutter * 2 - spacing.md) / 2;
  const active = orders.filter((o) => o.status !== 'delivered');
  const recent = recentIds.map((id) => catalog.products.find((p) => p.id === id)).filter(Boolean) as typeof catalog.products;
  const inBasket = new Set(basket.lines.map((l) => l.productId));
  const recommended = catalog.products
    .filter((p) => p.categoryId === 'supplies' && !inBasket.has(p.id) && p.availability !== 'out_of_stock')
    .slice(0, 3);

  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.brand} accessible accessibilityLabel="TGN">
          <LogoMark size={34} />
          <Text variant="displayM" style={{ fontSize: 24, lineHeight: 28 }}>TGN</Text>
        </View>
        <BasketButton />
      </View>

      <EditorialHeading lead={`${greeting()}, `} accent="Neighbour" trail="." variant="displayM" style={{ marginTop: spacing.sm }} />

      <View style={styles.hero}>
        <View style={[styles.blob, { backgroundColor: colors.olive }]} />
        <Text variant="displayM" style={{ fontSize: 26, lineHeight: 30 }}>Whatever brings everyone together, we've got you.</Text>
        <Text variant="body" color={colors.inkSoft}>Find everything you need in one place, with delivery arranged around you.</Text>
        <Button label="Explore Supplies" icon="arrow-right" onPress={() => router.push('/(tabs)/explore')} style={{ marginTop: spacing.xs }} />
      </View>

      {active.length > 0 ? (
        <>
          <SectionHeader title="Active Orders" actionLabel="See All" onAction={() => router.push('/(tabs)/orders')} />
          <View style={{ gap: spacing.md }}>
            {active.slice(0, 2).map((o) => (
              <Pressable key={o.id} onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })} style={styles.active} accessibilityRole="button" accessibilityLabel={`Order ${o.reference}, ${ORDER_STATUS_LABEL[o.status]}`}>
                <View style={[styles.activeIcon, { backgroundColor: accents.ember.tint }]}><Icon name="truck-delivery-outline" size={22} color={colors.ember} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="cardTitle">{o.reference}</Text>
                  <Text variant="bodyS">{ORDER_STATUS_LABEL[o.status]}</Text>
                </View>
                <Text variant="price">{formatZAR(o.totals.totalCents ?? o.totals.subtotalCents)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="Popular Packages" actionLabel="Explore" onAction={() => router.push('/(tabs)/explore')} />
      {status === 'loading' ? <LoadingState rows={1} label="Loading packages" /> : null}
      {status === 'error' ? <ErrorState message={error} onRetry={reload} /> : null}
      {status === 'ready' ? (
        <FlatList
          horizontal
          data={catalog.packages}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.md, paddingRight: gutter, paddingBottom: spacing.sm }}
          style={{ marginHorizontal: -gutter, paddingLeft: gutter }}
          snapToInterval={cardW + spacing.md}
          decelerationRate="fast"
          renderItem={({ item }) => <PackageCard pkg={item} width={cardW} />}
        />
      ) : null}

      <SectionHeader title="Shop By Category" />
      <View style={styles.grid}>
        {catalog.categories.map((c) => (
          <CategoryTile key={c.id} category={c} width={tileW} onPress={() => router.push({ pathname: '/(tabs)/explore', params: { categoryId: c.id } })} />
        ))}
      </View>

      {recent.length > 0 ? (
        <>
          <SectionHeader title="Recently Viewed" />
          <FlatList
            horizontal
            data={recent}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingRight: gutter }}
            style={{ marginHorizontal: -gutter, paddingLeft: gutter }}
            renderItem={({ item }) => {
              const cat = catalog.categories.find((c) => c.id === item.categoryId);
              const a = accents[cat?.accent ?? 'olive'];
              return (
                <Pressable onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })} style={styles.recent} accessibilityRole="button" accessibilityLabel={item.name}>
                  <View style={[styles.recentIcon, { backgroundColor: a.tint }]}><Icon name={cat?.icon ?? 'package-variant'} size={20} color={a.main} /></View>
                  <Text variant="label" color={colors.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{item.name}</Text>
                </Pressable>
              );
            }}
          />
        </>
      ) : null}

      {recommended.length > 0 ? (
        <>
          <SectionHeader title="Recommended Additions" />
          <View style={{ gap: spacing.md }}>{recommended.map((p) => <ProductCard key={p.id} product={p} compact />)}</View>
        </>
      ) : null}

      {config.usingMocks ? (
        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <Badge label="Preview data: prices and stock are samples" />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hero: { marginTop: spacing.xl, backgroundColor: colors.oliveLight, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.md, overflow: 'hidden' },
  blob: { position: 'absolute', width: 180, height: 180, borderRadius: radii.pill, opacity: 0.08, right: -60, top: -70 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  active: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  activeIcon: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  recent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, padding: 6, paddingRight: spacing.lg, maxWidth: 220 },
  recentIcon: { width: 34, height: 34, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
