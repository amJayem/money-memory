import React, { useRef } from 'react';
import { StyleSheet, View, ScrollView, ScrollViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView } from 'expo-blur';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { BlurTargetContext } from './BlurTargetContext';

/**
 * The warm mesh ground + three blurred color blobs that sit behind every
 * regular screen (brief §7). Full-screen overlays (entry form) use the same
 * gradient with `blobs={false}` — the design's `formStyle` is a flatter
 * 2-stop version of this gradient with no blob decoration, to stay calm
 * while the keypad is in use.
 */
export function Backdrop({ blobs = true }: { blobs?: boolean }) {
  const theme = useTheme();
  const blobColor = theme.mode === 'dark' ? 'rgba(120,140,255,0.16)' : 'rgba(255,200,140,0.35)';
  const blobColor2 = theme.mode === 'dark' ? 'rgba(255,140,180,0.10)' : 'rgba(150,190,255,0.28)';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} />
      {blobs ? (
        <>
          <View style={{ position: 'absolute', top: -60, left: -40, width: 260, height: 260, borderRadius: 130, backgroundColor: blobColor, opacity: 0.7 }} />
          <View style={{ position: 'absolute', top: 220, right: -70, width: 220, height: 220, borderRadius: 110, backgroundColor: blobColor2, opacity: 0.6 }} />
          <View style={{ position: 'absolute', bottom: -80, left: 30, width: 240, height: 240, borderRadius: 120, backgroundColor: blobColor, opacity: 0.4 }} />
        </>
      ) : null}
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
