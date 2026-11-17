import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { colors, typography } from '../theme';

export type TextVariant = Exclude<keyof typeof typography, 'serif'>;

interface Props extends RNTextProps {
  variant?: TextVariant;
  color?: string;
}

export function Text({ variant = 'body', color, style, ...rest }: Props) {
  const base: TextStyle = typography[variant];
  return <RNText {...rest} style={[base, color ? { color } : null, style]} />;
}

/**
 * Editorial heading: Urbanist ExtraBold with ONE emphasised word in Instrument Serif Italic.
 * e.g. <EditorialHeading lead="Good morning, " accent="Neighbour" trail="." />
 */
export function EditorialHeading({
  lead, accent, trail = '', variant = 'display', accentColor = colors.ember, style, numberOfLines,
}: {
  lead: string; accent: string; trail?: string; variant?: 'display' | 'displayM'; accentColor?: string;
  style?: TextStyle; numberOfLines?: number;
}) {
  const base = typography[variant];
  return (
    <RNText accessibilityRole="header" numberOfLines={numberOfLines} style={[base, style]}>
      {lead}
      <RNText style={[typography.serif, { fontSize: base.fontSize + 6, letterSpacing: -0.4, color: accentColor }]}>
        {accent}
      </RNText>
      {trail}
    </RNText>
  );
}
