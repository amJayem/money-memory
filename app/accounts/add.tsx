import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { Chip } from '@/components/Chip';
import { GhostButton } from '@/components/GhostButton';
import { GlassCard } from '@/components/GlassCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/appStore';
import { useToastStore } from '@/store/toastStore';
import { ACCOUNT_TYPE_LABEL } from '@/theme/tokens';
import type { AccountType } from '@/domain/types';

const TYPES: AccountType[] = ['cash', 'bank', 'debit', 'credit', 'wallet', 'savings'];

export default function AddAccountScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const theme = useTheme();
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);
  const transactions = useAppStore((s) => s.transactions);
  const addAccount = useAppStore((s) => s.addAccount);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const toast = useToastStore((s) => s.show);

  const editing = editId ? accounts.find((a) => a.id === editId) : undefined;
  const relatedCount = editing ? transactions.filter((t) => t.account === editing.id || t.toAccount === editing.id).length : 0;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.push('/accounts');
  }

  const [name, setName] = useState(editing?.name ?? '');
  const [type, setType] = useState<AccountType>(editing?.type ?? 'cash');
  const [amount, setAmount] = useState(editing ? String(editing.type === 'credit' ? editing.limit ?? 0 : editing.openingBalance) : '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const typeLocked = !!editing && relatedCount > 0;

  function save() {
    if (!name.trim()) {
      toast('Give the account a name first');
      return;
    }
    const value = parseFloat(amount) || 0;
    if (editing) {
      updateAccount(editing.id, {
        name: name.trim(),
        type,
        openingBalance: type === 'credit' ? editing.openingBalance : value,
        limit: type === 'credit' ? value : undefined,
      });
      toast('Account updated');
    } else {
      addAccount({
        id: `acc${Date.now()}`,
        name: name.trim(),
        type,
        openingBalance: type === 'credit' ? 0 : value,
        limit: type === 'credit' ? value : undefined,
        openingUsed: type === 'credit' ? 0 : undefined,
      });
      toast('Account added');
    }
    goBack();
  }

  function askDelete() {
    if (relatedCount > 0) {
      toast(`Remove or reassign ${relatedCount} transaction${relatedCount === 1 ? '' : 's'} on this account first`);
      return;
    }
    setConfirmDelete(true);
  }

  function confirmDeleteAccount() {
    if (!editing) return;
    deleteAccount(editing.id);
    toast('Account deleted');
    setConfirmDelete(false);
    goBack();
  }

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={goBack} />
        <AppText variant="title">{editing ? 'Edit account' : 'Add account'}</AppText>
      </View>

      <GlassCard>
        <View style={{ gap: 16 }}>
          <View>
            <AppText variant="label" style={{ marginBottom: 8 }}>
              Name
            </AppText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. City Bank"
              placeholderTextColor={theme.ink3}
              style={{ borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 14, padding: 13, color: theme.ink, fontSize: 14 }}
            />
          </View>

          <View>
            <AppText variant="label" style={{ marginBottom: 8 }}>
              Type
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, opacity: typeLocked ? 0.5 : 1 }}>
              {TYPES.map((t) => (
                <Chip key={t} label={ACCOUNT_TYPE_LABEL[t]} active={type === t} onPress={typeLocked ? () => {} : () => setType(t)} />
              ))}
            </View>
            {typeLocked ? (
              <AppText variant="mono" style={{ marginTop: 6 }}>
                Type is locked once an account has transactions.
              </AppText>
            ) : null}
          </View>

          <View>
            <AppText variant="label" style={{ marginBottom: 8 }}>
              {type === 'credit' ? 'Credit limit' : editing ? 'Starting balance' : 'Money in it now'}
            </AppText>
            <TextInput
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.ink3}
              style={{ borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 14, padding: 13, color: theme.ink, fontSize: 14 }}
            />
          </View>

          <AppText variant="body2">
            We never ask for bank logins, card numbers or OTPs. You type what you know; the numbers stay on this phone.
          </AppText>

          <Pressable onPress={save} style={{ backgroundColor: theme.ink, borderRadius: 18, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}>
            <AppText color={theme.solid} weight="manrope700">
              {editing ? 'Save changes' : 'Save account'}
            </AppText>
          </Pressable>

          {editing ? <GhostButton label="Delete account" tone="neg" fullWidth onPress={askDelete} /> : null}
        </View>
      </GlassCard>

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this account?"
        body="This account has no transactions, so it can be removed cleanly. This can't be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={confirmDeleteAccount}
      />
    </Screen>
  );
}
