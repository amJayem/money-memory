import type { Account, Settings, Transaction } from './types';
import { ACCENT_THEMES, DEFAULT_ACCENT } from '@/theme/tokens';

const VALID_APPEARANCE = new Set(['light', 'dark', 'system']);
const VALID_NAV_STYLE = new Set(['classic', 'floating']);
const VALID_PRIVACY_SCOPE = new Set(['dashboard', 'all']);

/** The exact shape appStore persists — a backup is just that, wrapped with a version and a timestamp so an older app can refuse a newer backup it doesn't understand. */
export interface BackupFile {
  app: 'money-memory';
  backupVersion: 1;
  exportedAt: string;
  accounts: Account[];
  transactions: Transaction[];
  settings: Settings;
}

export function serializeBackup(accounts: Account[], transactions: Transaction[], settings: Settings): string {
  const file: BackupFile = {
    app: 'money-memory',
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    transactions,
    settings,
  };
  return JSON.stringify(file, null, 2);
}

/** Checks only the shape a restore actually depends on — not a full schema
 * validator — so a backup from a slightly older app version (missing a
 * newer settings field, say) still restores instead of being rejected outright. */
export function parseBackup(raw: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('That file isn\'t valid JSON — pick a Money Memory backup file.');
  }
  if (typeof data !== 'object' || data === null) throw new Error('That file isn\'t a Money Memory backup.');
  const file = data as Partial<BackupFile>;
  if (file.app !== 'money-memory') throw new Error('That file isn\'t a Money Memory backup.');
  if (file.backupVersion !== 1) throw new Error('This backup was made by a newer version of the app — update Money Memory first.');
  if (!Array.isArray(file.accounts) || !Array.isArray(file.transactions) || typeof file.settings !== 'object' || file.settings === null) {
    throw new Error('That backup file is incomplete or corrupted.');
  }
  return { ...file, settings: sanitizeSettings(file.settings) } as BackupFile;
}

/** A backup's settings came from outside this install — a hand-edited file,
 * a future app version with a theme/option this build doesn't know, or
 * plain corruption. Rather than crash deep in a component that assumes
 * every enum value is valid (ThemeProvider indexing ACCENT_THEMES, say),
 * fall back to a safe default for anything unrecognized so the restore
 * still succeeds with the rest of the data intact. */
function sanitizeSettings(settings: Partial<Settings>): Partial<Settings> {
  return {
    ...settings,
    accentTheme: settings.accentTheme && settings.accentTheme in ACCENT_THEMES ? settings.accentTheme : DEFAULT_ACCENT,
    appearance: settings.appearance && VALID_APPEARANCE.has(settings.appearance) ? settings.appearance : 'system',
    navStyle: settings.navStyle && VALID_NAV_STYLE.has(settings.navStyle) ? settings.navStyle : 'classic',
    privacyScope: settings.privacyScope && VALID_PRIVACY_SCOPE.has(settings.privacyScope) ? settings.privacyScope : 'dashboard',
  };
}
