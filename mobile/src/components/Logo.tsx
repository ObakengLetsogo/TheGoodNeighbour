import Svg, { Circle, Path } from 'react-native-svg';
import { View } from 'react-native';
import { colors, spacing } from '../theme';
import { Text } from './Text';

/** Two interlocking neighbours: Ember Orange and Olive. */
export function LogoMark({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={30} cy={12} r={7} fill={colors.ember} />
      <Circle cx={55} cy={20} r={7} fill={colors.olive} />
      {/* olive neighbour (behind) */}
      <Path d="M42 64 V46 A15 15 0 0 1 72 46 V64" stroke={colors.olive} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* ember neighbour */}
      <Path d="M10 64 V42 A17 17 0 0 1 44 42" stroke={colors.ember} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* weave: olive passes back over ember */}
      <Path d="M42 52 V46" stroke={colors.olive} strokeWidth={8} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function Logo({ size = 72, showName = false, align = 'center' }: { size?: number; showName?: boolean; align?: 'center' | 'flex-start' }) {
  return (
    <View style={{ alignItems: align, gap: spacing.sm }} accessible accessibilityLabel="TGN, The Good Neighbour">
      <LogoMark size={size} />
      <Text variant="display" style={{ fontSize: size * 0.62, lineHeight: size * 0.68, letterSpacing: -2 }}>TGN</Text>
      {showName ? (
        <Text variant="body" style={{ fontSize: 17 }}>
          The <Text variant="cardTitle" style={{ fontFamily: 'Urbanist_800ExtraBold' }}>Good</Text>Neighbour
        </Text>
      ) : null}
    </View>
  );
}
