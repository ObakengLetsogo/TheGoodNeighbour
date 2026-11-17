import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { useAuth } from '../../src/store/AuthContext';
import { colors, spacing } from '../../src/theme';

export default function ChangePassword() {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    const e: typeof errors = {};
    if (!current) e.current = 'Please enter your current password.';
    if (next.length < 8) e.next = 'Use at least 8 characters.';
    else if (next === current) e.next = 'Choose a password different from your current one.';
    if (confirm !== next) e.confirm = "These passwords don't match.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try { await changePassword(current, next); setDone(true); }
    catch (err) { setErrors({ form: err instanceof Error ? err.message : "We couldn't change your password. Please try again." }); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <ScreenHeader title="Change Password" />
      {done ? (
        <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          <Text variant="displayM">Password changed.</Text>
          <Text variant="body" color={colors.muted}>You're still signed in here. Any other devices have been signed out.</Text>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      ) : (
        <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
          <Input label="Current Password" value={current} onChangeText={setCurrent} secureTextEntry textContentType="password" error={errors.current} />
          <Input label="New Password" value={next} onChangeText={setNext} secureTextEntry textContentType="newPassword" hint="At least 8 characters." error={errors.next} />
          <Input label="Confirm New Password" value={confirm} onChangeText={setConfirm} secureTextEntry textContentType="newPassword" error={errors.confirm} />
          {errors.form ? <Text variant="body" color={colors.danger} accessibilityLiveRegion="polite">{errors.form}</Text> : null}
          <Button label="Change Password" onPress={submit} loading={busy} />
          <Text variant="bodyS">Forgotten your current password? Sign out and use Forgot Password on the sign-in screen.</Text>
        </View>
      )}
    </Screen>
  );
}
