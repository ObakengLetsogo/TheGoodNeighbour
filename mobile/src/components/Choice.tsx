import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

/** A selectable card with a title and a sentence of explanation, for choosing one of a few options. */
export function Choice({ selected, title, text, onPress, disabled }: { selected: boolean; title: string; text: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="radio" accessibilityState={{ selected, disabled: !!disabled }} accessibilityLabel={`${title}. ${text}`}
      style={[styles.choice, selected && { borderColor: colors.olive, backgroundColor: colors.oliveLight }, disabled && { opacity: 0.6 }]}>
      <Icon name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={selected ? colors.olive : colors.muted} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="cardTitle">{title}</Text>
        <Text variant="bodyS" color={colors.inkSoft}>{text}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md },
});
