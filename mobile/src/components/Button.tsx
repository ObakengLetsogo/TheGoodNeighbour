import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, components, spacing } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'regular' | 'small';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/** Primary actions are ALWAYS Olive. Labels are Title Case. */
export function Button({
  label, onPress, variant = 'primary', size = 'regular', icon, loading, disabled, fullWidth = true, style, accessibilityHint,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) => Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: colors.olive, pressed: colors.olivePressed, fg: colors.white, border: 'transparent' },
    secondary: { bg: colors.card, pressed: colors.oliveLight, fg: colors.olive, border: colors.olive },
    ghost: { bg: 'transparent', pressed: colors.oliveLight, fg: colors.olive, border: 'transparent' },
    danger: { bg: colors.card, pressed: '#F7E1E1', fg: colors.danger, border: colors.danger },
  }[variant];

  return (
    <Animated.View style={[fullWidth && { alignSelf: 'stretch' }, { transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!inactive, busy: !!loading }}
        disabled={inactive}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress?.();
        }}
        style={({ pressed }) => [
          styles.base,
          {
            height: size === 'small' ? components.button.heightSmall : components.button.height,
            backgroundColor: pressed ? palette.pressed : palette.bg,
            borderColor: palette.border,
            borderWidth: variant === 'secondary' || variant === 'danger' ? 1.5 : 0,
            opacity: inactive ? 0.5 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <>
            {icon ? <Icon name={icon} size={size === 'small' ? 18 : 20} color={palette.fg} /> : null}
            <Text variant="button" color={palette.fg} style={size === 'small' ? { fontSize: 14 } : undefined}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: components.button.radius,
    paddingHorizontal: components.button.paddingX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minWidth: components.minTouch,
  },
});
