import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as Splash from 'expo-splash-screen';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { useEffect } from 'react';
import { colors } from '../src/theme';

void Splash.preventAutoHideAsync();
export default function Layout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_600SemiBold, Poppins_600SemiBold, Poppins_700Bold });
  useEffect(() => { if (loaded || error) void Splash.hideAsync(); }, [loaded, error]);
  if (!loaded && !error) return null;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.obsidian } }} />;
}
