import React from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { ProgressBar } from '@/components/ProgressBar';
import { TransactionRow } from '@/components/TransactionRow';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { outstandingFor, statusLabel, statusTone } from '@/domain/money';
import { sortedTransactions, transactionIcon, transactionSub, transactionTitle } from '@/domain/search';

export default function PersonScreen() {
  const { name, kind } = useLocalSearchParams<{ name: string; kind?: string }>();
  const person = decodeURIComponent(name ?? '');
  const direction: 'lent' | 'borrowed' = kind === 'borrowed' ? 'borrowed' : 'lent';
  const theme = useTheme();
  const router = useRouter();
  const { accounts, transactions } = useLedger();
  const privacy = usePrivacy('person');

  const ledger = outstandingFor(transactions, direction, person);
  const cleared = ledger.out <= 0 && ledger.given > 0;
  const tone = statusTone(ledger);
  const pct = ledger.given > 0 ? Math.min(100, (ledger.back / ledger.given) * 100) : 0;

  const related = sortedTransactions(transactions.filter((t) => t.person === person));

  const ctaLabel = direction === 'lent' ? (cleared ? 'Lend again' : 'Record a repayment') : cleared ? 'Borrow again' : 'Record a payment';
  const ctaType = direction === 'lent' ? 'repay_in' : 'repay_out';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.back()} />
        <AppText variant="title" numberOfLines={1}>
          {person}
        </AppText>
      </View>

      <GlassCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 54, height: 54, borderRadius: 19, backgroundColor: theme.toneBg(tone), alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="heading" color={theme.tone(tone)} style={{ fontSize: 21 }}>
              {person[0]?.toUpperCase()}
            </AppText>
          </View>
          <View>
            <AppText variant="label">{direction === 'lent' ? 'Outstanding to you' : 'You still owe'}</AppText>
            <AppText variant="amount" style={{ fontSize: 24, marginTop: 4 }}>
              {privacy.fmt(Math.max(0, ledger.out))}
            </AppText>
            <View style={{ alignSelf: 'flex-start', backgroundColor: theme.toneBg(tone), borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, marginTop: 6 }}>
              <AppText variant="mono" color={theme.tone(tone)} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {statusLabel(ledger)}
              </AppText>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 13, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="body2">{direction === 'lent' ? 'Lent' : 'Borrowed'}</AppText>
            <AppText variant="body" style={{ marginTop: 4 }}>
              {privacy.fmt(ledger.given)}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body2">{direction === 'lent' ? 'Received' : 'Paid back'}</AppText>
            <AppText variant="body" color={theme.tone('pos')} style={{ marginTop: 4 }}>
              {privacy.fmt(ledger.back)}
            </AppText>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <ProgressBar barPct={pct} tone="pos" height={8} />
        </View>
        {cleared ? (
          <AppText variant="body2" style={{ marginTop: 10 }}>
            Settled in full — kept here so it stays searchable.
          </AppText>
        ) : null}
        <Pressable onPress={() => router.push(`/entry/${ctaType}?person=${encodeURIComponent(person)}`)} style={{ backgroundColor: theme.ink, borderRadius: 16, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
          <AppText color={theme.solid} weight="manrope700">
            {ctaLabel}
          </AppText>
        </Pressable>
      </GlassCard>

      <AppText variant="label" style={{ paddingHorizontal: 5 }}>
        Timeline
      </AppText>
      <GlassCard padding={4}>
        {related.map((t) => (
          <TransactionRow
            key={t.id}
            title={transactionTitle(t, accounts)}
            sub={transactionSub(t, accounts)}
            icon={transactionIcon(t)}
            amountText={privacy.fmt(t.type === 'expense' || t.type === 'lent' || t.type === 'repay_out' ? -t.amount : t.amount, true)}
            type={t.type}
            onPress={() => router.push(`/transaction/${t.id}`)}
          />
        ))}
      </GlassCard>
    </Screen>
  );
}
