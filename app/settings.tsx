import React, { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { AppSwitch } from '@/components/AppSwitch';
import { SelectModal } from '@/components/SelectModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { GhostButton } from '@/components/GhostButton';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/appStore';
import { useToastStore } from '@/store/toastStore';
import { ACCENT_THEMES, type AccentTheme } from '@/theme/tokens';
import type { PrivacyScope } from '@/domain/types';
import { syncDailyReminder } from '@/notifications/dailyReminder';

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const settings = useAppStore((s) => s.settings);
  const accounts = useAppStore((s) => s.accounts);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const resetAllData = useAppStore((s) => s.resetAllData);
  const transactions = useAppStore((s) => s.transactions);

  const [currency, setCurrency] = useState(settings.currencySymbol);
  const [accentModal, setAccentModal] = useState(false);
  const [privacyScopeModal, setPrivacyScopeModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReminderTime, setShowReminderTime] = useState(false);

  const isDark = theme.mode === 'dark';
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function commitCurrency(v: string) {
    setCurrency(v);
    updateSettings({ currencySymbol: v.trim() || '৳' });
  }

  async function setReminderEnabled(enabled: boolean) {
    const ok = await syncDailyReminder(enabled, settings.reminderHour, settings.reminderMinute);
    if (enabled && !ok) {
      toast(Platform.OS === 'web' ? 'Reminders need a real device build — not available in this web preview' : 'Notifications are blocked — allow them for Money Memory in your phone settings');
      return;
    }
    updateSettings({ reminderEnabled: enabled });
  }

  async function setReminderTime(date: Date) {
    setShowReminderTime(Platform.OS === 'ios');
    const hour = date.getHours();
    const minute = date.getMinutes();
    updateSettings({ reminderHour: hour, reminderMinute: minute });
    if (settings.reminderEnabled) await syncDailyReminder(true, hour, minute);
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <TextInput
            value={currency}
            onChangeText={commitCurrency}
            maxLength={4}
            placeholder="৳"
            placeholderTextColor={theme.ink3}
            style={{ width: 74, minHeight: 46, textAlign: 'center', borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, borderRadius: 14, color: theme.ink, fontSize: 16, fontWeight: '700' }}
          />
          <AppText variant="body2" style={{ flex: 1 }}>
            Relabels the app immediately — never converts past amounts.
          </AppText>
        </View>
      </GlassCard>

      <GlassCard padding={6}>
        <SelectRow
          label="Accent theme"
          sub={`${ACCENT_THEMES[settings.accentTheme].label} · colours highlights, charts and the app mark`}
          value={ACCENT_THEMES[settings.accentTheme].label}
          onPress={() => setAccentModal(true)}
        />
        <SwitchRow
          label="Dark appearance"
          sub={isDark ? 'Dark — easier at night' : 'Light — easier in daylight'}
          value={isDark}
          onValueChange={(v) => updateSettings({ appearance: v ? 'dark' : 'light' })}
        />
        <SwitchRow
          label="Privacy mode"
          sub={settings.privacy ? 'The eye on Home reveals hidden amounts for 10 seconds' : 'Amounts are visible on every screen'}
          value={settings.privacy}
          onValueChange={(v) => updateSettings({ privacy: v })}
        />
        <SelectRow
          label="What privacy hides"
          sub={settings.privacyScope === 'all' ? 'Every amount in the app — cards, transactions, loans' : 'Dashboard cards only · open an account and the balance is visible'}
          value={settings.privacyScope === 'all' ? 'Everything' : 'Dashboard only'}
          onPress={() => setPrivacyScopeModal(true)}
        />
        <SwitchRow
          label="Count lent money as spending"
          sub={settings.countLentAsSpending ? 'Loans reduce your budget like an expense' : 'Loans stay out of your budget until written off'}
          value={settings.countLentAsSpending}
          onValueChange={(v) => updateSettings({ countLentAsSpending: v })}
        />
        <SwitchRow
          label="Budget alerts"
          sub={settings.budgetAlerts ? 'At 80% and when you pass the budget' : 'No notifications'}
          value={settings.budgetAlerts}
          onValueChange={(v) => updateSettings({ budgetAlerts: v })}
        />
        <SwitchRow
          label="Daily reminder"
          sub={settings.reminderEnabled ? `Every day at ${formatTime(settings.reminderHour, settings.reminderMinute)}` : 'Off — nudges you to log today’s spending'}
          value={settings.reminderEnabled}
          onValueChange={setReminderEnabled}
        />
        {settings.reminderEnabled ? (
          <SelectRow label="Reminder time" sub="Tap to change when it fires" value={formatTime(settings.reminderHour, settings.reminderMinute)} onPress={() => setShowReminderTime(true)} />
        ) : null}
        <LinkRow label="Categories" sub={`${settings.categories.length} categories · rename or add`} onPress={() => router.push('/categories')} />
        <LinkRow label="Accounts" sub={`${accounts.length} accounts`} onPress={() => router.push('/accounts')} />
        <LinkRow label="Backup & export" sub="CSV or full backup file, saved by you" onPress={() => toast(`Backup file prepared · ${transactions.length} transactions`)} last />
        <LinkRow label="Monthly summary" sub={monthLabel} onPress={() => router.push('/report')} last />
      </GlassCard>

      <View style={{ borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, borderRadius: 22, padding: 18 }}>
        <AppText variant="body" weight="manrope700">
          Your money data stays yours
        </AppText>
        <AppText variant="body2" style={{ marginTop: 5 }}>
          Everything is stored on this device. No bank passwords, card PINs or OTPs are ever requested. Export a backup any time you like.
        </AppText>
      </View>

      <GhostButton label="Delete all data" tone="neg" fullWidth onPress={() => setConfirmDelete(true)} />

      {showReminderTime ? (
        <DateTimePicker
          value={new Date(2000, 0, 1, settings.reminderHour, settings.reminderMinute)}
          mode="time"
          onChange={(_, selected) => {
            if (selected) setReminderTime(selected);
            else setShowReminderTime(false);
          }}
        />
      ) : null}

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

function RowShell({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 44, padding: 13, marginBottom: last ? 0 : 0 }}>{children}</View>;
}

function RowText({ label, sub }: { label: string; sub: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <AppText variant="body" style={{ fontSize: 13.5 }}>
        {label}
      </AppText>
      <AppText variant="mono" style={{ marginTop: 2, textTransform: 'none', letterSpacing: 0, fontSize: 11.5 }}>
        {sub}
      </AppText>
    </View>
  );
}

function LinkRow({ label, sub, onPress, last }: { label: string; sub: string; onPress: () => void; last?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <RowShell last={last}>
        <RowText label={label} sub={sub} />
        <AppText color={theme.ink3} weight="manrope600" style={{ fontSize: 15 }}>
          →
        </AppText>
      </RowShell>
    </Pressable>
  );
}

function SwitchRow({ label, sub, value, onValueChange }: { label: string; sub: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <RowShell>
      <RowText label={label} sub={sub} />
      <AppSwitch value={value} onValueChange={onValueChange} />
    </RowShell>
  );
}

function SelectRow({ label, sub, value, onPress }: { label: string; sub: string; value: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <RowShell>
      <RowText label={label} sub={sub} />
      <Pressable
        onPress={onPress}
        style={{ minHeight: 44, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, borderRadius: 13, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}
      >
        <AppText variant="body" style={{ fontSize: 12.5 }}>
          {value}
        </AppText>
      </Pressable>
    </RowShell>
  );
}
