import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState as RNAppState } from 'react-native';
import { create } from 'zustand';
import type { Account, Settings, Transaction } from '@/domain/types';
import type { BackupFile } from '@/domain/backup';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/domain/types';
import { SEED_ACCOUNTS, SEED_TRANSACTIONS } from '@/domain/seed';
import { DEFAULT_ACCENT } from '@/theme/tokens';
import { STRINGS } from '@/i18n/strings';
import { useToastStore } from './toastStore';

const STORAGE_KEY = 'moneymemory.v1';
// Where an unreadable (corrupt) saved ledger is set aside before a fresh one replaces it.
const RESCUE_KEY = 'moneymemory.v1.unreadable';
// Written into every save so a future app version that changes the saved shape can tell which
// shape it is reading and convert it, instead of guessing. Saves from before this field existed
// have no version and are the same shape as version 1.
const SCHEMA_VERSION = 1;

const DEFAULT_SETTINGS: Settings = {
  hasOnboarded: false,
  language: 'en',
  enabledAccountTypes: ['cash', 'bank', 'wallet'],
  currencySymbol: '৳',
  accentTheme: DEFAULT_ACCENT,
  appearance: 'system',
  privacy: false,
  privacyScope: 'dashboard',
  countLentAsSpending: false,
  budgetAlerts: true,
  // 0 means "not set" (see money.ts's budgetStatus/noBudget) — a real user's
  // budget is their call to make from the Budget screen, never assumed.
  monthlyBudget: 0,
  lastAccountId: null,
  lastCategory: null,
  categories: [...EXPENSE_CATEGORIES],
  incomeCategories: [...INCOME_CATEGORIES],
  reminderEnabled: false,
  reminderHour: 9,
  reminderMinute: 0,
  navStyle: 'classic',
  categoryBudgets: {},
  appLockEnabled: false,
  setupChecklistDismissed: false,
};

interface PersistedShape {
  accounts: Account[];
  transactions: Transaction[];
  settings: Settings;
}

interface AppState extends PersistedShape {
  hydrated: boolean;
  /** The saved ledger exists but couldn't be read. Nothing is written while this is set, so a
   * storage hiccup can never be followed by an empty ledger overwriting the real one. */
  loadFailed: boolean;
  peekUntil: number | null;
  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
  addTransaction: (t: Transaction) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addAccount: (a: Account) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addCategory: (name: string) => void;
  renameCategory: (oldName: string, newName: string) => void;
  deleteCategory: (name: string) => void;
  addIncomeCategory: (name: string) => void;
  setCategoryBudget: (name: string, amount: number) => void;
  removeCategoryBudget: (name: string) => void;
  loadSampleData: () => Promise<void>;
  resetAllData: () => Promise<void>;
  restoreBackup: (backup: BackupFile) => Promise<void>;
  startPeek: () => void;
  cancelPeek: () => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  accounts: [],
  transactions: [],
  settings: DEFAULT_SETTINGS,
  hydrated: false,
  loadFailed: false,
  peekUntil: null,

  hydrate: async () => {
    if (get().hydrated) return;
    // A read that throws is NOT the same as "nothing saved yet". It used to fall through to the
    // empty state below, which showed onboarding and then saved that empty ledger over the real
    // one. Now it stops here: the app shows a retry screen and writes nothing.
    let raw: string | null;
    try {
      raw = await readSaved();
    } catch {
      set({ loadFailed: true });
      return;
    }
    if (raw) {
      const parsed = parseSaved(raw);
      if (parsed) {
        set({
          accounts: parsed.accounts,
          transactions: parsed.transactions,
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          hydrated: true,
          loadFailed: false,
        });
        return;
      }
      // Readable but not a ledger (truncated or corrupt JSON). Keep a copy before starting
      // fresh, and don't start fresh at all if that copy can't be made.
      try {
        if ((await AsyncStorage.getItem(RESCUE_KEY)) === null) await AsyncStorage.setItem(RESCUE_KEY, raw);
      } catch {
        set({ loadFailed: true });
        return;
      }
    }
    // A brand-new install starts genuinely empty and runs onboarding — real
    // users shouldn't land on a ledger full of someone else's fake accounts
    // and transactions. Onboarding itself offers a "load sample data" option
    // (loadSampleData, below) for anyone who wants to explore first.
    set({
      accounts: [],
      transactions: [],
      settings: DEFAULT_SETTINGS,
      hydrated: true,
      loadFailed: false,
    });
  },

  // Every write used to be fire-and-forget: schedulePersist's setTimeout called this
  // with nothing awaiting it and no error handling, so a process kill or a transient
  // AsyncStorage failure in that window silently discarded the write — the in-memory
  // state (and whatever the UI showed right after) was never actually what ended up
  // on disk. One retry covers the common transient case; the error is at least
  // surfaced now instead of vanishing.
  persist: async () => {
    // Never write before the saved ledger has been read: the background flush at the bottom of
    // this file can fire while the app is still on its splash screen, and at that point the
    // in-memory state is the empty default — writing it would erase everything.
    if (!get().hydrated) return;
    const { accounts, transactions, settings } = get();
    const payload = JSON.stringify({ schemaVersion: SCHEMA_VERSION, accounts, transactions, settings } satisfies PersistedShape & { schemaVersion: number });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, payload);
    } catch (err) {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, payload);
      } catch (err2) {
        console.error('Failed to save app data', err2);
        throw err2;
      }
    }
  },

  addTransaction: (t) => {
    set((s) => ({ transactions: [...s.transactions, t] }));
    schedulePersist(get);
  },

  updateTransaction: (id, patch) => {
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch, editedAt: new Date().toISOString() } : t)),
    }));
    schedulePersist(get);
  },

  deleteTransaction: (id) => {
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
    schedulePersist(get);
  },

  addAccount: (a) => {
    set((s) => ({ accounts: [...s.accounts, a] }));
    schedulePersist(get);
  },

  updateAccount: (id, patch) => {
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
    schedulePersist(get);
  },

  // Callers must check for related transactions first (see accounts/add.tsx) —
  // deleting an account with history would orphan those transactions' `account`/`toAccount` refs.
  deleteAccount: (id) => {
    set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
    schedulePersist(get);
  },

  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    schedulePersist(get);
  },

  addCategory: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => (s.settings.categories.some((c) => c.toLowerCase() === trimmed.toLowerCase()) ? s : { settings: { ...s.settings, categories: [...s.settings.categories, trimmed] } }));
    schedulePersist(get);
  },

  // Renaming relabels every past transaction filed under the old name too, so
  // history doesn't quietly split between the old and new spelling.
  renameCategory: (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    set((s) => {
      // Renaming onto a name another category already has would leave two identical entries.
      if (s.settings.categories.some((c) => c !== oldName && c.toLowerCase() === trimmed.toLowerCase())) return s;
      // The category's own budget is keyed by name, so it has to move with the rename.
      const { [oldName]: movedBudget, ...otherBudgets } = s.settings.categoryBudgets;
      return {
        settings: {
          ...s.settings,
          categories: s.settings.categories.map((c) => (c === oldName ? trimmed : c)),
          categoryBudgets: movedBudget === undefined ? otherBudgets : { ...otherBudgets, [trimmed]: movedBudget },
          lastCategory: s.settings.lastCategory === oldName ? trimmed : s.settings.lastCategory,
        },
        transactions: s.transactions.map((t) => (t.category === oldName ? { ...t, category: trimmed } : t)),
      };
    });
    schedulePersist(get);
  },

  // Callers must check the category is unused first (see app/categories.tsx) —
  // deleting one still in use would leave those transactions' category dangling.
  deleteCategory: (name) => {
    set((s) => {
      const { [name]: _removed, ...categoryBudgets } = s.settings.categoryBudgets;
      return { settings: { ...s.settings, categories: s.settings.categories.filter((c) => c !== name), categoryBudgets } };
    });
    schedulePersist(get);
  },

  // Mirrors addCategory for income — used when someone types a name under
  // "Other" on an income entry, so it becomes a normal pickable chip after.
  addIncomeCategory: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => (s.settings.incomeCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase()) ? s : { settings: { ...s.settings, incomeCategories: [...s.settings.incomeCategories, trimmed] } }));
    schedulePersist(get);
  },

  setCategoryBudget: (name, amount) => {
    if (amount <= 0) return;
    set((s) => ({ settings: { ...s.settings, categoryBudgets: { ...s.settings.categoryBudgets, [name]: amount } } }));
    schedulePersist(get);
  },

  removeCategoryBudget: (name) => {
    set((s) => {
      const { [name]: _removed, ...rest } = s.settings.categoryBudgets;
      return { settings: { ...s.settings, categoryBudgets: rest } };
    });
    schedulePersist(get);
  },

  // Onboarding's "explore with sample data" choice — loads the same demo
  // ledger a fresh install used to start with automatically, for anyone who
  // wants to poke around before adding their own real accounts.
  // These three replace the entire ledger in one shot, so unlike the small
  // incremental edits above they persist immediately and are awaited by the
  // caller — the debounced path was how a restore could show as "done" on
  // screen yet never actually reach disk (see persist()'s comment). A caller
  // that awaits this knows the data is durable before it navigates away or
  // reports success.
  loadSampleData: async () => {
    set({
      accounts: SEED_ACCOUNTS,
      transactions: SEED_TRANSACTIONS,
      // The demo sets its own budget so the feature has something to show —
      // this is explicitly opt-in exploration, not a real user's default.
      settings: { ...DEFAULT_SETTINGS, hasOnboarded: true, monthlyBudget: 30000 },
    });
    await persistNow(get);
  },

  // Unlike the prototype (which only clears transactions), this wipes the
  // whole ledger — accounts and settings included — and routes back through
  // onboarding, since the brief's "delete all" implies a true fresh start.
  resetAllData: async () => {
    set({ accounts: [], transactions: [], settings: DEFAULT_SETTINGS });
    await persistNow(get);
  },

  // Replaces the entire ledger with an imported backup, same as resetAllData
  // but restoring real data instead of wiping it — merged onto DEFAULT_SETTINGS
  // like hydrate() does, so a backup from an older app version that predates
  // a newer settings field still restores with that field's default intact.
  restoreBackup: async (backup) => {
    set({
      accounts: backup.accounts,
      transactions: backup.transactions,
      settings: { ...DEFAULT_SETTINGS, ...backup.settings },
    });
    await persistNow(get);
  },

  startPeek: () => set({ peekUntil: Date.now() + 10_000 }),
  cancelPeek: () => set({ peekUntil: null }),
}));

async function readSaved(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    // One retry covers a transient failure; a second failure is reported to the caller.
    return AsyncStorage.getItem(STORAGE_KEY);
  }
}

function parseSaved(raw: string): PersistedShape | null {
  try {
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    if (!Array.isArray(data.accounts) || !Array.isArray(data.transactions)) return null;
    if (typeof data.settings !== 'object' || data.settings === null) return null;
    return data as PersistedShape;
  } catch {
    return null;
  }
}

function schedulePersist(get: () => AppState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    get()
      .persist()
      .catch(() => {
        // The change is on screen but not on disk — say so instead of losing it silently.
        useToastStore.getState().show(STRINGS[get().settings.language].common.saveFailed);
      });
  }, 300);
}

// Cancels any pending debounced write and persists right now instead —
// used by the three ledger-replacing actions above, and by the app-background
// flush below, wherever "the data is durable before we move on" actually matters.
async function persistNow(get: () => AppState) {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  await get().persist();
}

// Safety net for every other action (addTransaction, updateSettings, ...): those
// still debounce for efficiency, which leaves a real window — up to 300ms — where
// a change is only in memory. Flushing on backgrounding closes that window for the
// most common real way the app gets killed (switching away, the OS reclaiming it,
// a notification tap), without paying the cost of persisting on every keystroke.
RNAppState.addEventListener('change', (next) => {
  if (next === 'background' || next === 'inactive') {
    persistNow(useAppStore.getState).catch(() => {});
  }
});
