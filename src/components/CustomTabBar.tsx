import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

const GLYPH: Record<string, string> = { index: '▤', history: '≡', loans: '◎', stats: '◨' };
const LABEL: Record<string, string> = { index: 'Home', history: 'History', loans: 'Loans', stats: 'Stats' };

// A minimal, locally-defined shape for what we read off React Navigation's
// tabBar render-prop contract — avoids depending on expo-router's internal
// bundled copy of @react-navigation/bottom-tabs' type path.
interface MinimalTabBarProps {
  state: { routes: { key: string; name: string }[]; index: number };
  navigation: { navigate: (name: string) => void };
}

/** 5-slot bar (Home · History · FAB gap · Loans · Stats) — the FAB is a sibling overlay, not a tab (§1, §6). */
export function CustomTabBar({ state, navigation }: MinimalTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const routes = state.routes;
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  function renderTab(route: (typeof routes)[number], index: number) {
    const focused = state.index === index;
    const color = focused ? theme.accentColor : theme.ink3;
    return (
      <Pressable
        key={route.key}
        onPress={() => navigation.navigate(route.name)}
        style={styles.tab}
      >
        <AppText style={{ fontSize: 19, color }}>{GLYPH[route.name]}</AppText>
        <AppText variant="label" color={color} style={{ marginTop: 3, fontSize: 9.5, letterSpacing: 0.4 }}>
          {LABEL[route.name]}
        </AppText>
      </Pressable>
    );
  }

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
      <View style={styles.barContainer}>
        <BlurView intensity={50} tint={theme.mode} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface2 }]} />
        <View style={[styles.row, { borderColor: theme.line }]}>
          {left.map((r, i) => renderTab(r, i))}
          <View style={styles.fabGap} />
          {right.map((r, i) => renderTab(r, i + left.length))}
        </View>
      </View>
      <Pressable onPress={() => router.push('/sheet')} style={[styles.fab, { backgroundColor: theme.ink, shadowColor: theme.lift.shadowColor }]}>
        <AppText color={theme.solid} style={{ fontSize: 26, marginTop: -2 }}>
          +
        </AppText>
      </Pressable>
    </View>
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
    width: '92%',
    borderRadius: 26,
    overflow: 'hidden',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 26,
    paddingVertical: 8,
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
    top: -22,
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
