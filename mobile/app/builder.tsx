import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BundleBuilder, type Selection } from '../src/components/BundleBuilder';
import { BundleSummary } from '../src/components/BundleSummary';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { Choice } from '../src/components/Choice';
import { HowPriceWorks } from '../src/components/HowPriceWorks';
import { Icon } from '../src/components/Icon';
import { PriceBreakdown, type PersonLine } from '../src/components/PriceBreakdown';
import { Input } from '../src/components/Input';
import { MemberForm } from '../src/components/MemberForm';
import { Screen, ScreenHeader } from '../src/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../src/components/States';
import { Text } from '../src/components/Text';
import { months, monthsAdj, ordinal } from '../src/lib/cover';
import { formatZAR } from '../src/lib/format';
import { ageOn, dobFromSAId } from '../src/lib/saId';
import { useQuote } from '../src/lib/useQuote';
import { legalService } from '../src/services/api';
import { useAuth } from '../src/store/AuthContext';
import { useCover } from '../src/store/CoverContext';
import { useOptions } from '../src/store/OptionsContext';
import { colors, radii, spacing } from '../src/theme';
import { RELATIONSHIP_LABEL, type LegalSummary, type MemberInput } from '../src/types';

const NEW_STEPS = ['Your Cover', 'About You', 'Your Family', 'Review'];
const EDIT_STEPS = ['Your Cover', 'Review'];

/** Builds a new cover, or (with ?policyId=) changes the bundle on an existing one. */
export default function Build() {
  const { policyId } = useLocalSearchParams<{ policyId?: string }>();
  const { status, options, error, reload } = useOptions();
  const { user, smsEnabled } = useAuth();
  const { apply, changeBundle, policies, current } = useCover();
  const editing = policies.find((p) => p.id === policyId);
  const STEPS = editing ? EDIT_STEPS : NEW_STEPS;

  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<Selection>(() =>
    editing ? Object.fromEntries(editing.bundle.lines.map((l) => [l.itemId, l.quantity])) : { 'grocery-5000': 1, sheep: 1 });
  const [coverMe, setCoverMe] = useState(true);
  const [idNumber, setIdNumber] = useState('');
  const [idError, setIdError] = useState<string>();
  const [debitDay, setDebitDay] = useState<number>(25);
  const [members, setMembers] = useState<MemberInput[]>([]);
  const [adding, setAdding] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showSum, setShowSum] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [legal, setLegal] = useState<LegalSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  useEffect(() => {
    if (!policyId) legalService.list().then(setLegal).catch(() => {});
  }, [policyId]);

  const items = useMemo(() => Object.entries(selection).filter(([, q]) => q > 0).map(([itemId, quantity]) => ({ itemId, quantity })), [selection]);
  const quoteMembers = useMemo(
    () => (editing ? editing.members.map((m) => ({ relationship: m.relationship, dateOfBirth: m.dateOfBirth })) : members.map((m) => ({ relationship: m.relationship, dateOfBirth: m.dateOfBirth }))),
    [editing, members],
  );
  // The main member's age comes from their ID number (or, when editing, from the cover). Until then they are priced as a typical adult.
  const holderDobIso = useMemo(() => (editing ? editing.holder.dateOfBirth : dobFromSAId(idNumber) ?? undefined), [editing, idNumber]);
  const coverMain = editing ? editing.coversMainMember : coverMe;
  const { quote, loading: quoting, error: quoteError } = useQuote(items, quoteMembers, holderDobIso, coverMain);

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
  const memberNames = editing ? editing.members.map((m) => m.fullName) : members.map((m) => m.fullName);
  const people: PersonLine[] = quote ? [...(quote.mainCovered ? [{ ...quote.main, name: user?.fullName }] : []), ...quote.members.map((m, i) => ({ ...m, name: memberNames[i] }))] : [];
  // An owner who only pays has to cover someone, but that is asked on the family step, so earlier steps don't block on it.
  const missingPeopleOnly = !!quote && !quote.valid && quote.problems.every((p) => p.startsWith('Add at least one person'));
  const canContinue = !!quote && (quote.valid || (step < 2 && missingPeopleOnly)) && !quoting;
  const shownProblem = quote?.problems.find((p) => step >= 2 || !p.startsWith('Add at least one person'));
  const isLast = step === STEPS.length - 1;
  const needsVerify = !editing && smsEnabled && !!user && !user.phoneVerified;
  const terms = legal.find((d) => d.slug === 'terms');
  const privacy = legal.find((d) => d.slug === 'privacy');

  const next = () => {
    if (!editing && step === 1) {
      if (!holderDob) return setIdError("That ID number doesn't look right. Please check it.");
      if (coverMain && (holderAge! < options.mainMinAge || holderAge! > options.mainMaxAge)) return setIdError(`This cover is for people aged ${options.mainMinAge} to ${options.mainMaxAge}.`);
      if (!coverMain && holderAge! < 18) return setIdError('You need to be 18 or older to own a plan.');
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
        if (!terms || !privacy) throw new Error("We couldn't load our terms. Please check your connection and try again.");
        const p = await apply({ items, holderIdNumber: idNumber, debitDay, members, acceptedTermsVersion: terms.version, acceptedPrivacyVersion: privacy.version, coverMainMember: coverMe });
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
      {quote && !quote.valid && step !== 1 && step !== 2 && shownProblem ? <Text variant="bodyS" color={colors.danger} accessibilityLiveRegion="polite">{shownProblem}</Text> : null}
      {quoteError ? <Text variant="bodyS" color={colors.danger}>{quoteError}</Text> : null}
      {showSum && quote ? (
        <ScrollView style={{ maxHeight: 250 }} contentContainerStyle={{ paddingBottom: spacing.sm }}>
          <PriceBreakdown baseMonthlyCents={quote.baseMonthlyCents} people={people} totalMonthlyCents={total} />
        </ScrollView>
      ) : null}
      <Pressable onPress={() => setShowSum(!showSum)} accessibilityRole="button" accessibilityState={{ expanded: showSum }} accessibilityLabel={`${editing ? 'New monthly price' : 'Your monthly price'} ${quote ? formatZAR(total) : ''}. ${showSum ? "Hide" : "See"} how it adds up`}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text variant="eyebrow">{editing ? 'NEW MONTHLY PRICE' : 'YOUR MONTHLY PRICE'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text variant="label" color={colors.olive} style={{ fontFamily: 'Urbanist_600SemiBold' }}>{showSum ? 'Hide how it adds up' : 'See how it adds up'}</Text>
            <Icon name={showSum ? 'chevron-down' : 'chevron-up'} size={16} color={colors.olive} />
          </View>
        </View>
        <Text variant="price" style={{ fontSize: 24, opacity: quoting ? 0.5 : 1 }} accessibilityLiveRegion="polite">{quote ? formatZAR(total) : '–'}</Text>
      </Pressable>
      {!isLast ? (
        <Button label="Continue" icon="arrow-right" onPress={next} disabled={step === 0 ? !canContinue : step === 1 ? needsVerify : step === 2 ? adding || !canContinue : false} />
      ) : (
        <>
          {submitError ? <Text variant="bodyS" color={colors.danger} accessibilityLiveRegion="polite">{submitError}</Text> : null}
          <Button label={editing ? 'Update My Cover' : 'Submit Application'} onPress={submit} loading={busy} disabled={!agreed || !canContinue || (!editing && !acceptedLegal)} />
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
          {quote && !quote.valid && shownProblem ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{shownProblem}</Text> : null}
          {!editing ? <Notice text="This price is for a typical adult. It updates as soon as we know your age and your family's ages and relationships, because everyone's price depends on both." /> : null}
          <Pressable onPress={() => setShowHow(!showHow)} accessibilityRole="button" accessibilityState={{ expanded: showHow }} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 }}>
            <Icon name="calculator-variant-outline" size={22} color={colors.olive} />
            <Text variant="cardTitle" color={colors.olive} style={{ flex: 1 }}>How is my price worked out?</Text>
            <Icon name={showHow ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
          </Pressable>
          {showHow ? <HowPriceWorks options={options} exampleBaseCents={quote?.baseMonthlyCents} /> : null}
        </View>
      ) : null}

      {!editing && step === 1 ? (
        <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
          <View style={{ gap: spacing.sm }}>
            <Text variant="displayM">Now, a little about you.</Text>
            <Text variant="body" color={colors.muted}>{user?.fullName}, {coverMe ? "we need your ID number to check you're eligible." : 'we need your ID number so we know who owns the plan.'}</Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" color={colors.inkSoft}>Who is this cover for?</Text>
            <Choice selected={coverMe} title="Me and my family" text="You're covered too, and your age sets your own price." onPress={() => setCoverMe(true)} />
            <Choice selected={!coverMe} title="My family only" text="You pay, but you aren't covered. For example, you're covering your parents. Your brothers and sisters can share the cost." onPress={() => setCoverMe(false)} />
          </View>
          {needsVerify ? (
            <Pressable onPress={() => router.push('/verify-phone')} accessibilityRole="button" style={[styles.notice, { backgroundColor: '#F8EAC2' }]}>
              <Icon name="cellphone-message" size={22} color={colors.ink} />
              <View style={{ flex: 1 }}><Text variant="cardTitle">Verify your mobile number first</Text><Text variant="bodyS" color={colors.inkSoft}>We'll text you a code. Tap here to do it now, then come back.</Text></View>
              <Icon name="chevron-right" size={22} color={colors.ink} />
            </Pressable>
          ) : null}
          <Input label="ID Number" value={idNumber} onChangeText={(t) => { setIdNumber(t.replace(/\D/g, '').slice(0, 13)); setIdError(undefined); }} keyboardType="number-pad" maxLength={13} error={idError}
            hint={holderDob ? (coverMain ? `Born ${holderDob}, age ${holderAge}. Your own price at this age is ${formatZAR(quote?.main.feeCents ?? 0)} a month.` : `Born ${holderDob}, age ${holderAge}. You won't be priced or covered.`) : (coverMain ? 'Your 13-digit South African ID number. Your age sets your own price.' : 'Your 13-digit South African ID number. It is only used to know who owns the plan.')} />
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
            <Text variant="displayM">{coverMe ? 'Who else matters?' : 'Who are you covering?'}</Text>
            <Text variant="body" color={colors.muted}>{coverMe ? "Add the people you'd like covered. Each pays a small monthly fee. You can also do this later." : 'Add the people this plan covers, such as your parents. Each has their own price. You need at least one.'}</Text>
          </View>
          {members.map((m, i) => (
            <View key={`${m.fullName}${i}`} style={styles.member}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="cardTitle">{m.fullName}</Text>
                <Text variant="bodyS">{RELATIONSHIP_LABEL[m.relationship]}{quote?.members[i]?.age != null ? ` · age ${quote.members[i].age}` : ''} · +{formatZAR(quote?.members[i]?.feeCents ?? 0)} a month</Text>
              </View>
              <Pressable onPress={() => setMembers(members.filter((_, j) => j !== i))} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${m.fullName}`}><Icon name="close" size={22} color={colors.muted} /></Pressable>
            </View>
          ))}
          {!coverMe && members.length === 0 && !adding ? <Text variant="bodyS" color={colors.warning}>Add at least one person to continue.</Text> : null}
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
          <Card accent="gold" tabLabel="How your price adds up">
            <View style={{ gap: spacing.md }}>
              {quote ? <PriceBreakdown baseMonthlyCents={quote.baseMonthlyCents} people={people} totalMonthlyCents={total} /> : null}
              {editing ? <Text variant="bodyS">Was {formatZAR(editing.monthlyTotalCents)} a month. The new price starts from your next debit.</Text> : <Text variant="bodyS">Debit order on the {ordinal(debitDay)} of each month, once approved by you and your bank.</Text>}
            </View>
          </Card>
          {editing && upgrade ? (
            <Notice text={`You're increasing your cover. The extra only pays out after a new ${monthsAdj(options.upgradeWaitingDays)} waiting period. Until then, your current bundle stays payable.`} />
          ) : editing && started ? (
            <Notice text="You're reducing your cover. This applies straight away." />
          ) : editing ? (
            <Notice text="Your cover hasn't started yet, so this simply updates your application." />
          ) : (
            <Notice text={`This is an application, not cover. We review it first. Cover starts once it's approved and your first payment is received. Natural causes have a ${monthsAdj(options.naturalWaitingDays)} waiting period${options.accidentalWaitingDays === 0 ? '; accidents have none' : ''}.`} />
          )}
          <Text variant="bodyS">Your price is reviewed once a year and won't go up by more than {options.escalationCapPercent}%. We'll give you notice first.</Text>
          <Pressable onPress={() => setAgreed(!agreed)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} style={styles.agree}>
            <Icon name={agreed ? 'checkbox-marked' : 'checkbox-blank-outline'} size={26} color={agreed ? colors.olive : colors.muted} />
            <Text variant="body" style={{ flex: 1 }}>{editing ? 'I understand how this change affects my price and my cover.' : 'The details above are correct, and I understand this is an application that must be approved before cover starts.'}</Text>
          </Pressable>
          {!editing ? (
            <Pressable onPress={() => setAcceptedLegal(!acceptedLegal)} accessibilityRole="checkbox" accessibilityState={{ checked: acceptedLegal }} style={styles.agree}>
              <Icon name={acceptedLegal ? 'checkbox-marked' : 'checkbox-blank-outline'} size={26} color={acceptedLegal ? colors.olive : colors.muted} />
              <Text variant="body" style={{ flex: 1 }}>
                I have read and accept the{' '}
                <Text variant="body" color={colors.olive} style={{ fontFamily: 'Urbanist_700Bold' }} accessibilityRole="link" onPress={() => router.push({ pathname: '/legal/[slug]', params: { slug: 'terms' } })}>Terms Of Use</Text>
                {terms ? ` (v${terms.version})` : ''} and the{' '}
                <Text variant="body" color={colors.olive} style={{ fontFamily: 'Urbanist_700Bold' }} accessibilityRole="link" onPress={() => router.push({ pathname: '/legal/[slug]', params: { slug: 'privacy' } })}>Privacy Notice</Text>
                {privacy ? ` (v${privacy.version})` : ''}.
              </Text>
            </Pressable>
          ) : null}
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
