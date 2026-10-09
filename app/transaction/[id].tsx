import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TRANSACTION_TONE } from '@/components/TransactionRow';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/appStore';
import { useToastStore } from '@/store/toastStore';
import { usePrivacy } from '@/hooks/usePrivacy';
import { transactionIcon, transactionTitle, type Translate } from '@/domain/search';
import { formatAmount } from '@/domain/format';
import { useTranslation } from '@/i18n/useTranslation';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const privacy = usePrivacy('txdetail');
  const t = useTranslation('transaction');
  const tc = useTranslation('common') as unknown as Translate;
  const accounts = useAppStore((s) => s.accounts);
  const transactions = useAppStore((s) => s.transactions);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const tx = transactions.find((x) => x.id === id);
  if (!tx) {
    return (
      <Screen>
        <AppText variant="body">{t('notFound')}</AppText>
      </Screen>
    );
  }

  const accName = (accId?: string) => accounts.find((a) => a.id === accId)?.name ?? accId ?? '';
  const tone = TRANSACTION_TONE[tx.type];
  const amountColor = tone === 'pos' || tone === 'neg' ? theme.tone(tone) : theme.ink;
  const when = new Date(tx.at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const monthLabel = tc(`monthShort${new Date(tx.at).getMonth()}`);

  const echo =
    tx.type === 'transfer'
      ? t('echoTransfer')
      : tx.type === 'expense'
        ? tx.excludeFromBudget
          ? t('echoExcluded', { month: monthLabel })
          : t('echoCountedExpense', { month: monthLabel, category: tx.category ?? '' })
        : tx.type === 'income'
          ? t('echoCountedIncome', { month: monthLabel })
          : tx.type === 'lent'
            ? t('echoLent', { person: tx.person ?? '' })
            : tx.type === 'repay_in'
              ? t('echoRepayIn')
              : tx.type === 'borrowed'
                ? t('echoBorrowed', { person: tx.person ?? '' })
                : t('echoRepayOut', { person: tx.person ?? '' });

  const TYPE_LABEL: Record<string, string> = {
    expense: t('typeMoneyOut'),
    income: t('typeMoneyIn'),
    transfer: t('typeTransfer'),
    lent: t('typeLent'),
    borrowed: t('typeBorrowed'),
    repay_in: t('typeRepayIn'),
    repay_out: t('typeRepayOut'),
  };

  const rows: { label: string; value: string }[] = [
    { label: t('rowType'), value: TYPE_LABEL[tx.type] },
    ...(tx.category ? [{ label: t('rowCategory'), value: tx.category }] : []),
    ...(tx.person ? [{ label: t('rowPerson'), value: tx.person }] : []),
    { label: tx.type === 'transfer' ? t('rowOutOf') : t('rowPaidUsing'), value: accName(tx.account) },
    ...(tx.toAccount ? [{ label: t('rowInto'), value: accName(tx.toAccount) }] : []),
    { label: t('rowWhen'), value: when },
    ...(tx.note ? [{ label: t('rowNote'), value: tx.note }] : []),
    ...(tx.editedAt ? [{ label: t('rowEdited'), value: new Date(tx.editedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) }] : []),
  ];

  function askDelete() {
    setConfirmOpen(true);
  }

  function confirmDelete() {
    const removed = tx!;
    deleteTransaction(removed.id);
    toast(t('toastDeleted'), {
      label: t('toastUndo'),
      onPress: () => addTransaction(removed),
    });
    setConfirmOpen(false);
    if (router.canGoBack()) router.back();
    else router.push('/');
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.back()} />
        <AppText variant="title">{t('title')}</AppText>
      </View>

      <GlassCard>
        <View style={{ alignItems: 'center', gap: 9, paddingVertical: 6 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.toneBg(tone),
            }}
          >
            <AppText color={theme.tone(tone)} weight="manrope700" style={{ fontSize: 20 }}>
              {transactionIcon(tx)}
            </AppText>
          </View>
          <AppText variant="body">{transactionTitle(tx, accounts, tc)}</AppText>
          <AppText variant="amount" color={amountColor} style={{ fontSize: 30 }}>
            {privacy.fmt(tx.amount)}
          </AppText>
          <AppText variant="mono">{when}</AppText>
        </View>

        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: theme.line }}>
          {rows.map((r, i) => (
            <View
              key={r.label}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 12,
                paddingVertical: 9,
                borderBottomWidth: i < rows.length - 1 ? 1 : 0,
                borderBottomColor: theme.line,
              }}
            >
              <AppText variant="body2">{r.label}</AppText>
              <AppText variant="body" style={{ flexShrink: 1, textAlign: 'right' }}>
                {r.value}
              </AppText>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 11, marginTop: 14 }}>
          <Pressable
            onPress={() => router.push(`/entry/${tx.type}?editId=${tx.id}`)}
            style={{ flex: 1, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 15, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText variant="body">{tc('edit')}</AppText>
          </Pressable>
          <Pressable onPress={askDelete} style={{ flex: 1, backgroundColor: theme.toneBg('neg'), borderRadius: 15, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="body" color={theme.tone('neg')}>
              {tc('delete')}
            </AppText>
          </Pressable>
        </View>
      </GlassCard>

      <AppText variant="body2" style={{ paddingHorizontal: 4 }}>
        {echo}
      </AppText>

      <ConfirmDialog
        visible={confirmOpen}
        title={t('deleteTitle')}
        body={
          tx.person
            ? t('deleteBodyWithPerson', { summary: `${transactionTitle(tx, accounts, tc)} · ${formatAmount(tx.amount, '')}${tx.category ? ' · ' + tx.category : ''}`, person: tx.person })
            : t('deleteBodyNoPerson', { summary: `${transactionTitle(tx, accounts, tc)} · ${formatAmount(tx.amount, '')}${tx.category ? ' · ' + tx.category : ''}` })
        }
        confirmLabel={tc('delete')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </Screen>
  );
}
