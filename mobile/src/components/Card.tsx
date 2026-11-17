import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { accents, colors, components, radii, shadows, spacing, type AccentName } from '../theme';
import { Text } from './Text';

interface Props {
  children: React.ReactNode;
  /** Colours the folder tab. Accents are identity colours only. */
  accent?: AccentName;
  /** Text shown on the folder tab. */
  tabLabel?: string;
  /** Hide the tab for dense lists. */
  noTab?: boolean;
  onPress?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * The signature TGN surface: a card with a folder tab at its top-left corner.
 */
export function Card({
  children, accent = 'olive', tabLabel, noTab, onPress, padded = true, style, accessibilityLabel, accessibilityHint,
}: Props) {
  const a = accents[accent];
  const body = (
    <View style={[styles.wrap, style]}>
      {noTab ? null : (
        <View style={[styles.tab, { backgroundColor: a.main, borderColor: a.main }]}>
          {tabLabel ? (
            <Text variant="eyebrow" color={accent === 'gold' ? colors.ink : colors.white} style={styles.tabText} numberOfLines={1}>
              {tabLabel}
            </Text>
          ) : <View style={styles.dot} />}
        </View>
      )}
      <View
        style={[
          styles.body,
          padded && { padding: spacing.lg },
          noTab && { borderTopLeftRadius: components.card.radius },
        ]}
      >
        {children}
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.995 : 1 }] })}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  tab: {
    alignSelf: 'flex-start',
    height: components.card.tabHeight,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: components.card.tabRadius,
    borderTopRightRadius: components.card.tabRadius,
    borderWidth: components.card.borderWidth,
    borderBottomWidth: 0,
    borderColor: colors.border,
    marginBottom: -1,
    zIndex: 1,
  },
  tabText: { fontSize: 11, lineHeight: 14 },
  dot: { width: 22, height: 6, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.7)' },
  body: {
    backgroundColor: colors.card,
    borderWidth: components.card.borderWidth,
    borderColor: colors.border,
    borderTopLeftRadius: 0,
    borderTopRightRadius: components.card.radius,
    borderBottomLeftRadius: components.card.radius,
    borderBottomRightRadius: components.card.radius,
    overflow: 'hidden',
    ...shadows.card,
  },
});
