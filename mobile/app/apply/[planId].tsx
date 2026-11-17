import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Icon } from '../../src/components/Icon';
import { Input } from '../../src/components/Input';
import { MemberForm } from '../../src/components/MemberForm';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { EmptyState, LoadingState } from '../../src/components/States';
import { Text } from '../../src/components/Text';
import { formatZAR } from '../../src/lib/format';
import { DEBIT_DAYS, monthlyTotal, ordinal, ruleFor } from '../../src/lib/plans';
import { ageOn, dobFromSAId } from '../../src/lib/saId';
import { useAuth } from '../../src/store/AuthContext';
import { useCover } from '../../src/store/CoverContext';
import { usePlans } from '../../src/store/PlansContext';
import { colors, radii, spacing } from '../../src/theme';
import { MEMBER_LABEL, type MemberInput } from '../../src/types';

const STEPS = ['About You', 'Your Family', 'Review'];

export default function Apply() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { status, plans } = usePlans();
  const { user } = useAuth();
  const { apply, current } = useCover();
  const plan = plans.find((p) => p.id === planId);

  const [step, setStep] = useState(0);
  const [idNumber, setIdNumber] = useState('');
  const [idError, setIdError] = useState<string>();
  const [debitDay, setDebitDay] = useState<number>(25);
  const [members, setMembers] = useState<MemberInput[]>([]);
  const [adding, setAdding] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (status === 'loading') return <Screen><ScreenHeader /><LoadingState rows={2} /></Screen>;
  if (!plan) return <Screen><ScreenHeader /><EmptyState icon="shield-off-outline" title="We can't find that plan" message="Please choose a plan again." actionLabel="See Plans" onAction={() => router.replace('/(tabs)/plans')} /></Screen>;
  if (current) return <Screen><ScreenHeader /><EmptyState icon="shield-check-outline" title="You already have a plan" message="You can add family members to the plan you have." actionLabel="View My Cover" onAction={() => router.replace({ pathname: '/policy/[id]', params: { id: current.id } })} /></Screen>;

  const holderDob = dobFromSAId(idNumber);
  const holderAge = holderDob ? ageOn(holderDob) : null;
  const total = monthlyTotal(plan, members);

  const next = () => {
    if (step === 0) {
      if (!holderDob) return setIdError("That ID number doesn't look right. Please check it.");
      if (holderAge! < plan.minAge || holderAge! > plan.maxAge) return setIdError(`This plan is for people aged ${plan.minAge} to ${plan.maxAge}.`);
      setIdError(undefined);
    }
    setStep((s) => s + 1);
  };

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const policy = await apply({ planId: plan.id, holderIdNumber: idNumber, debitDay, members });
      router.replace({ pathname: '/policy/[id]', params: { id: policy.id, applied: '1' } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't send your application. Nothing has been charged. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="eyebrow">MONTHLY TOTAL</Text>
        <Text variant="price" style={{ fontSize: 22 }} accessibilityLiveRegion="polite">{formatZAR(total)}</Text>
      </View>
      {step < 2 ? (
        <Button label="Continue" icon="arrow-right" onPress={next} disabled={step === 1 && adding} />
      ) : (
        <>
          {error ? <Text variant="bodyS" color={colors.danger} accessibilityLiveRegion="polite">{error}</Text> : null}
          <Button label="Submit Application" onPress={submit} loading={busy} disabled={!agreed} />
        </>
      )}
    </>
  );

  return (
    <Screen footer={footer}>
      <ScreenHeader title={`${plan.name} Plan`} onBack={() => (step > 0 ? setStep(step - 1) : router.back())} />

      <View style={styles.steps} accessible accessibilityLabel={`Step ${step + 1} of 3: ${STEPS[step]}`}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flex: 1, gap: 6 }}>
            <View style={[styles.bar, i <= step && { backgroundColor: colors.olive }]} />
            <Text variant="eyebrow" color={i <= step ? colors.ink : colors.muted}>{s.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      {step === 0 ? (
        <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="displayM">Let's start with you.</Text>
            <Text variant="body" color={colors.muted}>{user?.fullName}, we just need your ID number to check you're eligible.</Text>
          </View>
          <Input label="ID Number" value={idNumber} onChangeText={(t) => { setIdNumber(t.replace(/\D/g, '').slice(0, 13)); setIdError(undefined); }} keyboardType="number-pad" maxLength={13} error={idError}
            hint={holderDob ? `Born ${holderDob}, age ${holderAge}` : 'Your 13-digit South African ID number.'} />
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" color={colors.inkSoft}>Which day of the month should the debit order go off?</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              {DEBIT_DAYS.map((d) => <Chip key={d} label={`The ${ordinal(d)}`} selected={d === debitDay} onPress={() => setDebitDay(d)} />)}
            </View>
            <Text variant="bodyS">Nothing is collected until you approve the debit order with your bank, and not before your cover is approved.</Text>
          </View>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="displayM">Who else matters?</Text>
            <Text variant="body" color={colors.muted}>Add the people you'd like covered. You can also do this later.</Text>
          </View>
          {members.map((m, i) => (
            <MemberRow key={`${m.fullName}${i}`} member={m} fee={ruleFor(plan, m.type)?.feeCents ?? 0} onRemove={() => setMembers(members.filter((_, j) => j !== i))} />
          ))}
          {adding ? (
            <Card accent="ember" tabLabel="New family member">
              <MemberForm plan={plan} existing={members} onCancel={() => setAdding(false)} onAdd={(m) => { setMembers([...members, m]); setAdding(false); }} />
            </Card>
          ) : (
            <Button label="Add Family Member" icon="account-plus-outline" variant="secondary" onPress={() => setAdding(true)} />
          )}
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          <Text variant="displayM">Please check everything.</Text>
          <Card accent={plan.accent} tabLabel={`${plan.name} plan`}>
            <View style={{ gap: spacing.sm }}>
              <Line label={`${plan.name}, for you`} value={formatZAR(plan.premiumCents)} />
              {members.map((m, i) => <Line key={i} label={`${m.fullName} (${MEMBER_LABEL[m.type]})`} value={formatZAR(ruleFor(plan, m.type)?.feeCents ?? 0)} />)}
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.xs }} />
              <Line bold label="Every month" value={formatZAR(total)} />
              <Text variant="bodyS">Debit order on the {ordinal(debitDay)} of each month, once approved by you and your bank.</Text>
            </View>
          </Card>
          <View style={styles.notice}>
            <Icon name="information-outline" size={20} color={colors.warning} />
            <Text variant="bodyS" color={colors.inkSoft} style={{ flex: 1 }}>
              This is an application, not cover. We review it first. Cover starts only once it is approved and your first payment has been received, and the {plan.waitingPeriodDays}-day waiting period applies.
            </Text>
          </View>
          <Pressable onPress={() => setAgreed(!agreed)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} style={styles.agree}>
            <Icon name={agreed ? 'checkbox-marked' : 'checkbox-blank-outline'} size={26} color={agreed ? colors.olive : colors.muted} />
            <Text variant="body" style={{ flex: 1 }}>The details above are correct, and I understand this is an application that must be approved before cover starts.</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
      <Text variant={bold ? 'cardTitle' : 'body'} style={{ flex: 1 }}>{label}</Text>
      <Text variant={bold ? 'price' : 'body'}>{value}</Text>
    </View>
  );
}

function MemberRow({ member, fee, onRemove }: { member: MemberInput; fee: number; onRemove: () => void }) {
  return (
    <View style={styles.member}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="cardTitle">{member.fullName}</Text>
        <Text variant="bodyS">{MEMBER_LABEL[member.type]} · +{formatZAR(fee)} a month</Text>
      </View>
      <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${member.fullName}`}><Icon name="close" size={22} color={colors.muted} /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  bar: { height: 4, borderRadius: radii.pill, backgroundColor: colors.border },
  member: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  notice: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: '#F7ECD8', borderRadius: radii.md, padding: spacing.md },
  agree: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', minHeight: 44 },
});
