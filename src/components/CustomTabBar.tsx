import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme/ThemeProvider';
import { useNavBarStore } from '@/store/navBarStore';
import { AppText } from './AppText';

const TABS = [
  { path: '/', name: 'index', glyph: '▤', label: 'Home' },
  { path: '/history', name: 'history', glyph: '≡', label: 'History' },
  { path: '/loans', name: 'loans', glyph: '◎', label: 'Loans' },
  { path: '/stats', name: 'stats', glyph: '◨', label: 'Stats' },
] as const;

/**
 * 5-slot bar (Home · History · FAB gap · Loans · Stats) — the FAB is a
 * sibling overlay, not a tab (§1, §6). Mounted once at the root so it's
 * present on every screen, not only the four tab routes; a scrollable
 * screen can hide/reveal it via useHideNavBarOnScroll + useNavBarStore.
 */
export function CustomTabBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
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
        <BlurView intensity={50} tint={theme.mode} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface2 }]} />
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
});
