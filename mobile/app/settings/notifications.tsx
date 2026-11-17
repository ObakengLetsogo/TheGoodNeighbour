import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Screen, ScreenHeader } from '../../src/components/Screen';
import { Text } from '../../src/components/Text';
import { accountService } from '../../src/services/api';
import { useAuth } from '../../src/store/AuthContext';
import { colors, radii, spacing } from '../../src/theme';

export default function Notifications() {
  const { user, setUser } = useAuth();
  const [error, setError] = useState<string>();
  if (!user) return null;

  const set = async (patch: Partial<{ claims: boolean; payments: boolean; news: boolean }>) => {
    const next = { claims: user.notifyClaims, payments: user.notifyPayments, news: user.notifyNews, ...patch };
    setUser({ ...user, notifyClaims: next.claims, notifyPayments: next.payments, notifyNews: next.news });   // instant feedback
    setError(undefined);
    try { setUser(await accountService.setNotifications(next.claims, next.payments, next.news)); }
    catch (e) { setUser(user); setError(e instanceof Error ? e.message : "We couldn't save that. Please try again."); }
  };

  const row = (title: string, sub: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="cardTitle">{title}</Text>
        <Text variant="bodyS">{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.olive, false: colors.fill }} thumbColor={colors.white} accessibilityLabel={title} />
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title="Notifications" />
      <Text variant="body" color={colors.muted} style={{ marginTop: spacing.sm }}>Choose what we may message you about.</Text>
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {row('Claim Updates', 'When something changes on a claim.', user.notifyClaims, (v) => set({ claims: v }))}
        {row('Payment Reminders', 'About your monthly payments and your cover.', user.notifyPayments, (v) => set({ payments: v }))}
        {row('News And Offers', 'Occasional news from TGN. Off unless you switch it on.', user.notifyNews, (v) => set({ news: v }))}
      </View>
      {error ? <Text variant="body" color={colors.danger} style={{ marginTop: spacing.md }} accessibilityLiveRegion="polite">{error}</Text> : null}
      <Text variant="bodyS" style={{ marginTop: spacing.lg }}>Messages by SMS and in the app aren't switched on yet. Your choices are saved and will be respected when they are.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
});
