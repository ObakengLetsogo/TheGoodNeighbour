import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Chip';
import { Input } from '../../src/components/Input';
import { LogoMark } from '../../src/components/Logo';
import { Screen, SectionHeader } from '../../src/components/Screen';
import { SettingsRow } from '../../src/components/SettingsRow';
import { Text } from '../../src/components/Text';
import { displayPhone, isValidEmail } from '../../src/lib/format';
import { confirmAction } from '../../src/lib/confirm';
import { accountService } from '../../src/services/api';
import { useAuth } from '../../src/store/AuthContext';
import { colors, radii, spacing } from '../../src/theme';

export default function Account() {
  const { user, smsEnabled, signOut, updateProfile } = useAuth();
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
    try { await updateProfile({ fullName: name.trim(), email: email.trim() || undefined }); setEditing(false); }
    catch { Alert.alert("Couldn't save", 'Please try again in a moment.'); }
    finally { setBusy(false); }
  };

  const doSignOut = () =>
    confirmAction('Sign out?', 'You can sign back in any time.', 'Sign Out', async () => { await signOut(); router.replace('/(onboarding)/welcome'); });

  const signOutAll = () =>
    confirmAction('Sign out of all devices?', 'Every device, including this one, will be signed out.', 'Sign Out Everywhere', async () => {
      try { await accountService.signOutEverywhere(); } catch { /* signing out locally anyway */ }
      await signOut();
      router.replace('/(onboarding)/welcome');
    });

  return (
    <Screen>
      <Text variant="displayM" style={{ marginTop: spacing.lg }} accessibilityRole="header">Account</Text>

      <View style={{ marginTop: spacing.xl }}>
        <Card accent="ember" tabLabel="Your Details">
          <View style={styles.profile}>
            <View style={styles.avatar}><Text variant="section" color={colors.white}>{initials}</Text></View>
            <View style={{ flex: 1, gap: 2 }}>
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

      <SectionHeader title="Security" />
      <Card noTab padded={false}>
        <View style={styles.list}>
          <SettingsRow icon="cellphone-check" accent={user.phoneVerified ? 'olive' : 'gold'} title="Mobile Number"
            subtitle={user.phoneVerified ? `${displayPhone(user.phone)} · verified` : smsEnabled ? 'Not verified yet. Tap to verify.' : displayPhone(user.phone)}
            onPress={() => router.push(user.phoneVerified || !smsEnabled ? '/settings/phone' : '/verify-phone')}
            right={user.phoneVerified ? <Badge label="Verified" color={colors.olive} bg={colors.oliveLight} /> : smsEnabled ? <Badge label="Verify" color={colors.ink} bg="#F8EAC2" /> : undefined} />
          {user.phoneVerified ? <SettingsRow icon="swap-horizontal" accent="ember" title="Change Mobile Number" subtitle="We'll text a code to the new number" onPress={() => router.push('/settings/phone')} /> : null}
          <SettingsRow icon="lock-outline" accent="berry" title="Change Password" onPress={() => router.push('/settings/password')} />
          <SettingsRow icon="logout-variant" accent="gold" title="Sign Out Of All Devices" subtitle="Useful if you've lost a phone" onPress={signOutAll} />
        </View>
      </Card>

      <SectionHeader title="Preferences" />
      <Card noTab padded={false}>
        <View style={styles.list}>
          <SettingsRow icon="bell-outline" accent="ember" title="Notifications" subtitle="Claim updates, payment reminders, news" onPress={() => router.push('/settings/notifications')} />
        </View>
      </Card>

      <SectionHeader title="Legal And Privacy" />
      <Card noTab padded={false}>
        <View style={styles.list}>
          <SettingsRow icon="file-document-outline" accent="olive" title="Terms Of Use" onPress={() => router.push({ pathname: '/legal/[slug]', params: { slug: 'terms' } })} />
          <SettingsRow icon="shield-lock-outline" accent="olive" title="Privacy Notice" onPress={() => router.push({ pathname: '/legal/[slug]', params: { slug: 'privacy' } })} />
          <SettingsRow icon="format-list-checks" accent="gold" title="Key Facts About Your Cover" subtitle="A plain-language summary" onPress={() => router.push('/legal/key-facts')} />
          <SettingsRow icon="delete-outline" title="Delete My Account And Data" subtitle="Your right under POPIA" danger onPress={() => router.push('/settings/delete')} />
        </View>
      </Card>

      <SectionHeader title="About TGN" />
      <Card noTab>
        <View style={{ gap: spacing.md, alignItems: 'flex-start' }}>
          <LogoMark size={44} />
          <Text variant="cardTitle">The Good Neighbour</Text>
          <Text variant="body" style={{ fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 20, lineHeight: 26, color: colors.ember }}>Here when it matters.</Text>
          <Text variant="body">Funeral cover for you and the people who matter, paid monthly, with a real person here when it matters.</Text>
        </View>
      </Card>

      <View style={{ marginTop: spacing.xl }}>
        <Button label="Sign Out" variant="danger" onPress={doSignOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.ember, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg },
});
