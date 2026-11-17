import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { packageDefaultLines, packagePriceCents } from '../lib/catalog';
import { formatZAR } from '../lib/format';
import { useCatalog } from '../store/CatalogContext';
import { accents, colors, radii, spacing } from '../theme';
import type { PackageDef } from '../types';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';

export function PackageCard({ pkg, width }: { pkg: PackageDef; width?: number }) {
  const { catalog } = useCatalog();
  const a = accents[pkg.accent];
  const lines = packageDefaultLines(pkg, catalog.products, 'card');
  const { totalCents } = packagePriceCents(pkg, catalog.products);
  const icons = Array.from(new Set(lines.map((l) => catalog.categories.find((c) => c.id === l.categoryId)?.icon ?? 'package-variant'))).slice(0, 4);
  const open = () => router.push({ pathname: '/package/[id]', params: { id: pkg.id } });

  return (
    <View style={width ? { width } : undefined}>
      <Card accent={pkg.accent} tabLabel={pkg.accommodates ?? 'Package'} onPress={open} padded={false} accessibilityLabel={`${pkg.name}. ${pkg.description}. From ${formatZAR(totalCents)}`}>
        <View style={[styles.hero, { backgroundColor: a.tint }]}>
          <View style={[styles.blob, { backgroundColor: a.main }]} />
          <View style={styles.icons}>
            {icons.map((n) => (
              <View key={n} style={styles.iconWrap}><Icon name={n} size={26} color={a.main} /></View>
            ))}
          </View>
        </View>
        <View style={styles.body}>
          <Text variant="cardTitle" numberOfLines={2}>{pkg.name}</Text>
          <Text variant="bodyS" numberOfLines={3}>{pkg.description}</Text>
          <View style={styles.includes}>
            {lines.slice(0, 4).map((l) => (
              <View key={l.key} style={styles.inc}>
                <Icon name="check" size={14} color={colors.olive} />
                <Text variant="bodyS" numberOfLines={1} style={{ flex: 1 }} color={colors.inkSoft}>
                  {l.quantity > 1 ? `${l.quantity} × ` : ''}{l.productName}
                </Text>
              </View>
            ))}
            {lines.length > 4 ? <Text variant="bodyS">+ {lines.length - 4} more</Text> : null}
          </View>
          <View style={styles.foot}>
            <View>
              <Text variant="eyebrow">From</Text>
              <Text variant="price">{formatZAR(totalCents)}</Text>
            </View>
            <Button label="View Package" size="small" fullWidth={false} onPress={open} />
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 104, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  blob: { position: 'absolute', width: 150, height: 150, borderRadius: radii.pill, opacity: 0.12, right: -30, top: -50 },
  icons: { flexDirection: 'row', gap: spacing.sm },
  iconWrap: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, gap: 6 },
  includes: { gap: 4, marginTop: spacing.xs },
  inc: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
});
