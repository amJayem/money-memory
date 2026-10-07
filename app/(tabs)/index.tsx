import React, { useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from 'react-native';
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
import { useHideNavBarOnScroll } from '@/hooks/useHideNavBarOnScroll';
import { useToastStore } from '@/store/toastStore';
import { balance, budgetStatusLine, creditLeft, creditUsed, peopleAgg } from '@/domain/money';
import { formatAmount } from '@/domain/format';
import { sortedTransactions, transactionIcon, transactionSub, transactionTitle } from '@/domain/search';
import { ACCOUNT_TYPE_LABEL } from '@/theme/tokens';
import { useTranslation } from '@/i18n/useTranslation';

type QuickActionType = 'expense' | 'income' | 'transfer' | 'lent' | 'borrowed' | 'repay_in' | 'repay_out';
const QUICK_ACTIONS: { labelKey: 'actionSpent' | 'actionGot' | 'actionMoved' | 'actionLent' | 'actionBorrowed' | 'actionGotPaid' | 'actionPaidBack'; type: QuickActionType; icon: string; tone: 'neg' | 'pos' | 'warn' | 'neutral' }[] = [
  { labelKey: 'actionSpent', type: 'expense', icon: '−', tone: 'neg' },
  { labelKey: 'actionGot', type: 'income', icon: '+', tone: 'pos' },
  { labelKey: 'actionMoved', type: 'transfer', icon: '⇄', tone: 'neutral' },
  { labelKey: 'actionLent', type: 'lent', icon: '→', tone: 'warn' },
  { labelKey: 'actionBorrowed', type: 'borrowed', icon: '←', tone: 'warn' },
  { labelKey: 'actionGotPaid', type: 'repay_in', icon: '↩', tone: 'pos' },
  { labelKey: 'actionPaidBack', type: 'repay_out', icon: '↪', tone: 'neg' },
];

const WALLET_CARD_STEP = 309; // card width 296 + 13 gap

/** Design's masked card-number readout — a stable pseudo-random 4-digit tail derived from the account id. */
function digitsFor(id: string): string {
  const n = 1000 + (id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 9000);
  return `•••• ${n}`;
}

const MONTH_KEYS = ['month0', 'month1', 'month2', 'month3', 'month4', 'month5', 'month6', 'month7', 'month8', 'month9', 'month10', 'month11'] as const;

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const t = useTranslation('home');
  const toast = useToastStore((s) => s.show);
  const { accounts, transactions, settings, spentAmount, liquid, owed, iOwe, budget } = useLedger();
  const privacy = usePrivacy('home');
  const [walletIndex, setWalletIndex] = useState(0);

  function onWalletScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / WALLET_CARD_STEP);
    if (i !== walletIndex) setWalletIndex(i);
  }

  function greeting(): string {
    const h = new Date().getHours();
    if (h < 5) return t('greetingNight');
    if (h < 12) return t('greetingMorning');
    if (h < 17) return t('greetingAfternoon');
    if (h < 21) return t('greetingEvening');
    return t('greetingNight');
  }

  const today = new Date();
  const monthLabel = t(MONTH_KEYS[today.getMonth()]);
  // The full weekday+day headline ("Wednesday, Oct 7") stays in English for
  // now — translating weekday names and short-month forms is its own small
  // scope, left for a follow-up pass rather than half-translating this line.
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(0, daysInMonth - today.getDate());

  const orderedAccounts = [...accounts].sort((a, b) => (a.type === 'credit' ? 1 : 0) - (b.type === 'credit' ? 1 : 0));

  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lentThisMonth = transactions.filter((t) => t.type === 'lent').reduce((s, t) => s + t.amount, 0);
  const recoveredThisMonth = transactions.filter((t) => t.type === 'repay_in').reduce((s, t) => s + t.amount, 0);
  const borrowedThisMonth = transactions.filter((t) => t.type === 'borrowed').reduce((s, t) => s + t.amount, 0);
  const paidBackThisMonth = transactions.filter((t) => t.type === 'repay_out').reduce((s, t) => s + t.amount, 0);

  const recent = sortedTransactions(transactions).slice(0, 6);
  const lentLedger = peopleAgg(transactions, 'lent');
  const peopleOwing = lentLedger.length;
  const totalLentAll = lentLedger.reduce((s, p) => s + p.given, 0);
  const totalRecoveredAll = lentLedger.reduce((s, p) => s + p.back, 0);
  const borrowedLedger = peopleAgg(transactions, 'borrowed');
  const peopleIOwe = borrowedLedger.length;
  const totalBorrowedAll = borrowedLedger.reduce((s, p) => s + p.given, 0);
  const totalPaidBackAll = borrowedLedger.reduce((s, p) => s + p.back, 0);
  const onHomeScroll = useHideNavBarOnScroll();

  return (
    <Screen onScroll={onHomeScroll} scrollEventThrottle={16}>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={WALLET_CARD_STEP}
          decelerationRate="fast"
          onScroll={onWalletScroll}
          scrollEventThrottle={32}
          contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 2, gap: 13 }}
        >
          <Pressable onPress={() => router.push('/accounts')}>
            <WalletCard
              kicker={t('overview')}
              simple
              name={t('totalAvailable')}
              digits="•••• ALL"
              holderLabel={t('allAccountsHolder')}
              amount={privacy.fmtTotal(liquid)}
              sub={
                [
                  orderedAccounts.filter((a) => a.type === 'cash').length ? t('cashCount', { count: String(orderedAccounts.filter((a) => a.type === 'cash').length) }) : '',
                  orderedAccounts.filter((a) => a.type === 'bank' || a.type === 'savings').length
                    ? t('accountsCount', { count: String(orderedAccounts.filter((a) => a.type === 'bank' || a.type === 'savings').length) })
                    : '',
                  orderedAccounts.filter((a) => a.type === 'wallet').length ? t('walletCount', { count: String(orderedAccounts.filter((a) => a.type === 'wallet').length) }) : '',
                  orderedAccounts.filter((a) => a.type === 'debit' || a.type === 'credit').length
                    ? t('cardCount', { count: String(orderedAccounts.filter((a) => a.type === 'debit' || a.type === 'credit').length) })
                    : '',
                ]
                  .filter(Boolean)
                  .join(' · ')
              }
              palette={paletteFor('total')}
              isTotal
              eyeGlyph={privacy.eyeGlyph}
              onEyePress={() => privacy.tapEye(toast)}
            />
          </Pressable>
          {orderedAccounts.map((a) => {
            const credit = a.type === 'credit';
            const used = credit ? creditUsed(a, transactions) : 0;
            const pctUsed = credit ? Math.min(100, (used / Math.max(1, a.limit ?? 1)) * 100) : 0;
            return (
              <Pressable key={a.id} onPress={() => router.push(`/accounts/add?editId=${a.id}`)}>
                <WalletCard
                  kicker={credit ? t('creditCardBorrowed') : ACCOUNT_TYPE_LABEL[a.type]}
                  simple={a.type === 'cash'}
                  name={a.name}
                  digits={digitsFor(a.id)}
                  holderLabel={t('accountHolder')}
                  amount={credit ? privacy.fmtTotal(creditLeft(a, transactions)) : privacy.fmtTotal(balance(a, transactions))}
                  sub={
                    credit
                      ? privacy.hiddenHere
                        ? t('creditLeftNotYours')
                        : t('usedOfLimit', { used: formatAmount(used, settings.currencySymbol), limit: formatAmount(a.limit ?? 0, settings.currencySymbol) })
                      : t('availableToSpend')
                  }
                  palette={paletteFor(a.type)}
                  hasMeter={credit}
                  pctUsed={pctUsed}
                />
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingTop: 9 }}>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {[0, ...orderedAccounts.map((_, i) => i + 1)].map((i) => (
              <View
                key={i}
                style={{
                  width: i === walletIndex ? 16 : 6,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: i === walletIndex ? theme.ink : theme.lineStrong,
                }}
              />
            ))}
          </View>
          <Pressable onPress={() => router.push('/accounts')}>
            <AppText variant="body2" weight="manrope600" color={theme.accentColor} style={{ fontSize: 12.5 }}>
              {t('allAccountsLink')}
            </AppText>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 18, paddingTop: 7, gap: 3 }}>
          {privacy.hintText ? (
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: theme.toneBg('accent'),
              }}
            >
              <AppText variant="mono" color={theme.accentColor}>
                {privacy.hintText}
              </AppText>
            </View>
          ) : null}
          <AppText variant="mono">
            {[t('spendableHint'), owed > 0 ? t('lentOutNotCounted', { amount: privacy.fmt(owed) }) : '', accounts.some((a) => a.type === 'credit') ? t('cardCreditExcluded') : '']
              .filter(Boolean)
              .join(' · ')}
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {QUICK_ACTIONS.map((q) => (
          <Pressable key={q.type} onPress={() => router.push(`/entry/${q.type}`)} style={{ width: '31.5%' }}>
            <GlassCard radius={18} padding={13}>
              <View style={{ alignItems: 'center', gap: 7 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.toneBg(q.tone) }}>
                  <AppText style={{ fontSize: 15 }} color={theme.tone(q.tone)}>
                    {q.icon}
                  </AppText>
                </View>
                <AppText variant="body" style={{ fontSize: 11.5 }}>
                  {t(q.labelKey)}
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
              <AppText variant="heading">{t('monthBudget', { month: monthLabel })}</AppText>
              <View style={{ backgroundColor: theme.toneBg(budget.tone), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <AppText variant="mono" color={theme.tone(budget.tone)}>
                  {budget.noBudget ? t('notSet') : `${budget.pct}%`}
                </AppText>
              </View>
            </View>
            {budget.noBudget ? (
              <AppText variant="body2">{t('setBudgetHint')}</AppText>
            ) : (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <View>
                    <AppText variant="label">{t('leftToSpend')}</AppText>
                    <AppText variant="amount" color={theme.tone(budget.tone)}>
                      {privacy.fmt(Math.max(0, budget.left))}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText variant="mono">
                      {t('spentLabel')} <AppText variant="body">{privacy.fmt(budget.spent)}</AppText>
                    </AppText>
                    <AppText variant="mono">
                      {t('budgetLabel')} <AppText variant="body">{privacy.fmt(budget.budget)}</AppText>
                    </AppText>
                  </View>
                </View>
                <ProgressBar barPct={budget.barPct} overPct={budget.overPct} tone={budget.tone} />
                <AppText variant="body2">{budgetStatusLine(budget, monthLabel, daysRemaining, (n) => formatAmount(n, settings.currencySymbol))}</AppText>
              </>
            )}
          </View>
        </GlassCard>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 11, alignItems: 'stretch' }}>
        <Pressable onPress={() => router.push('/loans')} style={{ flex: 1 }}>
          <GlassCard padding={15} fill>
            <AppText variant="label">{t('youAreOwed')}</AppText>
            <AppText variant="amount" color={theme.tone('warn')} style={{ fontSize: 23, marginTop: 8 }}>
              {privacy.fmt(owed)}
            </AppText>
            <AppText variant="body2" style={{ marginTop: 4 }}>
              {t(peopleOwing === 1 ? 'personOne' : 'personOther', { count: String(peopleOwing) })}
            </AppText>
            {totalLentAll > 0 ? (
              <AppText variant="mono" style={{ marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: theme.line }}>
                {t('allTimeLent', { amount: privacy.fmt(totalLentAll), back: privacy.fmt(totalRecoveredAll) })}
              </AppText>
            ) : null}
          </GlassCard>
        </Pressable>
        {totalBorrowedAll > 0 ? (
          <Pressable onPress={() => router.push('/loans?tab=borrowed')} style={{ flex: 1 }}>
            <GlassCard padding={15} fill>
              <AppText variant="label">{t('youOwe')}</AppText>
              <AppText variant="amount" color={theme.tone('neg')} style={{ fontSize: 23, marginTop: 8 }}>
                {privacy.fmt(iOwe)}
              </AppText>
              <AppText variant="body2" style={{ marginTop: 4 }}>
                {t(peopleIOwe === 1 ? 'personOne' : 'personOther', { count: String(peopleIOwe) })}
              </AppText>
              <AppText variant="mono" style={{ marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: theme.line }}>
                {t('allTimeBorrowed', { amount: privacy.fmt(totalBorrowedAll), back: privacy.fmt(totalPaidBackAll) })}
              </AppText>
            </GlassCard>
          </Pressable>
        ) : null}
      </View>

      <GlassCard padding={15}>
        <AppText variant="label">{t('thisMonth')}</AppText>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="body2">{t('moneyIn')}</AppText>
            <AppText variant="amount" color={theme.tone('pos')} style={{ fontSize: 17, marginTop: 2 }}>
              {privacy.fmt(income)}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body2">{t('moneyOut')}</AppText>
            <AppText variant="amount" color={theme.tone('neg')} style={{ fontSize: 17, marginTop: 2 }}>
              {privacy.fmt(expense)}
            </AppText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: theme.line }}>
          <View style={{ flex: 1 }}>
            <AppText variant="body2">{t('lentLabel')}</AppText>
            <AppText variant="amount" color={theme.tone('warn')} style={{ fontSize: 17, marginTop: 2 }}>
              {privacy.fmt(lentThisMonth)}
            </AppText>
            <AppText variant="mono" style={{ marginTop: 2 }}>
              {t('backAmount', { amount: privacy.fmt(recoveredThisMonth) })}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body2">{t('borrowedLabel')}</AppText>
            <AppText variant="amount" color={theme.tone('warn')} style={{ fontSize: 17, marginTop: 2 }}>
              {privacy.fmt(borrowedThisMonth)}
            </AppText>
            <AppText variant="mono" style={{ marginTop: 2 }}>
              {t('backAmount', { amount: privacy.fmt(paidBackThisMonth) })}
            </AppText>
          </View>
        </View>
      </GlassCard>

      <GlassCard padding={5}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 }}>
          <AppText variant="heading">{t('recentActivity')}</AppText>
          <Pressable onPress={() => router.push('/history')}>
            <AppText variant="body2" weight="manrope600" color={theme.accentColor} style={{ fontSize: 12.5 }}>
              {t('seeAll')}
            </AppText>
          </Pressable>
        </View>
        {recent.length === 0 ? (
          <AppText variant="body2" style={{ padding: 16, textAlign: 'center' }}>
            {t('noTransactionsYet')}
          </AppText>
        ) : (
          recent.map((tx) => (
            <TransactionRow
              key={tx.id}
              title={transactionTitle(tx, accounts)}
              sub={transactionSub(tx, accounts)}
              icon={transactionIcon(tx)}
              amountText={privacy.fmt(tx.type === 'expense' || tx.type === 'lent' || tx.type === 'repay_out' ? -tx.amount : tx.amount, true)}
              type={tx.type}
              onPress={() => router.push(`/transaction/${tx.id}`)}
            />
          ))
        )}
      </GlassCard>

      <Pressable onPress={() => router.push('/report')}>
        <GlassCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{t('monthSummary', { month: monthLabel })}</AppText>
              <AppText variant="body2" style={{ marginTop: 2 }}>
                {t('monthSummarySub')}
              </AppText>
            </View>
            <AppText style={{ fontSize: 16, color: theme.ink3 }}>→</AppText>
          </View>
        </GlassCard>
      </Pressable>
    </Screen>
  );
}
