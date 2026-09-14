import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { AppSwitch } from '@/components/AppSwitch';
import { SelectModal } from '@/components/SelectModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/appStore';
import { useToastStore } from '@/store/toastStore';
import { ACCENT_THEMES, type AccentTheme } from '@/theme/tokens';
import type { PrivacyScope } from '@/domain/types';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const resetAllData = useAppStore((s) => s.resetAllData);
  const transactions = useAppStore((s) => s.transactions);

  const [currency, setCurrency] = useState(settings.currencySymbol);
  const [accentModal, setAccentModal] = useState(false);
  const [privacyScopeModal, setPrivacyScopeModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function commitCurrency(v: string) {
    setCurrency(v);
    updateSettings({ currencySymbol: v.trim() || '৳' });
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.back()} />
        <AppText variant="title">More</AppText>
      </View>

      <GlassCard>
        <AppText variant="label" style={{ marginBottom: 8 }}>
          Currency symbol
        </AppText>
        <TextInput
          value={currency}
          onChangeText={commitCurrency}
          maxLength={4}
          placeholder="৳"
          placeholderTextColor={theme.ink3}
          style={{ borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 14, padding: 12, color: theme.ink, fontSize: 16, fontWeight: '700', width: 90, textAlign: 'center' }}
        />
        <AppText variant="body2" style={{ marginTop: 8 }}>
          Relabels the app immediately — never converts past amounts.
        </AppText>
      </GlassCard>

      <GlassCard padding={4}>
        <SettingRow label="Accent theme" value={ACCENT_THEMES[settings.accentTheme].label} onPress={() => setAccentModal(true)} />
        <Sep />
        <SwitchRow
          label="Dark appearance"
          sub={settings.appearance === 'system' ? 'Follows system' : settings.appearance === 'dark' ? 'On' : 'Off'}
          value={settings.appearance === 'dark'}
          onValueChange={(v) => updateSettings({ appearance: v ? 'dark' : 'light' })}
        />
        <Sep />
        <SwitchRow label="Privacy mode" value={settings.privacy} onValueChange={(v) => updateSettings({ privacy: v })} />
        <Sep />
        <SettingRow label="What privacy hides" value={settings.privacyScope === 'all' ? 'Everything' : 'Dashboard only'} onPress={() => setPrivacyScopeModal(true)} />
        <Sep />
        <SwitchRow label="Count lent money as spending" value={settings.countLentAsSpending} onValueChange={(v) => updateSettings({ countLentAsSpending: v })} />
        <Sep />
        <SwitchRow label="Budget alerts" sub="Fires at 80% and at overspend" value={settings.budgetAlerts} onValueChange={(v) => updateSettings({ budgetAlerts: v })} />
      </GlassCard>

      <GlassCard padding={4}>
        <SettingRow label="Categories" onPress={() => toast('Category editor is coming soon')} />
        <Sep />
        <SettingRow label="Accounts" onPress={() => router.push('/accounts')} />
        <Sep />
        <SettingRow label="Backup & export" onPress={() => toast(`Backup file prepared · ${transactions.length} transactions`)} />
        <Sep />
        <SettingRow label="Monthly summary" onPress={() => router.push('/report')} />
      </GlassCard>

      <GlassCard>
        <AppText variant="body2">
          Your money data stays yours. Everything is stored on this device — nothing is uploaded unless you export it yourself.
        </AppText>
      </GlassCard>

      <Pressable onPress={() => setConfirmDelete(true)} style={{ backgroundColor: theme.toneBg('neg'), borderRadius: 18, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}>
        <AppText color={theme.tone('neg')} weight="manrope700">
          Delete all data
        </AppText>
      </Pressable>

      <SelectModal
        visible={accentModal}
        title="Accent theme"
        value={settings.accentTheme}
        options={(Object.keys(ACCENT_THEMES) as AccentTheme[]).map((k) => ({ value: k, label: ACCENT_THEMES[k].label }))}
        onSelect={(v) => updateSettings({ accentTheme: v as AccentTheme })}
        onClose={() => setAccentModal(false)}
      />
      <SelectModal
        visible={privacyScopeModal}
        title="What privacy hides"
        value={settings.privacyScope}
        options={[
          { value: 'dashboard', label: 'Dashboard only' },
          { value: 'all', label: 'Everything' },
        ]}
        onSelect={(v) => updateSettings({ privacyScope: v as PrivacyScope })}
        onClose={() => setPrivacyScopeModal(false)}
      />

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete all data?"
        body="This clears every account, transaction and setting on this device. This can't be undone."
        confirmLabel="Delete everything"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          resetAllData();
          setConfirmDelete(false);
          router.replace('/');
        }}
      />
    </Screen>
  );
}

function SettingRow({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: 12 }}>
      <AppText variant="body">{label}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {value ? <AppText variant="body2">{value}</AppText> : null}
        <AppText color={theme.ink3}>→</AppText>
      </View>
    </Pressable>
  );
}

function SwitchRow({ label, sub, value, onValueChange }: { label: string; sub?: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: 12 }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <AppText variant="body">{label}</AppText>
        {sub ? (
          <AppText variant="mono" style={{ marginTop: 2 }}>
            {sub}
          </AppText>
        ) : null}
      </View>
      <AppSwitch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function Sep() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.line, marginHorizontal: 12 }} />;
}
