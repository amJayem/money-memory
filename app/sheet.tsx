import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/AppText';
import { MIN_TAP_TARGET } from '@/theme/tokens';
import type { TransactionType } from '@/domain/types';

const OPTIONS: { label: string; type: TransactionType; icon: string }[] = [
  { label: 'I spent money', type: 'expense', icon: '−' },
  { label: 'I received money', type: 'income', icon: '+' },
  { label: 'I moved my own money', type: 'transfer', icon: '⇄' },
  { label: 'I lent money to someone', type: 'lent', icon: '→' },
  { label: 'Someone paid me back', type: 'repay_in', icon: '↩' },
  { label: 'I borrowed money', type: 'borrowed', icon: '←' },
];

export default function ActionSheet() {
  const theme = useTheme();
  const router = useRouter();

  function open(type: TransactionType) {
    router.replace(`/entry/${type}`);
  }

  return (
    <Pressable style={{ flex: 1, backgroundColor: 'rgba(10,10,12,0.45)', justifyContent: 'flex-end' }} onPress={() => router.back()}>
      <Pressable onPress={(e) => e.stopPropagation()}>
        <View style={{ backgroundColor: theme.solid, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: theme.line, borderBottomWidth: 0 }}>
          <SafeAreaView edges={['bottom']}>
            <View style={{ padding: 22, gap: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.lineStrong, marginBottom: 14 }} />
                <AppText variant="title" style={{ fontSize: 18 }}>
                  What happened with your money?
                </AppText>
                <AppText variant="body2" style={{ marginTop: 4, textAlign: 'center' }}>
                  Record it once — balances, budget and loans all update.
                </AppText>
              </View>
              <View style={{ gap: 8 }}>
                {OPTIONS.map((o) => (
                  <Pressable
                    key={o.type}
                    onPress={() => open(o.type)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: MIN_TAP_TARGET, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, borderRadius: 16, paddingHorizontal: 14 }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.solid }}>
                      <AppText color={theme.ink}>{o.icon}</AppText>
                    </View>
                    <AppText variant="body">{o.label}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Pressable>
    </Pressable>
  );
}
