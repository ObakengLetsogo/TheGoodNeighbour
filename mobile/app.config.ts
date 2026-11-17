import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Build variants (set by the EAS build profiles in eas.json):
 *   development  local dev and dev-client builds. May talk to http://localhost or a LAN address.
 *   preview      internal test builds (TestFlight / APK). Must use an https API.
 *   production   store builds. Must use an https API.
 * Locally, with no APP_VARIANT, you get "development".
 */
const variant = process.env.APP_VARIANT ?? 'development';
const dev = variant === 'development';
const suffix = dev ? '.dev' : variant === 'preview' ? '.preview' : '';
const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

// Never ship a phone build that points at localhost or plain http.
if (!dev && !apiUrl.startsWith('https://')) {
  throw new Error(`EXPO_PUBLIC_API_BASE_URL must be an https:// URL for ${variant} builds (got "${apiUrl}"). Set it with: eas env:create`);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: dev ? 'TGN (Dev)' : variant === 'preview' ? 'TGN (Preview)' : 'TGN',
  slug: 'tgn',
  scheme: 'tgn',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    // TODO before the first store submission: confirm this identifier. It is permanent once an app is published.
    bundleIdentifier: `za.co.thegoodneighbour.tgn${suffix}`,
    buildNumber: '1',
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: `za.co.thegoodneighbour.tgn${suffix}`,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#F4F5EE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png', bundler: 'metro' },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-image',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#F4F5EE' }],
    // Android blocks plain-http traffic in release builds; only development builds may talk to a local server.
    ['expo-build-properties', { android: { usesCleartextTraffic: dev } }],
  ],
});
