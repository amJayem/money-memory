import React, { useState } from 'react';
import { Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { ACCENT_THEMES, ACCOUNT_TYPE_LABEL, type AccentTheme } from '@/theme/tokens';
import { oklch } from '@/theme/oklch';
import type { Appearance, NavStyle, PrivacyScope } from '@/domain/types';
import { syncDailyReminder } from '@/notifications/dailyReminder';
import { exportTransactionsCsv } from '@/export/exportTransactions';

const APPEARANCE_LABELS: Record<Appearance, string> = { light: 'Light', dark: 'Night', system: 'System' };
const NAV_STYLE_LABELS: Record<NavStyle, string> = { classic: 'Classic', floating: 'Floating' };

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
  const [appearanceModal, setAppearanceModal] = useState(false);
  const [navStyleModal, setNavStyleModal] = useState(false);
  const [privacyScopeModal, setPrivacyScopeModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReminderTime, setShowReminderTime] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [pendingReminderTime, setPendingReminderTime] = useState(() => new Date(2000, 0, 1, settings.reminderHour, settings.reminderMinute));

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const accountTypesSub = [...new Set(accounts.map((a) => ACCOUNT_TYPE_LABEL[a.type]?.split(' ')[0]).filter(Boolean))].join(', ') || 'None yet';

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

  async function exportCsv() {
    if (exportingCsv) return;
    if (transactions.length === 0) {
      toast('Nothing to export yet');
      return;
    }
    setExportingCsv(true);
    try {
      const ok = await exportTransactionsCsv(transactions, accounts, settings.currencySymbol);
      if (!ok) toast('No way to share files on this device');
    } catch {
      toast('Export failed — try again');
    } finally {
      setExportingCsv(false);
    }
  }

  async function commitReminderTime(date: Date) {
    const hour = date.getHours();
    const minute = date.getMinutes();
    updateSettings({ reminderHour: hour, reminderMinute: minute });
    if (settings.reminderEnabled) await syncDailyReminder(true, hour, minute);
  }

  return (
    <Screen bottomInset={200}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.back()} />
        <AppText variant="title">Settings</AppText>
      </View>

      <GroupHeading title="Money" />
      <Card>
        <Row label="Currency symbol" sub="Relabels the app · never converts">
          <TextInput
            value={currency}
            onChangeText={commitCurrency}
            maxLength={4}
            placeholder="৳"
            placeholderTextColor={theme.ink3}
            style={{
              width: 52,
              height: 38,
              textAlign: 'center',
              borderWidth: 1,
              borderColor: theme.line,
              backgroundColor: theme.surface2,
              borderRadius: 12,
              color: theme.ink,
              fontSize: 16,
              fontWeight: '700',
            }}
          />
        </Row>
        <Row label="Count lent money as spending" sub={settings.countLentAsSpending ? 'On — loans reduce your budget' : 'Off — loans stay out of your budget'} last>
          <AppSwitch value={settings.countLentAsSpending} onValueChange={(v) => updateSettings({ countLentAsSpending: v })} compact />
        </Row>
      </Card>

      <GroupHeading title="Appearance" />
      <Card>
        <Row label="Accent theme" sub={ACCENT_THEMES[settings.accentTheme].label}>
          <AccentDots value={settings.accentTheme} onPress={() => setAccentModal(true)} />
        </Row>
        <Row label="Theme" sub={settings.appearance === 'system' ? 'Follows your phone' : APPEARANCE_LABELS[settings.appearance]}>
          <Dropdown value={APPEARANCE_LABELS[settings.appearance]} onPress={() => setAppearanceModal(true)} />
        </Row>
        <Row label="Navigation style" sub={settings.navStyle === 'floating' ? 'Rounded floating pill' : 'Classic edge-to-edge bar'} last>
          <Dropdown value={NAV_STYLE_LABELS[settings.navStyle]} onPress={() => setNavStyleModal(true)} />
        </Row>
      </Card>

      <GroupHeading title="Privacy" />
      <Card>
        <Row label="Privacy mode" sub={settings.privacy ? 'On — tap the eye to reveal' : 'Off — amounts visible everywhere'}>
          <AppSwitch value={settings.privacy} onValueChange={(v) => updateSettings({ privacy: v })} compact />
        </Row>
        <Row label="What it hides" sub="Tap the eye to reveal for 10s" last>
          <Dropdown value={settings.privacyScope === 'all' ? 'Everything' : 'Dashboard'} onPress={() => setPrivacyScopeModal(true)} />
        </Row>
      </Card>

      <GroupHeading title="Notifications" />
      <Card>
        <Row label="Budget alerts" sub={settings.budgetAlerts ? 'At 80% and when you pass it' : 'No notifications'} last={!settings.reminderEnabled}>
          <AppSwitch value={settings.budgetAlerts} onValueChange={(v) => updateSettings({ budgetAlerts: v })} compact />
        </Row>
        <Row label="Daily reminder" sub={settings.reminderEnabled ? `Every day at ${formatTime(settings.reminderHour, settings.reminderMinute)}` : 'Off — nudges you to log spending'} last={!settings.reminderEnabled}>
          <AppSwitch value={settings.reminderEnabled} onValueChange={setReminderEnabled} compact />
        </Row>
        {settings.reminderEnabled ? (
          <Row label="Reminder time" sub="Tap to change when it fires" last>
            <Dropdown
              value={formatTime(settings.reminderHour, settings.reminderMinute)}
              onPress={() => {
                setPendingReminderTime(new Date(2000, 0, 1, settings.reminderHour, settings.reminderMinute));
                setShowReminderTime(true);
              }}
            />
          </Row>
        ) : null}
      </Card>

      <GroupHeading title="Your data" />
      <Card>
        <NavRow label="Categories" sub="Rename or add" trailing={String(settings.categories.length)} onPress={() => router.push('/categories')} />
        <NavRow label="Accounts" sub={accountTypesSub} trailing={String(accounts.length)} onPress={() => router.push('/accounts')} />
        <NavRow label="Export CSV" sub={exportingCsv ? 'Preparing file…' : `${transactions.length} transactions`} onPress={exportCsv} />
        <NavRow label="Monthly summary" sub={monthLabel} onPress={() => router.push('/report')} last />
      </Card>

      <View style={{ borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, borderRadius: 22, padding: 18 }}>
        <AppText variant="body" weight="manrope700">
          Your money data stays yours
        </AppText>
        <AppText variant="body2" style={{ marginTop: 5 }}>
          Everything is stored on this device. No bank passwords, card PINs or OTPs are ever requested. Export a backup any time you like.
        </AppText>
      </View>

      <GhostButton label="Delete all data" tone="neg" fullWidth onPress={() => setConfirmDelete(true)} />

      <Modal visible={showReminderTime} transparent animationType="fade" onRequestClose={() => setShowReminderTime(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(10,10,12,0.45)', justifyContent: 'flex-end' }} onPress={() => setShowReminderTime(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: theme.solid, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: theme.line }}>
              <SafeAreaView edges={['bottom']}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
                  <Pressable onPress={() => setShowReminderTime(false)} hitSlop={8}>
                    <AppText variant="body" color={theme.ink3}>
                      Cancel
                    </AppText>
                  </Pressable>
                  <AppText variant="body" weight="manrope700">
                    Reminder time
                  </AppText>
                  <Pressable
                    onPress={() => {
                      setShowReminderTime(false);
                      commitReminderTime(pendingReminderTime);
                    }}
                    hitSlop={8}
                  >
                    <AppText variant="body" weight="manrope700" color={theme.accentColor}>
                      Done
                    </AppText>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={pendingReminderTime}
                  mode="time"
                  display="spinner"
                  themeVariant={theme.mode}
                  onChange={(_, selected) => {
                    if (selected) setPendingReminderTime(selected);
                  }}
                />
              </SafeAreaView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <SelectModal
        visible={accentModal}
        title="Accent theme"
        value={settings.accentTheme}
        options={(Object.keys(ACCENT_THEMES) as AccentTheme[]).map((k) => ({ value: k, label: ACCENT_THEMES[k].label }))}
        onSelect={(v) => updateSettings({ accentTheme: v as AccentTheme })}
        onClose={() => setAccentModal(false)}
      />
      <SelectModal
        visible={appearanceModal}
        title="Theme"
        value={settings.appearance}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Night' },
          { value: 'system', label: 'System' },
        ]}
        onSelect={(v) => updateSettings({ appearance: v as Appearance })}
        onClose={() => setAppearanceModal(false)}
      />
      <SelectModal
        visible={navStyleModal}
        title="Navigation style"
        value={settings.navStyle}
        options={[
          { value: 'classic', label: 'Classic' },
          { value: 'floating', label: 'Floating' },
        ]}
        onSelect={(v) => updateSettings({ navStyle: v as NavStyle })}
        onClose={() => setNavStyleModal(false)}
      />
      <SelectModal
        visible={privacyScopeModal}
        title="What it hides"
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
        confirmLabel="Delete all"
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

/** Small uppercase mono label that sits above a Card, never inside one — the one place monospace still appears on this screen. */
function GroupHeading({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <AppText variant="label" color={theme.ink3} style={{ paddingLeft: 4, marginBottom: -4 }}>
      {title}
    </AppText>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <GlassCard radius={20} padding={0}>
      {children}
    </GlassCard>
  );
}

/** Row shell + label/sub-line. `sub` is Manrope, not mono — the biggest readability change from the old list. */
function Row({ label, sub, last, children }: { label: string; sub?: string; last?: boolean; children?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.line,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="body" weight="manrope700" style={{ fontSize: 13.5 }}>
          {label}
        </AppText>
        {sub ? (
          <AppText variant="body2" color={theme.ink3} numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 15, marginTop: 2 }}>
            {sub}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** A navigation row: the whole row is pressable, trailing count + a '›' drill-in chevron — never '→'. */
function NavRow({ label, sub, trailing, onPress, last }: { label: string; sub: string; trailing?: string; onPress: () => void; last?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Row label={label} sub={sub} last={last}>
        {trailing ? (
          <AppText color={theme.ink3} style={{ fontSize: 11.5 }}>
            {trailing}
          </AppText>
        ) : null}
        <AppText color={theme.ink3} weight="manrope700" style={{ fontSize: 17 }}>
          ›
        </AppText>
      </Row>
    </Pressable>
  );
}

/** The pill-shaped value control: current value + a chevron, distinguishing it from a plain button. */
function Dropdown({ value, onPress }: { value: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 34,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: theme.surface2,
        borderWidth: 1,
        borderColor: theme.line,
      }}
    >
      <AppText weight="manrope700" style={{ fontSize: 11.5 }}>
        {value}
      </AppText>
      <AppText color={theme.ink3} style={{ fontSize: 9 }}>
        ▾
      </AppText>
    </Pressable>
  );
}

/** Accent theme's own control — six colour dots (the active one ringed) instead of a text button, since a theme picker can't describe itself in words. */
function AccentDots({ value, onPress }: { value: AccentTheme; onPress: () => void }) {
  const theme = useTheme();
  const keys = Object.keys(ACCENT_THEMES) as AccentTheme[];
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {keys.map((k) => {
        const active = k === value;
        const size = active ? 18 : 14;
        return (
          <View
            key={k}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: oklch(0.68, 0.19, ACCENT_THEMES[k].hue),
              borderWidth: active ? 2 : 1,
              borderColor: active ? '#fff' : theme.mode === 'dark' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.14)',
            }}
          />
        );
      })}
      <AppText color={theme.ink3} style={{ fontSize: 9, marginLeft: 2 }}>
        ▾
      </AppText>
    </Pressable>
  );
}
