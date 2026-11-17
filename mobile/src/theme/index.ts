import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * TGN design tokens. Every colour, size, radius and shadow in the app comes from here.
 */
export const colors = {
  // Primary
  olive: '#4A5728',
  olivePressed: '#3A451F',
  oliveLight: '#E4E8D4',
  olivePale: '#CDD6A8',
  ink: '#15171C',
  inkSoft: '#2A2D34',
  background: '#F4F5EE',
  card: '#FAFBF6',

  // Neutrals
  muted: '#62656E',
  border: '#DCDFD2',
  fill: '#E7E9DF',
  white: '#FFFFFF',

  // Identity accents — never used for primary actions
  ember: '#D45B38',
  berry: '#CD1364',
  gold: '#EBB111',

  // Status
  success: '#2F8A5A',
  warning: '#B7791F',
  danger: '#C53030',
} as const;

export type AccentName = 'ember' | 'berry' | 'gold' | 'olive';

/** Accent + a soft tint used behind icons and tabs. */
export const accents: Record<AccentName, { main: string; tint: string }> = {
  ember: { main: colors.ember, tint: '#F6DDD3' },
  berry: { main: colors.berry, tint: '#F5D3E2' },
  gold: { main: colors.gold, tint: '#F8EAC2' },
  olive: { main: colors.olive, tint: colors.oliveLight },
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

/** The only radii used in the app. */
export const radii = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const fonts = {
  regular: 'Urbanist_400Regular',
  medium: 'Urbanist_500Medium',
  semibold: 'Urbanist_600SemiBold',
  bold: 'Urbanist_700Bold',
  extrabold: 'Urbanist_800ExtraBold',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
} as const;

export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 38, letterSpacing: -1.2, color: colors.ink },
  displayM: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -0.9, color: colors.ink },
  section: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: colors.ink },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.1, color: colors.ink },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, color: colors.white },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.inkSoft },
  bodyS: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, color: colors.muted },
  price: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: colors.ink },
  serif: { fontFamily: fonts.serifItalic, fontWeight: '400' as const },
} satisfies Record<string, TextStyle>;

const shadow = (opacity: number, radius: number, y: number, elevation: number): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: { shadowColor: '#15171C', shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: y } },
    android: { elevation },
    default: { boxShadow: `0px ${y}px ${radius * 2}px rgba(21,23,28,${opacity})` } as ViewStyle,
  });

/** Shadows are deliberately subtle. */
export const shadows = {
  none: {} as ViewStyle,
  card: shadow(0.05, 6, 2, 1),
  raised: shadow(0.1, 12, 6, 4),
};

/** Component-level tokens. */
export const components = {
  button: { height: 52, heightSmall: 40, radius: radii.pill, paddingX: spacing.xl },
  input: { height: 52, radius: radii.md, background: colors.fill },
  card: { radius: radii.md, tabHeight: 22, tabRadius: radii.sm, borderWidth: 1 },
  screen: { paddingX: spacing.lg },
  tabBar: { height: 64 },
  minTouch: 44,
};

export const theme = { colors, accents, spacing, radii, fonts, typography, shadows, components };
export type Theme = typeof theme;
