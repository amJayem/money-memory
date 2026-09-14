import { oklch } from './oklch';

export type ThemeMode = 'light' | 'dark';
export type AccentTheme = 'indigo' | 'slate' | 'teal' | 'forest' | 'amber' | 'plum';
export type Tone = 'pos' | 'neg' | 'warn' | 'neutral' | 'accent';

export const ACCENT_THEMES: Record<AccentTheme, { label: string; hue: number }> = {
  indigo: { label: 'Indigo', hue: 265 },
  slate: { label: 'Slate blue', hue: 250 },
  teal: { label: 'Teal', hue: 195 },
  forest: { label: 'Forest', hue: 155 },
  amber: { label: 'Amber', hue: 70 },
  plum: { label: 'Plum', hue: 325 },
};

export const DEFAULT_ACCENT: AccentTheme = 'indigo';

/** Category donut/legend hues (§5 CAT_HUE). */
export const CATEGORY_HUE: Record<string, number> = {
  Food: 45,
  Shopping: 320,
  Transport: 230,
  Bills: 280,
  Entertainment: 350,
  Health: 165,
  Personal: 100,
  Other: 0,
};

export function categoryColor(category: string, mode: ThemeMode): string {
  const hue = CATEGORY_HUE[category] ?? CATEGORY_HUE.Other;
  return mode === 'dark' ? oklch(0.72, 0.11, hue) : oklch(0.63, 0.12, hue);
}

/** Wallet-card gradient palettes by account type (§5, `paletteOf`). */
export const WALLET_PALETTE: Record<string, [string, string, string]> = {
  total: ['#2f3d63', '#222c48', '#161d2f'],
  cash: ['#6a5a3c', '#4a3f2a', '#332b1d'],
  bank: ['#3d4d7a', '#2b3757', '#1d263c'],
  wallet: ['#5a3f66', '#412e4a', '#2c1f33'],
  savings: ['#2f5a55', '#22423f', '#172c2a'],
  credit: ['#4a4a55', '#35353d', '#24242a'],
  debit: ['#3a4a5e', '#293643', '#1c252e'],
  other: ['#454a52', '#31353b', '#212429'],
};

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank account',
  debit: 'Debit card',
  credit: 'Credit card',
  wallet: 'Mobile wallet',
  savings: 'Savings',
};

export interface ThemeTokens {
  mode: ThemeMode;
  bg: string;
  bgGradient: [string, string, string];
  solid: string;
  surfaceGradient: [string, string];
  surface2: string;
  line: string;
  lineStrong: string;
  ink: string;
  ink2: string;
  ink3: string;
  lift: { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number } };
  liftInsetColor: string;
}

/** Base surface/ink tokens, light vs dark (§5). */
export function baseTokens(mode: ThemeMode): ThemeTokens {
  if (mode === 'dark') {
    return {
      mode,
      bg: '#101216',
      bgGradient: ['#171a20', '#101216', '#0b0c0f'],
      solid: '#1b1d22',
      surfaceGradient: ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.05)'],
      surface2: 'rgba(255,255,255,0.10)',
      line: 'rgba(255,255,255,0.16)',
      lineStrong: 'rgba(255,255,255,0.3)',
      ink: '#f7f6f3',
      ink2: 'rgba(247,246,243,0.78)',
      ink3: 'rgba(247,246,243,0.62)',
      lift: { shadowColor: '#000000', shadowOpacity: 0.34, shadowRadius: 34, shadowOffset: { width: 0, height: 12 } },
      liftInsetColor: 'rgba(255,255,255,0.22)',
    };
  }
  return {
    mode,
    bg: '#eae5db',
    bgGradient: ['#f4eee4', '#e6dfd3', '#dbd6ce'],
    solid: '#fbfaf7',
    surfaceGradient: ['rgba(255,255,255,0.74)', 'rgba(255,255,255,0.48)'],
    surface2: 'rgba(20,18,16,0.07)',
    line: 'rgba(255,255,255,0.75)',
    lineStrong: 'rgba(20,18,16,0.2)',
    ink: '#141210',
    ink2: 'rgba(20,18,16,0.76)',
    ink3: 'rgba(20,18,16,0.68)',
    lift: { shadowColor: 'rgba(60,44,28,1)', shadowOpacity: 0.1, shadowRadius: 30, shadowOffset: { width: 0, height: 10 } },
    liftInsetColor: 'rgba(255,255,255,0.9)',
  };
}

/** Semantic tone colors (§5 `tone()`), theme-mode aware; hue fixed except 'accent'. */
export function tone(name: Tone, mode: ThemeMode, accentHue: number): string {
  if (mode === 'dark') {
    switch (name) {
      case 'pos':
        return oklch(0.78, 0.14, 155);
      case 'neg':
        return oklch(0.75, 0.14, 25);
      case 'warn':
        return oklch(0.82, 0.13, 80);
      case 'accent':
        return oklch(0.79, 0.11, accentHue);
      default:
        return oklch(0.75, 0.06, 250);
    }
  }
  switch (name) {
    case 'pos':
      return oklch(0.5, 0.12, 155);
    case 'neg':
      return oklch(0.53, 0.15, 25);
    case 'warn':
      return oklch(0.58, 0.12, 70);
    case 'accent':
      return oklch(0.5, 0.13, accentHue);
    default:
      return oklch(0.5, 0.07, 250);
  }
}

/** Pale background chip fill behind a tone color (§5 `toneBg()`). */
export function toneBg(name: Tone, mode: ThemeMode, accentHue: number): string {
  const hueByTone: Record<Tone, number> = { pos: 155, neg: 25, warn: 75, neutral: 250, accent: accentHue };
  const h = hueByTone[name];
  return mode === 'dark' ? oklch(0.33, 0.05, h) : oklch(0.94, 0.04, h);
}

export const RADII = {
  card: 22,
  walletCard: 24,
  row: 20,
  iconTile: 14,
  pill: 999,
  input: 14,
};

/** Switch geometry (§5): 52x32 track, 24px knob inset 3px, 44x44 hit area. */
export const SWITCH = {
  trackWidth: 52,
  trackHeight: 32,
  knobSize: 24,
  knobInset: 3,
  hitArea: 44,
};

export function switchOffTrackColor(mode: ThemeMode): string {
  return mode === 'dark' ? oklch(0.32, 0.02, 265) : oklch(0.88, 0.01, 265);
}

export const MIN_TAP_TARGET = 44;
