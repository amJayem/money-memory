import React from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';
import { MIN_TAP_TARGET, RADII } from '@/theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'neg';
  fullWidth?: boolean;
}

/** Design's `ghostBtn`/`dangerGhostBtn`: bordered, transparent-fill pill — used for secondary actions like "Calendar", "+ Add", "Skip", and (in its danger variant) "Delete all data". */
export function GhostButton({ label, onPress, tone = 'neutral', fullWidth = false }: Props) {
  const theme = useTheme();
  const isDanger = tone === 'neg';
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        width: fullWidth ? '100%' : undefined,
        minHeight: MIN_TAP_TARGET,
        borderWidth: 1,
        borderColor: isDanger ? theme.line : theme.lineStrong,
        backgroundColor: 'transparent',
        borderRadius: isDanger ? 16 : RADII.pill,
        paddingHorizontal: isDanger ? 14 : 15,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText variant="body" color={isDanger ? theme.tone('neg') : theme.ink2} style={{ fontSize: 12.5 }}>
        {label}
      </AppText>
    </Pressable>
  );
}
