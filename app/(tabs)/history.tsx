import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useBlurTarget } from '@/components/BlurTargetContext';
import { groupByDay, matchesFilter, matchesQuery, transactionIcon, transactionSub, transactionTitle, type TxFilter } from '@/domain/search';

const FILTERS: TxFilter[] = ['All', 'Money out', 'Money in', 'Transfers', 'Loans', 'Cash', 'Cards'];

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const blurTarget = useBlurTarget();
  const { accounts, transactions, settings } = useLedger();
  const privacy = usePrivacy('transactions');
  const params = useLocalSearchParams<{ category?: string }>();
  const [query, setQuery] = useState(params.category ?? '');
  const [filter, setFilter] = useState<TxFilter>(params.category ? 'Money out' : 'All');

  const filtered = transactions.filter((t) => matchesFilter(t, filter, accounts) && matchesQuery(t, query, accounts));
  const groups = groupByDay(filtered, settings.currencySymbol);
  const sum = filtered.reduce((s, t) => s + t.amount, 0);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconButton glyph="←" onPress={() => (router.canGoBack() ? router.back() : router.push('/'))} />
          <AppText variant="title">Transactions</AppText>
        </View>
        <GhostButton label="Calendar" onPress={() => router.push('/calendar')} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.line, borderRadius: 16, paddingHorizontal: 13, minHeight: 46, overflow: 'hidden' }}>
        <BlurView intensity={40} tint={theme.mode} blurMethod="dimezisBlurView" blurTarget={blurTarget ?? undefined} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={theme.surfaceGradient as unknown as [string, string]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
        <AppText color={theme.ink3}>⌕</AppText>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rahim · 450 · Food · Cash"
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
          <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="mono">
          {filtered.length} transaction{filtered.length === 1 ? '' : 's'}
        </AppText>
        <AppText variant="mono">{privacy.fmt(sum)}</AppText>
      </View>

      {groups.length === 0 ? (
        <View style={{ padding: 32, alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.lineStrong, borderRadius: 22 }}>
          <AppText variant="heading">{transactions.length === 0 ? 'No transactions yet' : 'Nothing matched that'}</AppText>
          <AppText variant="body2" style={{ textAlign: 'center' }}>
            {transactions.length === 0
              ? 'Record your first expense and this becomes the history you can search months from now.'
              : "Try a person's name, an amount, a category, or the account you paid from."}
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
              {g.items.map((t) => (
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
          </View>
        ))
      )}
    </Screen>
  );
}
