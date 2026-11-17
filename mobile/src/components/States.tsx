import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { accents, colors, radii, spacing, type AccentName } from '../theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function Skeleton({ height = 16, width = '100%', radius = radii.sm, style }: { height?: number; width?: number | `${number}%`; radius?: number; style?: ViewStyle }) {
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: colors.fill, opacity: o }, style]} />;
}

export function LoadingState({ rows = 3, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <View accessible accessibilityLabel={label} accessibilityRole="progressbar" style={{ gap: spacing.lg }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skel}>
          <Skeleton height={96} radius={radii.md} />
          <Skeleton height={18} width="60%" />
          <Skeleton height={14} width="85%" />
        </View>
      ))}
    </View>
  );
}

interface MessageProps {
  icon: IconName;
  title: string;
  message: string;
  accent?: AccentName;
  actionLabel?: string;
  onAction?: () => void;
}

function Message({ icon, title, message, accent = 'olive', actionLabel, onAction }: MessageProps) {
  const a = accents[accent];
  return (
    <View style={styles.center} accessible={false}>
      <View style={[styles.badge, { backgroundColor: a.tint }]}>
        <Icon name={icon} size={34} color={a.main} />
      </View>
      <Text variant="section" style={{ textAlign: 'center' }} accessibilityRole="header">{title}</Text>
      <Text variant="body" color={colors.muted} style={{ textAlign: 'center', maxWidth: 300 }}>{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} fullWidth={false} style={{ marginTop: spacing.sm }} /> : null}
    </View>
  );
}

export const EmptyState = (p: MessageProps) => <Message {...p} />;

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <Message
      icon="cloud-off-outline"
      accent="ember"
      title="That didn't go to plan"
      message={message ?? 'Something got in the way. Please try again in a moment.'}
      actionLabel={onRetry ? 'Try Again' : undefined}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  skel: { gap: spacing.sm },
  center: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl },
  badge: { width: 76, height: 76, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
});
