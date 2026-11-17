import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AVAILABILITY_LABEL, fromPrice, hasVariants, isPurchasable } from '../lib/catalog';
import { formatZAR } from '../lib/format';
import { useBasket } from '../store/BasketContext';
import { useCatalog } from '../store/CatalogContext';
import { colors, spacing } from '../theme';
import type { Product } from '../types';
import { Badge } from './Chip';
import { Button } from './Button';
import { Card } from './Card';
import { ProductImage } from './ProductImage';
import { Text } from './Text';

const availabilityColor = { in_stock: colors.olive, limited: colors.warning, on_request: colors.inkSoft, out_of_stock: colors.danger } as const;

export function ProductCard({ product, compact }: { product: Product; compact?: boolean }) {
  const { catalog } = useCatalog();
  const { addProduct } = useBasket();
  const category = catalog.categories.find((c) => c.id === product.categoryId);
  const open = () => router.push({ pathname: '/product/[id]', params: { id: product.id } });
  const buyable = isPurchasable(product.availability);
  const needsChoice = hasVariants(product) || !!product.serviceOptions?.length;
  const price = product.availability === 'on_request' ? 'Price On Request' : `${hasVariants(product) ? 'From ' : ''}${formatZAR(fromPrice(product))}`;

  const onAdd = () => {
    if (product.availability === 'on_request') return router.push({ pathname: '/support/request', params: { topic: product.name } });
    if (needsChoice) return open();
    addProduct(product);
  };

  return (
    <Card accent={category?.accent ?? 'olive'} tabLabel={category?.name} onPress={open} accessibilityLabel={`${product.name}. ${price}. ${AVAILABILITY_LABEL[product.availability]}`}>
      <View style={styles.row}>
        <ProductImage uri={product.imageUrl} icon={category?.icon ?? 'package-variant'} accent={category?.accent ?? 'olive'} height={compact ? 84 : 96} label={`${product.name} image`} style={{ width: compact ? 84 : 96 }} />
        <View style={styles.info}>
          <Text variant="cardTitle" numberOfLines={2}>{product.name}</Text>
          <Text variant="bodyS" numberOfLines={2}>{product.description}</Text>
          <Badge label={AVAILABILITY_LABEL[product.availability]} color={availabilityColor[product.availability]} bg={colors.fill} />
        </View>
      </View>
      <View style={styles.foot}>
        <Text variant="price">{price}</Text>
        <Button
          label={product.availability === 'on_request' ? 'Ask Us' : needsChoice ? 'Choose' : 'Add'}
          icon={product.availability === 'on_request' ? 'message-text-outline' : needsChoice ? undefined : 'plus'}
          size="small"
          fullWidth={false}
          disabled={!buyable && product.availability !== 'on_request'}
          onPress={onAdd}
          accessibilityHint={needsChoice ? 'Opens the product to choose options' : undefined}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  info: { flex: 1, gap: 4, alignItems: 'flex-start' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
});
