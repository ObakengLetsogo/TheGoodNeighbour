import Svg, { Circle, ClipPath, Defs, Path, Text as SvgText } from 'react-native-svg';
import { View } from 'react-native';
import { spacing } from '../theme';
import { Text } from './Text';

/**
 * The TGN mark: two neighbours (Ember Orange and Olive) as interlocking speech-bubble figures.
 * Geometry was traced from the approved logo artwork; the orange passes over the olive at the top
 * and the olive passes back over the orange at the bottom left.
 */
export const LOGO_ORANGE = '#D45B38';
export const LOGO_OLIVE = '#4A5728';
const ORANGE_PATH = 'M118.5 327.5L60.9 380.5Q35.8 403.8 35.8 369.5L35.8 236.2A112.8 112.8 0 0 1 261.2 236.2L261.2 236.2A77.5 77.5 0 0 1 108.9 256.3';
const OLIVE_PATH = 'M319 392L370.9 441Q395.8 464.5 395.8 430.2L395.8 294.5A115 115 0 0 0 165.8 294.5L165.8 294.5A84.5 84.5 0 0 0 324.5 334.8';

/** @param size height in px; width follows the artwork's proportions. */
export function LogoMark({ size = 72 }: { size?: number }) {
  const w = (size * 406) / 462;
  const stroke = { fill: 'none' as const, strokeWidth: 36.2, strokeLinejoin: 'round' as const };
  return (
    <Svg width={w} height={size} viewBox="12 12 406 462" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <ClipPath id="tgn-weave"><Circle cx={167} cy={311} r={38} /></ClipPath>
      </Defs>
      <Circle cx={111} cy={60} r={43} fill={LOGO_ORANGE} />
      <Circle cx={310} cy={114} r={39} fill={LOGO_OLIVE} />
      <Path d={OLIVE_PATH} stroke={LOGO_OLIVE} {...stroke} />
      <Circle cx={324.5} cy={334.8} r={18.1} fill={LOGO_OLIVE} />
      <Path d={ORANGE_PATH} stroke={LOGO_ORANGE} {...stroke} />
      <Circle cx={108.9} cy={256.3} r={18.1} fill={LOGO_ORANGE} />
      <Path d={OLIVE_PATH} stroke={LOGO_OLIVE} {...stroke} clipPath="url(#tgn-weave)" />
    </Svg>
  );
}

/** Full lockup: mark, TGN, The Good Neighbour. (The rule and tagline are added by the splash/welcome screens.) */
export function Logo({ size = 72, showName = false, align = 'center' }: { size?: number; showName?: boolean; align?: 'center' | 'flex-start' }) {
  return (
    <View style={{ alignItems: align, gap: spacing.sm }} accessible accessibilityLabel="TGN, The Good Neighbour">
      <LogoMark size={size} />
      <Wordmark size={size} />
      {showName ? (
        <Text variant="body" style={{ fontSize: Math.max(16, size * 0.235), letterSpacing: -0.4 }}>
          The <Text variant="cardTitle" style={{ fontFamily: 'Urbanist_800ExtraBold', fontSize: Math.max(16, size * 0.235) }}>Good</Text>Neighbour
        </Text>
      ) : null}
    </View>
  );
}

const INK = '#16171D';

/**
 * "TGN" in Urbanist Black, drawn as SVG so it can be made sturdier than the font alone allows: a round outline of the same ink
 * thickens every stroke, and the letters are stretched a little wider so they sit squat and solid under the mark.
 */
function Wordmark({ size }: { size: number }) {
  const fs = size * 0.86, h = fs * 0.78, w = size * 1.8, stroke = size * 0.032;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgText x={w / 2} y={h * 0.97} fontSize={fs} fontFamily="Urbanist_900Black" fontWeight="900" fill={INK} stroke={INK} strokeWidth={stroke} strokeLinejoin="round"
        textAnchor="middle" textLength={w - stroke * 2} lengthAdjust="spacingAndGlyphs">TGN</SvgText>
    </Svg>
  );
}
