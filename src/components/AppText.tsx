import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { FONT } from '@/theme/fonts';

interface Props extends TextProps {
  variant?: 'title' | 'heading' | 'body' | 'body2' | 'label' | 'mono' | 'amount';
  color?: string;
  weight?: keyof typeof FONT;
}

/** Centralizes the two-typeface system (Manrope voice/amounts, IBM Plex Mono labels) so screens never hand-roll font stacks. */
export function AppText({ variant = 'body', color, weight, style, ...rest }: Props) {
  const theme = useTheme();
  const base = (() => {
    switch (variant) {
      case 'title':
        return { fontFamily: FONT.manrope800, fontSize: 21, letterSpacing: -0.6, color: theme.ink };
      case 'heading':
        return { fontFamily: FONT.manrope700, fontSize: 15, letterSpacing: -0.3, color: theme.ink };
      case 'body':
        return { fontFamily: FONT.manrope600, fontSize: 14, color: theme.ink };
      case 'body2':
        return { fontFamily: FONT.manrope500, fontSize: 12.5, color: theme.ink2 };
      case 'label':
        return { fontFamily: FONT.mono500, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: theme.ink3 };
      case 'mono':
        return { fontFamily: FONT.mono500, fontSize: 11.5, color: theme.ink3 };
      case 'amount':
        return { fontFamily: FONT.manrope800, fontSize: 22, letterSpacing: -0.8, color: theme.ink, fontVariant: ['tabular-nums'] as ['tabular-nums'] };
    }
  })();
  return <Text {...rest} style={[base, weight ? { fontFamily: FONT[weight] } : null, color ? { color } : null, style]} />;
}
