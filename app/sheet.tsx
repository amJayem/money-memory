import React from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/AppText';
import { useAppStore } from '@/store/appStore';
import { useToastStore } from '@/store/toastStore';
import { MIN_TAP_TARGET } from '@/theme/tokens';
import type { TransactionType } from '@/domain/types';
import type { Tone } from '@/theme/tokens';

const OPTIONS: { label: string; sub: string; type: TransactionType; icon: string; tone: Tone }[] = [
  { label: 'I spent money', sub: 'Food, bills, shopping — anything out', type: 'expense', icon: '−', tone: 'neg' },
  { label: 'I received money', sub: 'Salary, freelance, gifts', type: 'income', icon: '+', tone: 'pos' },
  { label: 'I moved my own money', sub: 'Bank → cash, wallet → bank', type: 'transfer', icon: '⇄', tone: 'neutral' },
  { label: 'I lent money to someone', sub: 'Still yours — just not with you', type: 'lent', icon: '→', tone: 'warn' },
  { label: 'Someone paid me back', sub: 'Reduces what they owe you', type: 'repay_in', icon: '↩', tone: 'pos' },
  { label: 'I borrowed money', sub: 'Track what you owe them', type: 'borrowed', icon: '←', tone: 'warn' },
];

export default function ActionSheet() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const theme = useTheme();
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);
  const toast = useToastStore((s) => s.show);
  const canTransfer = accounts.filter((a) => a.type !== 'credit').length >= 2;

  function open(type: TransactionType) {
    if (type === 'transfer' && !canTransfer) {
      toast('Add a second account first to move money between accounts');
      return;
    }
    router.replace(editId ? `/entry/${type}?editId=${editId}` : `/entry/${type}`);
  }

  return (
    <Pressable style={{ flex: 1, backgroundColor: 'rgba(8,8,10,0.44)', justifyContent: 'flex-end' }} onPress={() => router.back()}>
      <Pressable onPress={(e) => e.stopPropagation()}>
        <View
          style={{
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderWidth: 1,
            borderColor: theme.line,
            borderBottomWidth: 0,
            overflow: 'hidden',
            backgroundColor: theme.solid,
            shadowColor: '#08080a',
            shadowOpacity: 0.28,
            shadowRadius: 50,
            shadowOffset: { width: 0, height: -18 },
          }}
        >
          <SafeAreaView edges={['bottom']}>
            <View style={{ padding: 22, gap: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.lineStrong, marginBottom: 14 }} />
                <AppText variant="title" style={{ fontSize: 18 }}>
                  {editId ? 'Change this to…' : 'What happened with your money?'}
                </AppText>
                <AppText variant="body2" style={{ marginTop: 4, textAlign: 'center' }}>
                  {editId ? "Pick what this record should actually be — the amount and note carry over." : 'Record it once — balances, budget and loans all update.'}
                </AppText>
              </View>
              <View style={{ gap: 8 }}>
                {OPTIONS.map((o) => {
                  const disabled = o.type === 'transfer' && !canTransfer;
                  return (
                    <Pressable
                      key={o.type}
                      onPress={() => open(o.type)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: MIN_TAP_TARGET, borderWidth: 1, borderColor: theme.line, borderRadius: 17, paddingHorizontal: 14, paddingVertical: 13, opacity: disabled ? 0.45 : 1 }}
                    >
                      <View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.toneBg(o.tone) }}>
                        <AppText color={theme.tone(o.tone)} weight="manrope700">
                          {o.icon}
                        </AppText>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText variant="body">{o.label}</AppText>
                        <AppText variant="mono" style={{ marginTop: 2 }}>
                          {disabled ? 'Needs a second account first' : o.sub}
                        </AppText>
                      </View>
                      <AppText color={theme.ink3} weight="manrope600">
                        →
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Pressable>
    </Pressable>
  );
}
