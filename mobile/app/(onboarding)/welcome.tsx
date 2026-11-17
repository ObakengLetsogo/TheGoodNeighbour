import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Logo } from '../../src/components/Logo';
import { Text } from '../../src/components/Text';
import { colors, radii, spacing } from '../../src/theme';

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xxl, paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm }]}>
      <View style={[styles.blob, { backgroundColor: colors.ember, top: -90, right: -90, opacity: 0.1 }]} />
      <View style={[styles.blob, { backgroundColor: colors.olive, bottom: 120, left: -120, opacity: 0.08, width: 300, height: 300 }]} />

      <Animated.View style={[styles.hero, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <Logo size={96} showName />
        <View style={styles.rule} />
        <Text style={styles.tagline}>Here when it matters.</Text>
        <Text variant="body" color={colors.muted} style={styles.support}>
          Life brings us together in important moments. We're here to make organising what you need a little easier.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.actions, { opacity: fade }]}>
        <Button label="Create Account" onPress={() => router.push('/(onboarding)/register')} />
        <Button label="Sign In" variant="secondary" onPress={() => router.push('/(onboarding)/sign-in')} />
        <Button label="Continue With Phone Number" variant="ghost" icon="phone-outline" onPress={() => router.push('/(onboarding)/sign-in')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl, justifyContent: 'space-between', overflow: 'hidden' },
  blob: { position: 'absolute', width: 260, height: 260, borderRadius: radii.pill },
  hero: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  rule: { width: 56, height: 4, borderRadius: radii.pill, backgroundColor: colors.olive, marginTop: spacing.md },
  tagline: { fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 34, lineHeight: 40, color: colors.inkSoft, marginTop: spacing.xs },
  support: { textAlign: 'center', maxWidth: 320, marginTop: spacing.xs },
  actions: { gap: spacing.md },
});
