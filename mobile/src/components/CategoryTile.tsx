import { Pressable, StyleSheet, View } from 'react-native';
import { accents, colors, radii, spacing } from '../theme';
import type { Category } from '../types';
import { Icon } from './Icon';
import { Text } from './Text';

export function CategoryTile({ category, onPress, width }: { category: Category; onPress: () => void; width: number }) {
  const a = accents[category.accent];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}. ${category.blurb}`}
      style={({ pressed }) => [styles.tile, { width, backgroundColor: a.tint, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.icon}>
        <Icon name={category.icon} size={24} color={a.main} />
      </View>
      <Text variant="cardTitle" numberOfLines={2} style={{ fontSize: 15, lineHeight: 19 }}>{category.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radii.md, padding: spacing.md, gap: spacing.md, minHeight: 112, justifyContent: 'space-between' },
  icon: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
});
