import React, { useRef } from 'react';
import { Platform, StyleSheet, View, ScrollView, ScrollViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView } from 'expo-blur';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { oklch } from '@/theme/oklch';
import { BlurTargetContext } from './BlurTargetContext';

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

// Native has no blur-filter for a plain View; web (the platform this was
// screenshotted on) supports CSS filter, so the near-doubled blur only
// applies there — a harmless no-op style key on native.
const BLOB_BLUR = Platform.OS === 'web' ? ({ filter: 'blur(120px)' } as const) : {};

/**
 * The warm mesh ground + three blurred color blobs that sit behind every
 * regular screen (brief §7). Full-screen overlays (entry form) use the same
 * gradient with `blobs={false}` — the design's `formStyle` is a flatter
 * 2-stop version of this gradient with no blob decoration, to stay calm
 * while the keypad is in use.
 */
export function Backdrop({ blobs = true }: { blobs?: boolean }) {
  const theme = useTheme();
  const set = BLOBS[theme.mode];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} />
      {blobs
        ? set.map((b, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: 'top' in b ? b.top : undefined,
                bottom: 'bottom' in b ? b.bottom : undefined,
                left: 'left' in b ? b.left : undefined,
                right: 'right' in b ? b.right : undefined,
                width: b.size,
                height: b.size,
                borderRadius: b.size / 2,
                backgroundColor: b.color,
                opacity: b.opacity,
                ...BLOB_BLUR,
              }}
            />
          ))
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
  const blurTargetRef = useRef<View>(null);
  return (
    <BlurTargetView ref={blurTargetRef} style={{ flex: 1, backgroundColor: theme.bg }}>
      <BlurTargetContext.Provider value={blurTargetRef}>
        <Backdrop blobs={blobs} />
        <SafeAreaView style={[{ flex: 1 }, style]} edges={edges} {...rest}>
          {children}
        </SafeAreaView>
      </BlurTargetContext.Provider>
    </BlurTargetView>
  );
}

interface Props extends ScrollViewProps {
  scroll?: boolean;
  bottomInset?: number;
}

/** Standard screen shell: backdrop + safe area + (optionally) a scroll container with room for the tab bar/FAB. */
export function Screen({ scroll = true, bottomInset = 122, children, contentContainerStyle, ...rest }: Props) {
  return (
    <ScreenBackground>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ paddingHorizontal: 18, paddingBottom: bottomInset, gap: 13 }, contentContainerStyle]}
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
