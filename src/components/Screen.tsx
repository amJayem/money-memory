import React from 'react';
import { StyleSheet, View, ScrollView, ScrollViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView, SafeAreaViewProps, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { oklch } from '@/theme/oklch';
import { FAB_CLEARANCE, TAB_BAR_CONTENT_HEIGHT } from './CustomTabBar';

/** Design's `blob1`/`blob2`/`blob3`: three fixed circles, distinct per theme mode — position, size and color all differ, not just a light/dark recolor of the same two shapes. Cool blue/violet mesh, not warm. */
const BLOBS = {
  light: [
    { top: -210, right: -210, size: 520, opacity: 0.5, color: oklch(0.87, 0.09, 265) },
    { top: 240, left: -230, size: 480, opacity: 0.38, color: oklch(0.86, 0.08, 235) },
    { bottom: -190, right: -170, size: 460, opacity: 0.3, color: oklch(0.86, 0.08, 295) },
  ],
  dark: [
    { top: -210, right: -210, size: 520, opacity: 0.78, color: oklch(0.52, 0.19, 265) },
    { top: 240, left: -230, size: 480, opacity: 0.58, color: oklch(0.5, 0.15, 235) },
    { bottom: -190, right: -170, size: 460, opacity: 0.5, color: oklch(0.46, 0.14, 295) },
  ],
} as const;

/**
 * The warm mesh ground + three blurred color blobs that sit behind every
 * regular screen (brief §7). Full-screen overlays (entry form) use the same
 * gradient with `blobs={false}` — the design's `formStyle` is a flatter
 * 2-stop version of this gradient with no blob decoration, to stay calm
 * while the keypad is in use.
 *
 * Rendered as an SVG radial gradient rather than a plain tinted circle: RN's
 * View has no blur-filter on native (only web honours CSS `filter`), so a
 * flat circle+opacity reads as a hard-edged disc on Android/iOS. A radial
 * gradient fading to fully transparent well before the edge gives the same
 * "diffuse light behind glass" falloff on every platform without relying on
 * a blur filter at all.
 */
export function Backdrop({ blobs = true }: { blobs?: boolean }) {
  const theme = useTheme();
  const set = BLOBS[theme.mode];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} />
      {blobs
        ? set.map((b, i) => {
            const id = `blob-${theme.mode}-${i}`;
            return (
              <Svg
                key={i}
                width={b.size}
                height={b.size}
                style={{
                  position: 'absolute',
                  top: 'top' in b ? b.top : undefined,
                  bottom: 'bottom' in b ? b.bottom : undefined,
                  left: 'left' in b ? b.left : undefined,
                  right: 'right' in b ? b.right : undefined,
                }}
              >
                <Defs>
                  <RadialGradient id={id} cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={b.color} stopOpacity={b.opacity} />
                    <Stop offset="60%" stopColor={b.color} stopOpacity={b.opacity} />
                    <Stop offset="100%" stopColor={b.color} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={b.size / 2} cy={b.size / 2} r={b.size / 2} fill={`url(#${id})`} />
              </Svg>
            );
          })
        : null}
    </View>
  );
}

/**
 * The lower-level piece `Screen` is built from: full-page gradient + blobs,
 * the shared Android blur target, and safe-area handling — with no opinion
 * about scrolling or padding. Use this directly (instead of `Screen`) for
 * screens that need their own content layout, like the entry form and the
 * action sheet, so they still get the full-page background every screen
 * shares instead of a flat color.
 */
export function ScreenBackground({
  children,
  edges = ['top', 'left', 'right'],
  blobs = true,
  style,
  ...rest
}: { children: React.ReactNode; blobs?: boolean } & SafeAreaViewProps) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Backdrop blobs={blobs} />
      <SafeAreaView style={[{ flex: 1 }, style]} edges={edges} {...rest}>
        {children}
      </SafeAreaView>
    </View>
  );
}

interface Props extends ScrollViewProps {
  scroll?: boolean;
  bottomInset?: number;
}

/** Standard screen shell: backdrop + safe area + (optionally) a scroll container with room for the tab bar/FAB. */
export function Screen({ scroll = true, bottomInset, children, contentContainerStyle, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  // Measured, not guessed: clear whichever of the bar's own content or the
  // FAB's overhang reaches further up, plus the safe-area inset and a 24px
  // breathing-room margin above it.
  const resolvedBottomInset = bottomInset ?? insets.bottom + Math.max(TAB_BAR_CONTENT_HEIGHT, FAB_CLEARANCE) + 24;
  return (
    <ScreenBackground>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ paddingHorizontal: 18, paddingBottom: resolvedBottomInset, gap: 13 }, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          {...rest}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 18 }}>{children}</View>
      )}
    </ScreenBackground>
  );
}
