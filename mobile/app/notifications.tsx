import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Icon, type IconName } from '../src/components/Icon';
import { Screen, ScreenHeader } from '../src/components/Screen';
import { EmptyState } from '../src/components/States';
import { Text } from '../src/components/Text';
import { useNotifications } from '../src/store/NotificationsContext';
import { accents, colors, radii, spacing, type AccentName } from '../src/theme';
import type { AppNotification } from '../src/types';

const LOOK: Record<AppNotification['category'], { icon: IconName; accent: AccentName }> = {
  cover: { icon: 'shield-check-outline', accent: 'olive' },
  payment: { icon: 'cash-check', accent: 'gold' },
  claim: { icon: 'hand-heart-outline', accent: 'berry' },
};

/** "Just now", "5 min ago", "3 h ago", "Yesterday", then the date. */
function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)} h ago`;
  if (mins < 60 * 48) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

export default function Notifications() {
  const { inbox, loaded, markRead, markAllRead } = useNotifications();

  const open = (n: AppNotification) => {
    markRead(n.id);
    if (n.refType === 'claim' && n.refId) router.push({ pathname: '/claim/[id]', params: { id: n.refId } });
    else if (n.refType === 'policy' && n.refId) router.push({ pathname: '/policy/[id]', params: { id: n.refId } });
  };

  return (
    <Screen>
      <ScreenHeader title="Messages" />
      {!loaded ? null : inbox.items.length === 0 ? (
        <EmptyState icon="bell-outline" title="Nothing new" message="When something changes on your cover or a claim, we'll tell you here." />
      ) : (
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {inbox.unread > 0 ? <Button label="Mark All As Read" variant="ghost" size="small" fullWidth={false} onPress={markAllRead} style={{ alignSelf: 'flex-end' }} /> : null}
          {inbox.items.map((n) => {
            const look = LOOK[n.category] ?? LOOK.cover;
            const a = accents[look.accent];
            return (
              <Pressable key={n.id} onPress={() => open(n)} accessibilityRole="button" accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}`}
                style={({ pressed }) => [styles.row, !n.read && styles.unread, pressed && { opacity: 0.85 }]}>
                <View style={[styles.icon, { backgroundColor: a.tint }]}><Icon name={look.icon} size={22} color={a.main} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text variant="cardTitle" style={{ flex: 1 }}>{n.title}</Text>
                    {!n.read ? <View style={styles.dot} accessibilityLabel="Unread" /> : null}
                  </View>
                  <Text variant="body" color={colors.inkSoft}>{n.body}</Text>
                  <Text variant="bodyS">{ago(n.createdAt)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  unread: { borderColor: colors.ember, backgroundColor: '#FFFDFB' },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ember },
});
