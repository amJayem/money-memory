import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
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
import { AppText } from '@/components/AppText';
import { ScreenBackground } from '@/components/Screen';
import { useTranslation } from '@/i18n/useTranslation';

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

/** Shown instead of the real screens whenever the app is locked — the real stack never even
 * mounts underneath it, so sensitive data is never briefly present in the tree while locked. */
function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const theme = useTheme();
  const t = useTranslation('lock');
  return (
    <ScreenBackground edges={['top', 'bottom', 'left', 'right']} style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 10 }}>
      <AppText variant="title">{t('title')}</AppText>
      <AppText variant="body2" style={{ textAlign: 'center' }}>
        {t('subtitle')}
      </AppText>
      <Pressable onPress={onUnlock} style={{ marginTop: 18, backgroundColor: theme.ink, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 26 }}>
        <AppText color={theme.solid} weight="manrope700">
          {t('unlock')}
        </AppText>
      </Pressable>
    </ScreenBackground>
  );
}

function AppShell() {
  const theme = useTheme();
  const hasOnboarded = useAppStore((s) => s.settings.hasOnboarded);
  const appLockEnabled = useAppStore((s) => s.settings.appLockEnabled);
  useDailyReminderSync();
  const statusBar = <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />;

  // Starts locked whenever the feature is on — including right after
  // onboarding turns it on, so the very first launch with it enabled still
  // asks. appState tracks transitions so re-foregrounding (not just cold
  // launch) re-locks too; without it, switching to another app and back
  // would skip the lock entirely.
  const [unlocked, setUnlocked] = useState(!appLockEnabled);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!appLockEnabled) {
      setUnlocked(true);
      return;
    }
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        setUnlocked(false);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [appLockEnabled]);

  async function tryUnlock() {
    const result = await LocalAuthentication.authenticateAsync();
    // A device that loses its screen lock after enabling this (PIN/pattern/biometric removed in
    // phone settings) can't be locked behind a security method that no longer exists — treat that
    // as unlocked rather than stranding the user outside their own data with no way back in.
    const hw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = hw && (await LocalAuthentication.isEnrolledAsync());
    if (result.success || !enrolled) setUnlocked(true);
  }

  if (!hasOnboarded) {
    return (
      <>
        {statusBar}
        <OnboardingFlow />
      </>
    );
  }

  if (appLockEnabled && !unlocked) {
    return (
      <>
        {statusBar}
        <LockScreenGate onTryUnlock={tryUnlock} />
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

/** Thin wrapper so the lock prompt fires once automatically on mount (first time locked each
 * session) without also re-firing on every re-render while still locked after a failed attempt. */
function LockScreenGate({ onTryUnlock }: { onTryUnlock: () => void }) {
  useEffect(() => {
    onTryUnlock();
    // Deliberately once-per-mount: this re-mounts fresh each time the app transitions back to
    // locked (see AppShell's appLockEnabled/unlocked-driven conditional render), which is exactly
    // when an automatic prompt is wanted again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <LockScreen onUnlock={onTryUnlock} />;
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
