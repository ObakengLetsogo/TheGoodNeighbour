import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BundleBuilder, type Selection } from '../src/components/BundleBuilder';
import { BundleSummary } from '../src/components/BundleSummary';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { Icon } from '../src/components/Icon';
import { Input } from '../src/components/Input';
import { MemberForm } from '../src/components/MemberForm';
import { Screen, ScreenHeader } from '../src/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../src/components/States';
import { Text } from '../src/components/Text';
import { months, ordinal } from '../src/lib/cover';
import { formatZAR } from '../src/lib/format';
import { ageOn, dobFromSAId } from '../src/lib/saId';
import { useQuote } from '../src/lib/useQuote';
import { useAuth } from '../src/store/AuthContext';
import { useCover } from '../src/store/CoverContext';
import { useOptions } from '../src/store/OptionsContext';
import { colors, radii, spacing } from '../src/theme';
import { RELATIONSHIP_LABEL, type MemberInput } from '../src/types';

const NEW_STEPS = ['Your Cover', 'About You', 'Your Family', 'Review'];
const EDIT_STEPS = ['Your Cover', 'Review'];

/** Builds a new cover, or (with ?policyId=) changes the bundle on an existing one. */
export default function Build() {
  const { policyId } = useLocalSearchParams<{ policyId?: string }>();
  const { status, options, error, reload } = useOptions();
  const { user } = useAuth();
  const { apply, changeBundle, policies, current } = useCover();
  const editing = policies.find((p) => p.id === policyId);
  const STEPS = editing ? EDIT_STEPS : NEW_STEPS;

  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<Selection>(() =>
    editing ? Object.fromEntries(editing.bundle.lines.map((l) => [l.itemId, l.quantity])) : { 'grocery-5000': 1, sheep: 1 });
  const [idNumber, setIdNumber] = useState('');
  const [idError, setIdError] = useState<string>();
  const [debitDay, setDebitDay] = useState<number>(25);
  const [members, setMembers] = useState<MemberInput[]>([]);
  const [adding, setAdding] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const items = useMemo(() => Object.entries(selection).filter(([, q]) => q > 0).map(([itemId, quantity]) => ({ itemId, quantity })), [selection]);
  const quoteMembers = useMemo(
    () => (editing ? editing.members.map((m) => ({ relationship: m.relationship, dateOfBirth: m.dateOfBirth })) : members.map((m) => ({ relationship: m.relationship, dateOfBirth: m.dateOfBirth }))),
    [editing, members],
  );
  const { quote, loading: quoting, error: quoteError } = useQuote(items, quoteMembers);

  if (status === 'loading') return <Screen><ScreenHeader /><LoadingState rows={3} /></Screen>;
  if (status === 'error' || !options) return <Screen><ScreenHeader /><ErrorState message={error} onRetry={reload} /></Screen>;
  if (!editing && current) {
    return (
      <Screen><ScreenHeader />
        <EmptyState icon="shield-check-outline" title="You already have a cover" message="You can change its bundle or add family members from My Cover." actionLabel="View My Cover" onAction={() => router.replace({ pathname: '/policy/[id]', params: { id: current.id } })} />
      </Screen>
    );
  }

  const holderDob = dobFromSAId(idNumber);
  const holderAge = holderDob ? ageOn(holderDob) : null;
  const total = quote?.totalMonthlyCents ?? 0;
  const canContinue = !!quote && quote.valid && !quoting;
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (!editing && step === 1) {
      if (!holderDob) return setIdError("That ID number doesn't look right. Please check it.");
      if (holderAge! < options.mainMinAge || holderAge! > options.mainMaxAge) return setIdError(`This cover is for people aged ${options.mainMinAge} to ${options.mainMaxAge}.`);
      setIdError(undefined);
    }
    setStep((s) => s + 1);
  };

  const submit = async () => {
    setBusy(true);
    setSubmitError(undefined);
    try {
      if (editing) {
        await changeBundle(editing.id, items);
        router.replace({ pathname: '/policy/[id]', params: { id: editing.id, changed: '1' } });
      } else {
        const p = await apply({ items, holderIdNumber: idNumber, debitDay, members });
        router.replace({ pathname: '/policy/[id]', params: { id: p.id, applied: '1' } });
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "We couldn't save that. Nothing has been charged. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const started = !!editing?.startDate;
  const upgrade = !!(editing && quote && started && quote.bundleValueCents > editing.bundle.bundleValueCents);

  const footer = (
    <>
      {quote && !quote.valid && step !== 1 && step !== 2 ? <Text variant="bodyS" color={colors.danger} accessibilityLiveRegion="polite">{quote.problems[0]}</Text> : null}
      {quoteError ? <Text variant="bodyS" color={colors.danger}>{quoteError}</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="eyebrow">{editing ? 'NEW MONTHLY PRICE' : 'YOUR MONTHLY PRICE'}</Text>
        <Text variant="price" style={{ fontSize: 24, opacity: quoting ? 0.5 : 1 }} accessibilityLiveRegion="polite">{quote ? formatZAR(total) : '–'}</Text>
      </View>
      {!isLast ? (
        <Button label="Continue" icon="arrow-right" onPress={next} disabled={step === 0 ? !canContinue : step === 2 ? adding || !canContinue : false} />
      ) : (
        <>
          {submitError ? <Text variant="bodyS" color={colors.danger} accessibilityLiveRegion="polite">{submitError}</Text> : null}
          <Button label={editing ? 'Update My Cover' : 'Submit Application'} onPress={submit} loading={busy} disabled={!agreed || !canContinue} />
        </>
      )}
    </>
  );

  return (
    <Screen footer={footer}>
      <ScreenHeader title={editing ? 'Change My Bundle' : 'Build Your Cover'} onBack={() => (step > 0 ? setStep(step - 1) : router.back())} />

      <View style={styles.steps} accessible accessibilityLabel={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flex: 1, gap: 6 }}>
            <View style={[styles.bar, i <= step && { backgroundColor: colors.ember }]} />
            <Text variant="eyebrow" color={i <= step ? colors.ink : colors.muted} numberOfLines={1}>{s.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      {step === 0 ? (
        <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="displayM">What should your family receive?</Text>
            <Text variant="body" color={colors.muted}>Build the bundle we'll deliver when it matters. Your monthly price updates as you go.</Text>
          </View>
          <BundleBuilder items={options.items} value={selection} onChange={setSelection} />
          {quote && quote.lines.length > 0 ? (
            <Card accent="ember" tabLabel="Your bundle">
              <BundleSummary lines={quote.lines} totalValueCents={quote.bundleValueCents} />
            </Card>
          ) : null}
          {quote && !quote.valid ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{quote.problems[0]}</Text> : null}
        </View>
      ) : null}

      {!editing && step === 1 ? (
        <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="displayM">Now, a little about you.</Text>
            <Text variant="body" color={colors.muted}>{user?.fullName}, we need your ID number to check you're eligible.</Text>
          </View>
          <Input label="ID Number" value={idNumber} onChangeText={(t) => { setIdNumber(t.replace(/\D/g, '').slice(0, 13)); setIdError(undefined); }} keyboardType="number-pad" maxLength={13} error={idError}
            hint={holderDob ? `Born ${holderDob}, age ${holderAge}` : 'Your 13-digit South African ID number.'} />
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" color={colors.inkSoft}>Which day of the month should the debit order go off?</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              {options.debitDays.map((d) => <Chip key={d} label={`The ${ordinal(d)}`} selected={d === debitDay} onPress={() => setDebitDay(d)} />)}
            </View>
            <Text variant="bodyS">Nothing is collected until you approve the debit order with your bank, and not before your cover is approved.</Text>
          </View>
        </View>
      ) : null}

      {!editing && step === 2 ? (
        <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="displayM">Who else matters?</Text>
            <Text variant="body" color={colors.muted}>Add the people you'd like covered. Each pays a small monthly fee. You can also do this later.</Text>
          </View>
          {members.map((m, i) => (
            <View key={`${m.fullName}${i}`} style={styles.member}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="cardTitle">{m.fullName}</Text>
                <Text variant="bodyS">{RELATIONSHIP_LABEL[m.relationship]} · +{formatZAR(quote?.members[i]?.feeCents ?? 0)} a month</Text>
              </View>
              <Pressable onPress={() => setMembers(members.filter((_, j) => j !== i))} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${m.fullName}`}><Icon name="close" size={22} color={colors.muted} /></Pressable>
            </View>
          ))}
          {adding ? (
            <Card accent="berry" tabLabel="New family member">
              <MemberForm options={options} baseMonthlyCents={quote?.baseMonthlyCents ?? 0} existing={members} onCancel={() => setAdding(false)} submitLabel="Add To My Cover"
                onAdd={(m) => { setMembers([...members, m]); setAdding(false); }} />
            </Card>
          ) : (
            <Button label="Add Family Member" icon="account-plus-outline" variant="secondary" onPress={() => setAdding(true)} />
          )}
        </View>
      ) : null}

      {isLast ? (
        <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          <Text variant="displayM">{editing ? 'Check your changes.' : 'Please check everything.'}</Text>
          <Card accent="ember" tabLabel="What your family receives">
            {quote ? <BundleSummary lines={quote.lines} totalValueCents={quote.bundleValueCents} /> : null}
          </Card>
          <Card accent="gold" tabLabel="Every month">
            <View style={{ gap: spacing.sm }}>
              <Line label="You" value={formatZAR(quote?.baseMonthlyCents ?? 0)} />
              {(editing ? editing.members.map((m) => ({ name: m.fullName, rel: m.relationship })) : members.map((m) => ({ name: m.fullName, rel: m.relationship }))).map((m, i) => (
                <Line key={i} label={`${m.name} (${RELATIONSHIP_LABEL[m.rel]})`} value={formatZAR(quote?.members[i]?.feeCents ?? 0)} />
              ))}
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.xs }} />
              <Line bold label="In total" value={formatZAR(total)} />
              {editing ? <Text variant="bodyS">Was {formatZAR(editing.monthlyTotalCents)} a month. The new price starts from your next debit.</Text> : <Text variant="bodyS">Debit order on the {ordinal(debitDay)} of each month, once approved by you and your bank.</Text>}
            </View>
          </Card>
          {editing && upgrade ? (
            <Notice text={`You're increasing your cover. The extra only pays out after a new ${months(options.upgradeWaitingDays)} waiting period. Until then, your current bundle stays payable.`} />
          ) : editing && started ? (
            <Notice text="You're reducing your cover. This applies straight away." />
          ) : editing ? (
            <Notice text="Your cover hasn't started yet, so this simply updates your application." />
          ) : (
            <Notice text={`This is an application, not cover. We review it first. Cover starts once it's approved and your first payment is received. Natural causes have a ${months(options.naturalWaitingDays)} waiting period${options.accidentalWaitingDays === 0 ? '; accidents have none' : ''}.`} />
          )}
          <Text variant="bodyS">Your price is reviewed once a year and won't go up by more than {options.escalationCapPercent}%. We'll give you notice first.</Text>
          <Pressable onPress={() => setAgreed(!agreed)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} style={styles.agree}>
            <Icon name={agreed ? 'checkbox-marked' : 'checkbox-blank-outline'} size={26} color={agreed ? colors.olive : colors.muted} />
            <Text variant="body" style={{ flex: 1 }}>{editing ? 'I understand how this change affects my price and my cover.' : 'The details above are correct, and I understand this is an application that must be approved before cover starts.'}</Text>
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

function Notice({ text }: { text: string }) {
  return (
    <View style={styles.notice}>
      <Icon name="information-outline" size={20} color={colors.warning} />
      <Text variant="bodyS" color={colors.inkSoft} style={{ flex: 1 }}>{text}</Text>
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
