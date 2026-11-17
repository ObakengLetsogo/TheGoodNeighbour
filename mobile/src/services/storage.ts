import AsyncStorage from '@react-native-async-storage/async-storage';

/** Typed, failure-tolerant wrappers: storage problems must never crash the app. */
export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* non-fatal */
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* non-fatal */
  }
}

export const KEYS = {
  session: 'tgn.session.v1',
  onboarded: 'tgn.onboarded.v1',
};
