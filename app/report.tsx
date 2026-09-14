import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { balance, monthlyReport } from '@/domain/money';
import { sortedTransactions, transactionTitle } from '@/domain/search';

export default function ReportScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { accounts, transactions } = useLedger();
  const privacy = usePrivacy('report');

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const report = monthlyReport(accounts, transactions);

  const largest = sortedTransactions(transactions)
    .filter((t) => t.type !== 'transfer')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  const rows: { label: string; value: number | null; bold?: boolean }[] = [
    { label: `Total available on ${monthLabel.split(' ')[0]} 1`, value: report.opening },
    { label: 'Money in', value: report.income },
    { label: 'Money out', value: -report.expense },
    { label: 'Lent to people', value: -report.lent },
    { label: 'Repayments received', value: report.repaidIn },
    { label: 'Borrowed', value: report.borrowed },
    { label: 'Repayments made', value: -report.repaidOut },
    { label: 'Transfers', value: null },
    { label: 'Total available now', value: report.closing, bold: true },
  ];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.back()} />
        <AppText variant="title">{monthLabel}</AppText>
      </View>

      <GlassCard>
        <View style={{ gap: 12 }}>
          {rows.map((r) => (
            <View
              key={r.label}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingTop: r.bold ? 12 : 0,
                borderTopWidth: r.bold ? 1 : 0,
                borderTopColor: theme.line,
              }}
            >
              <AppText variant={r.bold ? 'heading' : 'body2'}>{r.label}</AppText>
              <AppText variant={r.bold ? 'amount' : 'body'} style={r.bold ? { fontSize: 17 } : undefined}>
                {r.value === null ? 'no net effect' : r.bold ? privacy.fmtTotal(r.value) : privacy.fmt(r.value, true)}
              </AppText>
            </View>
          ))}
        </View>
      </GlassCard>

      <AppText variant="label" style={{ paddingHorizontal: 5 }}>
        Largest transactions
      </AppText>
      <GlassCard padding={4}>
        {largest.map((t) => (
          <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}>
            <AppText variant="body">{transactionTitle(t, accounts)}</AppText>
            <AppText variant="body">{privacy.fmt(t.amount)}</AppText>
          </View>
        ))}
      </GlassCard>

      <AppText variant="label" style={{ paddingHorizontal: 5 }}>
        Where balances landed
      </AppText>
      <GlassCard padding={4}>
        {accounts
          .filter((a) => a.type !== 'credit')
          .map((a) => (
            <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}>
              <AppText variant="body">{a.name}</AppText>
              <AppText variant="body">{privacy.fmt(balance(a, transactions))}</AppText>
            </View>
          ))}
      </GlassCard>
    </Screen>
  );
}
