import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Badge } from '../../src/components/Chip';
import { Card } from '../../src/components/Card';
import { Screen, SectionHeader } from '../../src/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../src/components/States';
import { Text } from '../../src/components/Text';
import { formatDate, formatZAR, pluralise } from '../../src/lib/format';
import { useOrders } from '../../src/store/OrdersContext';
import { colors, spacing } from '../../src/theme';
import { ORDER_STATUS_LABEL, type Order } from '../../src/types';

function OrderCard({ order }: { order: Order }) {
  const items = order.lines.reduce((s, l) => s + l.quantity, 0);
  return (
    <Card accent={order.status === 'delivered' ? 'olive' : 'ember'} tabLabel={formatDate(order.createdAt)} onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })} accessibilityLabel={`Order ${order.reference}, ${ORDER_STATUS_LABEL[order.status]}`}>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 4, alignItems: 'flex-start' }}>
          <Text variant="cardTitle">{order.reference}</Text>
          <Text variant="bodyS">{pluralise(items, 'item', 'items')} · to {order.delivery.recipientName}</Text>
          <Badge label={ORDER_STATUS_LABEL[order.status]} color={colors.olive} bg={colors.oliveLight} />
        </View>
        <Text variant="price">{formatZAR(order.totals.totalCents ?? order.totals.subtotalCents)}</Text>
      </View>
    </Card>
  );
}

export default function Orders() {
  const { status, orders, error, refresh } = useOrders();
  const active = orders.filter((o) => o.status !== 'delivered');
  const past = orders.filter((o) => o.status === 'delivered');
  return (
    <Screen>
      <Text variant="displayM" style={{ marginTop: spacing.lg }} accessibilityRole="header">Orders</Text>
      {status === 'loading' ? <View style={{ marginTop: spacing.xl }}><LoadingState rows={2} label="Loading orders" /></View> : null}
      {status === 'error' ? <ErrorState message={error} onRetry={refresh} /> : null}
      {status === 'ready' && orders.length === 0 ? (
        <EmptyState icon="clipboard-text-outline" title="No orders yet" message="When you place an order, you'll be able to follow it here from start to finish." actionLabel="Browse Packages" onAction={() => router.push('/(tabs)')} />
      ) : null}
      {status === 'ready' && active.length > 0 ? (
        <>
          <SectionHeader title="In Progress" />
          <View style={{ gap: spacing.lg }}>{active.map((o) => <OrderCard key={o.id} order={o} />)}</View>
        </>
      ) : null}
      {status === 'ready' && past.length > 0 ? (
        <>
          <SectionHeader title="Order History" />
          <View style={{ gap: spacing.lg }}>{past.map((o) => <OrderCard key={o.id} order={o} />)}</View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md } });
