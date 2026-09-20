import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { syncDailyReminder } from '@/notifications/dailyReminder';

/**
 * Re-applies the reminder setting to the OS once the store has hydrated, in
 * case the scheduled notification didn't survive an app update/reinstall.
 * Interactive changes (the Settings screen's switch/time picker) call
 * syncDailyReminder directly so they can react to a denied permission —
 * this hook only re-syncs quietly on launch.
 */
export function useDailyReminderSync() {
  const hydrated = useAppStore((s) => s.hydrated);
  const enabled = useAppStore((s) => s.settings.reminderEnabled);
  const hour = useAppStore((s) => s.settings.reminderHour);
  const minute = useAppStore((s) => s.settings.reminderMinute);
  const ranOnce = useRef(false);

  useEffect(() => {
    if (!hydrated || ranOnce.current || !enabled) return;
    ranOnce.current = true;
    syncDailyReminder(enabled, hour, minute).catch(() => {});
  }, [hydrated, enabled, hour, minute]);
}
