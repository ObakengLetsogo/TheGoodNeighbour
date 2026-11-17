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
import { PROVINCES, type CauseOfDeath } from '../../src/types';

type Errors = Partial<Record<'date' | 'name' | 'phone' | 'rName' | 'rPhone' | 'address' | 'suburb' | 'city' | 'province' | 'postal' | 'form', string>>;

export default function NewClaim() {
  const { policyId } = useLocalSearchParams<{ policyId: string }>();
  const { user } = useAuth();
  const { policies, submitClaim } = useCover();
  const policy = policies.find((p) => p.id === policyId);
  const [who, setWho] = useState<string>('holder');
  const [cause, setCause] = useState<CauseOfDeath>('natural');
  const [date, setDate] = useState('');
  const [name, setName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user ? displayPhone(user.phone) : '');
  const [rName, setRName] = useState(user?.fullName ?? '');
  const [rPhone, setRPhone] = useState(user ? displayPhone(user.phone) : '');
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState<string>();
  const [postal, setPostal] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  if (!policy) return <Screen><ScreenHeader onBack={() => router.back()} /><Text variant="body">We can't find that cover.</Text></Screen>;

  const submit = async () => {
    const e164 = normaliseSAPhone(phone);
    const rE164 = normaliseSAPhone(rPhone);
    const next: Errors = {};
    if (!date) next.date = 'Please enter the date they passed away.';
    if (name.trim().length < 2) next.name = 'Please enter your name.';
    if (!e164) next.phone = 'Please enter a valid mobile number so we can reach you.';
    if (rName.trim().length < 2) next.rName = 'Who should we deliver to?';
    if (!rE164) next.rPhone = 'Please enter a valid mobile number for the delivery.';
    if (address.trim().length < 3) next.address = 'Please enter the street address.';
    if (suburb.trim().length < 2) next.suburb = 'Please enter the suburb, village or area.';
    if (city.trim().length < 2) next.city = 'Please enter the town or city.';
    if (!province) next.province = 'Please choose the province.';
    if (!/^\d{4}$/.test(postal)) next.postal = 'Postal codes have 4 digits.';
    setErrors(next);
    if (Object.keys(next).length || !e164 || !rE164 || !province) return;
    setBusy(true);
    try {
      const claim = await submitClaim({
        policyId: policy.id, memberId: who === 'holder' ? undefined : who, dateOfDeath: date, causeOfDeath: cause, claimantName: name.trim(), claimantPhone: e164,
        delivery: { recipientName: rName.trim(), recipientPhone: rE164, addressLine: address.trim(), suburb: suburb.trim(), city: city.trim(), province, postalCode: postal, instructions: notes.trim() || undefined },
      });
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
          <Button label="WhatsApp" icon="whatsapp" variant="secondary" size="small" fullWidth={false} style={{ flex: 1 }} onPress={() => openWhatsApp(`Hi TGN, I need to make a claim on cover ${policy.reference}.`)} />
          <Button label="Call Us" icon="phone-outline" variant="secondary" size="small" fullWidth={false} style={{ flex: 1 }} onPress={callSupport} />
        </View>

        <View style={{ gap: 6 }}>
          <Text variant="label" color={colors.inkSoft}>Who has passed away?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Chip label={`${policy.holder.name} (main member)`} selected={who === 'holder'} onPress={() => setWho('holder')} />
            {policy.members.map((m) => <Chip key={m.id} label={m.fullName} selected={who === m.id} onPress={() => setWho(m.id)} />)}
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <Text variant="label" color={colors.inkSoft}>What was the cause?</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Chip label="Natural Causes" selected={cause === 'natural'} onPress={() => setCause('natural')} />
            <Chip label="Accident" selected={cause === 'accidental'} onPress={() => setCause('accidental')} />
          </View>
        </View>
        <DateField label="Date They Passed Away" onChange={setDate} error={errors.date} />
        <Input label="Your Name" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
        <Input label="Your Mobile Number" prefix="+27" value={phone.startsWith('+27') ? phone.slice(3).trim() : phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} hint="We'll call you on this number." />

        <Text variant="section" style={{ marginTop: spacing.md }}>Where should we deliver?</Text>
        <Input label="Who Is Receiving It" value={rName} onChangeText={setRName} autoCapitalize="words" error={errors.rName} />
        <Input label="Their Mobile Number" prefix="+27" value={rPhone.startsWith('+27') ? rPhone.slice(3).trim() : rPhone} onChangeText={setRPhone} keyboardType="phone-pad" error={errors.rPhone} />
        <Input label="Street Address" value={address} onChangeText={setAddress} autoCapitalize="words" error={errors.address} />
        <Input label="Suburb, Village Or Area" value={suburb} onChangeText={setSuburb} autoCapitalize="words" error={errors.suburb} />
        <Input label="Town Or City" value={city} onChangeText={setCity} autoCapitalize="words" error={errors.city} />
        <View style={{ gap: 6 }}>
          <Text variant="label" color={colors.inkSoft}>Province</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {PROVINCES.map((p) => <Chip key={p} label={p} selected={p === province} onPress={() => setProvince(p)} />)}
          </View>
          {errors.province ? <Text variant="bodyS" color={colors.danger}>{errors.province}</Text> : null}
        </View>
        <Input label="Postal Code" value={postal} onChangeText={(t) => setPostal(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} error={errors.postal} />
        <Input label="Anything We Should Know" optional multiline value={notes} onChangeText={setNotes} placeholder="Directions, gate codes, who to call on arrival..." />
        <Text variant="bodyS">We'll call to confirm the date and arrangements. Preparing livestock is arranged separately with our team.</Text>

        {errors.form ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{errors.form}</Text> : null}
        <Button label="Send Claim" onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}
