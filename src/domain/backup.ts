import type { Account, Settings, Transaction } from './types';
import { ACCENT_THEMES, DEFAULT_ACCENT } from '@/theme/tokens';

const VALID_APPEARANCE = new Set(['light', 'dark', 'system']);
const VALID_NAV_STYLE = new Set(['classic', 'floating']);
const VALID_PRIVACY_SCOPE = new Set(['dashboard', 'all']);
const VALID_LANGUAGE = new Set(['en', 'bn']);

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
  // Every record is checked, not just the containers: one transaction without a date or an
  // amount would be saved as-is and then crash every screen that sorts or sums the ledger —
  // on every launch, with no way back in to undo the restore.
  if (!file.accounts.every(isValidAccount) || !file.transactions.every(isValidTransaction)) {
    throw new Error('That backup file is incomplete or corrupted.');
  }
  return { ...file, settings: sanitizeSettings(file.settings) } as BackupFile;
}

const ACCOUNT_TYPES = new Set(['cash', 'bank', 'debit', 'credit', 'wallet', 'savings']);
const TRANSACTION_TYPES = new Set(['expense', 'income', 'transfer', 'lent', 'borrowed', 'repay_in', 'repay_out']);

function isAmount(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isValidAccount(a: unknown): boolean {
  if (typeof a !== 'object' || a === null) return false;
  const acc = a as Record<string, unknown>;
  return (
    typeof acc.id === 'string' &&
    !!acc.id &&
    typeof acc.name === 'string' &&
    typeof acc.type === 'string' &&
    ACCOUNT_TYPES.has(acc.type) &&
    isAmount(acc.openingBalance) &&
    (acc.limit === undefined || acc.limit === null || isAmount(acc.limit)) &&
    (acc.openingUsed === undefined || acc.openingUsed === null || isAmount(acc.openingUsed))
  );
}

function isValidTransaction(t: unknown): boolean {
  if (typeof t !== 'object' || t === null) return false;
  const tx = t as Record<string, unknown>;
  return (
    typeof tx.id === 'string' &&
    !!tx.id &&
    typeof tx.type === 'string' &&
    TRANSACTION_TYPES.has(tx.type) &&
    isAmount(tx.amount) &&
    tx.amount >= 0 &&
    typeof tx.at === 'string' &&
    !Number.isNaN(new Date(tx.at).getTime()) &&
    typeof tx.account === 'string'
  );
}

function stringList(v: unknown): string[] | undefined {
  return Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : undefined;
}

/** Drops a key entirely when its value is the wrong shape, so restoreBackup's merge onto
 * DEFAULT_SETTINGS supplies the default instead. */
function keepIf<K extends keyof Settings>(key: K, value: Settings[K] | undefined): Partial<Settings> {
  return value === undefined ? {} : ({ [key]: value } as Partial<Settings>);
}

/** A backup's settings came from outside this install — a hand-edited file,
 * a future app version with a theme/option this build doesn't know, or
 * plain corruption. Rather than crash deep in a component that assumes
 * every enum value is valid (ThemeProvider indexing ACCENT_THEMES, say),
 * fall back to a safe default for anything unrecognized so the restore
 * still succeeds with the rest of the data intact. */
function sanitizeSettings(settings: Partial<Settings>): Partial<Settings> {
  const { categories, incomeCategories, categoryBudgets, monthlyBudget, reminderHour, reminderMinute, currencySymbol, ...rest } = settings;
  const budgets =
    typeof categoryBudgets === 'object' && categoryBudgets !== null && !Array.isArray(categoryBudgets) && Object.values(categoryBudgets).every(isAmount)
      ? categoryBudgets
      : undefined;
  return {
    ...rest,
    ...keepIf('categories', stringList(categories)),
    ...keepIf('incomeCategories', stringList(incomeCategories)),
    ...keepIf('categoryBudgets', budgets),
    ...keepIf('monthlyBudget', isAmount(monthlyBudget) ? monthlyBudget : undefined),
    ...keepIf('reminderHour', isAmount(reminderHour) && reminderHour >= 0 && reminderHour <= 23 ? Math.floor(reminderHour) : undefined),
    ...keepIf('reminderMinute', isAmount(reminderMinute) && reminderMinute >= 0 && reminderMinute <= 59 ? Math.floor(reminderMinute) : undefined),
    ...keepIf('currencySymbol', typeof currencySymbol === 'string' ? currencySymbol : undefined),
    accentTheme: settings.accentTheme && settings.accentTheme in ACCENT_THEMES ? settings.accentTheme : DEFAULT_ACCENT,
    appearance: settings.appearance && VALID_APPEARANCE.has(settings.appearance) ? settings.appearance : 'system',
    navStyle: settings.navStyle && VALID_NAV_STYLE.has(settings.navStyle) ? settings.navStyle : 'classic',
    privacyScope: settings.privacyScope && VALID_PRIVACY_SCOPE.has(settings.privacyScope) ? settings.privacyScope : 'dashboard',
    language: settings.language && VALID_LANGUAGE.has(settings.language) ? settings.language : 'en',
  };
}
