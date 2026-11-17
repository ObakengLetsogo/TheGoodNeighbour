import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { DateField } from '../../src/components/DateField';
import { Input } from '../../src/components/Input';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { displayPhone, normaliseSAPhone } from '../../src/lib/format';
import { callSupport, openWhatsApp } from '../../src/lib/support';
import { useAuth } from '../../src/store/AuthContext';
import { useCover } from '../../src/store/CoverContext';
import { colors, spacing } from '../../src/theme';

export default function NewClaim() {
  const { policyId } = useLocalSearchParams<{ policyId: string }>();
  const { user } = useAuth();
  const { policies, submitClaim } = useCover();
  const policy = policies.find((p) => p.id === policyId);
  const [who, setWho] = useState<string>('holder');
  const [date, setDate] = useState('');
  const [name, setName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user ? displayPhone(user.phone) : '');
  const [errors, setErrors] = useState<{ date?: string; name?: string; phone?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  if (!policy) return <Screen><ScreenHeader onBack={() => router.back()} /><Text variant="body">We can't find that plan.</Text></Screen>;

  const submit = async () => {
    const e164 = normaliseSAPhone(phone);
    const next: typeof errors = {};
    if (!date) next.date = 'Please enter the date they passed away.';
    if (name.trim().length < 2) next.name = 'Please enter your name.';
    if (!e164) next.phone = 'Please enter a valid mobile number so we can reach you.';
    setErrors(next);
    if (next.date || next.name || !e164) return;
    setBusy(true);
    try {
      const claim = await submitClaim({ policyId: policy.id, memberId: who === 'holder' ? undefined : who, dateOfDeath: date, claimantName: name.trim(), claimantPhone: e164 });
      router.replace({ pathname: '/claim/[id]', params: { id: claim.id, submitted: '1' } });
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : "We couldn't send your claim just now. Please try again or call us." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Make A Claim" onBack={() => router.back()} />
      <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
        <Text variant="body" color={colors.inkSoft}>We're so sorry for your loss. Tell us a little and we'll take it from here. If you'd rather talk to someone, we're here.</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button label="WhatsApp" icon="whatsapp" variant="secondary" size="small" fullWidth={false} style={{ flex: 1 }} onPress={() => openWhatsApp(`Hi TGN, I need to make a claim on plan ${policy.reference}.`)} />
          <Button label="Call Us" icon="phone-outline" variant="secondary" size="small" fullWidth={false} style={{ flex: 1 }} onPress={callSupport} />
        </View>

        <View style={{ gap: 6 }}>
          <Text variant="label" color={colors.inkSoft}>Who has passed away?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Chip label={`${policy.holder.name} (main member)`} selected={who === 'holder'} onPress={() => setWho('holder')} />
            {policy.members.map((m) => <Chip key={m.id} label={m.fullName} selected={who === m.id} onPress={() => setWho(m.id)} />)}
          </View>
        </View>
        <DateField label="Date They Passed Away" onChange={setDate} error={errors.date} />
        <Input label="Your Name" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
        <Input label="Your Mobile Number" prefix="+27" value={phone.startsWith('+27') ? phone.slice(3).trim() : phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} hint="We'll call you on this number." />
        {errors.form ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{errors.form}</Text> : null}
        <Button label="Send Claim" onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}
