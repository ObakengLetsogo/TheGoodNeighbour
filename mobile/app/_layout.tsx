import {
  Urbanist_400Regular, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold, Urbanist_800ExtraBold,
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
import { BasketProvider } from '../src/store/BasketContext';
import { CatalogProvider } from '../src/store/CatalogContext';
import { OrdersProvider } from '../src/store/OrdersContext';
import { RecentsProvider } from '../src/store/RecentsContext';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Routes() {
  const { ready, user } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Urbanist_400Regular, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold, Urbanist_800ExtraBold,
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
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="package/[id]" />
        <Stack.Screen name="basket" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="order/[id]" />
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
          <CatalogProvider>
            <BasketProvider>
              <OrdersProvider>
                <RecentsProvider>
                  <StatusBar style="dark" />
                  <Routes />
                </RecentsProvider>
              </OrdersProvider>
            </BasketProvider>
          </CatalogProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
