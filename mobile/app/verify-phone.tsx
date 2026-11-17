import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { Input } from '../src/components/Input';
import { Screen, ScreenHeader } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { displayPhone } from '../src/lib/format';
import { useCooldown } from '../src/lib/useCooldown';
import { accountService } from '../src/services/api';
import { useAuth } from '../src/store/AuthContext';
import { accents, colors, radii, spacing } from '../src/theme';

/** Confirms the customer's mobile number with an SMS code. */
export default function VerifyPhone() {
  const { user, setUser } = useAuth();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const cooldown = useCooldown(30);

  const send = async () => {
    setBusy(true); setError(undefined);
    try { await accountService.startVerification(); setSent(true); cooldown.start(); }
    catch (e) { setError(e instanceof Error ? e.message : "We couldn't send a code right now."); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from the SMS.');
    setBusy(true); setError(undefined);
    try { const me = await accountService.confirmVerification(code); setUser(me.user); setDone(true); }
    catch (e) { setError(e instanceof Error ? e.message : "That didn't work. Please try again."); }
    finally { setBusy(false); }
  };

  if (!user) return null;
  return (
    <Screen>
      <ScreenHeader title="Verify Your Number" onBack={() => router.back()} />
      <View style={{ gap: spacing.xl, marginTop: spacing.md }}>
        <View style={[styles.badge, { backgroundColor: done ? accents.olive.tint : accents.gold.tint }]}>
          <Icon name={done ? 'check-decagram' : 'cellphone-message'} size={36} color={done ? colors.olive : colors.gold} />
        </View>
        {done ? (
          <>
            <Text variant="displayM">You're verified.</Text>
            <Text variant="body" color={colors.muted}>{displayPhone(user.phone)} is confirmed. Thank you.</Text>
            <Button label="Done" onPress={() => router.back()} />
          </>
        ) : (
          <>
            <View style={{ gap: spacing.sm }}>
              <Text variant="displayM">Let's confirm it's you.</Text>
              <Text variant="body" color={colors.muted}>
                We'll text a 6-digit code to {displayPhone(user.phone)}. It protects your account and lets us reach you about your cover.
              </Text>
            </View>
            {sent ? <Input label="6-Digit Code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" autoComplete="sms-otp" /> : null}
            {error ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{error}</Text> : null}
            {sent ? (
              <View style={{ gap: spacing.md }}>
                <Button label="Verify" onPress={confirm} loading={busy} />
                <Button label={cooldown.left > 0 ? `Send A New Code In ${cooldown.left}s` : 'Send A New Code'} variant="ghost" onPress={send} disabled={cooldown.left > 0 || busy} />
              </View>
            ) : (
              <Button label="Send Me A Code" icon="message-text-outline" onPress={send} loading={busy} />
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { width: 76, height: 76, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center' },
});
