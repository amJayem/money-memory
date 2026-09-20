import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'daily_reminders';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Reconciles the OS's scheduled notification with the user's reminder setting.
 * The app only ever schedules this one notification, so cancelling everything
 * before rescheduling is safe and keeps this idempotent — call it whenever the
 * setting changes and once on app start.
 *
 * Returns false when the user needs to grant notification permission (the
 * caller is responsible for reverting the setting and telling them why).
 */
export async function syncDailyReminder(enabled: boolean, hour: number, minute: number): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return true;

  const { status } = await Notifications.getPermissionsAsync();
  let granted = status === 'granted';
  if (!granted) {
    const request = await Notifications.requestPermissionsAsync();
    granted = request.status === 'granted';
  }
  if (!granted) return false;

  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Record today’s spending',
      body: 'A quick log now beats trying to remember it tomorrow.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}
