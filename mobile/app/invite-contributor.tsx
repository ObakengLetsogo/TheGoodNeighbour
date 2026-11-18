import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../src/components/Button';
import { Chip } from '../src/components/Chip';
import { Input } from '../src/components/Input';
import { Screen, ScreenHeader } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { formatZAR, normaliseSAPhone } from '../src/lib/format';
import { useCover } from '../src/store/CoverContext';
import { useOptions } from '../src/store/OptionsContext';
import { colors, spacing } from '../src/theme';

const CHOICES = [10, 20, 25, 30, 40, 50, 60, 75, 90];
const OWNER_MIN_PERCENT = 5;

/** Invite a brother, sister or anyone else to share the monthly cost. They pay a percentage and you pay the rest. */
export default function InviteContributor() {
  const { policyId } = useLocalSearchParams<{ policyId: string }>();
  const { policies, inviteContributor } = useCover();
  const { options } = useOptions();
  const policy = policies.find((p) => p.id === policyId);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [percent, setPercent] = useState(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [touched, setTouched] = useState(false);

  if (!policy) return <Screen><ScreenHeader onBack={() => router.back()} /><Text variant="body">We can't find that cover.</Text></Screen>;

  const taken = policy.contributors.reduce((n, c) => n + c.shareBps / 100, 0);
  const room = 100 - OWNER_MIN_PERCENT - taken;
  // Every payer costs a collection fee, so a share has to be worth a minimum amount a month.
  const minAmount = options?.minContributionCents ?? 0;
  const minPercent = minAmount > 0 && policy.monthlyTotalCents > 0 ? Math.max(5, Math.ceil((minAmount * 100) / policy.monthlyTotalCents)) : 5;
  const allowed = CHOICES.filter((c) => c <= room && c >= minPercent);
  const canInvite = allowed.length > 0;
  const e164 = normaliseSAPhone(phone);
  const nameError = touched && name.trim().length < 1 ? 'Please enter their name.' : undefined;
  const phoneError = touched && !e164 ? "That doesn't look like a South African mobile number." : undefined;
  // The share on screen is always one of the choices that is actually allowed: the one picked, or the nearest allowed one above it.
  const chosen = allowed.includes(percent) ? percent : (allowed.find((c) => c >= percent) ?? allowed[allowed.length - 1] ?? 0);
  const monthly = Math.round((policy.monthlyTotalCents * chosen) / 100);

  const submit = async () => {
    setTouched(true);
    if (name.trim().length < 1 || !e164 || !canInvite) return;
    setBusy(true); setError(undefined);
    try {
      await inviteContributor(policy.id, { name: name.trim(), phone: e164, sharePercent: chosen });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't send that invitation. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Share The Cost" onBack={() => router.back()} />
      <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
        <Text variant="body" color={colors.muted}>
          Ask a brother, sister or anyone else to pay a share of the monthly price. They'll get an invitation in the app and can see who has paid. They never see anyone's ID number.
        </Text>
        {!canInvite ? (
          <Text variant="body" color={colors.warning}>{room < 5 ? 'The shares on this plan are full. Remove someone, or ask a person to lower their share, to invite someone else.' : `There isn't room for another share. Each person's share has to be at least ${formatZAR(minAmount)} a month, which is ${minPercent}% of this plan.`}</Text>
        ) : (
          <>
            <Input label="Their Name" value={name} onChangeText={setName} placeholder="Thabo" autoCapitalize="words" error={nameError} />
            <Input label="Their Mobile Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" prefix="+27" placeholder="82 123 4567" error={phoneError} hint="They need a TGN account with this number." />
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" color={colors.inkSoft}>Their Share Of The Monthly Price</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {CHOICES.map((c) => <Chip key={c} label={`${c}%`} selected={chosen === c} disabled={c > room || c < minPercent} onPress={() => setPercent(c)} />)}
              </View>
              <Text variant="bodyS">
                {chosen}% of {formatZAR(policy.monthlyTotalCents)} is about {formatZAR(monthly)} a month. You pay the rest. They can change their own share later, and the shares always add up, even if the price goes up. {minAmount > 0 ? `Each share has to be at least ${formatZAR(minAmount)} a month, so every payment is worth collecting.` : ''}
              </Text>
            </View>
            {error ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{error}</Text> : null}
            <Button label="Send Invitation" icon="send-outline" loading={busy} onPress={submit} />
          </>
        )}
      </View>
    </Screen>
  );
}
