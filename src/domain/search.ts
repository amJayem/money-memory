// Transactions-screen search/filter/grouping (§3 of the extracted spec).

import type { Account, Transaction, TransactionType } from './types';
import { formatAmount, formatSigned } from './format';

export type TxFilter = 'All' | 'Money out' | 'Money in' | 'Transfers' | 'Loans' | 'Cash' | 'Cards';

export type Translate = (key: string, vars?: Record<string, string>) => string;

const LOAN_TYPES: TransactionType[] = ['lent', 'repay_in', 'borrowed', 'repay_out'];

export function matchesFilter(t: Transaction, filter: TxFilter, accounts: Account[]): boolean {
  switch (filter) {
    case 'All':
      return true;
    case 'Money out':
      return t.type === 'expense';
    case 'Money in':
      return t.type === 'income';
    case 'Transfers':
      return t.type === 'transfer';
    case 'Loans':
      return LOAN_TYPES.includes(t.type);
    case 'Cash':
      return accounts.find((a) => a.id === t.account)?.type === 'cash';
    case 'Cards': {
      const a = accounts.find((acc) => acc.id === t.account);
      return a?.type === 'credit' || a?.type === 'debit';
    }
  }
}

const FILTER_KEY: Record<TxFilter, string> = {
  All: 'filterAll',
  'Money out': 'filterMoneyOut',
  'Money in': 'filterMoneyIn',
  Transfers: 'filterTransfers',
  Loans: 'filterLoans',
  Cash: 'filterCash',
  Cards: 'filterCards',
};

/** `t` is the caller's `useTranslation('common')`. */
export function filterLabel(f: TxFilter, t: Translate): string {
  return t(FILTER_KEY[f]);
}

/** Row icon: the design uses a single letter (category or person initial), not a symbolic glyph — transfer is the one fixed exception. */
export function transactionIcon(t: Transaction): string {
  if (t.type === 'transfer') return '⇄';
  const text = t.type === 'expense' || t.type === 'income' ? t.category : t.person;
  return (text || '?')[0]?.toUpperCase() ?? '?';
}

/** `t` is the caller's `useTranslation('common')`. */
export function transactionTitle(t: Transaction, accounts: Account[], translate: Translate): string {
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  switch (t.type) {
    case 'expense':
      return t.category ?? translate('titleExpenseFallback');
    case 'income':
      return t.category ?? translate('titleIncomeFallback');
    case 'transfer':
      return `${accName(t.account)} → ${accName(t.toAccount ?? '')}`;
    case 'lent':
      return translate('titleLentTo', { person: t.person ?? '' });
    case 'borrowed':
      return translate('titleBorrowedFrom', { person: t.person ?? '' });
    case 'repay_in':
      return translate('titlePaidYouBack', { person: t.person ?? '' });
    case 'repay_out':
      return translate('titlePaidPersonBack', { person: t.person ?? '' });
  }
}

/** `t` is the caller's `useTranslation('common')`. */
export function transactionSub(t: Transaction, accounts: Account[], translate: Translate): string {
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  if (t.type === 'transfer') return translate('subTransferNotSpending');
  return `${accName(t.account)}${t.note ? ' · ' + t.note : ''}`;
}

export function matchesQuery(t: Transaction, query: string, accounts: Account[], translate: Translate): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    transactionTitle(t, accounts, translate),
    transactionSub(t, accounts, translate),
    t.category ?? '',
    t.person ?? '',
    t.note ?? '',
    accounts.find((a) => a.id === t.account)?.name ?? '',
    String(t.amount),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

/** Signed contribution of a transaction to a day/group net total. */
function netContribution(t: Transaction): number {
  if (t.type === 'transfer') return 0;
  if (t.type === 'expense' || t.type === 'lent' || t.type === 'repay_out') return -t.amount;
  return t.amount;
}

export interface TxGroup {
  label: string;
  total: string;
  items: Transaction[];
}

function dayLabel(date: Date, today: Date, t: Translate): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(date)) / (24 * 60 * 60 * 1000));
  const md = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (diffDays === 0) return `${t('today')} · ${md}`;
  if (diffDays === 1) return `${t('yesterday')} · ${md}`;
  return md;
}

export function sortedTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/** `t` is the caller's `useTranslation('common')` (for the Today/Yesterday day labels). */
export function groupByDay(transactions: Transaction[], symbol: string, t: Translate, now: Date = new Date()): TxGroup[] {
  const sorted = sortedTransactions(transactions);
  const groups = new Map<string, Transaction[]>();
  for (const tx of sorted) {
    const key = new Date(tx.at).toDateString();
    const arr = groups.get(key) ?? [];
    arr.push(tx);
    groups.set(key, arr);
  }
  return Array.from(groups.entries()).map(([key, items]) => {
    const net = items.reduce((s, tx) => s + netContribution(tx), 0);
    return {
      label: dayLabel(new Date(key), now, t),
      total: formatSigned(net, symbol),
      items,
    };
  });
}

export function transactionSum(transactions: Transaction[], symbol: string): string {
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  return formatAmount(total, symbol);
}
