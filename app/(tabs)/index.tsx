import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { ProgressBar } from '@/components/ProgressBar';
import { TransactionRow } from '@/components/TransactionRow';
import { WalletCard, paletteFor } from '@/components/WalletCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { useToastStore } from '@/store/toastStore';
import { balance, budgetStatusLine, creditLeft, creditUsed } from '@/domain/money';
import { formatAmount } from '@/domain/format';
import { sortedTransactions, transactionIcon, transactionSub, transactionTitle } from '@/domain/search';
import { ACCOUNT_TYPE_LABEL } from '@/theme/tokens';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

const QUICK_ACTIONS: { label: string; type: 'expense' | 'income' | 'lent' | 'transfer'; icon: string; tone: 'neg' | 'pos' | 'warn' | 'neutral' }[] = [
  { label: 'Spent', type: 'expense', icon: '−', tone: 'neg' },
  { label: 'Received', type: 'income', icon: '+', tone: 'pos' },
  { label: 'Lent', type: 'lent', icon: '→', tone: 'warn' },
  { label: 'Moved', type: 'transfer', icon: '⇄', tone: 'neutral' },
];

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const { accounts, transactions, settings, spentAmount, liquid, owed, budget } = useLedger();
  const privacy = usePrivacy('home');

  const today = new Date();
  const monthLabel = today.toLocaleDateString('en-US', { month: 'long' });
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - today.getDate());

  const orderedAccounts = [...accounts].sort((a, b) => (a.type === 'credit' ? 1 : 0) - (b.type === 'credit' ? 1 : 0));

  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lentThisMonth = transactions.filter((t) => t.type === 'lent').reduce((s, t) => s + t.amount, 0);
  const recoveredThisMonth = transactions.filter((t) => t.type === 'repay_in').reduce((s, t) => s + t.amount, 0);

  const recent = sortedTransactions(transactions).slice(0, 6);
  const peopleOwing = new Set(transactions.filter((t) => t.type === 'lent').map((t) => t.person)).size;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 4 }}>
        <View>
          <AppText variant="label">{greeting()}</AppText>
          <AppText variant="title" style={{ marginTop: 3 }}>
            {dateLabel}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton glyph="⌕" onPress={() => router.push('/history')} />
          <IconButton glyph="⚙" onPress={() => router.push('/settings')} />
        </View>
      </View>

      <View style={{ marginHorizontal: -18 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={309} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 18, gap: 13 }}>
          <WalletCard
            kicker="Money Memory"
            name="Total available"
            amount={privacy.fmtTotal(liquid)}
            sub={`${orderedAccounts.filter((a) => a.type !== 'credit').length} accounts`}
            palette={paletteFor('total')}
            isTotal
            eyeGlyph={privacy.eyeGlyph}
            onEyePress={() => privacy.tapEye(toast)}
          />
          {orderedAccounts.map((a) => {
            const credit = a.type === 'credit';
            const used = credit ? creditUsed(a, transactions) : 0;
            const pctUsed = credit ? Math.min(100, (used / Math.max(1, a.limit ?? 1)) * 100) : 0;
            return (
              <WalletCard
                key={a.id}
                kicker={credit ? 'Credit card · borrowed' : ACCOUNT_TYPE_LABEL[a.type]}
                name={a.name}
                amount={credit ? privacy.fmtTotal(creditLeft(a, transactions)) : privacy.fmtTotal(balance(a, transactions))}
                sub={credit ? (privacy.hiddenHere ? 'Credit left · not your money' : `${formatAmount(used, settings.currencySymbol)} used of ${formatAmount(a.limit ?? 0, settings.currencySymbol)}`) : 'Available to spend'}
                palette={paletteFor(a.type)}
                hasMeter={credit}
                pctUsed={pctUsed}
              />
            );
          })}
        </ScrollView>
        <Pressable onPress={() => router.push('/accounts')} style={{ paddingTop: 9 }}>
          <AppText variant="mono" color={theme.accentColor} style={{ textAlign: 'right' }}>
            All accounts →
          </AppText>
        </Pressable>
        {privacy.hintText ? (
          <AppText variant="mono" color={theme.accentColor} style={{ marginTop: 6 }}>
            {privacy.hintText}
          </AppText>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 9 }}>
        {QUICK_ACTIONS.map((q) => (
          <Pressable key={q.type} onPress={() => router.push(`/entry/${q.type}`)} style={{ flex: 1 }}>
            <GlassCard radius={18} padding={13}>
              <View style={{ alignItems: 'center', gap: 7 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.toneBg(q.tone) }}>
                  <AppText style={{ fontSize: 15 }} color={theme.tone(q.tone)}>
                    {q.icon}
                  </AppText>
                </View>
                <AppText variant="body" style={{ fontSize: 11.5 }}>
                  {q.label}
                </AppText>
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => router.push('/budget')}>
        <GlassCard>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <AppText variant="heading">{monthLabel} budget</AppText>
              <View style={{ backgroundColor: theme.toneBg(budget.tone), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <AppText variant="mono" color={theme.tone(budget.tone)}>
                  {budget.noBudget ? 'not set' : `${budget.pct}%`}
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <AppText variant="label">left to spend</AppText>
                <AppText variant="amount" color={theme.tone(budget.tone)}>
                  {privacy.fmt(Math.max(0, budget.left))}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="mono">
                  Spent <AppText variant="body">{privacy.fmt(budget.spent)}</AppText>
                </AppText>
                <AppText variant="mono">
                  Budget <AppText variant="body">{privacy.fmt(budget.budget)}</AppText>
                </AppText>
              </View>
            </View>
            <ProgressBar barPct={budget.barPct} overPct={budget.overPct} tone={budget.tone} />
            <AppText variant="body2">{budgetStatusLine(budget, monthLabel, daysRemaining, (n) => formatAmount(n, settings.currencySymbol))}</AppText>
          </View>
        </GlassCard>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 11 }}>
        <Pressable onPress={() => router.push('/loans')} style={{ flex: 1 }}>
          <GlassCard padding={15}>
            <AppText variant="label">You are owed</AppText>
            <AppText variant="amount" color={theme.tone('warn')} style={{ fontSize: 23, marginTop: 8 }}>
              {privacy.fmt(owed)}
            </AppText>
            <AppText variant="body2" style={{ marginTop: 4 }}>
              {peopleOwing} {peopleOwing === 1 ? 'person' : 'people'}
            </AppText>
          </GlassCard>
        </Pressable>
        <View style={{ flex: 1 }}>
          <GlassCard padding={15}>
            <AppText variant="label">This month</AppText>
            <AppText variant="body2" style={{ marginTop: 8 }}>
              Money in
            </AppText>
            <AppText variant="amount" color={theme.tone('pos')} style={{ fontSize: 17 }}>
              {privacy.fmt(income)}
            </AppText>
            <AppText variant="body2" style={{ marginTop: 6 }}>
              Money out
            </AppText>
            <AppText variant="amount" color={theme.tone('neg')} style={{ fontSize: 17 }}>
              {privacy.fmt(expense)}
            </AppText>
            <AppText variant="mono" style={{ marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: theme.line }}>
              Lent {privacy.fmt(lentThisMonth)} · back {privacy.fmt(recoveredThisMonth)}
            </AppText>
          </GlassCard>
        </View>
      </View>

      <GlassCard padding={5}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 }}>
          <AppText variant="heading">Recent activity</AppText>
          <Pressable onPress={() => router.push('/history')}>
            <AppText variant="mono" color={theme.accentColor}>
              See all
            </AppText>
          </Pressable>
        </View>
        {recent.length === 0 ? (
          <AppText variant="body2" style={{ padding: 16, textAlign: 'center' }}>
            No transactions yet.
          </AppText>
        ) : (
          recent.map((t) => (
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

      <Pressable onPress={() => router.push('/report')}>
        <GlassCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{monthLabel} summary</AppText>
              <AppText variant="body2" style={{ marginTop: 2 }}>
                Everything that moved this month, on one page.
              </AppText>
            </View>
            <AppText style={{ fontSize: 16, color: theme.ink3 }}>→</AppText>
          </View>
        </GlassCard>
      </Pressable>
    </Screen>
  );
}
