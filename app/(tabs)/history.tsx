import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { Chip } from '@/components/Chip';
import { GhostButton } from '@/components/GhostButton';
import { GlassCard } from '@/components/GlassCard';
import { TransactionRow } from '@/components/TransactionRow';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { filterLabel, groupByDay, matchesFilter, matchesQuery, transactionIcon, transactionSub, transactionTitle, type Translate, type TxFilter } from '@/domain/search';
import { useTranslation } from '@/i18n/useTranslation';

const FILTERS: TxFilter[] = ['All', 'Money out', 'Money in', 'Transfers', 'Loans', 'Cash', 'Cards'];

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { accounts, transactions, settings } = useLedger();
  const privacy = usePrivacy('transactions');
  const t = useTranslation('history');
  const tc = useTranslation('common') as unknown as Translate;
  const params = useLocalSearchParams<{ category?: string }>();
  const [query, setQuery] = useState(params.category ?? '');
  const [filter, setFilter] = useState<TxFilter>(params.category ? 'Money out' : 'All');

  const filtered = transactions.filter((tx) => matchesFilter(tx, filter, accounts) && matchesQuery(tx, query, accounts, tc));
  const groups = groupByDay(filtered, settings.currencySymbol, tc);
  const sum = filtered.reduce((s, tx) => s + tx.amount, 0);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconButton glyph="←" onPress={() => (router.canGoBack() ? router.back() : router.push('/'))} />
          <AppText variant="title">{t('title')}</AppText>
        </View>
        <GhostButton label={t('calendar')} onPress={() => router.push('/calendar')} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.solid, borderRadius: 16, paddingHorizontal: 13, minHeight: 46, overflow: 'hidden' }}>
        <AppText color={theme.ink3}>⌕</AppText>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={theme.ink3}
          style={{ flex: 1, color: theme.ink, fontSize: 13.5 }}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <AppText color={theme.ink2}>×</AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {FILTERS.map((f) => (
          <Chip key={f} label={filterLabel(f, tc)} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="mono">
          {filtered.length === 1 ? t('txCountOne', { count: String(filtered.length) }) : t('txCountOther', { count: String(filtered.length) })}
        </AppText>
        <AppText variant="mono">{privacy.fmt(sum)}</AppText>
      </View>

      {groups.length === 0 ? (
        <View style={{ padding: 32, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 22 }}>
          <AppText variant="heading">{transactions.length === 0 ? t('noneYet') : t('nothingMatched')}</AppText>
          <AppText variant="body2" style={{ textAlign: 'center' }}>
            {transactions.length === 0 ? t('noneYetHint') : t('nothingMatchedHint')}
          </AppText>
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.label} style={{ gap: 7 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 }}>
              <AppText variant="label">{g.label}</AppText>
              <AppText variant="mono">{g.total}</AppText>
            </View>
            <GlassCard padding={4}>
              {g.items.map((tx) => (
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
          </View>
        ))
      )}
    </Screen>
  );
}
