import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Chip';
import { Card } from '../../src/components/Card';
import { Icon } from '../../src/components/Icon';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { EmptyState, LoadingState } from '../../src/components/States';
import { Text } from '../../src/components/Text';
import { Timeline } from '../../src/components/Timeline';
import { formatDate, formatDateLong, formatZAR } from '../../src/lib/format';
import { ordinal } from '../../src/lib/plans';
import { CLAIM_STATUS_LABEL, POLICY_STATUS_LABEL, POLICY_STATUS_MESSAGE, POLICY_STEPS, policyStep } from '../../src/lib/status';
import { callSupport, openWhatsApp } from '../../src/lib/support';
import { policyService } from '../../src/services/api';
import { useCover } from '../../src/store/CoverContext';
import { colors, radii, spacing } from '../../src/theme';
import { MEMBER_LABEL } from '../../src/types';

export default function PolicyDetails() {
  const { id, applied } = useLocalSearchParams<{ id: string; applied?: string }>();
  const { status, policies, claims, removeMember } = useCover();
  const policy = policies.find((p) => p.id === id);
  const [debitMsg, setDebitMsg] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (status === 'loading' && !policy) return <Screen><ScreenHeader /><LoadingState rows={2} /></Screen>;
  if (!policy) return <Screen><ScreenHeader /><EmptyState icon="shield-off-outline" title="We can't find that plan" message="It may not be on this account." actionLabel="Back Home" onAction={() => router.replace('/(tabs)')} /></Screen>;

  const mine = claims.filter((c) => c.policyId === policy.id);
  const open = ['pending_review', 'approved', 'active'].includes(policy.status);
  const step = policyStep(policy.status);
  const live = ['approved', 'pending_review'].includes(policy.status);

  const setUpDebit = async () => {
    setBusy(true);
    try {
      setDebitMsg((await policyService.setUpDebitOrder(policy.id)).message);
    } catch (e) {
      setDebitMsg(e instanceof Error ? e.message : "We couldn't do that just now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (memberId: string, name: string) =>
    Alert.alert(`Remove ${name}?`, 'They will no longer be covered and your monthly total will go down.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMember(policy.id, memberId).catch((e) => Alert.alert("Couldn't remove", e.message)) },
    ]);

  return (
    <Screen>
      <ScreenHeader title={policy.planName} />

      {applied ? (
        <View style={styles.thanks} accessibilityRole="alert">
          <Icon name="hand-heart-outline" size={28} color={colors.olive} />
          <Text variant="displayM" style={{ fontSize: 24, lineHeight: 28 }}>Thank you, we've got your application.</Text>
          <Text variant="body" color={colors.inkSoft}>It's now being reviewed. You're not covered yet, and nothing has been charged. We'll be in touch.</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' }}>
        <Badge label={POLICY_STATUS_LABEL[policy.status]} color={colors.olive} bg={colors.oliveLight} />
        <Badge label={policy.reference} />
      </View>
      <Text variant="body" style={{ marginTop: spacing.md }}>{POLICY_STATUS_MESSAGE[policy.status]}</Text>

      {live || policy.status === 'active' ? (
        <>
          <Text variant="section" style={styles.h}>Progress</Text>
          <Card noTab>
            <Timeline steps={POLICY_STEPS} current={step} allDone={policy.status === 'active'} hints={policy.status === 'active' ? undefined : { [step]: step === 0 ? "We're reviewing it." : 'Waiting for your first payment.' }} />
          </Card>
        </>
      ) : null}

      <Text variant="section" style={styles.h}>Your Cover</Text>
      <Card accent="olive" tabLabel="Monthly">
        <View style={{ gap: spacing.sm }}>
          <Row label="Cover for you" value={formatZAR(policy.coverCents)} />
          <Row label="Every month" value={formatZAR(policy.monthlyTotalCents)} bold />
          <Row label="Debit date" value={`The ${ordinal(policy.debitDay)}`} />
          {policy.nextDebitDate ? <Row label="Next debit" value={formatDate(policy.nextDebitDate)} /> : null}
          {policy.waitingEndsOn ? <Row label="Waiting period ends" value={formatDateLong(policy.waitingEndsOn)} /> : null}
        </View>
      </Card>

      <Text variant="section" style={styles.h}>Family On Your Plan</Text>
      <View style={{ gap: spacing.sm }}>
        <View style={styles.member}>
          <Icon name="account-circle-outline" size={28} color={colors.olive} />
          <View style={{ flex: 1 }}>
            <Text variant="cardTitle">{policy.holder.name}</Text>
            <Text variant="bodyS">Main member · {formatZAR(policy.coverCents)} cover</Text>
          </View>
        </View>
        {policy.members.map((m) => (
          <View key={m.id} style={styles.member}>
            <Icon name="account-outline" size={28} color={colors.ember} />
            <View style={{ flex: 1 }}>
              <Text variant="cardTitle">{m.fullName}</Text>
              <Text variant="bodyS">{MEMBER_LABEL[m.type]} · +{formatZAR(m.feeCents)} a month · {formatZAR(m.coverCents)} cover</Text>
              {m.coverStartsOn ? <Text variant="bodyS">Covered from {formatDate(m.coverStartsOn)}</Text> : null}
            </View>
            {open ? (
              <Pressable onPress={() => confirmRemove(m.id, m.fullName)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${m.fullName}`}>
                <Icon name="trash-can-outline" size={22} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {open ? <Button label="Add Family Member" icon="account-plus-outline" variant="secondary" onPress={() => router.push({ pathname: '/add-member', params: { policyId: policy.id } })} /> : null}
      </View>

      {open ? (
        <>
          <Text variant="section" style={styles.h}>Monthly Payments</Text>
          <Card accent="gold" tabLabel="Debit order">
            <View style={{ gap: spacing.md }}>
              <Row label="Debit order" value={policy.mandateStatus === 'active' ? 'Approved' : policy.mandateStatus === 'pending_customer_approval' ? 'Waiting for your bank' : 'Not set up'} />
              {debitMsg ? <Text variant="bodyS" color={colors.inkSoft} accessibilityLiveRegion="polite">{debitMsg}</Text> : null}
              {policy.mandateStatus !== 'active' ? <Button label="Set Up Debit Order" icon="bank-outline" variant="secondary" size="small" fullWidth={false} onPress={setUpDebit} loading={busy} /> : null}
              <Text variant="bodyS">We never ask for your card or banking password. Your bank asks you to approve the debit order itself.</Text>
            </View>
          </Card>
          {policy.payments.length > 0 ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              {policy.payments.map((p) => (
                <View key={p.id} style={styles.member}>
                  <View style={{ flex: 1 }}>
                    <Text variant="cardTitle">{formatDate(p.paidOn)}</Text>
                    <Text variant="bodyS">{p.status === 'collected' ? 'Payment received' : p.status}</Text>
                  </View>
                  <Text variant="price" color={p.status === 'collected' ? colors.success : colors.ink}>{formatZAR(p.amountCents)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text variant="bodyS" style={{ marginTop: spacing.md }}>No payments received yet.</Text>
          )}
        </>
      ) : null}

      <Text variant="section" style={styles.h}>Claims</Text>
      {mine.map((c) => (
        <Pressable key={c.id} onPress={() => router.push({ pathname: '/claim/[id]', params: { id: c.id } })} style={[styles.member, { marginBottom: spacing.sm }]} accessibilityRole="button" accessibilityLabel={`Claim ${c.reference}, ${CLAIM_STATUS_LABEL[c.status]}`}>
          <View style={{ flex: 1 }}>
            <Text variant="cardTitle">{c.deceasedName}</Text>
            <Text variant="bodyS">{c.reference} · {CLAIM_STATUS_LABEL[c.status]}</Text>
          </View>
          <Icon name="chevron-right" size={22} color={colors.muted} />
        </Pressable>
      ))}
      <View style={{ gap: spacing.md }}>
        {policy.status === 'active' || policy.status === 'lapsed' ? <Button label="Make A Claim" icon="hand-heart-outline" onPress={() => router.push({ pathname: '/claim/new', params: { policyId: policy.id } })} /> : <Text variant="bodyS">Claims can be made once your cover is active.</Text>}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label="WhatsApp" icon="whatsapp" variant="secondary" size="small" fullWidth={false} style={{ flex: 1 }} onPress={() => openWhatsApp(`Hi TGN, about my plan ${policy.reference}.`)} />
          <Button label="Call Us" icon="phone-outline" variant="secondary" size="small" fullWidth={false} style={{ flex: 1 }} onPress={callSupport} />
        </View>
      </View>
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
      <Text variant={bold ? 'cardTitle' : 'body'}>{label}</Text>
      <Text variant={bold ? 'price' : 'body'}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h: { marginTop: spacing.xl, marginBottom: spacing.md },
  thanks: { backgroundColor: colors.oliveLight, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm, marginTop: spacing.sm },
  member: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
});
