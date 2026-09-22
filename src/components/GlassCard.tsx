import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { RADII } from '@/theme/tokens';

interface Props extends ViewProps {
  radius?: number;
  padding?: number;
}

/**
 * The app's one recurring surface: a translucent glass pane with a hairline
 * border and a lift shadow (brief §7). Balance/wallet cards are the
 * deliberate exception and render opaque instead — they don't use this.
 *
 * BlurView is left at its default `blurMethod` ('none', a plain tint) rather
 * than Android's 'dimezisBlurView' — that live-capture mode crashed the
 * render thread with a native stack overflow during screen transitions once
 * enough of these were mounted at once (confirmed via device logcat).
 */
export function GlassCard({ radius = RADII.card, padding = 18, style, children, ...rest }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: theme.line,
          overflow: 'hidden',
          shadowColor: theme.lift.shadowColor,
          shadowOpacity: theme.lift.shadowOpacity,
          shadowRadius: theme.lift.shadowRadius,
          shadowOffset: theme.lift.shadowOffset,
          elevation: 4,
        },
        style,
      ]}
      {...rest}
    >
      <BlurView intensity={40} tint={theme.mode} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      <LinearGradient
        colors={theme.surfaceGradient as unknown as [string, string]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View style={{ padding }}>{children}</View>
    </View>
  );
}
