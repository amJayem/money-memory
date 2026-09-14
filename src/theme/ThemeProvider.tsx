import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  ACCENT_THEMES,
  AccentTheme,
  DEFAULT_ACCENT,
  ThemeMode,
  ThemeTokens,
  Tone,
  baseTokens,
  switchOffTrackColor,
  tone as toneFn,
  toneBg as toneBgFn,
} from './tokens';

export interface ThemeContextValue extends ThemeTokens {
  accent: AccentTheme;
  accentHue: number;
  accentColor: string;
  switchOffTrack: string;
  tone: (name: Tone) => string;
  toneBg: (name: Tone) => string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * `appearance` is the persisted user override ('light' | 'dark' | 'system').
 * Passing 'system' (or omitting it) follows the OS color scheme, matching
 * the brief's "Dark appearance ... follows system" default.
 */
export function ThemeProvider({
  appearance = 'system',
  accent = DEFAULT_ACCENT,
  children,
}: {
  appearance?: ThemeMode | 'system';
  accent?: AccentTheme;
  children: React.ReactNode;
}) {
  const systemScheme = useColorScheme();
  const mode: ThemeMode = appearance === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : appearance;

  const value = useMemo<ThemeContextValue>(() => {
    const base = baseTokens(mode);
    const accentHue = ACCENT_THEMES[accent].hue;
    return {
      ...base,
      accent,
      accentHue,
      accentColor: toneFn('accent', mode, accentHue),
      switchOffTrack: switchOffTrackColor(mode),
      tone: (name: Tone) => toneFn(name, mode, accentHue),
      toneBg: (name: Tone) => toneBgFn(name, mode, accentHue),
    };
  }, [mode, accent]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
