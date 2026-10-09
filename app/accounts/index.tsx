import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GhostButton } from '@/components/GhostButton';
import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { balance, creditLeft, creditUsed } from '@/domain/money';
import { useTranslation } from '@/i18n/useTranslation';

export default function AccountsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { accounts, transactions, liquid, owed, totalPosition } = useLedger();
  const privacy = usePrivacy('accounts');
  const t = useTranslation('accounts');
  const tc = useTranslation('common');
  const ACCOUNT_TYPE_LABEL: Record<string, string> = {
    cash: tc('accountTypeCash'),
    bank: tc('accountTypeBank'),
    debit: tc('accountTypeDebit'),
    credit: tc('accountTypeCredit'),
    wallet: tc('accountTypeWallet'),
    savings: tc('accountTypeSavings'),
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconButton glyph="←" onPress={() => router.back()} />
          <AppText variant="title">{t('title')}</AppText>
        </View>
        <GhostButton label={t('add')} onPress={() => router.push('/accounts/add')} />
      </View>

      <GlassCard>
        <AppText variant="label">{t('totalAvailable')}</AppText>
        <AppText variant="amount" style={{ fontSize: 22, marginTop: 6 }}>
          {privacy.fmtTotal(liquid)}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: theme.line, marginTop: 14, paddingTop: 13 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="body2">{t('lentOutNotAvailable')}</AppText>
            <AppText variant="body" color={theme.tone('warn')} style={{ marginTop: 3 }}>
              {privacy.fmt(owed)}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body2">{t('availablePlusLent')}</AppText>
            <AppText variant="body" style={{ marginTop: 3 }}>
              {privacy.fmtTotal(totalPosition)}
            </AppText>
          </View>
        </View>
        <AppText variant="body2" style={{ marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.line }}>
          {t('creditNote')}
        </AppText>
      </GlassCard>

      <View style={{ gap: 9 }}>
        {accounts.map((a) => {
          const credit = a.type === 'credit';
          const used = credit ? creditUsed(a, transactions) : 0;
          const left = credit ? creditLeft(a, transactions) : 0;
          const bal = credit ? left : balance(a, transactions);
          const dupes = accounts.filter((x) => x.type === a.type).length > 1;
          const sub = credit
            ? t('creditCardUsed', { used: privacy.fmt(used), limit: privacy.fmt(a.limit ?? 0) })
            : dupes
              ? `${ACCOUNT_TYPE_LABEL[a.type]} · ${a.name}`
              : ACCOUNT_TYPE_LABEL[a.type];
          const tag = credit ? (left <= 0 ? t('noCreditLeft') : t('creditLeftNotYours')) : t('available');
          return (
            <Pressable key={a.id} onPress={() => router.push(`/accounts/${a.id}`)}>
              <GlassCard padding={15}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
                    <AppText variant="body" weight="manrope700">
                      {a.name[0]?.toUpperCase()}
                    </AppText>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="body" numberOfLines={1}>
                      {a.name}
                    </AppText>
                    <AppText variant="mono" style={{ marginTop: 2 }} numberOfLines={1}>
                      {sub}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', maxWidth: 120 }}>
                    <AppText variant="amount" style={{ fontSize: 15 }}>
                      {privacy.fmt(bal)}
                    </AppText>
                    <AppText variant="mono" style={{ marginTop: 2, textAlign: 'right' }} color={credit ? theme.tone('warn') : theme.ink3}>
                      {tag}
                    </AppText>
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
