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
import type { Appearance, Language, NavStyle, PrivacyScope } from '@/domain/types';
import { syncDailyReminder } from '@/notifications/dailyReminder';
import { exportTransactionsCsv } from '@/export/exportTransactions';
import { exportBackup } from '@/export/exportBackup';
import { pickBackupFile } from '@/export/importBackup';
import { useTranslation } from '@/i18n/useTranslation';

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
  const t = useTranslation('settings');
  const toast = useToastStore((s) => s.show);
  const settings = useAppStore((s) => s.settings);
  const accounts = useAppStore((s) => s.accounts);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const resetAllData = useAppStore((s) => s.resetAllData);
  const restoreBackup = useAppStore((s) => s.restoreBackup);
  const transactions = useAppStore((s) => s.transactions);

  const [currency, setCurrency] = useState(settings.currencySymbol);
  const [accentModal, setAccentModal] = useState(false);
  const [appearanceModal, setAppearanceModal] = useState(false);
  const [navStyleModal, setNavStyleModal] = useState(false);
  const [languageModal, setLanguageModal] = useState(false);
  const [privacyScopeModal, setPrivacyScopeModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReminderTime, setShowReminderTime] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<Awaited<ReturnType<typeof pickBackupFile>>>(null);
  const [pendingReminderTime, setPendingReminderTime] = useState(() => new Date(2000, 0, 1, settings.reminderHour, settings.reminderMinute));

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const accountTypesSub = [...new Set(accounts.map((a) => ACCOUNT_TYPE_LABEL[a.type]?.split(' ')[0]).filter(Boolean))].join(', ') || t('noneYet');

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

  async function exportBackupFile() {
    if (exportingBackup) return;
    setExportingBackup(true);
    try {
      const ok = await exportBackup(accounts, transactions, settings);
      if (!ok) toast('No way to share files on this device');
    } catch {
      toast('Backup failed — try again');
    } finally {
      setExportingBackup(false);
    }
  }

  async function importBackupFile() {
    if (importingBackup) return;
    setImportingBackup(true);
    try {
      const backup = await pickBackupFile();
      if (backup) setPendingRestore(backup);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'That file could not be read');
    } finally {
      setImportingBackup(false);
    }
  }

  async function commitReminderTime(date: Date) {
    const hour = date.getHours();
    const minute = date.getMinutes();
    updateSettings({ reminderHour: hour, reminderMinute: minute });
    if (settings.reminderEnabled) await syncDailyReminder(true, hour, minute);
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.back()} />
        <AppText variant="title">{t('title')}</AppText>
      </View>

      <GroupHeading title={t('groupMoney')} />
      <Card>
        <Row label={t('currencySymbol')} sub={t('currencySymbolSub')}>
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
        <Row label={t('countLent')} sub={settings.countLentAsSpending ? t('countLentOn') : t('countLentOff')} last>
          <AppSwitch value={settings.countLentAsSpending} onValueChange={(v) => updateSettings({ countLentAsSpending: v })} compact />
        </Row>
      </Card>

      <GroupHeading title={t('groupAppearance')} />
      <Card>
        <Row label={t('accentTheme')} sub={ACCENT_THEMES[settings.accentTheme].label}>
          <AccentDots value={settings.accentTheme} onPress={() => setAccentModal(true)} />
        </Row>
        <Row label={t('theme')} sub={settings.appearance === 'system' ? t('themeFollowsPhone') : APPEARANCE_LABELS[settings.appearance]}>
          <Dropdown value={APPEARANCE_LABELS[settings.appearance]} onPress={() => setAppearanceModal(true)} />
        </Row>
        <Row label={t('navStyle')} sub={settings.navStyle === 'floating' ? t('navStyleFloating') : t('navStyleClassic')} last>
          <Dropdown value={NAV_STYLE_LABELS[settings.navStyle]} onPress={() => setNavStyleModal(true)} />
        </Row>
      </Card>

      <GroupHeading title={t('groupLanguage')} />
      <Card>
        <Row label={t('language')} sub={settings.language === 'bn' ? t('languageBengali') : t('languageEnglish')} last>
          <Dropdown value={settings.language === 'bn' ? t('languageBengali') : t('languageEnglish')} onPress={() => setLanguageModal(true)} />
        </Row>
      </Card>

      <GroupHeading title={t('groupPrivacy')} />
      <Card>
        <Row label={t('privacyMode')} sub={settings.privacy ? t('privacyModeOn') : t('privacyModeOff')}>
          <AppSwitch value={settings.privacy} onValueChange={(v) => updateSettings({ privacy: v })} compact />
        </Row>
        <Row label={t('whatItHides')} sub={t('whatItHidesSub')} last>
          <Dropdown value={settings.privacyScope === 'all' ? t('whatItHidesAll') : t('whatItHidesDashboard')} onPress={() => setPrivacyScopeModal(true)} />
        </Row>
      </Card>

      <GroupHeading title={t('groupNotifications')} />
      <Card>
        <Row label={t('budgetAlerts')} sub={settings.budgetAlerts ? t('budgetAlertsOn') : t('budgetAlertsOff')} last={!settings.reminderEnabled}>
          <AppSwitch value={settings.budgetAlerts} onValueChange={(v) => updateSettings({ budgetAlerts: v })} compact />
        </Row>
        <Row
          label={t('dailyReminder')}
          sub={settings.reminderEnabled ? t('dailyReminderOn', { time: formatTime(settings.reminderHour, settings.reminderMinute) }) : t('dailyReminderOff')}
          last={!settings.reminderEnabled}
        >
          <AppSwitch value={settings.reminderEnabled} onValueChange={setReminderEnabled} compact />
        </Row>
        {settings.reminderEnabled ? (
          <Row label={t('reminderTime')} sub={t('reminderTimeSub')} last>
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

      <GroupHeading title={t('groupYourData')} />
      <Card>
        <NavRow label={t('categories')} sub={t('categoriesSub')} trailing={String(settings.categories.length)} onPress={() => router.push('/categories')} />
        <NavRow label={t('accounts')} sub={accountTypesSub} trailing={String(accounts.length)} onPress={() => router.push('/accounts')} />
        <NavRow label={t('exportCsv')} sub={exportingCsv ? t('exportCsvPreparing') : t('transactionsCount', { count: String(transactions.length) })} onPress={exportCsv} />
        <NavRow label={t('exportBackup')} sub={exportingBackup ? t('exportBackupPreparing') : t('exportBackupSub')} onPress={exportBackupFile} />
        <NavRow label={t('importBackup')} sub={importingBackup ? t('importBackupReading') : t('importBackupSub')} onPress={importBackupFile} />
        <NavRow label={t('monthlySummary')} sub={monthLabel} onPress={() => router.push('/report')} last />
      </Card>

      <View style={{ borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, borderRadius: 22, padding: 18 }}>
        <AppText variant="body" weight="manrope700">
          {t('dataStaysYoursTitle')}
        </AppText>
        <AppText variant="body2" style={{ marginTop: 5 }}>
          {t('dataStaysYoursBody')}
        </AppText>
      </View>

      <GhostButton label={t('deleteAllData')} tone="neg" fullWidth onPress={() => setConfirmDelete(true)} />

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
        title={t('accentTheme')}
        value={settings.accentTheme}
        options={(Object.keys(ACCENT_THEMES) as AccentTheme[]).map((k) => ({ value: k, label: ACCENT_THEMES[k].label }))}
        onSelect={(v) => updateSettings({ accentTheme: v as AccentTheme })}
        onClose={() => setAccentModal(false)}
      />
      <SelectModal
        visible={appearanceModal}
        title={t('theme')}
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
        title={t('navStyle')}
        value={settings.navStyle}
        options={[
          { value: 'classic', label: 'Classic' },
          { value: 'floating', label: 'Floating' },
        ]}
        onSelect={(v) => updateSettings({ navStyle: v as NavStyle })}
        onClose={() => setNavStyleModal(false)}
      />
      <SelectModal
        visible={languageModal}
        title={t('language')}
        value={settings.language}
        options={[
          { value: 'en', label: t('languageEnglish') },
          { value: 'bn', label: t('languageBengali') },
        ]}
        onSelect={(v) => updateSettings({ language: v as Language })}
        onClose={() => setLanguageModal(false)}
      />
      <SelectModal
        visible={privacyScopeModal}
        title={t('whatItHides')}
        value={settings.privacyScope}
        options={[
          { value: 'dashboard', label: 'Dashboard only' },
          { value: 'all', label: 'Everything' },
        ]}
        onSelect={(v) => updateSettings({ privacyScope: v as PrivacyScope })}
        onClose={() => setPrivacyScopeModal(false)}
      />

      <ConfirmDialog
        visible={!!pendingRestore}
        title="Restore this backup?"
        body={
          pendingRestore
            ? `This replaces everything currently on this device with the backup from ${new Date(pendingRestore.exportedAt).toLocaleDateString()} — ${pendingRestore.accounts.length} accounts, ${pendingRestore.transactions.length} transactions. This can't be undone.`
            : ''
        }
        confirmLabel="Restore"
        onCancel={() => setPendingRestore(null)}
        onConfirm={() => {
          if (!pendingRestore) return;
          restoreBackup(pendingRestore);
          setPendingRestore(null);
          toast('Backup restored');
          router.replace('/');
        }}
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
    <Pressable onPress={onPress} android_ripple={{ color: theme.line }} style={({ pressed }) => ({ backgroundColor: pressed && Platform.OS === 'ios' ? theme.surface2 : 'transparent' })}>
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
      android_ripple={{ color: theme.lineStrong }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 34,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: pressed && Platform.OS === 'ios' ? theme.lineStrong : theme.surface2,
        borderWidth: 1,
        borderColor: theme.line,
        overflow: 'hidden',
      })}
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
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.line, radius: 90 }}
      hitSlop={8}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed && Platform.OS === 'ios' ? 0.6 : 1 })}
    >
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
