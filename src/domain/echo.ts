// The entry form's live "echo line" — exact templates from §7 of the spec.
// Always unsigned/unmasked: it's explanatory helper text, never subject to privacy masking.

import { formatAmount } from './format';
import type { TransactionType } from './types';

export interface EchoContext {
  type: TransactionType;
  amount: number;
  symbol: string;
  accountName: string;
  toAccountName?: string;
  category?: string;
  person?: string;
  budgetTotal: number;
  spentSoFar: number;
  liquidTotal: number;
  outstandingToThem: number; // lent/repay_in: peopleAgg('lent', person).out
  owedToThem: number; // borrowed/repay_out: peopleAgg('borrowed', person).out
}

export type Translate = (key: string, vars?: Record<string, string>) => string;

/** `t` is the caller's `useTranslation('entry')` — kept out of this module so
 * it stays a plain function of its inputs, not coupled to the i18n hook. */
export function echoLine(ctx: EchoContext, t: Translate): string {
  const fmt = (n: number) => formatAmount(n, ctx.symbol);
  const amt = fmt(ctx.amount);
  switch (ctx.type) {
    case 'expense':
      return t('echoExpense', { amt, account: ctx.accountName, category: ctx.category ?? '', left: fmt(ctx.budgetTotal - ctx.spentSoFar - ctx.amount) });
    case 'income':
      return t('echoIncome', { amt, account: ctx.accountName, category: ctx.category ?? '' });
    case 'transfer':
      return t('echoTransfer', { account: ctx.accountName, toAccount: ctx.toAccountName ?? '', total: fmt(ctx.liquidTotal) });
    case 'lent':
      return t('echoLent', { person: ctx.person ?? '', amt: fmt(ctx.outstandingToThem + ctx.amount) });
    case 'repay_in':
      return t('echoRepayIn', { person: ctx.person ?? '', amt: fmt(Math.max(0, ctx.outstandingToThem - ctx.amount)) });
    case 'borrowed':
      return t('echoBorrowed', { person: ctx.person ?? '', amt: fmt(ctx.owedToThem + ctx.amount) });
    case 'repay_out':
      return t('echoRepayOut', { person: ctx.person ?? '', amt: fmt(Math.max(0, ctx.owedToThem - ctx.amount)) });
  }
}
