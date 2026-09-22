import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
const MAX_LEN = 9;
const GAP = 7;

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** 12-key numeric pad: digits append, '.' inserts once, '⌫' deletes, capped at 9 chars (§7). Each key is its own glass card, per the design's `keys[i].style`. */
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
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -GAP / 2, marginTop: -GAP / 2 }}>
      {KEYS.map((k) => (
        <View key={k} style={{ width: '33.333%', padding: GAP / 2 }}>
          <Pressable
            onPress={() => press(k)}
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
            <AppText style={{ fontSize: 19, color: theme.ink }} weight="manrope600">
              {k}
            </AppText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
