import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { displayPhone, normaliseSAPhone } from '../../src/lib/format';
import { useCooldown } from '../../src/lib/useCooldown';
import { accountService } from '../../src/services/api';
import { useAuth } from '../../src/store/AuthContext';
import { colors, spacing } from '../../src/theme';

/** Change the mobile number: a code is sent to the NEW number and must be entered to confirm it. */
export default function ChangePhone() {
  const { user, setUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const cooldown = useCooldown(30);
  const e164 = normaliseSAPhone(phone);

  const send = async () => {
    if (!e164) return setError('Please enter a valid South African mobile number, e.g. 082 123 4567.');
    setBusy(true); setError(undefined);
    try { await accountService.startPhoneChange(e164); setSent(true); cooldown.start(); }
    catch (e) { setError(e instanceof Error ? e.message : "We couldn't send a code right now."); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!e164 || !/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from the SMS.');
    setBusy(true); setError(undefined);
    try { const me = await accountService.confirmPhoneChange(e164, code); setUser(me.user); setDone(true); }
    catch (e) { setError(e instanceof Error ? e.message : "That didn't work. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <ScreenHeader title="Change Mobile Number" />
      {done ? (
        <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          <Text variant="displayM">Number changed.</Text>
          <Text variant="body" color={colors.muted}>You'll now sign in with {user ? displayPhone(user.phone) : 'your new number'}.</Text>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      ) : (
        <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
          <Text variant="body" color={colors.muted}>Your number is {user ? displayPhone(user.phone) : ''}. We'll text a code to the new one to make sure it's yours.</Text>
          <Input label="New Mobile Number" prefix="+27" value={phone} onChangeText={setPhone} placeholder="82 123 4567" keyboardType="phone-pad" editable={!sent} />
          {sent ? <Input label="6-Digit Code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" autoComplete="sms-otp" /> : null}
          {error ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{error}</Text> : null}
          {sent ? (
            <View style={{ gap: spacing.md }}>
              <Button label="Confirm New Number" onPress={confirm} loading={busy} />
              <Button label={cooldown.left > 0 ? `Send A New Code In ${cooldown.left}s` : 'Send A New Code'} variant="ghost" onPress={send} disabled={cooldown.left > 0 || busy} />
            </View>
          ) : (
            <Button label="Send Code" onPress={send} loading={busy} />
          )}
        </View>
      )}
    </Screen>
  );
}
