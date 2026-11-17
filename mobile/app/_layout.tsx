import {
  Urbanist_400Regular, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold, Urbanist_800ExtraBold, Urbanist_900Black,
} from '@expo-google-fonts/urbanist';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/store/AuthContext';
import { CoverProvider } from '../src/store/CoverContext';
import { OptionsProvider } from '../src/store/OptionsContext';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Routes() {
  const { ready, user } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Urbanist_400Regular, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold, Urbanist_800ExtraBold, Urbanist_900Black,
    InstrumentSerif_400Regular_Italic,
  });
  const done = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (done) SplashScreen.hideAsync().catch(() => {});
  }, [done]);

  if (!done) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(onboarding)" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="builder" />
        <Stack.Screen name="cancel-cover" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="verify-phone" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings/password" />
        <Stack.Screen name="settings/phone" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/delete" />
        <Stack.Screen name="legal/[slug]" />
        <Stack.Screen name="legal/key-facts" />
        <Stack.Screen name="schedule/[id]" />
        <Stack.Screen name="policy/[id]" />
        <Stack.Screen name="add-member" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="claim/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="claim/[id]" />
        <Stack.Screen name="support/request" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <AuthProvider>
          <OptionsProvider>
            <CoverProvider>
              <StatusBar style="dark" />
              <Routes />
            </CoverProvider>
          </OptionsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
