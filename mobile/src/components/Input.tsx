import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, components, fonts, radii, spacing } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  prefix?: string;
  optional?: boolean;
}

export type InputRef = ComponentRef<typeof TextInput>;

export const Input = forwardRef<InputRef, Props>(function Input(
  { label, error, hint, prefix, optional, secureTextEntry, style, multiline, ...rest }, ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" color={colors.inkSoft}>
        {label}
        {optional ? <Text variant="label"> (Optional)</Text> : null}
      </Text>
      <View
        style={[
          styles.field,
          multiline && { height: undefined, minHeight: 96, alignItems: 'flex-start', paddingVertical: spacing.md },
          focused && { borderColor: colors.olive, backgroundColor: colors.card },
          !!error && { borderColor: colors.danger },
        ]}
      >
        {prefix ? <Text variant="body" color={colors.inkSoft} style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          secureTextEntry={hidden}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.muted}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          style={[styles.input, multiline && { textAlignVertical: 'top' }, style]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="bodyS" color={colors.danger} accessibilityLiveRegion="polite">{error}</Text>
      ) : hint ? (
        <Text variant="bodyS">{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    height: components.input.height,
    backgroundColor: components.input.background,
    borderRadius: components.input.radius,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prefix: { fontFamily: fonts.semibold, paddingRight: spacing.sm, borderRightWidth: 1, borderRightColor: colors.border },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.ink, paddingVertical: 0, outlineStyle: 'none' as never },
});

export const radiusPill = radii.pill;
