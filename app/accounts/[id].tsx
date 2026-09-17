import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { TransactionRow } from '@/components/TransactionRow';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { balance, creditLeft, creditUsed } from '@/domain/money';
import { sortedTransactions, transactionIcon, transactionSub, transactionTitle } from '@/domain/search';
import { ACCOUNT_TYPE_LABEL } from '@/theme/tokens';
import { formatAmount } from '@/domain/format';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const { accounts, transactions, settings } = useLedger();
  const privacy = usePrivacy('account');

  const account = accounts.find((a) => a.id === id);
  if (!account) {
    return (
      <Screen>
        <AppText variant="body">Account not found.</AppText>
      </Screen>
    );
  }

  const credit = account.type === 'credit';
  const used = credit ? creditUsed(account, transactions) : 0;
  const left = credit ? creditLeft(account, transactions) : 0;
  const bal = credit ? left : balance(account, transactions);

  const related = sortedTransactions(transactions.filter((t) => t.account === account.id || t.toAccount === account.id));
  const inTotal = related.filter((t) => t.type === 'income' || t.type === 'repay_in' || t.type === 'borrowed' || (t.type === 'transfer' && t.toAccount === account.id)).reduce((s, t) => s + t.amount, 0);
  const outTotal = related.filter((t) => (t.type === 'expense' || t.type === 'lent' || t.type === 'repay_out' || (t.type === 'transfer' && t.account === account.id))).reduce((s, t) => s + t.amount, 0);
  const transferCount = related.filter((t) => t.type === 'transfer').length;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <IconButton glyph="←" onPress={() => router.back()} />
          <AppText variant="title" numberOfLines={1}>
            {account.name}
          </AppText>
        </View>
        <IconButton glyph="✎" onPress={() => router.push(`/accounts/add?editId=${account.id}`)} />
      </View>

      <GlassCard>
        <AppText variant="label">{credit ? 'Credit left' : 'Balance'}</AppText>
        <AppText variant="amount" style={{ fontSize: 26, marginTop: 8 }}>
          {privacy.fmtTotal(bal)}
        </AppText>
        <AppText variant="body2" style={{ marginTop: 6 }}>
          {credit ? `${formatAmount(used, settings.currencySymbol)} used of ${formatAmount(account.limit ?? 0, settings.currencySymbol)} · not your money` : ACCOUNT_TYPE_LABEL[account.type]}
        </AppText>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 13, marginTop: 13 }}>
          <Stat label="In" value={privacy.fmt(inTotal)} color={theme.tone('pos')} />
          <Divider />
          <Stat label="Out" value={privacy.fmt(outTotal)} color={theme.tone('neg')} />
          <Divider />
          <Stat label="Transfers" value={String(transferCount)} />
        </View>
      </GlassCard>

      <AppText variant="label" style={{ paddingHorizontal: 5 }}>
        This account's history
      </AppText>
      <GlassCard padding={4}>
        {related.length === 0 ? (
          <AppText variant="body2" style={{ padding: 20, textAlign: 'center' }}>
            No transactions yet.
          </AppText>
        ) : (
          related.map((t) => (
            <TransactionRow
              key={t.id}
              title={transactionTitle(t, accounts)}
              sub={transactionSub(t, accounts)}
              icon={transactionIcon(t)}
              amountText={privacy.fmt(t.type === 'expense' || t.type === 'lent' || t.type === 'repay_out' ? -t.amount : t.amount, true)}
              type={t.type}
              onPress={() => router.push(`/transaction/${t.id}`)}
            />
          ))
        )}
      </GlassCard>
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="body2">{label}</AppText>
      <AppText variant="body" color={color} style={{ marginTop: 3 }}>
        {value}
      </AppText>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ width: 1, backgroundColor: theme.line }} />;
}
