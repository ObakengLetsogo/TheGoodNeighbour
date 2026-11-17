import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, components, radii, spacing } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  /** Reserve room for a bottom tab bar or sticky footer. */
  footer?: React.ReactNode;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  top?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function Screen({ children, scroll = true, footer, padded = true, contentStyle, top = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const pad = padded ? components.screen.paddingX : 0;
  return (
    <View style={[styles.root, { paddingTop: top ? insets.top : 0 }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ paddingHorizontal: pad, paddingBottom: spacing.xxl }, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingHorizontal: pad }, contentStyle]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>{footer}</View>
      ) : null}
    </View>
  );
}

export function ScreenHeader({ title, right, onBack, large }: { title?: string; right?: React.ReactNode; onBack?: () => void; large?: boolean }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Icon name="chevron-left" size={26} />
      </Pressable>
      {title ? (
        <Text variant={large ? 'section' : 'cardTitle'} style={{ flex: 1 }} numberOfLines={1} accessibilityRole="header">{title}</Text>
      ) : <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text variant="section" accessibilityRole="header">{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${actionLabel}, ${title}`}>
          <Text variant="label" color={colors.olive} style={{ fontFamily: 'Urbanist_600SemiBold' }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  footer: {
    paddingHorizontal: components.screen.paddingX,
    paddingTop: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 56 },
  back: {
    width: components.minTouch, height: components.minTouch, borderRadius: radii.pill,
    alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm,
  },
  section: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
});
