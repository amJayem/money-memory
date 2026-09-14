import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';
import { MIN_TAP_TARGET, RADII } from '@/theme/tokens';

interface Props {
  label: string;
  active?: boolean;
  onPress: () => void;
}

/** Pill chip: filled ink + inverted text when active, outlined when not (brief §7). */
export function Chip({ label, active, onPress }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        {
          borderRadius: RADII.pill,
          backgroundColor: active ? theme.ink : 'transparent',
          borderWidth: active ? 0 : 1,
          borderColor: theme.lineStrong,
        },
      ]}
    >
      <AppText variant="body" color={active ? theme.solid : theme.ink2} style={{ fontSize: 12.5 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TAP_TARGET,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
