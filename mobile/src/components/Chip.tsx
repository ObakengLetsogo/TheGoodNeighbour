import { Pressable, StyleSheet } from 'react-native';
import { colors, components, radii, spacing } from '../theme';
import { Text } from './Text';

export function Chip({ label, selected, onPress, disabled }: { label: string; selected?: boolean; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      accessibilityLabel={label}
      style={[styles.chip, selected && styles.selected, disabled && { opacity: 0.45 }]}
    >
      <Text variant="label" color={selected ? colors.white : colors.inkSoft} style={{ fontFamily: 'Urbanist_600SemiBold' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Badge({ label, color = colors.inkSoft, bg = colors.fill }: { label: string; color?: string; bg?: string }) {
  return (
    <Text variant="eyebrow" color={color} style={[styles.badge, { backgroundColor: bg }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: components.minTouch - 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.olive, borderColor: colors.olive },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill, overflow: 'hidden', alignSelf: 'flex-start', letterSpacing: 0.3 },
});
