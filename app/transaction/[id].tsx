import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/appStore';
import { useToastStore } from '@/store/toastStore';
import { usePrivacy } from '@/hooks/usePrivacy';
import { transactionSub, transactionTitle } from '@/domain/search';
import { formatAmount } from '@/domain/format';

const TYPE_LABEL: Record<string, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  lent: 'Lent',
  borrowed: 'Borrowed',
  repay_in: 'Repayment received',
  repay_out: 'Repayment made',
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
  const negative = t.type === 'expense' || t.type === 'lent' || t.type === 'repay_out';
  const tone = negative ? 'neg' : t.type === 'transfer' ? 'neutral' : 'pos';

  function askDelete() {
    setConfirmOpen(true);
  }

  function confirmDelete() {
    deleteTransaction(t!.id);
    toast('Transaction deleted · everything recalculated');
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
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 6 }}>
          <AppText variant="body">{transactionTitle(t, accounts)}</AppText>
          <AppText variant="amount" color={theme.tone(tone)} style={{ fontSize: 30 }}>
            {privacy.fmt(t.amount)}
          </AppText>
          <AppText variant="mono">{new Date(t.at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</AppText>
        </View>

        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 14, gap: 12 }}>
          <Row label="Type" value={TYPE_LABEL[t.type]} />
          {t.category ? <Row label="Category" value={t.category} /> : null}
          {t.person ? <Row label="Person" value={t.person} /> : null}
          <Row label={t.type === 'transfer' ? 'Out of' : 'Account'} value={accName(t.account)} />
          {t.toAccount ? <Row label="Into" value={accName(t.toAccount)} /> : null}
          {t.note ? <Row label="Note" value={t.note} /> : null}
          {t.editedAt ? <Row label="Edited" value={new Date(t.editedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} /> : null}
        </View>

        <AppText variant="body2" style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.line }}>
          {transactionSub(t, accounts)}
        </AppText>
      </GlassCard>

      <View style={{ flexDirection: 'row', gap: 11 }}>
        <Pressable
          onPress={() => router.push(`/entry/${t.type}?editId=${t.id}`)}
          style={{ flex: 1, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 16, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText variant="body">Edit</AppText>
        </Pressable>
        <Pressable onPress={askDelete} style={{ flex: 1, backgroundColor: theme.toneBg('neg'), borderRadius: 16, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="body" color={theme.tone('neg')}>
            Delete
          </AppText>
        </Pressable>
      </View>

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <AppText variant="body2">{label}</AppText>
      <AppText variant="body" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}
