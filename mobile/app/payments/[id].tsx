import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Chip';
import { Card } from '../../src/components/Card';
import { Icon } from '../../src/components/Icon';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/States';
import { Text } from '../../src/components/Text';
import { ordinal } from '../../src/lib/cover';
import { formatDate, formatDateLong, formatZAR } from '../../src/lib/format';
import { POLICY_STATUS_LABEL } from '../../src/lib/status';
import { policyService } from '../../src/services/api';
import { useCover } from '../../src/store/CoverContext';
import { colors, radii, spacing } from '../../src/theme';
import type { Payment, Policy } from '../../src/types';

/** Payment history, receipts and a statement, plus the debit order. We only ever show payments that were really received. */
export default function Payments() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { policies } = useCover();
  const policy = policies.find((p) => p.id === id);
  const [debitMsg, setDebitMsg] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (!policy) return <Screen><ScreenHeader /><EmptyState icon="cash-remove" title="We can't find that cover" message="It may not be on this account." actionLabel="My Cover" onAction={() => router.replace('/(tabs)/cover')} /></Screen>;

  const received = policy.payments.filter((p) => p.status === 'collected');
  const totalReceived = received.reduce((s, p) => s + p.amountCents, 0);
  const debitLabel = policy.mandateStatus === 'active' ? 'Approved by your bank' : policy.mandateStatus === 'pending_customer_approval' ? 'Waiting for your bank to approve' : policy.mandateStatus === 'rejected' ? 'Your bank declined it' : 'Not set up';

  const setUp = async () => {
    setBusy(true);
    try { setDebitMsg((await policyService.setUpDebitOrder(policy.id)).message); }
    catch (e) { setDebitMsg(e instanceof Error ? e.message : "We couldn't do that just now. Please try again."); }
    finally { setBusy(false); }
  };

  const share = async (title: string, message: string) => {
    try { await Share.share({ title, message }); } catch { Alert.alert("Couldn't share", "Sharing isn't available here. You can screenshot this page instead."); }
  };

  return (
    <Screen>
      <ScreenHeader title="Payments" />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
        <Badge label={POLICY_STATUS_LABEL[policy.status]} color={colors.ink} bg="#F8EAC2" />
        <Badge label={policy.reference} />
      </View>

      <Card accent="gold" tabLabel="Your monthly payment" style={{ marginTop: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Row label="Every month" value={formatZAR(policy.monthlyTotalCents)} bold />
          <Row label="Debit date" value={`The ${ordinal(policy.debitDay)}`} />
          {policy.nextDebitDate ? <Row label="Next debit" value={formatDateLong(policy.nextDebitDate)} /> : null}
          <Row label="Total received so far" value={formatZAR(totalReceived)} />
        </View>
      </Card>

      {policy.status === 'lapsed' ? (
        <View style={[styles.notice, { backgroundColor: '#F8EAC2' }]}>
          <Icon name="alert-circle-outline" size={22} color={colors.warning} />
          <Text variant="bodyS" color={colors.inkSoft} style={{ flex: 1 }}>Your cover has lapsed because a payment was missed. Open your cover to see how to reinstate it.</Text>
        </View>
      ) : null}

      <Text variant="section" style={styles.h}>Debit Order</Text>
      <Card accent="ember" tabLabel="How you pay">
        <View style={{ gap: spacing.md }}>
          <Row label="Status" value={debitLabel} />
          {debitMsg ? <Text variant="bodyS" color={colors.inkSoft} accessibilityLiveRegion="polite">{debitMsg}</Text> : null}
          {policy.mandateStatus !== 'active' && ['pending_review', 'approved', 'active'].includes(policy.status) ? (
            <Button label="Set Up Debit Order" icon="bank-outline" variant="secondary" size="small" fullWidth={false} onPress={setUp} loading={busy} />
          ) : null}
          <Text variant="bodyS">Your bank asks you to approve the debit order itself. We never ask for your card or banking password.</Text>
        </View>
      </Card>

      <Text variant="section" style={styles.h}>Payments Received</Text>
      {received.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="cash-clock" size={28} color={colors.muted} />
          <Text variant="body" color={colors.muted} style={{ flex: 1 }}>No payments received yet. They'll appear here once your first payment comes in.</Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {policy.payments.map((p) => (
            <Pressable key={p.id} onPress={() => share(`TGN receipt ${p.reference}`, receiptText(policy, p))} accessibilityRole="button" accessibilityLabel={`${formatDate(p.paidOn)}, ${formatZAR(p.amountCents)}, ${p.status}. Share receipt`} style={styles.pay}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="cardTitle">{formatDate(p.paidOn)}</Text>
                <Text variant="bodyS">{p.status === 'collected' ? 'Received' : p.status === 'failed' ? 'Failed' : 'Reversed'} · {p.source === 'manual' ? 'Recorded by our team' : 'Debit order'} · ref {p.reference}</Text>
                <Text variant="bodyS" color={colors.olive}>Tap to share a receipt</Text>
              </View>
              <Text variant="price" color={p.status === 'collected' ? colors.success : colors.muted}>{formatZAR(p.amountCents)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {received.length > 0 ? (
        <View style={{ marginTop: spacing.xl }}>
          <Button label="Share Statement" icon="file-document-outline" variant="secondary" onPress={() => share(`TGN statement ${policy.reference}`, statementText(policy, received, totalReceived))} />
        </View>
      ) : null}
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
      <Text variant={bold ? 'cardTitle' : 'body'} color={bold ? colors.ink : colors.muted} style={{ flex: 1 }}>{label}</Text>
      <Text variant={bold ? 'price' : 'cardTitle'} style={{ flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

const receiptText = (p: Policy, x: Payment) =>
  ['TGN - The Good Neighbour', 'Payment receipt', '', `Cover: ${p.reference}`, `Paid on: ${formatDateLong(x.paidOn)}`, `Amount: ${formatZAR(x.amountCents)}`, `Reference: ${x.reference}`, `Status: ${x.status === 'collected' ? 'Received' : x.status}`, '', 'Thank you.'].join('\n');

const statementText = (p: Policy, received: Payment[], total: number) =>
  ['TGN - The Good Neighbour', `Statement for cover ${p.reference}`, `Main member: ${p.holder.name}`, '', ...received.map((x) => `${formatDate(x.paidOn)}  ${formatZAR(x.amountCents)}  ref ${x.reference}`), '', `Total received: ${formatZAR(total)}`, `Monthly price: ${formatZAR(p.monthlyTotalCents)}`].join('\n');

const styles = StyleSheet.create({
  h: { marginTop: spacing.xl, marginBottom: spacing.md },
  pay: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  empty: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  notice: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderRadius: radii.md, padding: spacing.md, marginTop: spacing.lg },
});
