import { useRef, useState, type ComponentRef, type RefObject } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { isoFromParts } from '../lib/saId';
import { colors, components, fonts, spacing } from '../theme';
import { Text } from './Text';

/** Day / month / year entry. Calls onChange with an ISO date when valid, or '' while incomplete. */
type InputRef = ComponentRef<typeof TextInput>;

export function DateField({ label, onChange, error, hint }: { label: string; onChange: (iso: string) => void; error?: string; hint?: string }) {
  const [d, setD] = useState('');
  const [m, setM] = useState('');
  const [y, setY] = useState('');
  const mRef = useRef<InputRef>(null);
  const yRef = useRef<InputRef>(null);

  const emit = (dd: string, mm: string, yy: string) => onChange(isoFromParts(dd, mm, yy) ?? '');
  const digits = (t: string, max: number) => t.replace(/\D/g, '').slice(0, max);

  const box = (value: string, placeholder: string, width: number, ref: RefObject<InputRef | null> | undefined, set: (v: string) => void, max: number, next?: RefObject<InputRef | null>, a11y?: string) => (
    <TextInput
      ref={ref}
      value={value}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      keyboardType="number-pad"
      maxLength={max}
      accessibilityLabel={`${label}, ${a11y}`}
      onChangeText={(t) => {
        const v = digits(t, max);
        set(v);
        if (v.length === max) next?.current?.focus();
      }}
      style={[styles.box, { width }]}
    />
  );

  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" color={colors.inkSoft}>{label}</Text>
      <View style={styles.row}>
        {box(d, 'DD', 64, undefined, (v) => { setD(v); emit(v, m, y); }, 2, mRef, 'day')}
        {box(m, 'MM', 64, mRef, (v) => { setM(v); emit(d, v, y); }, 2, yRef, 'month')}
        {box(y, 'YYYY', 96, yRef, (v) => { setY(v); emit(d, m, v); }, 4, undefined, 'year')}
      </View>
      {error ? <Text variant="bodyS" color={colors.danger} accessibilityLiveRegion="polite">{error}</Text> : hint ? <Text variant="bodyS">{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  box: { height: components.input.height, backgroundColor: components.input.background, borderRadius: components.input.radius, textAlign: 'center', fontFamily: fonts.regular, fontSize: 16, color: colors.ink, outlineStyle: 'none' as never },
});
