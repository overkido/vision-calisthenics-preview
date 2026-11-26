import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Browser from 'expo-web-browser';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const browser = Platform.OS === 'web';
const storage = browser ? AsyncStorage : {
  getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync, removeItem: SecureStore.deleteItemAsync,
};
export const backend = url && key && (typeof window !== 'undefined' || !browser) ? createClient(url, key, {
  auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce', lock: processLock },
}) : null;

export function redirectUrl(recovery = false) {
  if (browser) return recovery ? new URL('?recovery=1', window.location.href).href : window.location.href.split(/[?#]/)[0];
  return Linking.createURL(recovery ? 'reset' : 'auth', { scheme: 'visioncalisthenics' });
}
let lastUrl = '';
export async function finishAuth(url: string) {
  if (!backend || lastUrl === url) return;
  const params = Linking.parse(url).queryParams;
  if (typeof params?.error_description === 'string') throw new Error(params.error_description);
  if (typeof params?.code !== 'string') return;
  lastUrl = url;
  if (browser) window.history.replaceState({}, '', window.location.pathname + (params.recovery === '1' ? '?recovery=1' : ''));
  const { error } = await backend.auth.exchangeCodeForSession(params.code);
  if (error) throw error;
}
export async function social(provider: 'google' | 'apple') {
  if (!backend) throw new Error('A conexão Supabase precisa ser configurada.');
  const redirectTo = redirectUrl();
  const { data, error } = await backend.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: !browser } });
  if (error) throw error;
  if (!browser && data.url) {
    const result = await Browser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') await finishAuth(result.url);
  }
}
