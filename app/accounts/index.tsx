import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { balance, creditLeft, creditUsed } from '@/domain/money';
import { ACCOUNT_TYPE_LABEL } from '@/theme/tokens';

export default function AccountsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { accounts, transactions, liquid, owed, totalPosition } = useLedger();
  const privacy = usePrivacy('accounts');

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconButton glyph="←" onPress={() => router.back()} />
          <AppText variant="title">Accounts</AppText>
        </View>
        <Pressable onPress={() => router.push('/accounts/add')}>
          <AppText variant="mono">+ Add</AppText>
        </Pressable>
      </View>

      <GlassCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <AppText variant="label">Total available</AppText>
            <AppText variant="amount" style={{ fontSize: 22, marginTop: 6 }}>
              {privacy.fmtTotal(liquid)}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="label">Available + lent</AppText>
            <AppText variant="amount" style={{ fontSize: 22, marginTop: 6 }}>
              {privacy.fmtTotal(totalPosition)}
            </AppText>
          </View>
        </View>
        <AppText variant="body2" style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.line }}>
          {owed > 0 ? `Includes ${privacy.fmt(owed)} lent out, not sitting in an account.` : 'Credit-card limits are never counted toward your money.'}
        </AppText>
      </GlassCard>

      <View style={{ gap: 9 }}>
        {accounts.map((a) => {
          const credit = a.type === 'credit';
          const used = credit ? creditUsed(a, transactions) : 0;
          const left = credit ? creditLeft(a, transactions) : 0;
          const bal = credit ? left : balance(a, transactions);
          const tag = credit ? (left <= 0 ? 'no credit left' : 'credit left · not your money') : 'available';
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
                    <AppText variant="mono" style={{ marginTop: 2 }}>
                      {ACCOUNT_TYPE_LABEL[a.type]} · {tag}
                    </AppText>
                  </View>
                  <AppText variant="amount" style={{ fontSize: 15 }}>
                    {privacy.fmt(bal)}
                  </AppText>
                </View>
              </GlassCard>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
