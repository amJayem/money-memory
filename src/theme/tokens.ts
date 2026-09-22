import { oklch } from './oklch';

export type ThemeMode = 'light' | 'dark';
export type AccentTheme = 'indigo' | 'slate' | 'teal' | 'forest' | 'amber' | 'plum';
export type Tone = 'pos' | 'neg' | 'warn' | 'neutral' | 'accent';

export const ACCENT_THEMES: Record<AccentTheme, { label: string; hue: number }> = {
  indigo: { label: 'Electric blue', hue: 262 },
  slate: { label: 'Deep sea', hue: 240 },
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

/** Rotating hues for "How the money left" — a different fixed palette from category colors, per the design's `hues` array. */
export const METHOD_HUES = [45, 230, 280, 165, 320, 100];

export function methodColor(index: number, mode: ThemeMode): string {
  const hue = METHOD_HUES[index % METHOD_HUES.length];
  return mode === 'dark' ? oklch(0.7, 0.1, hue) : oklch(0.6, 0.11, hue);
}

/** Wallet-card gradient palettes by account type (§5, `paletteOf`) — vivid blue bank-card tones. */
export const WALLET_PALETTE: Record<string, [string, string, string]> = {
  total: ['#16265f', '#3457dd', '#14225f'],
  cash: ['#17285e', '#3559c8', '#1b2f6e'],
  bank: ['#13234f', '#2f56c4', '#16265c'],
  wallet: ['#1d1f56', '#4a48c4', '#221f61'],
  savings: ['#102c52', '#2560a8', '#123a6e'],
  credit: ['#1b2340', '#2a3350', '#171d33'],
  debit: ['#142450', '#2d4ba4', '#172c68'],
  other: ['#1c2340', '#2e3a5c', '#1a2138'],
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
  surface2: string;
  line: string;
  lineStrong: string;
  ink: string;
  ink2: string;
  ink3: string;
  lift: { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number } };
  liftInsetColor: string;
}

/** Base surface/ink tokens, light vs dark (§5) — cool porcelain/midnight-navy scheme, not warm. */
export function baseTokens(mode: ThemeMode): ThemeTokens {
  if (mode === 'dark') {
    return {
      mode,
      bg: '#080d1c',
      bgGradient: ['#131d3a', '#0a1128', '#060a17'],
      solid: '#111a31',
      surface2: 'rgba(140,170,255,0.11)',
      line: 'rgba(150,180,255,0.17)',
      lineStrong: 'rgba(160,190,255,0.32)',
      ink: '#f2f6ff',
      ink2: 'rgba(242,246,255,0.8)',
      ink3: 'rgba(242,246,255,0.64)',
      lift: { shadowColor: 'rgba(2,6,20,1)', shadowOpacity: 0.55, shadowRadius: 40, shadowOffset: { width: 0, height: 14 } },
      liftInsetColor: 'rgba(180,205,255,0.2)',
    };
  }
  return {
    mode,
    bg: '#eaeef7',
    bgGradient: ['#f6f8fd', '#e9eef8', '#dfe6f4'],
    solid: '#ffffff',
    surface2: 'rgba(15,25,65,0.055)',
    line: 'rgba(255,255,255,0.9)',
    lineStrong: 'rgba(15,25,65,0.16)',
    ink: '#0f1941',
    ink2: 'rgba(15,25,65,0.76)',
    ink3: 'rgba(15,25,65,0.66)',
    lift: { shadowColor: 'rgba(22,38,88,1)', shadowOpacity: 0.11, shadowRadius: 30, shadowOffset: { width: 0, height: 10 } },
    liftInsetColor: 'rgba(255,255,255,0.95)',
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
        return oklch(0.78, 0.16, accentHue);
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
      return oklch(0.52, 0.19, accentHue);
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
