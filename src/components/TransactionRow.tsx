import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';
import { MIN_TAP_TARGET } from '@/theme/tokens';
import type { Transaction, TransactionType } from '@/domain/types';

const GLYPH: Record<TransactionType, string> = {
  expense: '−',
  income: '+',
  transfer: '⇄',
  lent: '→',
  borrowed: '←',
  repay_in: '↩',
  repay_out: '↩',
};

const TONE: Record<TransactionType, 'pos' | 'neg' | 'warn' | 'neutral'> = {
  expense: 'neg',
  income: 'pos',
  transfer: 'neutral',
  lent: 'warn',
  borrowed: 'warn',
  repay_in: 'pos',
  repay_out: 'neg',
};

interface Props {
  title: string;
  sub: string;
  amountText: string;
  type: TransactionType;
  onPress: () => void;
}

export function TransactionRow({ title, sub, amountText, type, onPress }: Props) {
  const theme = useTheme();
  const tone = TONE[type];
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: MIN_TAP_TARGET, paddingVertical: 8, paddingHorizontal: 8 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.toneBg(tone),
        }}
      >
        <AppText color={theme.tone(tone)} weight="manrope700">
          {GLYPH[type]}
        </AppText>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="body" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="mono" numberOfLines={1} style={{ marginTop: 2 }}>
          {sub}
        </AppText>
      </View>
      <AppText variant="amount" color={theme.tone(tone)} style={{ fontSize: 14.5 }}>
        {amountText}
      </AppText>
    </Pressable>
  );
}
