import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AuthShell } from '../../src/components/AuthShell';
import { Button } from '../../src/components/Button';
import { Input, type InputRef } from '../../src/components/Input';
import { EditorialHeading, Text } from '../../src/components/Text';
import { normaliseSAPhone } from '../../src/lib/format';
import { AuthError } from '../../src/services';
import { useAuth } from '../../src/store/AuthContext';
import { colors, spacing } from '../../src/theme';

export default function SignIn() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const pw = useRef<InputRef>(null);

  const submit = async () => {
    const e164 = normaliseSAPhone(phone);
    const next: typeof errors = {};
    if (!e164) next.phone = 'Please enter a valid South African mobile number, e.g. 082 123 4567.';
    if (!password) next.password = 'Please enter your password.';
    setErrors(next);
    if (next.phone || next.password || !e164) return;
    setBusy(true);
    try {
      await signIn(e164, password);
      router.replace('/(tabs)');
    } catch (e) {
      setErrors({ form: e instanceof AuthError ? e.message : "We couldn't sign you in right now. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <View style={{ gap: spacing.sm }}>
        <EditorialHeading lead="Welcome back, " accent="Neighbour" trail="." variant="displayM" />
        <Text variant="body" color={colors.muted}>Sign in with your mobile number.</Text>
      </View>
      <View style={{ gap: spacing.lg }}>
        <Input label="Mobile Number" prefix="+27" value={phone} onChangeText={setPhone} placeholder="82 123 4567" keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" returnKeyType="next" onSubmitEditing={() => pw.current?.focus()} error={errors.phone} />
        <Input ref={pw} label="Password" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" autoComplete="current-password" returnKeyType="go" onSubmitEditing={submit} error={errors.password} />
        {errors.form ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{errors.form}</Text> : null}
      </View>
      <View style={{ gap: spacing.md }}>
        <Button label="Sign In" onPress={submit} loading={busy} />
        <Pressable onPress={() => router.replace('/(onboarding)/register')} accessibilityRole="link" style={{ alignItems: 'center', padding: spacing.md }}>
          <Text variant="body">New to TGN? <Text variant="cardTitle" color={colors.olive}>Create An Account</Text></Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
