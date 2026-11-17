/**
 * Environment-based configuration from EXPO_PUBLIC_* variables (see .env.example).
 * Each must be read as a literal `process.env.EXPO_PUBLIC_X`: Expo only inlines it that way.
 */
export const config = {
  /** When set, the app talks to the TGN backend. When empty, bundled mock services are used. */
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, ''),
  /** Digits only, international format without "+", e.g. 27821234567. */
  supportWhatsApp: process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? '',
  supportPhone: process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '',
  /** Dev flag exposed in the UI so nobody mistakes mock data for production. */
  get usingMocks() {
    return this.apiBaseUrl === '';
  },
};
