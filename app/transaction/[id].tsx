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
import { transactionIcon, transactionTitle } from '@/domain/search';
import { formatAmount } from '@/domain/format';

const TYPE_LABEL: Record<string, string> = {
  expense: 'Money out',
  income: 'Money in',
  transfer: 'Transfer between your accounts',
  lent: 'Money you lent',
  borrowed: 'Money you borrowed',
  repay_in: 'Repayment received',
  repay_out: 'Repayment you made',
};

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const privacy = usePrivacy('txdetail');
  const accounts = useAppStore((s) => s.accounts);
  const transactions = useAppStore((s) => s.transactions);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const t = transactions.find((x) => x.id === id);
  if (!t) {
    return (
      <Screen>
        <AppText variant="body">Transaction not found.</AppText>
      </Screen>
    );
  }

  const accName = (accId?: string) => accounts.find((a) => a.id === accId)?.name ?? accId ?? '';
  const tone = TRANSACTION_TONE[t.type];
  const amountColor = tone === 'pos' || tone === 'neg' ? theme.tone(tone) : theme.ink;
  const when = new Date(t.at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const monthLabel = new Date(t.at).toLocaleDateString('en-US', { month: 'long' });

  const echo =
    t.type === 'transfer'
      ? 'Transfers move money between your own accounts — they never count as income or spending.'
      : t.type === 'expense'
        ? `Counted in ${monthLabel} spending and in your ${t.category} category.`
        : t.type === 'lent'
          ? `${t.person}'s outstanding balance includes this amount.`
          : t.type === 'repay_in'
            ? 'Recorded as money returning to you, not as new income.'
            : 'Recorded against your balance and this person.';

  const rows: { label: string; value: string }[] = [
    { label: 'Type', value: TYPE_LABEL[t.type] },
    ...(t.category ? [{ label: 'Category', value: t.category }] : []),
    ...(t.person ? [{ label: 'Person', value: t.person }] : []),
    { label: t.type === 'transfer' ? 'Out of' : 'Paid using', value: accName(t.account) },
    ...(t.toAccount ? [{ label: 'Into', value: accName(t.toAccount) }] : []),
    { label: 'When', value: when },
    ...(t.note ? [{ label: 'Note', value: t.note }] : []),
    ...(t.editedAt ? [{ label: 'Edited', value: new Date(t.editedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) }] : []),
  ];

  function askDelete() {
    setConfirmOpen(true);
  }

  function confirmDelete() {
    const removed = t!;
    deleteTransaction(removed.id);
    toast('Transaction deleted · everything recalculated', {
      label: 'Undo',
      onPress: () => addTransaction(removed),
    });
    setConfirmOpen(false);
    router.back();
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.back()} />
        <AppText variant="title">Transaction</AppText>
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
              {transactionIcon(t)}
            </AppText>
          </View>
          <AppText variant="body">{transactionTitle(t, accounts)}</AppText>
          <AppText variant="amount" color={amountColor} style={{ fontSize: 30 }}>
            {privacy.fmt(t.amount)}
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
            onPress={() => router.push(`/sheet?editId=${t.id}`)}
            style={{ flex: 1, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 15, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText variant="body">Edit</AppText>
          </Pressable>
          <Pressable onPress={askDelete} style={{ flex: 1, backgroundColor: theme.toneBg('neg'), borderRadius: 15, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="body" color={theme.tone('neg')}>
              Delete
            </AppText>
          </Pressable>
        </View>
      </GlassCard>

      <AppText variant="body2" style={{ paddingHorizontal: 4 }}>
        {echo}
      </AppText>

      <ConfirmDialog
        visible={confirmOpen}
        title="Delete this transaction?"
        body={`${transactionTitle(t, accounts)} · ${formatAmount(t.amount, '')}${t.category ? ' · ' + t.category : ''}. Deleting this updates your ${t.person ? `account balance and ${t.person}'s outstanding amount` : 'account balance, budget and statistics'}.`}
        confirmLabel="Delete"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </Screen>
  );
}
