// The money engine. Every function here is pure (no I/O, no React) so the
// non-negotiable rules in CLAUDE-CODE-BRIEF.md §2 can be asserted directly in
// tests without touching the UI. Verified against the prototype's own logic
// (see LEDGER_SPEC.md §2-3) rather than re-derived from the brief alone.

import type { Account, Transaction } from './types';

/** A non-credit account's current balance: opening balance plus every effect on it. */
export function balance(account: Account, transactions: Transaction[]): number {
  let b = account.openingBalance;
  for (const t of transactions) {
    if (t.account === account.id) {
      if (t.type === 'income' || t.type === 'repay_in' || t.type === 'borrowed') b += t.amount;
      else if (t.type === 'expense' || t.type === 'lent' || t.type === 'repay_out' || t.type === 'transfer') b -= t.amount;
    }
    if (t.type === 'transfer' && t.toAccount === account.id) b += t.amount;
  }
  return b;
}

/** Credit consumed on a credit-card account (expense + lent charged to it). */
export function creditUsed(account: Account, transactions: Transaction[]): number {
  let u = account.openingUsed ?? 0;
  for (const t of transactions) {
    if (t.account === account.id && (t.type === 'expense' || t.type === 'lent')) u += t.amount;
  }
  return u;
}

/** Credit remaining on a credit-card account — never negative. */
export function creditLeft(account: Account, transactions: Transaction[]): number {
  return Math.max(0, (account.limit ?? 0) - creditUsed(account, transactions));
}

/**
 * Total available (brief §2 rule 3): sum of non-credit account balances only.
 * Excludes money lent out (it simply isn't added back) and excludes every
 * credit account entirely — not even a nominal $0 balance is included.
 */
export function liquid(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter((a) => a.type !== 'credit')
    .reduce((sum, a) => sum + balance(a, transactions), 0);
}

/**
 * Spending total that counts toward the budget (brief §2 rule 1): only
 * `expense` counts by default; `lent` counts only if the user opted in.
 */
export function spent(transactions: Transaction[], countLentAsSpending: boolean): number {
  let total = 0;
  for (const t of transactions) {
    if (t.type === 'expense') total += t.amount;
    else if (t.type === 'lent' && countLentAsSpending) total += t.amount;
  }
  return total;
}

export function incomeTotal(transactions: Transaction[]): number {
  return transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
}

export function transferTotal(transactions: Transaction[]): number {
  return transactions.filter((t) => t.type === 'transfer').reduce((s, t) => s + t.amount, 0);
}

export interface PersonLedger {
  person: string;
  given: number;
  back: number;
  /** given - back, i.e. still outstanding in this direction. Never shown negative in the UI. */
  out: number;
}

/**
 * Per-person aggregation (brief §2 rule 6): lent and borrowed are two
 * completely independent ledgers per person — never netted against each other.
 */
export function peopleAgg(transactions: Transaction[], kind: 'lent' | 'borrowed'): PersonLedger[] {
  const give = kind === 'lent' ? 'lent' : 'borrowed';
  const back = kind === 'lent' ? 'repay_in' : 'repay_out';
  const byPerson = new Map<string, { given: number; back: number }>();
  for (const t of transactions) {
    if (!t.person) continue;
    if (t.type !== give && t.type !== back) continue;
    const entry = byPerson.get(t.person) ?? { given: 0, back: 0 };
    if (t.type === give) entry.given += t.amount;
    else entry.back += t.amount;
    byPerson.set(t.person, entry);
  }
  return Array.from(byPerson.entries()).map(([person, { given, back }]) => ({
    person,
    given,
    back,
    out: given - back,
  }));
}

export function outstandingFor(transactions: Transaction[], kind: 'lent' | 'borrowed', person: string): PersonLedger {
  const row = peopleAgg(transactions, kind).find((p) => p.person === person);
  return row ?? { person, given: 0, back: 0, out: 0 };
}

/** Design's `statusTone`: cleared -> pos, partly paid -> warn, still fully outstanding -> neg. Drives both the avatar circle and the status pill on Loans/Person. */
export function statusTone(p: PersonLedger): 'pos' | 'warn' | 'neg' {
  if (p.out <= 0) return 'pos';
  if (p.back > 0) return 'warn';
  return 'neg';
}

export function statusLabel(p: PersonLedger): 'Cleared' | 'Partly paid' | 'Outstanding' {
  if (p.out <= 0) return 'Cleared';
  if (p.back > 0) return 'Partly paid';
  return 'Outstanding';
}

/** "You are owed" — brief §2 rule: never shown negative, people can't net below zero. */
export function totalOwedToMe(transactions: Transaction[]): number {
  return peopleAgg(transactions, 'lent').reduce((sum, p) => sum + Math.max(0, p.out), 0);
}

/** "You owe" — the borrowed-side mirror of totalOwedToMe. */
export function totalIOwe(transactions: Transaction[]): number {
  return peopleAgg(transactions, 'borrowed').reduce((sum, p) => sum + Math.max(0, p.out), 0);
}

/** Total position (brief §2 rule 5): total available + outstanding owed to you. Never conflated with `liquid`. */
export function totalPosition(accounts: Account[], transactions: Transaction[]): number {
  return liquid(accounts, transactions) + totalOwedToMe(transactions);
}

export type BudgetTone = 'pos' | 'warn' | 'neg';

export interface BudgetStatus {
  budget: number;
  spent: number;
  left: number;
  /** Percent spent, one decimal, capped for display at 999. */
  pct: number;
  noBudget: boolean;
  overBudget: boolean;
  exactBudget: boolean;
  nearBudget: boolean;
  tone: BudgetTone;
  /** 0-100: the normal (non-overflow) fill width. */
  barPct: number;
  /** 0-100: the hatched overflow segment width, drawn separately so the bar never visually exceeds 100%. */
  overPct: number;
}

/** budget <= 0 means "no budget set" (the entry form's -1 / an unset 0). */
export function budgetStatus(budget: number, spentAmount: number): BudgetStatus {
  const noBudget = budget <= 0;
  const left = budget - spentAmount;
  const pct = noBudget ? 0 : Math.min(999, Math.round((spentAmount / budget) * 1000) / 10);
  const overBudget = !noBudget && left < 0;
  const exactBudget = !noBudget && left === 0;
  const nearBudget = !noBudget && !overBudget && !exactBudget && spentAmount / budget >= 0.8;
  const tone: BudgetTone = overBudget ? 'neg' : nearBudget || exactBudget ? 'warn' : 'pos';
  const barPct = noBudget ? 0 : overBudget ? (budget / spentAmount) * 100 : (spentAmount / budget) * 100;
  const overPct = overBudget ? 100 - barPct : 0;
  return { budget, spent: spentAmount, left, pct, noBudget, overBudget, exactBudget, nearBudget, tone, barPct, overPct };
}

/**
 * Plain-language budget status line (§3), given the days remaining in the
 * current month (the prototype hardcodes this; the real app computes it).
 */
export function budgetStatusLine(status: BudgetStatus, monthLabel: string, daysRemaining: number, fmt: (n: number) => string): string {
  if (status.noBudget) return 'No monthly budget set — spending is still recorded, just not measured against a plan.';
  if (status.overBudget) return `Your spending is ${fmt(-status.left)} above this month's plan.`;
  if (status.exactBudget) return `You've used your ${monthLabel} plan exactly — anything more goes over.`;
  if (status.nearBudget) return `You're getting close to your ${monthLabel} budget — ${fmt(status.left)} left.`;
  return `${fmt(status.left)} of your plan is still unspent, with ${daysRemaining} days to go.`;
}

/**
 * Monthly reconciliation (§3): opening = closing(liquid) − net movement.
 * Row order: opening -> +income -> -expense -> -lent -> +repay_in -> transfer (no net effect) -> closing.
 * Invariant: opening + every movement row must equal closing exactly.
 */
export interface MonthlyReport {
  opening: number;
  income: number;
  expense: number;
  lent: number;
  repaidIn: number;
  borrowed: number;
  repaidOut: number;
  transfers: number;
  closing: number;
}

/** Every distinct person named on any transaction — people are derived, never stored separately. */
export function knownPeople(transactions: Transaction[]): string[] {
  return Array.from(new Set(transactions.map((t) => t.person).filter((p): p is string => !!p))).sort();
}

export function monthlyReport(accounts: Account[], transactions: Transaction[]): MonthlyReport {
  const sumType = (type: Transaction['type']) => transactions.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
  const income = sumType('income');
  const expense = sumType('expense');
  const lent = sumType('lent');
  const repaidIn = sumType('repay_in');
  const borrowed = sumType('borrowed');
  const repaidOut = sumType('repay_out');
  const transfers = sumType('transfer');
  const closing = liquid(accounts, transactions);
  const netMovement = income + repaidIn - expense - lent + borrowed - repaidOut;
  const opening = closing - netMovement;
  return { opening, income, expense, lent, repaidIn, borrowed, repaidOut, transfers, closing };
}
