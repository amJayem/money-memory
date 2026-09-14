import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { Account, Settings, Transaction } from '@/domain/types';
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
  monthlyBudget: 30000,
  lastAccountId: null,
  lastCategory: null,
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
  updateSettings: (patch: Partial<Settings>) => void;
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
    // A brand-new install lands on the seeded demo ledger rather than an empty
    // one — already "set up" (brief §3), so onboarding's account/currency
    // picker is skipped. A genuinely empty start is still reachable by
    // deleting all data in Settings, which does route back through onboarding.
    set({
      accounts: SEED_ACCOUNTS,
      transactions: SEED_TRANSACTIONS,
      settings: { ...DEFAULT_SETTINGS, hasOnboarded: true },
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

  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
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
