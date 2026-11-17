/**
 * Environment-based configuration from EXPO_PUBLIC_* variables (see .env.example).
 * Each must be read as a literal `process.env.EXPO_PUBLIC_X`: Expo only inlines it that way.
 */
export const config = {
  /** The TGN backend. On a physical device use your computer's LAN address instead of localhost. */
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, ''),
  /** Digits only, international format without "+", e.g. 27821234567. */
  supportWhatsApp: process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? '',
  supportPhone: process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '',
};
