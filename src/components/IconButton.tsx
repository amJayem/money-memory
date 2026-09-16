import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';
import { MIN_TAP_TARGET } from '@/theme/tokens';
import { useBlurTarget } from './BlurTargetContext';

interface Props {
  glyph: string;
  onPress: () => void;
  variant?: 'ghost' | 'surface';
}

/**
 * A 44x44 tap target carrying a single glyph — back chevrons, search, settings
 * gear, the privacy eye. Design's `iconBtn`/`backBtn`: same glass treatment as
 * every card (blurred, `--surface` gradient, lift shadow), `ink2` glyph color.
 */
export function IconButton({ glyph, onPress, variant = 'surface' }: Props) {
  const theme = useTheme();
  const blurTarget = useBlurTarget();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        variant === 'surface'
          ? { borderWidth: 1, borderColor: theme.line, overflow: 'hidden', shadowColor: theme.lift.shadowColor, shadowOpacity: theme.lift.shadowOpacity, shadowRadius: theme.lift.shadowRadius, shadowOffset: theme.lift.shadowOffset, elevation: 3 }
          : null,
      ]}
    >
      {variant === 'surface' ? (
        <>
          <BlurView intensity={40} tint={theme.mode} blurMethod="dimezisBlurView" blurTarget={blurTarget ?? undefined} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={theme.surfaceGradient as unknown as [string, string]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
        </>
      ) : null}
      <View>
        <AppText variant="body" color={theme.ink2} style={{ fontSize: 16 }}>
          {glyph}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
