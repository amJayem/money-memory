import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { isOperator } from '@/domain/calc';
import { AppText } from './AppText';

const CALC_KEYS = ['1', '2', '3', '+', '4', '5', '6', '−', '7', '8', '9', '×', '.', '0', '⌫', '÷'];
const PLAIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
/** Per number in the expression, not the whole expression. */
const MAX_NUMBER_LEN = 9;
const MAX_EXPR_LEN = 40;
const GAP = 7;

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Adds the + − × ÷ column; off gives the plain 12-key pad. */
  calculator?: boolean;
}

/**
 * Numeric pad doubling as a mini calculator: digits append, '.' once per number, an operator
 * replaces a trailing operator instead of stacking, '⌫' deletes and long-press '⌫' clears.
 */
export function CalcKeypad({ value, onChange, calculator = false }: Props) {
  const theme = useTheme();
  const keys = calculator ? CALC_KEYS : PLAIN_KEYS;

  function press(key: string) {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    const last = value.slice(-1);
    if (isOperator(key)) {
      if (!value) return;
      onChange(isOperator(last) ? value.slice(0, -1) + key : value + key);
      return;
    }
    if (value.length >= MAX_EXPR_LEN) return;
    const currentNumber = value.split(/[+−×÷]/).pop() ?? '';
    if (key === '.' && currentNumber.includes('.')) return;
    if (currentNumber.length >= MAX_NUMBER_LEN) return;
    onChange(value + key);
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -GAP / 2, marginTop: -GAP / 2 }}>
      {keys.map((k) => {
        const op = isOperator(k);
        return (
          <View key={k} style={{ width: calculator ? '25%' : '33.333%', padding: GAP / 2 }}>
            <Pressable
              onPress={() => press(k)}
              onLongPress={k === '⌫' ? () => onChange('') : undefined}
              style={{
                height: 52,
                borderRadius: 15,
                borderWidth: 1,
                borderColor: theme.line,
                backgroundColor: theme.solid,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: theme.lift.shadowColor,
                shadowOpacity: theme.lift.shadowOpacity,
                shadowRadius: theme.lift.shadowRadius,
                shadowOffset: theme.lift.shadowOffset,
                elevation: 2,
              }}
            >
              <AppText style={{ fontSize: op ? 22 : 19, color: op ? theme.accentColor : theme.ink }} weight="manrope600">
                {k}
              </AppText>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
