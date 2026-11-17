import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AuthShell } from '../../src/components/AuthShell';
import { Button } from '../../src/components/Button';
import { Input, type InputRef } from '../../src/components/Input';
import { EditorialHeading, Text } from '../../src/components/Text';
import { isValidEmail, normaliseSAPhone } from '../../src/lib/format';
import { AuthError } from '../../src/services';
import { useAuth } from '../../src/store/AuthContext';
import { colors, spacing } from '../../src/theme';

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'password' | 'form', string>>;

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const phoneRef = useRef<InputRef>(null);
  const emailRef = useRef<InputRef>(null);
  const pwRef = useRef<InputRef>(null);

  const submit = async () => {
    const e164 = normaliseSAPhone(phone);
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'Please tell us your full name.';
    if (!e164) next.phone = 'Please enter a valid South African mobile number, e.g. 082 123 4567.';
    if (email.trim() && !isValidEmail(email)) next.email = "That email doesn't look quite right.";
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    setErrors(next);
    if (Object.keys(next).length || !e164) return;
    setBusy(true);
    try {
      await register({ fullName: name.trim(), phone: e164, email: email.trim() || undefined, password });
      router.replace('/(tabs)');
    } catch (e) {
      setErrors({ form: e instanceof AuthError ? e.message : "We couldn't create your account right now. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <View style={{ gap: spacing.sm }}>
        <EditorialHeading lead="Let's get you " accent="started" trail="." variant="displayM" />
        <Text variant="body" color={colors.muted}>It only takes a minute.</Text>
      </View>
      <View style={{ gap: spacing.lg }}>
        <Input label="Full Name" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" autoComplete="name" returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} error={errors.name} />
        <Input ref={phoneRef} label="Mobile Number" prefix="+27" value={phone} onChangeText={setPhone} placeholder="82 123 4567" keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} error={errors.phone} />
        <Input ref={emailRef} label="Email Address" optional value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" returnKeyType="next" onSubmitEditing={() => pwRef.current?.focus()} error={errors.email} />
        <Input ref={pwRef} label="Password" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" autoComplete="new-password" returnKeyType="go" onSubmitEditing={submit} hint="At least 8 characters." error={errors.password} />
        {errors.form ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{errors.form}</Text> : null}
      </View>
      <View style={{ gap: spacing.md }}>
        <Button label="Create Account" onPress={submit} loading={busy} />
        <Pressable onPress={() => router.replace('/(onboarding)/sign-in')} accessibilityRole="link" style={{ alignItems: 'center', padding: spacing.md }}>
          <Text variant="body">Already have an account? <Text variant="cardTitle" color={colors.olive}>Sign In</Text></Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
