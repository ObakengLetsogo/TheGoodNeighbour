import { Pressable, StyleSheet, View } from 'react-native';
import { accents, colors, radii, spacing, type AccentName } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function SettingsRow({ icon, title, subtitle, onPress, accent = 'olive', right, danger }: {
  icon: IconName; title: string; subtitle?: string; onPress?: () => void; accent?: AccentName; right?: React.ReactNode; danger?: boolean;
}) {
  const a = accents[accent];
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={`${title}${subtitle ? `. ${subtitle}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <View style={[styles.icon, { backgroundColor: danger ? '#F7E1E1' : a.tint }]}><Icon name={icon} size={22} color={danger ? colors.danger : a.main} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="cardTitle" color={danger ? colors.danger : colors.ink}>{title}</Text>
        {subtitle ? <Text variant="bodyS">{subtitle}</Text> : null}
      </View>
      {right}
      {onPress ? <Icon name="chevron-right" size={22} color={colors.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 64 },
  icon: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
});
