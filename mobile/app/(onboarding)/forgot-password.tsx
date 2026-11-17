import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AuthShell } from '../../src/components/AuthShell';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { EditorialHeading, Text } from '../../src/components/Text';
import { normaliseSAPhone } from '../../src/lib/format';
import { useCooldown } from '../../src/lib/useCooldown';
import { authService } from '../../src/services/api';
import { colors, spacing } from '../../src/theme';

/** Reset a forgotten password with a code sent by SMS. */
export default function ForgotPassword() {
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; code?: string; password?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const cooldown = useCooldown(30);
  const e164 = normaliseSAPhone(phone);

  const send = async () => {
    if (!e164) return setErrors({ phone: 'Please enter a valid South African mobile number, e.g. 082 123 4567.' });
    setBusy(true); setErrors({});
    try {
      await authService.requestPasswordReset(e164);
      setStep('code'); cooldown.start();
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : "We couldn't send a code right now. Please try again." });
    } finally { setBusy(false); }
  };

  const reset = async () => {
    const next: typeof errors = {};
    if (!/^\d{6}$/.test(code)) next.code = 'Enter the 6-digit code from the SMS.';
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (confirm !== password) next.confirm = "These passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length || !e164) return;
    setBusy(true);
    try {
      await authService.confirmPasswordReset(e164, code, password);
      setStep('done');
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : "We couldn't change your password. Please try again." });
    } finally { setBusy(false); }
  };

  return (
    <AuthShell>
      {step === 'done' ? (
        <View style={{ gap: spacing.xl }}>
          <EditorialHeading lead="All " accent="done" trail="." variant="displayM" />
          <Text variant="body" color={colors.muted}>Your password has been changed and you've been signed out everywhere. Please sign in with your new password.</Text>
          <Button label="Sign In" onPress={() => router.replace('/(onboarding)/sign-in')} />
        </View>
      ) : (
        <>
          <View style={{ gap: spacing.sm }}>
            <EditorialHeading lead="Let's get you " accent="back in" trail="." variant="displayM" />
            <Text variant="body" color={colors.muted}>{step === 'phone' ? "Enter your mobile number and we'll text you a code." : `We've sent a 6-digit code to ${phone}.`}</Text>
          </View>
          <View style={{ gap: spacing.lg }}>
            <Input label="Mobile Number" prefix="+27" value={phone} onChangeText={setPhone} placeholder="82 123 4567" keyboardType="phone-pad" editable={step === 'phone'} error={errors.phone} />
            {step === 'code' ? (
              <>
                <Input label="6-Digit Code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode" autoComplete="sms-otp" error={errors.code} />
                <Input label="New Password" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" hint="At least 8 characters." error={errors.password} />
                <Input label="Confirm New Password" value={confirm} onChangeText={setConfirm} secureTextEntry textContentType="newPassword" error={errors.confirm} />
              </>
            ) : null}
            {errors.form ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{errors.form}</Text> : null}
          </View>
          {step === 'phone' ? (
            <Button label="Send Code" onPress={send} loading={busy} />
          ) : (
            <View style={{ gap: spacing.md }}>
              <Button label="Change Password" onPress={reset} loading={busy} />
              <Button label={cooldown.left > 0 ? `Send A New Code In ${cooldown.left}s` : 'Send A New Code'} variant="ghost" onPress={send} disabled={cooldown.left > 0 || busy} />
            </View>
          )}
        </>
      )}
    </AuthShell>
  );
}
