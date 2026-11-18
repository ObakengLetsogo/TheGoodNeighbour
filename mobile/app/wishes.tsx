import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button } from '../src/components/Button';
import { Choice } from '../src/components/Choice';
import { Input } from '../src/components/Input';
import { Screen, ScreenHeader } from '../src/components/Screen';
import { LoadingState } from '../src/components/States';
import { Text } from '../src/components/Text';
import { normaliseSAPhone } from '../src/lib/format';
import { policyService } from '../src/services/api';
import { colors, spacing } from '../src/theme';
import { DISPOSITION_LABEL, type WishDisposition } from '../src/types';

const OPTIONS: { value: WishDisposition; text: string }[] = [
  { value: 'burial', text: 'A burial, in the place below.' },
  { value: 'cremation', text: 'A cremation.' },
  { value: 'family_decides', text: "They'd rather leave it to the family." },
];

/** Record what one covered person would like for their funeral, so the family doesn't have to guess at the hardest time. */
export default function Wishes() {
  const { policyId, memberKey } = useLocalSearchParams<{ policyId: string; memberKey: string }>();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [disposition, setDisposition] = useState<WishDisposition>('burial');
  const [place, setPlace] = useState('');
  const [denomination, setDenomination] = useState('');
  const [music, setMusic] = useState('');
  const [notes, setNotes] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [phoneError, setPhoneError] = useState<string>();

  useEffect(() => {
    policyService.wishes(policyId).then((all) => {
      const w = all.find((x) => x.memberKey === memberKey);
      if (w) {
        setName(w.personName);
        if (w.recorded) {
          setDisposition((w.disposition as WishDisposition) ?? 'burial'); setPlace(w.place ?? ''); setDenomination(w.denomination ?? ''); setMusic(w.music ?? '');
          setNotes(w.notes ?? ''); setContactName(w.contactName ?? ''); setContactPhone(w.contactPhone ? `0${w.contactPhone.slice(3)}` : '');
        }
      }
    }).catch(() => setError("We couldn't load this. Please try again.")).finally(() => setLoading(false));
  }, [policyId, memberKey]);

  const save = async () => {
    setPhoneError(undefined); setError(undefined);
    const e164 = contactPhone.trim() ? normaliseSAPhone(contactPhone) : null;
    if (contactPhone.trim() && !e164) return setPhoneError("That doesn't look like a South African mobile number.");
    setBusy(true);
    try {
      await policyService.saveWish(policyId, memberKey, { disposition, place, denomination, music, notes, contactName, contactPhone: e164 ?? undefined });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Screen><ScreenHeader title="Funeral Wishes" /><LoadingState rows={3} /></Screen>;

  return (
    <Screen>
      <ScreenHeader title={name ? `${name}'s Wishes` : 'Funeral Wishes'} />
      <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
        <Text variant="body" color={colors.muted}>Write down what {name || 'they'} would like, ideally together with them. Your family will be able to read it, and our team will see it if a claim is ever made, so nobody has to guess. You can change it any time.</Text>

        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color={colors.inkSoft}>What would they like?</Text>
          {OPTIONS.map((o) => <Choice key={o.value} selected={disposition === o.value} title={DISPOSITION_LABEL[o.value]} text={o.text} onPress={() => setDisposition(o.value)} />)}
        </View>
        <Input label="Where" value={place} onChangeText={setPlace} optional placeholder="For example: home village, a cemetery, or a farm" maxLength={200} />
        <Input label="Church or denomination" value={denomination} onChangeText={setDenomination} optional placeholder="For example: Zion Christian Church" maxLength={120} />
        <Input label="Music and hymns" value={music} onChangeText={setMusic} optional multiline maxLength={800} />
        <Input label="Anything else for the service" value={notes} onChangeText={setNotes} optional multiline maxLength={1500} hint="Customs, who should speak, what they would not want." />
        <Input label="First person to call" value={contactName} onChangeText={setContactName} optional placeholder="For example: Uncle Joe" maxLength={100} />
        <Input label="Their mobile number" value={contactPhone} onChangeText={setContactPhone} optional keyboardType="phone-pad" prefix="+27" placeholder="82 123 4567" error={phoneError} />
        {error ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{error}</Text> : null}
        <Button label="Save Wishes" icon="content-save-outline" loading={busy} onPress={save} />
      </View>
    </Screen>
  );
}
