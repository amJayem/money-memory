// The seven transaction types are a closed set — see CLAUDE-CODE-BRIEF.md §2.
// Do not add an eighth without a matching product decision.
export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'lent'
  | 'borrowed'
  | 'repay_in'
  | 'repay_out';

export type AccountType = 'cash' | 'bank' | 'debit' | 'credit' | 'wallet' | 'savings';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Balance the account started with when added to the app (the "Add account" screen's "Money in it now"). */
  openingBalance: number;
  /** Credit limit; only meaningful when type === 'credit'. */
  limit?: number;
  /** Credit already used at the moment the account was added; only meaningful when type === 'credit'. */
  openingUsed?: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Whole units of the user's currency (no decimals are ever shown). */
  amount: number;
  /** ISO 8601 timestamp — when the money actually moved. */
  at: string;
  /** expense | income only. */
  category?: string;
  /** transfer only: the account money left. Mirrors `account` for non-transfer types. */
  account: string;
  /** transfer only: the account money landed in. */
  toAccount?: string;
  /** lent | borrowed | repay_in | repay_out only. */
  person?: string;
  note?: string;
  /** Set when a transaction is edited, so history can show it was touched. */
  editedAt?: string;
}

export type PrivacyScope = 'dashboard' | 'all';
export type Appearance = 'light' | 'dark' | 'system';
export type NavStyle = 'classic' | 'floating';

export interface Settings {
  hasOnboarded: boolean;
  enabledAccountTypes: AccountType[];
  currencySymbol: string;
  accentTheme: import('../theme/tokens').AccentTheme;
  appearance: Appearance;
  privacy: boolean;
  privacyScope: PrivacyScope;
  countLentAsSpending: boolean;
  budgetAlerts: boolean;
  monthlyBudget: number;
  lastAccountId: string | null;
  lastCategory: string | null;
  /** User-editable expense categories — seeded from EXPENSE_CATEGORIES, renamed/added/removed via the Categories screen. */
  categories: string[];
  /** User-editable income categories — seeded from INCOME_CATEGORIES, grows when someone types a new one under "Other". */
  incomeCategories: string[];
  /** Daily "record today's spending" local notification — off by default, time is user-chosen. */
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  /** Bottom nav shape: 'classic' (edge-to-edge bar) or 'floating' (rounded pill with margins). */
  navStyle: NavStyle;
}

export const EXPENSE_CATEGORIES = [
  'Food',
  'Shopping',
  'Transport',
  'Bills',
  'Entertainment',
  'Health',
  'Personal',
  'Other',
] as const;

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Refund', 'Other'] as const;

export const CATEGORY_BUDGETS: [string, number][] = [
  ['Food', 8000],
  ['Shopping', 6000],
  ['Transport', 4000],
  ['Bills', 7000],
  ['Entertainment', 3000],
];
