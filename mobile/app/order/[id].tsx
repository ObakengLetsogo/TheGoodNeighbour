import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Chip';
import { Card } from '../../src/components/Card';
import { Icon } from '../../src/components/Icon';
import { OrderTimeline } from '../../src/components/OrderTimeline';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { EmptyState, LoadingState } from '../../src/components/States';
import { TotalsBlock } from '../../src/components/Summary';
import { Text } from '../../src/components/Text';
import { displayPhone, formatDateLong, formatZAR } from '../../src/lib/format';
import { DELIVERY_WINDOWS } from '../../src/lib/dates';
import { openWhatsApp } from '../../src/lib/support';
import { orderService } from '../../src/services';
import { useOrders } from '../../src/store/OrdersContext';
import { colors, radii, spacing } from '../../src/theme';
import { ORDER_STATUS_LABEL, type Order, type PaymentStatus } from '../../src/types';

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  awaiting_payment: 'Awaiting Payment',
  paid: 'Payment Confirmed',
  failed: 'Payment Failed',
  refunded: 'Refunded',
};

export default function OrderDetails() {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const { orders } = useOrders();
  const [order, setOrder] = useState<Order | null | undefined>(orders.find((o) => o.id === id));

  useEffect(() => {
    let live = true;
    orderService.getOrder(id).then((o) => live && setOrder(o)).catch(() => live && setOrder((c) => c ?? null));
    return () => { live = false; };
  }, [id]);

  const close = () => (placed ? router.replace('/(tabs)/orders') : router.back());

  if (order === undefined) return <Screen><ScreenHeader onBack={close} /><LoadingState rows={2} /></Screen>;
  if (order === null) {
    return (
      <Screen>
        <ScreenHeader onBack={close} />
        <EmptyState icon="clipboard-search-outline" title="We can't find that order" message="It may not be on this account." actionLabel="View My Orders" onAction={() => router.replace('/(tabs)/orders')} />
      </Screen>
    );
  }

  const d = order.delivery;
  const win = DELIVERY_WINDOWS.find((w) => w.id === d.window);

  return (
    <Screen>
      <ScreenHeader title={order.reference} onBack={close} />

      {placed ? (
        <View style={styles.thanks} accessibilityRole="alert">
          <Icon name="hand-heart-outline" size={28} color={colors.olive} />
          <Text variant="displayM" style={{ fontSize: 24, lineHeight: 28 }}>We've got your order.</Text>
          <Text variant="body" color={colors.inkSoft}>
            Thank you. Your order is saved as received.{order.paymentStatus === 'awaiting_payment' ? " Payment hasn't been confirmed yet, so we'll be in touch about how to pay." : ''} Our team will confirm availability and delivery with {d.recipientName.split(' ')[0]}.
          </Text>
        </View>
      ) : null}

      <View style={styles.badges}>
        <Badge label={ORDER_STATUS_LABEL[order.status]} color={colors.olive} bg={colors.oliveLight} />
        <Badge label={PAYMENT_LABEL[order.paymentStatus]} color={order.paymentStatus === 'paid' ? colors.success : colors.warning} bg={colors.fill} />
      </View>

      <Text variant="section" style={styles.h}>Progress</Text>
      <Card noTab><OrderTimeline status={order.status} /></Card>

      <Text variant="section" style={styles.h}>Delivery</Text>
      <Card accent="ember" tabLabel="To">
        <View style={{ gap: spacing.xs }}>
          <Text variant="cardTitle">{d.recipientName}</Text>
          <Text variant="body">{displayPhone(d.recipientPhone)}</Text>
          <Text variant="body" style={{ marginTop: spacing.xs }}>{d.addressLine}, {d.suburb}</Text>
          <Text variant="body">{d.city}, {d.province} {d.postalCode}</Text>
          <Text variant="body" color={colors.inkSoft} style={{ marginTop: spacing.sm }}>Preferred: {formatDateLong(d.date)}, {win?.label.toLowerCase()} ({win?.hours})</Text>
          {d.instructions ? <Text variant="bodyS">Instructions: {d.instructions}</Text> : null}
          <Text variant="bodyS" style={{ marginTop: spacing.xs }}>Ordered by {order.placedBy.name}</Text>
        </View>
      </Card>

      <Text variant="section" style={styles.h}>Your Order</Text>
      <Card noTab>
        <View style={{ gap: spacing.md }}>
          {order.lines.map((l) => (
            <View key={l.key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <Text variant="body" style={{ flex: 1 }}>{l.quantity} × {l.productName}{l.variantLabel ? ` (${l.variantLabel})` : ''}{l.serviceOptions.length ? ` + ${l.serviceOptions.map((o) => o.name).join(', ')}` : ''}</Text>
              <Text variant="body">{formatZAR(l.lineTotalCents)}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <TotalsBlock totals={order.totals} deliveryLabel={`Delivery to ${d.province}`} />
        </View>
      </Card>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        <Button label="Ask About This Order" icon="whatsapp" variant="secondary" onPress={() => openWhatsApp(`Hi TGN, I have a question about order ${order.reference}.`)} />
        {placed ? <Button label="Back To Home" onPress={() => router.replace('/(tabs)')} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { marginTop: spacing.xl, marginBottom: spacing.md },
  thanks: { backgroundColor: colors.oliveLight, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm, marginTop: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' },
});
