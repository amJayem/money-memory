import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme/ThemeProvider';
import { useNavBarStore } from '@/store/navBarStore';
import { useAppStore } from '@/store/appStore';
import { AppText } from './AppText';

const TABS = [
  { path: '/', name: 'index', glyph: '⌂', label: 'Home' },
  { path: '/history', name: 'history', glyph: '≡', label: 'History' },
  { path: '/loans', name: 'loans', glyph: '⚖', label: 'Loans' },
  { path: '/stats', name: 'stats', glyph: '▦', label: 'Stats' },
] as const;

// Shared with Screen.tsx so the scroll container's bottom padding is measured
// against the bar's real geometry instead of a guessed constant. Sized for
// the taller (classic) bar so it's a safe overestimate for the floating one.
export const TAB_BAR_CONTENT_HEIGHT = 62; // paddingTop 9 + tab minHeight 44 + paddingBottom 9, excluding the safe-area inset
export const FAB_CLEARANCE = 94; // FAB's top edge sits 36 (its own bottom offset) + 58 (height) above the safe-area line

/**
 * 5-slot bar (Home · History · FAB gap · Loans · Stats) — the FAB is a
 * sibling overlay, not a tab (§1, §6). Mounted once at the root so it's
 * present on every screen, not only the four tab routes; a scrollable
 * screen can hide/reveal it via useHideNavBarOnScroll + useNavBarStore.
 *
 * Two visual shells share this same routing/show-hide logic — "classic"
 * (edge-to-edge bar with labels) and "floating" (a rounded pill with side
 * margins and icon-only tabs, chosen in Settings → Navigation style).
 */
export function CustomTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const navStyle = useAppStore((s) => s.settings.navStyle);
  const visible = useNavBarStore((s) => s.visible);
  const show = useNavBarStore((s) => s.show);

  // The entry form and the action sheet are full-screen/bottom-sheet modals
  // with their own bottom-anchored controls (keypad + Save, the option list)
  // — a persistent nav bar would overlap them, so it never renders there.
  const isModalRoute = pathname === '/sheet' || pathname.startsWith('/entry/');

  const translateY = useRef(new Animated.Value(0)).current;
  const barHeight = 64 + insets.bottom;

  useEffect(() => {
    Animated.timing(translateY, { toValue: visible && !isModalRoute ? 0 : barHeight + 40, duration: 220, useNativeDriver: true }).start();
  }, [visible, isModalRoute, translateY, barHeight]);

  // A screen outside the four tab routes (Settings, Accounts, Budget, …)
  // doesn't drive show/hide itself — always show the bar there rather than
  // risk it staying hidden after navigating away from a scrolled-down tab.
  useEffect(() => {
    if (!TABS.some((t) => t.path === pathname)) show();
  }, [pathname, show]);

  if (isModalRoute) return null;

  return navStyle === 'floating' ? (
    <FloatingBar translateY={translateY} pathname={pathname} router={router} insets={insets} />
  ) : (
    <ClassicBar translateY={translateY} pathname={pathname} router={router} insets={insets} />
  );
}

interface BarProps {
  translateY: Animated.Value;
  pathname: string;
  router: ReturnType<typeof useRouter>;
  insets: { bottom: number };
}

function ClassicBar({ translateY, pathname, router, insets }: BarProps) {
  const theme = useTheme();
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  function renderTab(tab: (typeof TABS)[number]) {
    const focused = pathname === tab.path;
    const color = focused ? theme.accentColor : theme.ink3;
    return (
      <Pressable key={tab.name} onPress={() => router.navigate(tab.path)} style={styles.tab}>
        <AppText style={{ fontSize: 19, color }}>{tab.glyph}</AppText>
        <AppText variant="body2" weight="manrope600" color={color} style={{ marginTop: 3, fontSize: 10 }}>
          {tab.label}
        </AppText>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY }] }]} pointerEvents="box-none">
      <View style={styles.barContainer}>
        {Platform.OS === 'web' ? (
          <>
            <BlurView intensity={50} tint={theme.mode} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface2 }]} />
          </>
        ) : (
          // Native blur (expo-blur's dimezisBlurView) is avoided app-wide — see
          // GlassCard — so this renders as a near-opaque solid fill instead.
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.solid, opacity: theme.mode === 'dark' ? 0.96 : 0.98 }]} />
        )}
        <View style={[styles.row, { borderTopColor: theme.line, paddingBottom: 9 + insets.bottom }]}>
          {left.map(renderTab)}
          <View style={styles.fabGap} />
          {right.map(renderTab)}
        </View>
      </View>
      <Pressable onPress={() => router.push('/sheet')} style={[styles.fab, { backgroundColor: theme.accentColor, shadowColor: theme.lift.shadowColor, bottom: insets.bottom + 36 }]}>
        <AppText color="#fff" style={{ fontSize: 26, marginTop: -2 }}>
          +
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

// A flat (non-gradient) translucent tint for the Android/no-real-blur path.
// GlassCard's fix showed the artifact came from a translucent *gradient*
// behind text (Android's renderer samples one assumed backdrop color and
// the two gradient stops disagree with it); a single flat color has no such
// disagreement, so it's safe to keep this one translucent for the frosted
// look without reintroducing that bug.
function pillTint(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? 'rgba(17,26,49,0.82)' : 'rgba(255,255,255,0.82)';
}

/**
 * A rounded, inset "pill" bar — icons only, the active one sitting inside a
 * filled rounded-square highlight, floating above the safe-area edge with
 * side margins instead of running edge-to-edge.
 *
 * True frosted blur (iOS's real, hardware-backed blur) is used where it's
 * safe. On Android, expo-blur's only real blur mode ('dimezisBlurView')
 * previously crashed the render thread during screen transitions — see
 * GlassCard — so Android instead gets a flat translucent tint: it reads as
 * "glassy" without the risk.
 */
function FloatingBar({ translateY, pathname, router, insets }: BarProps) {
  const theme = useTheme();
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  function renderTab(tab: (typeof TABS)[number]) {
    const focused = pathname === tab.path;
    return (
      <Pressable key={tab.name} onPress={() => router.navigate(tab.path)} style={styles.floatingTab}>
        <View style={[styles.floatingTabHighlight, focused ? { backgroundColor: theme.toneBg('accent') } : null]}>
          <AppText style={{ fontSize: 19, color: focused ? theme.accentColor : theme.ink3 }}>{tab.glyph}</AppText>
        </View>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[styles.wrap, { bottom: insets.bottom + 18, transform: [{ translateY }] }]} pointerEvents="box-none">
      <View
        style={[
          styles.floatingPillShadow,
          {
            shadowColor: theme.lift.shadowColor,
            shadowOpacity: theme.lift.shadowOpacity,
            shadowRadius: theme.lift.shadowRadius,
            shadowOffset: theme.lift.shadowOffset,
            elevation: 6,
          },
        ]}
      >
        <View style={[styles.floatingPill, { borderColor: theme.line }]}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={60} tint={theme.mode} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: pillTint(theme.mode) }]} />
          )}
          {left.map(renderTab)}
          <View style={styles.fabGap} />
          {right.map(renderTab)}
        </View>
      </View>
      <Pressable onPress={() => router.push('/sheet')} style={[styles.floatingFab, { backgroundColor: theme.accentColor, shadowColor: theme.lift.shadowColor }]}>
        <AppText color="#fff" style={{ fontSize: 26, marginTop: -2 }}>
          +
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  barContainer: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 9,
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  fabGap: {
    width: 64,
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  floatingPillShadow: {
    width: '86%',
    borderRadius: 39,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  floatingTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  floatingTabHighlight: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingFab: {
    position: 'absolute',
    alignSelf: 'center',
    top: -22,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
