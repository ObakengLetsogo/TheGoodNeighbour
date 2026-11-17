/** Environment-based configuration. All values come from EXPO_PUBLIC_* variables (see .env.example). */
const env = process.env;

export const config = {
  /** When set, the app talks to the TGN backend. When empty, bundled mock services are used. */
  apiBaseUrl: (env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, ''),
  /** Digits only, international format without "+", e.g. 27821234567. */
  supportWhatsApp: env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? '',
  supportPhone: env.EXPO_PUBLIC_SUPPORT_PHONE ?? '',
  /** Dev flag exposed in the UI so nobody mistakes mock data for production. */
  get usingMocks() {
    return this.apiBaseUrl === '';
  },
};
