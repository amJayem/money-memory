import { useEffect } from 'react';
import { useFonts, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/appStore';
import { OnboardingFlow } from '@/screens/onboarding/OnboardingFlow';
import { ToastHost } from '@/components/ToastHost';

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
  const hasOnboarded = useAppStore((s) => s.settings.hasOnboarded);
  return hasOnboarded ? <ThemedStack /> : <OnboardingFlow />;
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
