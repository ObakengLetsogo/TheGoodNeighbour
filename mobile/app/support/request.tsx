import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { Input } from '../../src/components/Input';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { displayPhone, normaliseSAPhone } from '../../src/lib/format';
import { openWhatsApp } from '../../src/lib/support';
import { supportService } from '../../src/services/api';
import { useAuth } from '../../src/store/AuthContext';
import { useCover } from '../../src/store/CoverContext';
import { colors, spacing } from '../../src/theme';

export default function SupportRequest() {
  const { kind, topic, reference: initialRef } = useLocalSearchParams<{ kind?: string; topic?: string; reference?: string }>();
  const { user } = useAuth();
  const { policies } = useCover();
  const isPolicy = kind === 'policy_enquiry';
  const [reference, setReference] = useState<string | undefined>(initialRef);
  const [message, setMessage] = useState(topic ? `I'd like to ask about: ${topic}.\n\n` : '');
  const [phone, setPhone] = useState(user ? displayPhone(user.phone) : '');
  const [errors, setErrors] = useState<{ message?: string; phone?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'sent' | 'not_sent' | null>(null);

  const composed = () => `${reference ? `[${reference}] ` : ''}${message.trim()}`;

  const submit = async () => {
    const e164 = normaliseSAPhone(phone);
    const next: typeof errors = {};
    if (message.trim().length < 5) next.message = 'Please tell us a little more.';
    if (!e164) next.phone = 'Please enter a valid mobile number so we can reach you.';
    setErrors(next);
    if (next.message || !e164) return;
    setBusy(true);
    try {
      await supportService.submit({ kind: isPolicy ? 'policy_enquiry' : 'problem', reference, message: message.trim(), contactPhone: e164 });
      setResult('sent');
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : "We couldn't send that just now. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Screen>
        <ScreenHeader onBack={() => router.back()} />
        <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          <Text variant="displayM">{result === 'sent' ? 'Thank you. We have your message.' : "We can't send this from the app just yet."}</Text>
          <Text variant="body" color={colors.inkSoft}>
            {result === 'sent'
              ? "Someone from the team will get back to you on the number you gave us."
              : "Nothing has been sent. To reach a person now, send this on WhatsApp and we'll pick it up from there."}
          </Text>
          {result === 'not_sent' ? <Button label="Send On WhatsApp" icon="whatsapp" onPress={() => openWhatsApp(composed())} /> : null}
          <Button label="Done" variant={result === 'sent' ? 'primary' : 'secondary'} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={isPolicy ? 'Ask About My Plan' : topic ? 'Ask Us' : 'Report A Problem'} onBack={() => router.back()} />
      <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
        <Text variant="body" color={colors.muted}>{isPolicy ? 'Tell us what you would like to know.' : "We're sorry something isn't right. Tell us what happened and we'll help."}</Text>
        {isPolicy && policies.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" color={colors.inkSoft}>Which plan?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {policies.slice(0, 6).map((o) => <Chip key={o.id} label={o.reference} selected={reference === o.reference} onPress={() => setReference(o.reference)} />)}
            </View>
          </View>
        ) : null}
        <Input label="Your Message" multiline value={message} onChangeText={setMessage} error={errors.message} />
        <Input label="Best Number To Reach You" prefix="+27" value={phone.startsWith('+27') ? phone.slice(3).trim() : phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
        {errors.form ? <Text variant="body" color={colors.danger}>{errors.form}</Text> : null}
        <Button label="Send Message" onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}
