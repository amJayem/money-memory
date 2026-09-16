import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { Chip } from '@/components/Chip';
import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/appStore';
import { useToastStore } from '@/store/toastStore';
import { ACCOUNT_TYPE_LABEL } from '@/theme/tokens';
import type { AccountType } from '@/domain/types';

const TYPES: AccountType[] = ['cash', 'bank', 'debit', 'credit', 'wallet', 'savings'];

export default function AddAccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const addAccount = useAppStore((s) => s.addAccount);
  const toast = useToastStore((s) => s.show);

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [amount, setAmount] = useState('');

  function save() {
    if (!name.trim()) {
      toast('Give the account a name first');
      return;
    }
    const opening = parseFloat(amount) || 0;
    addAccount({
      id: `acc${Date.now()}`,
      name: name.trim(),
      type,
      openingBalance: type === 'credit' ? 0 : opening,
      limit: type === 'credit' ? opening : undefined,
      openingUsed: type === 'credit' ? 0 : undefined,
    });
    toast('Account added');
    router.back();
  }

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.back()} />
        <AppText variant="title">Add account</AppText>
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TYPES.map((t) => (
                <Chip key={t} label={ACCOUNT_TYPE_LABEL[t]} active={type === t} onPress={() => setType(t)} />
              ))}
            </View>
          </View>

          <View>
            <AppText variant="label" style={{ marginBottom: 8 }}>
              {type === 'credit' ? 'Credit limit' : 'Money in it now'}
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
              Save account
            </AppText>
          </Pressable>
        </View>
      </GlassCard>
    </Screen>
  );
}
