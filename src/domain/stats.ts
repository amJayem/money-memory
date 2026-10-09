// Statistics, money-flow and calendar-intensity calculations (§3). Unlike the
// prototype's fixed demo-month ranges, these compute real calendar ranges
// from `now` — flagged in LEDGER_SPEC.md §9 as something the real app must do.

import type { Account, Transaction } from './types';
import { incomeTotal, spent, totalOwedToMe, transferTotal } from './money';

export type StatRange = 'Today' | 'This week' | 'This month' | '3 months' | 'This year';

export type Translate = (key: string, vars?: Record<string, string>) => string;

const RANGE_KEY: Record<StatRange, string> = {
  Today: 'rangeToday',
  'This week': 'rangeWeek',
  'This month': 'rangeMonth',
  '3 months': 'range3Months',
  'This year': 'rangeYear',
};

/** `t` is the caller's `useTranslation('stats')`. */
export function rangeLabel(r: StatRange, t: Translate): string {
  return t(RANGE_KEY[r]);
}

export function startOfRange(range: StatRange, now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  switch (range) {
    case 'Today':
      return d;
    case 'This week': {
      const day = d.getDay(); // 0 = Sunday
      d.setDate(d.getDate() - day);
      return d;
    }
    case 'This month':
      return new Date(d.getFullYear(), d.getMonth(), 1);
    case '3 months':
      return new Date(d.getFullYear(), d.getMonth() - 2, 1);
    case 'This year':
      return new Date(d.getFullYear(), 0, 1);
  }
}

export function inRange(t: Transaction, range: StatRange, now: Date): boolean {
  const at = new Date(t.at);
  return at >= startOfRange(range, now) && at <= now;
}

export interface CategorySlice {
  name: string;
  amount: number;
  pct: number;
}

/** Expense breakdown by category, sorted descending, over the given range.
 * `t` is the caller's `useTranslation('common')` — only used for the
 * "Other" fallback bucket when a transaction has no category of its own;
 * real category names are user data and are never translated. */
export function categoryBreakdown(transactions: Transaction[], range: StatRange, t: Translate, now: Date = new Date()): CategorySlice[] {
  const inWindow = transactions.filter((t) => t.type === 'expense' && inRange(t, range, now));
  const total = inWindow.reduce((s, t) => s + t.amount, 0);
  const byCategory = new Map<string, number>();
  for (const tx of inWindow) {
    const name = tx.category ?? t('otherCategory');
    byCategory.set(name, (byCategory.get(name) ?? 0) + tx.amount);
  }
  return Array.from(byCategory.entries())
    .map(([name, amount]) => ({ name, amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

const METHOD_KEY: Record<Account['type'], string> = {
  cash: 'methodCash',
  bank: 'methodBank',
  savings: 'methodBank',
  wallet: 'methodWallet',
  credit: 'methodCard',
  debit: 'methodCard',
};

export interface MethodSlice {
  name: string;
  amount: number;
}

/** "How the money left" — expense breakdown bucketed by account type, not
 * individual account. `t` is the caller's `useTranslation('common')`. */
export function methodBreakdown(transactions: Transaction[], accounts: Account[], range: StatRange, t: Translate, now: Date = new Date()): MethodSlice[] {
  const byMethod = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'expense' || !inRange(tx, range, now)) continue;
    const acc = accounts.find((a) => a.id === tx.account);
    if (!acc) continue;
    const label = t(METHOD_KEY[acc.type]);
    byMethod.set(label, (byMethod.get(label) ?? 0) + tx.amount);
  }
  return Array.from(byMethod.entries())
    .map(([name, amount]) => ({ name, amount }))
    .filter((m) => m.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export interface FlowStep {
  label: string;
  amount: number;
  sub: string;
  /** Design colors each step's dot/amount by semantic tone (fixed per step), not accent — 'neutral' renders in plain ink. */
  tone: 'pos' | 'neutral' | 'neg' | 'warn';
}

/** "Money flow" — the 5 fixed reconciliation-style steps shown on Stats.
 * `t` is the caller's `useTranslation('stats')`, `tCommon` its
 * `useTranslation('common')` (passed through to categoryBreakdown). */
export function moneyFlow(transactions: Transaction[], accounts: Account[], countLentAsSpending: boolean, range: StatRange, t: Translate, tCommon: Translate, now: Date = new Date()): FlowStep[] {
  const inWindow = transactions.filter((t) => inRange(t, range, now));
  const income = incomeTotal(inWindow);
  const expense = inWindow.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const transfers = transferTotal(inWindow);
  const spentTotal = spent(inWindow, countLentAsSpending);
  const owed = totalOwedToMe(inWindow);
  const cats = categoryBreakdown(inWindow, range, tCommon, now)
    .slice(0, 3)
    .map((c) => c.name)
    .join(', ');
  const lentPeople = Array.from(new Set(inWindow.filter((tx) => tx.type === 'lent').map((tx) => tx.person).filter(Boolean)))
    .slice(0, 3)
    .join(', ');
  return [
    { label: t('flowIn'), amount: income, sub: t('flowInSub'), tone: 'pos' },
    { label: t('flowLanded'), amount: income - spentTotal, sub: t('flowLandedSub'), tone: 'neutral' },
    { label: t('flowMoved'), amount: transfers, sub: t('flowMovedSub'), tone: 'neutral' },
    { label: t('flowOut'), amount: expense, sub: cats || t('flowOutSubEmpty'), tone: 'neg' },
    { label: t('flowSitting'), amount: owed, sub: lentPeople || t('flowSittingSubEmpty'), tone: 'warn' },
  ];
}

export interface DaySpend {
  date: Date;
  amount: number;
}

/** Last `days` days' expense (+lent if opted in), oldest first. */
export function spendingByDay(transactions: Transaction[], countLentAsSpending: boolean, days = 6, now: Date = new Date()): DaySpend[] {
  const result: DaySpend[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const amount = transactions
      .filter((t) => {
        if (t.type !== 'expense' && !(t.type === 'lent' && countLentAsSpending)) return false;
        const at = new Date(t.at);
        return at >= day && at < nextDay;
      })
      .reduce((s, t) => s + t.amount, 0);
    result.push({ date: day, amount });
  }
  return result;
}

export interface CalendarDay {
  date: Date;
  amount: number;
  /** px width out of a 16px max, per §3's `round(amt / maxDay * 16)`, floored at 4 when amount > 0. */
  barWidth: number;
}

/** Per-day spend intensity for a whole month (§3 calendar day intensity). */
export function calendarIntensity(transactions: Transaction[], countLentAsSpending: boolean, year: number, month: number): CalendarDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totals: number[] = new Array(daysInMonth).fill(0);
  for (const t of transactions) {
    if (t.type !== 'expense' && !(t.type === 'lent' && countLentAsSpending)) continue;
    const at = new Date(t.at);
    if (at.getFullYear() !== year || at.getMonth() !== month) continue;
    totals[at.getDate() - 1] += t.amount;
  }
  const maxDay = Math.max(1, ...totals);
  return totals.map((amount, i) => ({
    date: new Date(year, month, i + 1),
    amount,
    barWidth: amount > 0 ? Math.max(4, Math.round((amount / maxDay) * 16)) : 0,
  }));
}

export interface MonthSpend {
  month: string;
  spent: number;
}

/**
 * Design's "Budget history" card shows the last 3 months' spending against
 * the budget. The prototype hardcodes 3 fixed demo months; we compute real
 * ones from actual transactions instead. Note: we don't yet persist a
 * budget-per-month snapshot, so each past month is compared against the
 * *current* budget setting, not whatever it was that month.
 */
/** `t` is the caller's `useTranslation('common')` (for the short month name). */
export function recentMonthSpending(transactions: Transaction[], countLentAsSpending: boolean, t: Translate, monthsBack = 3, now: Date = new Date()): MonthSpend[] {
  const result: MonthSpend[] = [];
  for (let i = 1; i <= monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const spent = transactions
      .filter((tx) => {
        if (tx.type !== 'expense' && !(tx.type === 'lent' && countLentAsSpending)) return false;
        const at = new Date(tx.at);
        return at.getFullYear() === d.getFullYear() && at.getMonth() === d.getMonth();
      })
      .reduce((s, tx) => s + tx.amount, 0);
    result.push({ month: t(`monthShort${d.getMonth()}`), spent });
  }
  return result;
}
