import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BasketButton } from '../../src/components/BasketButton';
import { Chip } from '../../src/components/Chip';
import { Icon } from '../../src/components/Icon';
import { Input } from '../../src/components/Input';
import { ProductCard } from '../../src/components/ProductCard';
import { Screen } from '../../src/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/States';
import { Text } from '../../src/components/Text';
import { pluralise } from '../../src/lib/format';
import { queryProducts } from '../../src/lib/catalog';
import { useCatalog } from '../../src/store/CatalogContext';
import { colors, spacing } from '../../src/theme';
import type { ProductQuery } from '../../src/types';

const SORTS: { id: NonNullable<ProductQuery['sort']>; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'price_asc', label: 'Price: Low To High' },
  { id: 'price_desc', label: 'Price: High To Low' },
  { id: 'name', label: 'Name' },
];

export default function Explore() {
  const { status, catalog, reload, error } = useCatalog();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const [categoryId, setCategoryId] = useState<string | undefined>(params.categoryId);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<NonNullable<ProductQuery['sort']>>('featured');
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => {
    setCategoryId(params.categoryId);
  }, [params.categoryId]);

  const results = useMemo(
    () => queryProducts(catalog.products, catalog.categories, { categoryId, search, sort, availableOnly }),
    [catalog, categoryId, search, sort, availableOnly],
  );
  const filtered = !!categoryId || !!search || availableOnly;

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60 }}>
          <Text variant="displayM" accessibilityRole="header">Explore</Text>
          <BasketButton />
        </View>

        <View style={{ backgroundColor: colors.background, paddingBottom: spacing.sm, gap: spacing.md }}>
          <View style={{ paddingHorizontal: spacing.lg }}>
            <Input label="Search" value={search} onChangeText={setSearch} placeholder="Maize meal, sheep, rice..." returnKeyType="search" autoCorrect={false} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            <Chip label="All" selected={!categoryId} onPress={() => setCategoryId(undefined)} />
            {catalog.categories.map((c) => (
              <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' }}>
            <Icon name="sort" size={18} color={colors.muted} />
            {SORTS.map((s) => <Chip key={s.id} label={s.label} selected={sort === s.id} onPress={() => setSort(s.id)} />)}
            <Chip label="Available Only" selected={availableOnly} onPress={() => setAvailableOnly((v) => !v)} />
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.sm }}>
          {status === 'loading' ? <LoadingState rows={3} label="Loading products" /> : null}
          {status === 'error' ? <ErrorState message={error} onRetry={reload} /> : null}
          {status === 'ready' && results.length === 0 ? (
            <EmptyState
              icon="magnify"
              title="Nothing matches just yet"
              message={filtered ? 'Try a different search or clear the filters. If you need something specific, our support team can help.' : 'There is nothing in the catalogue right now. Please check back soon.'}
              actionLabel={filtered ? 'Clear Filters' : undefined}
              onAction={() => { setCategoryId(undefined); setSearch(''); setAvailableOnly(false); }}
            />
          ) : null}
          {status === 'ready' && results.length > 0 ? (
            <>
              <Text variant="label" accessibilityLiveRegion="polite">{pluralise(results.length, 'product', 'products')}</Text>
              {results.map((p) => <ProductCard key={p.id} product={p} />)}
            </>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
