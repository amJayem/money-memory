import React from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/AppText';
import { useAppStore } from '@/store/appStore';
import { useToastStore } from '@/store/toastStore';
import { useTranslation } from '@/i18n/useTranslation';
import type { StringKey } from '@/i18n/strings';
import { MIN_TAP_TARGET } from '@/theme/tokens';
import type { TransactionType } from '@/domain/types';
import type { Tone } from '@/theme/tokens';

const OPTIONS: { titleKey: StringKey<'entry'>; subKey: StringKey<'sheet'>; type: TransactionType; icon: string; tone: Tone }[] = [
  { titleKey: 'titleExpense', subKey: 'subExpense', type: 'expense', icon: '−', tone: 'neg' },
  { titleKey: 'titleIncome', subKey: 'subIncome', type: 'income', icon: '+', tone: 'pos' },
  { titleKey: 'titleTransfer', subKey: 'subTransfer', type: 'transfer', icon: '⇄', tone: 'neutral' },
  { titleKey: 'titleLent', subKey: 'subLent', type: 'lent', icon: '→', tone: 'warn' },
  { titleKey: 'titleRepayIn', subKey: 'subRepayIn', type: 'repay_in', icon: '↩', tone: 'pos' },
  { titleKey: 'titleBorrowed', subKey: 'subBorrowed', type: 'borrowed', icon: '←', tone: 'warn' },
  { titleKey: 'titleRepayOut', subKey: 'subRepayOut', type: 'repay_out', icon: '↪', tone: 'neg' },
];

export default function ActionSheet() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const theme = useTheme();
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);
  const toast = useToastStore((s) => s.show);
  const te = useTranslation('entry');
  const t = useTranslation('sheet');
  const canTransfer = accounts.filter((a) => a.type !== 'credit').length >= 2;

  function open(type: TransactionType) {
    if (type === 'transfer' && !canTransfer) {
      toast(t('toastNeedSecondAccount'));
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
                  {editId ? t('editTitle') : t('newTitle')}
                </AppText>
                <AppText variant="body2" style={{ marginTop: 4, textAlign: 'center' }}>
                  {editId ? t('editSub') : t('newSub')}
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
                        <AppText variant="body">{te(o.titleKey)}</AppText>
                        <AppText variant="mono" style={{ marginTop: 2 }}>
                          {disabled ? t('needsSecondAccount') : t(o.subKey)}
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
