import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { Account, Settings, Transaction } from '@/domain/types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/domain/types';
import { SEED_ACCOUNTS, SEED_TRANSACTIONS } from '@/domain/seed';
import { DEFAULT_ACCENT } from '@/theme/tokens';

const STORAGE_KEY = 'moneymemory.v1';

const DEFAULT_SETTINGS: Settings = {
  hasOnboarded: false,
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
};

interface PersistedShape {
  accounts: Account[];
  transactions: Transaction[];
  settings: Settings;
}

interface AppState extends PersistedShape {
  hydrated: boolean;
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
  loadSampleData: () => void;
  resetAllData: () => void;
  startPeek: () => void;
  cancelPeek: () => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  accounts: [],
  transactions: [],
  settings: DEFAULT_SETTINGS,
  hydrated: false,
  peekUntil: null,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: PersistedShape = JSON.parse(raw);
        set({
          accounts: parsed.accounts,
          transactions: parsed.transactions,
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          hydrated: true,
        });
        return;
      }
    } catch {
      // Corrupt or unreadable storage falls through to a fresh seed below.
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
    });
  },

  persist: async () => {
    const { accounts, transactions, settings } = get();
    const payload: PersistedShape = { accounts, transactions, settings };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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
    set((s) => ({
      settings: { ...s.settings, categories: s.settings.categories.map((c) => (c === oldName ? trimmed : c)) },
      transactions: s.transactions.map((t) => (t.category === oldName ? { ...t, category: trimmed } : t)),
    }));
    schedulePersist(get);
  },

  // Callers must check the category is unused first (see app/categories.tsx) —
  // deleting one still in use would leave those transactions' category dangling.
  deleteCategory: (name) => {
    set((s) => ({ settings: { ...s.settings, categories: s.settings.categories.filter((c) => c !== name) } }));
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

  // Onboarding's "explore with sample data" choice — loads the same demo
  // ledger a fresh install used to start with automatically, for anyone who
  // wants to poke around before adding their own real accounts.
  loadSampleData: () => {
    set({
      accounts: SEED_ACCOUNTS,
      transactions: SEED_TRANSACTIONS,
      // The demo sets its own budget so the feature has something to show —
      // this is explicitly opt-in exploration, not a real user's default.
      settings: { ...DEFAULT_SETTINGS, hasOnboarded: true, monthlyBudget: 30000 },
    });
    schedulePersist(get);
  },

  // Unlike the prototype (which only clears transactions), this wipes the
  // whole ledger — accounts and settings included — and routes back through
  // onboarding, since the brief's "delete all" implies a true fresh start.
  resetAllData: () => {
    set({ accounts: [], transactions: [], settings: DEFAULT_SETTINGS });
    schedulePersist(get);
  },

  startPeek: () => set({ peekUntil: Date.now() + 10_000 }),
  cancelPeek: () => set({ peekUntil: null }),
}));

function schedulePersist(get: () => AppState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    get().persist();
  }, 300);
}
