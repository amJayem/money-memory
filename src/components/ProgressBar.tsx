import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { BudgetTone } from '@/domain/money';

interface Props {
  /** 0-100 */
  barPct: number;
  /** 0-100, drawn as a hatched overflow segment after barPct */
  overPct?: number;
  tone: BudgetTone;
  height?: number;
}

/** Two segments so an over-budget bar never visually exceeds 100% (§3). */
export function ProgressBar({ barPct, overPct = 0, tone, height = 10 }: Props) {
  const theme = useTheme();
  const color = theme.tone(tone);
  return (
    <View style={{ height, borderRadius: 999, backgroundColor: theme.surface2, overflow: 'hidden', flexDirection: 'row' }}>
      <View style={{ width: `${Math.min(100, Math.max(0, barPct))}%`, backgroundColor: color }} />
      {overPct > 0 ? (
        <View style={{ width: `${Math.min(100, overPct)}%`, backgroundColor: theme.tone('neg'), opacity: 0.55 }} />
      ) : null}
    </View>
  );
}
