import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Screen, ScreenHeader } from '../src/components/Screen';
import { EmptyState } from '../src/components/States';
import { Stepper } from '../src/components/Stepper';
import { TotalsBlock } from '../src/components/Summary';
import { Card } from '../src/components/Card';
import { Text } from '../src/components/Text';
import { formatZAR } from '../src/lib/format';
import { priceBasket } from '../src/lib/pricing';
import { useBasket } from '../src/store/BasketContext';
import { useCatalog } from '../src/store/CatalogContext';
import { colors, spacing } from '../src/theme';
import type { PricedLine } from '../src/types';

function LineRow({ line, onQty }: { line: PricedLine; onQty: (n: number) => void }) {
  return (
    <View style={styles.line}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="cardTitle">{line.productName}</Text>
        <Text variant="bodyS">
          {[line.variantLabel, ...line.serviceOptions.map((o) => `+ ${o.name}`)].filter(Boolean).join(' · ') || line.unitLabel}
        </Text>
        <Text variant="bodyS" color={colors.inkSoft}>{formatZAR(line.lineTotalCents)}</Text>
      </View>
      <Stepper value={line.quantity} min={0} label={line.productName} onChange={onQty} />
    </View>
  );
}

export default function Basket() {
  const { basket, setQuantity, removePackage, clear } = useBasket();
  const { catalog } = useCatalog();
  const priced = priceBasket(basket, null);
  const singles = priced.lines.filter((l) => !l.packageInstanceId);
  const accentOf = (packageId: string) => catalog.packages.find((p) => p.id === packageId)?.accent ?? 'olive';

  if (basket.lines.length === 0) {
    return (
      <Screen>
        <ScreenHeader title="Your Basket" />
        <EmptyState icon="basket-outline" title="Your basket is empty" message="Start with a package, or pick exactly what you need." actionLabel="Browse Packages" onAction={() => { router.dismissTo('/(tabs)'); }} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text variant="eyebrow">Total before delivery</Text>
              <Text variant="price" style={{ fontSize: 22 }}>{formatZAR(priced.totals.subtotalCents)}</Text>
            </View>
          </View>
          <Button label="Arrange Delivery" icon="arrow-right" onPress={() => router.push('/checkout')} />
        </>
      }
    >
      <ScreenHeader title="Your Basket" right={<Pressable onPress={clear} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear basket"><Text variant="label" color={colors.danger}>Clear</Text></Pressable>} />

      <View style={{ gap: spacing.lg, marginTop: spacing.sm }}>
        {priced.packages.map((p) => (
          <Card key={p.instanceId} accent={accentOf(p.packageId)} tabLabel="Package">
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Text variant="cardTitle" style={{ flex: 1 }}>{p.name}</Text>
                <Pressable onPress={() => removePackage(p.instanceId)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`}>
                  <Icon name="trash-can-outline" size={20} color={colors.muted} />
                </Pressable>
              </View>
              {priced.lines.filter((l) => l.packageInstanceId === p.instanceId).map((l) => <LineRow key={l.key} line={l} onQty={(n) => setQuantity(l.key, n)} />)}
              {p.instructions ? <Text variant="bodyS">Note: {p.instructions}</Text> : null}
              <View style={styles.pkgFoot}>
                <Text variant="label">Package saving</Text>
                <Text variant="label" color={colors.olive}>-{formatZAR(p.savingCents)}</Text>
              </View>
            </View>
          </Card>
        ))}

        {singles.length > 0 ? (
          <Card noTab>
            <View style={{ gap: spacing.lg }}>
              {singles.map((l) => <LineRow key={l.key} line={l} onQty={(n) => setQuantity(l.key, n)} />)}
            </View>
          </Card>
        ) : null}

        <Card noTab>
          <TotalsBlock totals={priced.totals} />
        </Card>
        <Text variant="bodyS" style={{ textAlign: 'center' }}>Delivery cost depends on the province you choose at checkout.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pkgFoot: { flexDirection: 'row', justifyContent: 'space-between' },
});
