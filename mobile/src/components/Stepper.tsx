import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, components, radii, spacing } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export function Stepper({
  value, onChange, min = 0, max = 99, label,
}: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  const set = (n: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(Math.max(min, Math.min(max, n)));
  };
  return (
    <View style={styles.wrap} accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: String(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}>
      <Pressable onPress={() => set(value - 1)} disabled={value <= min} style={[styles.btn, value <= min && { opacity: 0.35 }]} hitSlop={4} accessibilityLabel={`Decrease ${label}`}>
        <Icon name={value <= 1 && min === 0 ? 'trash-can-outline' : 'minus'} size={18} color={colors.olive} />
      </Pressable>
      <Text variant="cardTitle" style={styles.value}>{value}</Text>
      <Pressable onPress={() => set(value + 1)} disabled={value >= max} style={[styles.btn, value >= max && { opacity: 0.35 }]} hitSlop={4} accessibilityLabel={`Increase ${label}`}>
        <Icon name="plus" size={18} color={colors.olive} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.oliveLight, borderRadius: radii.pill },
  btn: { width: components.minTouch - 4, height: components.minTouch - 4, alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 28, textAlign: 'center', paddingHorizontal: spacing.xs },
});
