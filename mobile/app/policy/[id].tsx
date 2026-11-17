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
import { ordinal } from '../../src/lib/cover';
import { BundleSummary } from '../../src/components/BundleSummary';
import { PriceBreakdown, type PersonLine } from '../../src/components/PriceBreakdown';
import { CLAIM_STATUS_LABEL, POLICY_STATUS_LABEL, POLICY_STATUS_MESSAGE, POLICY_STEPS, policyStep } from '../../src/lib/status';
import { confirmAction } from '../../src/lib/confirm';
import { callSupport, openWhatsApp } from '../../src/lib/support';
import { policyService } from '../../src/services/api';
import { useCover } from '../../src/store/CoverContext';
import { colors, radii, spacing } from '../../src/theme';
import { RELATIONSHIP_LABEL } from '../../src/types';

export default function PolicyDetails() {
  const { id, applied, changed } = useLocalSearchParams<{ id: string; applied?: string; changed?: string }>();
  const { status, policies, claims, removeMember, keepCover, requestReinstate } = useCover();
  const policy = policies.find((p) => p.id === id);
  const [debitMsg, setDebitMsg] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [cycleBusy, setCycleBusy] = useState(false);
  const [cycleError, setCycleError] = useState<string>();

  if (status === 'loading' && !policy) return <Screen><ScreenHeader /><LoadingState rows={2} /></Screen>;
  if (!policy) return <Screen><ScreenHeader /><EmptyState icon="shield-off-outline" title="We can't find that plan" message="It may not be on this account." actionLabel="Back Home" onAction={() => router.replace('/(tabs)')} /></Screen>;

  const mine = claims.filter((c) => c.policyId === policy.id);
  const people: PersonLine[] = [
    { role: 'you', name: policy.holder.name, age: policy.holderAge, relationshipBps: 10000, ageBps: policy.mainAgeBps, feeCents: policy.mainFeeCents },
    ...policy.members.map((m) => ({ role: m.relationship, name: m.fullName, age: m.age, relationshipBps: m.relationshipBps, ageBps: m.ageBps, feeCents: m.feeCents })),
  ];
  const open = ['pending_review', 'approved', 'active'].includes(policy.status);
  const canReinstate = !!policy.reinstateUntil && new Date(`${policy.reinstateUntil}T23:59:59`) >= new Date();
  const previous = policy.bundleHistory.length > 1 ? policy.bundleHistory[policy.bundleHistory.length - 2] : undefined;
  const pendingUpgrade = !!policy.bundle.upgradeWaitingEndsOn && new Date(policy.bundle.upgradeWaitingEndsOn) > new Date();
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
    confirmAction(`Remove ${name}?`, 'They will no longer be covered and your monthly total will go down.', 'Remove', () => {
      removeMember(policy.id, memberId).catch((e) => Alert.alert("Couldn't remove", e.message));
    });

  return (
    <Screen>
      <ScreenHeader title="Your Cover" />

      {applied ? (
        <View style={styles.thanks} accessibilityRole="alert">
          <Icon name="hand-heart-outline" size={28} color={colors.olive} />
          <Text variant="displayM" style={{ fontSize: 24, lineHeight: 28 }}>Thank you, we've got your application.</Text>
          <Text variant="body" color={colors.inkSoft}>It's now being reviewed. You're not covered yet, and nothing has been charged. We'll be in touch.</Text>
        </View>
      ) : null}

      {changed ? (
        <View style={[styles.thanks, { backgroundColor: '#F8EAC2' }]} accessibilityRole="alert">
          <Text variant="cardTitle">Your cover has been updated.</Text>
          <Text variant="bodyS" color={colors.inkSoft}>The new price starts from your next debit.</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' }}>
        <Badge label={POLICY_STATUS_LABEL[policy.status]} color={colors.ink} bg="#F8EAC2" />
        <Badge label={policy.reference} />
      </View>
      <Text variant="body" style={{ marginTop: spacing.md }}>{POLICY_STATUS_MESSAGE[policy.status]}</Text>

      {policy.cancelRequestedAt && policy.status !== 'cancelled' ? (
        <View style={[styles.lifecycle, { backgroundColor: '#F7E1E1' }]} accessibilityRole="alert">
          <Text variant="cardTitle">You've asked to cancel</Text>
          <Text variant="bodyS" color={colors.inkSoft}>We received your request on {formatDate(policy.cancelRequestedAt)}. Our team will contact you to confirm the date. Until then your cover stays as it is.</Text>
          <Button label="Keep My Cover" size="small" fullWidth={false} onPress={async () => { setCycleBusy(true); setCycleError(undefined); try { await keepCover(policy.id); } catch (e) { setCycleError(e instanceof Error ? e.message : 'Please try again.'); } finally { setCycleBusy(false); } }} loading={cycleBusy} />
        </View>
      ) : null}

      {policy.status === 'lapsed' ? (
        <View style={[styles.lifecycle, { backgroundColor: '#F8EAC2' }]}>
          {canReinstate ? (
            <>
              <Text variant="cardTitle">You can still reinstate</Text>
              <Text variant="bodyS" color={colors.inkSoft}>
                Your cover lapsed on {formatDate(policy.lapsedAt!)}. Until {formatDate(policy.reinstateUntil!)} you can reinstate it by paying what's owed, and your waiting periods carry on from where they were.
              </Text>
              {policy.reinstateRequestedAt ? (
                <Text variant="label" color={colors.olive} accessibilityLiveRegion="polite">Requested on {formatDate(policy.reinstateRequestedAt)}. Our team will contact you.</Text>
              ) : (
                <Button label="Ask To Reinstate" size="small" fullWidth={false} loading={cycleBusy} onPress={async () => { setCycleBusy(true); setCycleError(undefined); try { await requestReinstate(policy.id); } catch (e) { setCycleError(e instanceof Error ? e.message : 'Please try again.'); } finally { setCycleBusy(false); } }} />
              )}
            </>
          ) : (
            <>
              <Text variant="cardTitle">The time to reinstate has passed</Text>
              <Text variant="bodyS" color={colors.inkSoft}>You can build a new cover. New waiting periods will apply.</Text>
              <Button label="Build A New Cover" size="small" fullWidth={false} onPress={() => router.push('/builder')} />
            </>
          )}
        </View>
      ) : null}

      {policy.status === 'cancelled' ? (
        <View style={{ marginTop: spacing.lg }}><Button label="Build A New Cover" onPress={() => router.push('/builder')} /></View>
      ) : null}
      {cycleError ? <Text variant="bodyS" color={colors.danger} style={{ marginTop: spacing.sm }} accessibilityLiveRegion="polite">{cycleError}</Text> : null}

      {live || policy.status === 'active' ? (
        <>
          <Text variant="section" style={styles.h}>Progress</Text>
          <Card noTab>
            <Timeline steps={POLICY_STEPS} current={step} allDone={policy.status === 'active'} hints={policy.status === 'active' ? undefined : { [step]: step === 0 ? "We're reviewing it." : 'Waiting for your first payment.' }} />
          </Card>
        </>
      ) : null}

      <Text variant="section" style={styles.h}>What Your Family Receives</Text>
      <Card accent="ember" tabLabel="Your bundle">
        <View style={{ gap: spacing.md }}>
          <BundleSummary lines={policy.bundle.lines} totalValueCents={policy.bundle.bundleValueCents} />
          {pendingUpgrade ? (
            <View style={styles.notice}>
              <Icon name="timer-sand" size={20} color={colors.warning} />
              <Text variant="bodyS" color={colors.inkSoft} style={{ flex: 1 }}>
                Your increase pays out from {formatDateLong(policy.bundle.upgradeWaitingEndsOn!)}. Until then, your earlier bundle ({formatZAR(previous?.bundleValueCents ?? 0)}) applies for natural causes. Accidents are covered in full straight away.
              </Text>
            </View>
          ) : null}
          {open ? <Button label="Change My Bundle" icon="tune-variant" variant="secondary" onPress={() => router.push({ pathname: '/builder', params: { policyId: policy.id } })} /> : null}
        </View>
      </Card>

      <Text variant="section" style={styles.h}>Your Price</Text>
      <Card accent="gold" tabLabel="How it adds up">
        <View style={{ gap: spacing.md }}>
          <PriceBreakdown baseMonthlyCents={policy.baseMonthlyCents} totalMonthlyCents={policy.monthlyTotalCents} people={people} />
          <View style={{ gap: spacing.sm }}>
            <Row label="Debit date" value={`The ${ordinal(policy.debitDay)}`} />
            {policy.nextDebitDate ? <Row label="Next debit" value={formatDate(policy.nextDebitDate)} /> : null}
            {policy.waitingEndsOn ? <Row label="Waiting period ends" value={formatDateLong(policy.waitingEndsOn)} /> : null}
          </View>
          <Text variant="bodyS">Prices are reviewed once a year. A person moving into an older age band can change the price.</Text>
        </View>
      </Card>

      <Text variant="section" style={styles.h}>Family On Your Cover</Text>
      <View style={{ gap: spacing.sm }}>
        <View style={styles.member}>
          <Icon name="account-circle-outline" size={28} color={colors.olive} />
          <View style={{ flex: 1 }}>
            <Text variant="cardTitle">{policy.holder.name}</Text>
            <Text variant="bodyS">Main member</Text>
          </View>
        </View>
        {policy.members.map((m) => (
          <View key={m.id} style={styles.member}>
            <Icon name="account-outline" size={28} color={colors.ember} />
            <View style={{ flex: 1 }}>
              <Text variant="cardTitle">{m.fullName}</Text>
              <Text variant="bodyS">{RELATIONSHIP_LABEL[m.relationship]} · age {m.age} · +{formatZAR(m.feeCents)} a month</Text>
              {m.coverStartsOn ? <Text variant="bodyS">Covered from {formatDate(m.coverStartsOn)}</Text> : null}
            </View>
            {open ? (
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <Pressable onPress={() => router.push({ pathname: '/edit-member', params: { policyId: policy.id, memberId: m.id } })} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Edit ${m.fullName}`}>
                  <Icon name="pencil-outline" size={22} color={colors.muted} />
                </Pressable>
                <Pressable onPress={() => confirmRemove(m.id, m.fullName)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${m.fullName}`}>
                  <Icon name="trash-can-outline" size={22} color={colors.muted} />
                </Pressable>
              </View>
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
              <Button label="Payments And Statements" icon="receipt-text-outline" variant="secondary" size="small" fullWidth={false} onPress={() => router.push({ pathname: '/payments/[id]', params: { id: policy.id } })} />
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

      <View style={{ marginTop: spacing.xl }}>
        <Button label="View Policy Schedule" icon="file-document-outline" variant="secondary" onPress={() => router.push({ pathname: '/schedule/[id]', params: { id: policy.id } })} />
      </View>

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

      {(open || policy.status === 'lapsed') && !policy.cancelRequestedAt ? (
        <View style={{ marginTop: spacing.xxl, gap: spacing.sm, alignItems: 'center' }}>
          <Text variant="bodyS">Need to stop your cover?</Text>
          <Button label={policy.startDate ? 'Cancel My Cover' : 'Withdraw My Application'} variant="ghost" fullWidth={false} onPress={() => router.push({ pathname: '/cancel-cover', params: { policyId: policy.id } })} />
        </View>
      ) : null}
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
  lifecycle: { borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, marginTop: spacing.lg, alignItems: 'flex-start' },
  notice: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: '#F7ECD8', borderRadius: radii.md, padding: spacing.md },
  member: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
});
