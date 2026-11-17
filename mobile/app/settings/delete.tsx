import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { Input } from '../../src/components/Input';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { accountService } from '../../src/services/api';
import { useAuth } from '../../src/store/AuthContext';
import { colors, radii, spacing } from '../../src/theme';

/** POPIA: the customer's right to ask for their data to be deleted. */
export default function DeleteAccount() {
  const { signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState<string>();

  const submit = async () => {
    if (!password) return setError('Please enter your password to confirm.');
    setBusy(true); setError(undefined);
    try {
      const r = await accountService.deleteAccount(password);
      if (r.state === 'deleted') { await signOut(); router.replace('/(onboarding)/welcome'); }
      else setRequested(r.message);
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn't do that right now. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <ScreenHeader title="Delete My Account" />
      {requested ? (
        <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          <Text variant="displayM">We've got your request.</Text>
          <Text variant="body" color={colors.muted}>{requested}</Text>
          <Button label="Done" onPress={() => router.back()} />
        </View>
      ) : (
        <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
          <View style={styles.warn}>
            <Icon name="alert-outline" size={22} color={colors.danger} />
            <Text variant="bodyS" color={colors.inkSoft} style={{ flex: 1 }}>
              You have the right to ask us to delete your personal information. If you have no cover or claims with us, your account and details are deleted straight away. If you do, we may need to keep some records, so our team will review your request and contact you.
            </Text>
          </View>
          <Input label="Your Password" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" error={error} hint="We ask for it to make sure it's really you." />
          <Button label="Delete My Account And Data" variant="danger" onPress={submit} loading={busy} />
        </View>
      )}
    </Screen>
  );
}

const styles = {
  warn: { flexDirection: 'row' as const, gap: spacing.sm, alignItems: 'flex-start' as const, backgroundColor: '#F7E1E1', borderRadius: radii.md, padding: spacing.md },
};
