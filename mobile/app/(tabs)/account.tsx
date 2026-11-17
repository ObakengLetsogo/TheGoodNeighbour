import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Input } from '../../src/components/Input';
import { LogoMark } from '../../src/components/Logo';
import { Screen, SectionHeader } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { config } from '../../src/config';
import { displayPhone, isValidEmail } from '../../src/lib/format';
import { useAuth } from '../../src/store/AuthContext';
import { colors, radii, spacing } from '../../src/theme';

export default function Account() {
  const { user, signOut, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const initials = user.fullName.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const save = async () => {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'Please enter your full name.';
    if (email.trim() && !isValidEmail(email)) next.email = "That email doesn't look quite right.";
    setErrors(next);
    if (next.name || next.email) return;
    setBusy(true);
    try {
      await updateProfile({ fullName: name.trim(), email: email.trim() || undefined });
      setEditing(false);
    } catch {
      Alert.alert("Couldn't save", 'Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text variant="displayM" style={{ marginTop: spacing.lg }} accessibilityRole="header">Account</Text>

      <View style={{ marginTop: spacing.xl }}>
        <Card accent="ember" tabLabel="Your Details">
          <View style={styles.profile}>
            <View style={styles.avatar}><Text variant="section" color={colors.white}>{initials}</Text></View>
            <View style={{ flex: 1 }}>
              <Text variant="cardTitle">{user.fullName}</Text>
              <Text variant="bodyS">{displayPhone(user.phone)}</Text>
              {user.email ? <Text variant="bodyS">{user.email}</Text> : null}
            </View>
          </View>
          {editing ? (
            <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
              <Input label="Full Name" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
              <Input label="Email Address" optional value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <Button label="Cancel" variant="secondary" fullWidth={false} style={{ flex: 1 }} onPress={() => { setEditing(false); setName(user.fullName); setEmail(user.email ?? ''); setErrors({}); }} />
                <Button label="Save" fullWidth={false} style={{ flex: 1 }} onPress={save} loading={busy} />
              </View>
            </View>
          ) : (
            <Button label="Edit Details" variant="secondary" size="small" fullWidth={false} style={{ marginTop: spacing.lg, alignSelf: 'flex-start' }} onPress={() => setEditing(true)} />
          )}
        </Card>
      </View>

      <SectionHeader title="About TGN" />
      <Card noTab>
        <View style={{ gap: spacing.md, alignItems: 'flex-start' }}>
          <LogoMark size={44} />
          <Text variant="cardTitle">The Good Neighbour</Text>
          <Text variant="body" style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 20, lineHeight: 26 }}>Here when it matters.</Text>
          <Text variant="body">We help families organise food, supplies and delivery for life's important occasions, so there's one less thing to carry.</Text>
        </View>
      </Card>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        <Button label="Sign Out" variant="danger" onPress={() => Alert.alert('Sign out?', 'You can sign back in any time.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(onboarding)/welcome'); } }])} />
        {config.usingMocks ? <Text variant="bodyS" style={{ textAlign: 'center' }}>Preview build: accounts, orders and catalogue are stored on this device only.</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.ember, alignItems: 'center', justifyContent: 'center' },
});
