import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from '../types';
import { Icon } from './Icon';
import { Text } from './Text';

const HINT: Record<OrderStatus, string> = {
  order_received: 'We have your order.',
  payment_confirmed: 'Shown once your payment has been confirmed.',
  preparing: 'Your items are being put together.',
  supplier_confirmed: 'Our supplier has confirmed your order.',
  out_for_delivery: 'On its way to the recipient.',
  delivered: 'Delivered to the recipient.',
};

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const current = ORDER_STATUSES.indexOf(status);
  return (
    <View accessible accessibilityLabel={`Order progress: ${ORDER_STATUS_LABEL[status]}, step ${current + 1} of ${ORDER_STATUSES.length}`}>
      {ORDER_STATUSES.map((s, i) => {
        const done = i < current;
        const now = i === current;
        const last = i === ORDER_STATUSES.length - 1;
        return (
          <View key={s} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.node, done && styles.nodeDone, now && styles.nodeNow]}>
                {done ? <Icon name="check" size={14} color={colors.white} /> : now ? <View style={styles.pulse} /> : null}
              </View>
              {!last ? <View style={[styles.line, done && { backgroundColor: colors.olive }]} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.lg }}>
              <Text variant="cardTitle" color={i > current ? colors.muted : colors.ink}>{ORDER_STATUS_LABEL[s]}</Text>
              {now || (i === current + 1) ? <Text variant="bodyS">{HINT[s]}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 24 },
  node: { width: 24, height: 24, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: colors.olive, borderColor: colors.olive },
  nodeNow: { borderColor: colors.olive, backgroundColor: colors.oliveLight },
  pulse: { width: 10, height: 10, borderRadius: radii.pill, backgroundColor: colors.olive },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 },
});
