import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
const MAX_LEN = 9;

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** 12-key numeric pad: digits append, '.' inserts once, '⌫' deletes, capped at 9 chars (§7). */
export function Keypad({ value, onChange }: Props) {
  const theme = useTheme();

  function press(key: string) {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === '.' && value.includes('.')) return;
    if (value.length >= MAX_LEN) return;
    onChange(value + key);
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => press(k)}
          style={{ width: '33.333%', height: 58, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText style={{ fontSize: 22, color: theme.ink }} weight={k === '⌫' ? 'manrope600' : 'manrope700'}>
            {k}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
