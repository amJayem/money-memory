import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
// Imported from each weight's own subpath (not the package root) so Metro
// only bundles the 6 font files we actually use, not all ~22 weights the
// packages ship — the root index re-exports every weight unconditionally.
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/appStore';
import { OnboardingFlow } from '@/screens/onboarding/OnboardingFlow';
import { ToastHost } from '@/components/ToastHost';
import { CustomTabBar } from '@/components/CustomTabBar';
import { useDailyReminderSync } from '@/hooks/useDailyReminderSync';

SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedStack() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sheet" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="entry/[type]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

function AppShell() {
  const theme = useTheme();
  const hasOnboarded = useAppStore((s) => s.settings.hasOnboarded);
  useDailyReminderSync();
  const statusBar = <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />;
  if (!hasOnboarded) {
    return (
      <>
        {statusBar}
        <OnboardingFlow />
      </>
    );
  }
  return (
    <>
      {statusBar}
      <ThemedStack />
      <CustomTabBar />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);
  const appearance = useAppStore((s) => s.settings.appearance);
  const accentTheme = useAppStore((s) => s.settings.accentTheme);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (fontsLoaded && hydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, hydrated]);

  if (!fontsLoaded || !hydrated) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider appearance={appearance} accent={accentTheme}>
        <AppShell />
        <ToastHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
