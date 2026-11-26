import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as Splash from 'expo-splash-screen';
import { Montserrat_400Regular } from '@expo-google-fonts/montserrat/400Regular';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat/700Bold';
import { useEffect } from 'react';
import { colors } from '../src/theme';

void Splash.preventAutoHideAsync();
export default function Layout() {
  const [loaded, error] = useFonts({ Montserrat_400Regular, Montserrat_700Bold });
  useEffect(() => { if (loaded || error) void Splash.hideAsync(); }, [loaded, error]);
  if (!loaded && !error) return null;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.obsidian } }} />;
}
