import { StyleSheet, View } from 'react-native';
import { formatZAR } from '../lib/format';
import { colors, spacing } from '../theme';
import type { BasketTotals } from '../types';
import { Text } from './Text';

export function Row({ label, value, bold, color, hint }: { label: string; value: string; bold?: boolean; color?: string; hint?: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={{ flex: 1 }}>
        <Text variant={bold ? 'cardTitle' : 'body'}>{label}</Text>
        {hint ? <Text variant="bodyS">{hint}</Text> : null}
      </View>
      <Text variant={bold ? 'price' : 'body'} color={color}>{value}</Text>
    </View>
  );
}

/** Totals block shared by the basket, customiser, checkout and order screens. */
export function TotalsBlock({ totals, deliveryLabel = 'Delivery' }: { totals: BasketTotals; deliveryLabel?: string }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Row label="Items" value={formatZAR(totals.itemsCents)} />
      {totals.packageSavingCents > 0 ? (
        <Row label="Package Savings" value={`-${formatZAR(totals.packageSavingCents)}`} color={colors.olive} />
      ) : null}
      <Row
        label={deliveryLabel}
        value={totals.deliveryCents == null ? 'Set At Checkout' : formatZAR(totals.deliveryCents)}
        hint={totals.deliveryCents == null ? 'Based on where it is going' : undefined}
      />
      <View style={styles.rule} />
      <Row label="Total" bold value={totals.totalCents == null ? formatZAR(totals.subtotalCents) : formatZAR(totals.totalCents)} hint={totals.totalCents == null ? 'Before delivery' : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});
