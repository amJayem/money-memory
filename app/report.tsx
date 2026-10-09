import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { TransactionRow } from '@/components/TransactionRow';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { balance, monthlyReport } from '@/domain/money';
import { sortedTransactions, transactionIcon, transactionSub, transactionTitle, type Translate } from '@/domain/search';
import type { Tone } from '@/theme/tokens';
import { useTranslation } from '@/i18n/useTranslation';

export default function ReportScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { accounts, transactions } = useLedger();
  const privacy = usePrivacy('report');
  const t = useTranslation('report');
  const tc = useTranslation('common') as unknown as Translate;

  const now = new Date();
  const monthLabel = `${tc(`monthShort${now.getMonth()}`)} ${now.getFullYear()}`;
  const monthShort = tc(`monthShort${now.getMonth()}`);
  const report = monthlyReport(accounts, transactions);

  const largest = sortedTransactions(transactions)
    .filter((t) => t.type !== 'transfer')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  const rows: { label: string; value: number | null; tone?: Tone; bold?: boolean }[] = [
    { label: t('totalAvailableOn', { month: monthShort }), value: report.opening },
    { label: t('moneyIn'), value: report.income, tone: 'pos' },
    { label: t('moneyOut'), value: -report.expense, tone: 'neg' },
    { label: t('lentToPeople'), value: -report.lent, tone: 'warn' },
    { label: t('repaymentsReceived'), value: report.repaidIn, tone: 'pos' },
    { label: t('transfers'), value: null },
    { label: t('totalAvailableNow'), value: report.closing, bold: true },
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
              <AppText
                variant={r.bold ? 'amount' : 'body'}
                color={r.tone ? theme.tone(r.tone) : undefined}
                style={r.bold ? { fontSize: 17 } : undefined}
              >
                {r.value === null ? t('noNetEffect') : r.bold ? privacy.fmtTotal(r.value) : privacy.fmt(r.value, true)}
              </AppText>
            </View>
          ))}
        </View>
      </GlassCard>

      <AppText variant="label" style={{ paddingHorizontal: 5 }}>
        {t('largestTransactions')}
      </AppText>
      <GlassCard padding={4}>
        {largest.map((tx) => (
          <TransactionRow
            key={tx.id}
            title={transactionTitle(tx, accounts, tc)}
            sub={transactionSub(tx, accounts, tc)}
            icon={transactionIcon(tx)}
            amountText={privacy.fmt(tx.type === 'expense' || tx.type === 'lent' || tx.type === 'repay_out' ? -tx.amount : tx.amount, true)}
            type={tx.type}
            onPress={() => router.push(`/transaction/${tx.id}`)}
          />
        ))}
      </GlassCard>

      <AppText variant="label" style={{ paddingHorizontal: 5 }}>
        {t('whereBalancesLanded')}
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
