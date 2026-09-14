import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';
import { MIN_TAP_TARGET } from '@/theme/tokens';

interface Props {
  glyph: string;
  onPress: () => void;
  variant?: 'ghost' | 'surface';
}

/** A 44x44 tap target carrying a single glyph — back chevrons, search, settings gear, the privacy eye. */
export function IconButton({ glyph, onPress, variant = 'surface' }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        variant === 'surface'
          ? { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line }
          : null,
      ]}
    >
      <AppText variant="body" color={theme.ink} style={{ fontSize: 16 }}>
        {glyph}
      </AppText>
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
