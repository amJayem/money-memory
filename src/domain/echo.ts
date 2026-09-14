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

export function echoLine(ctx: EchoContext): string {
  const fmt = (n: number) => formatAmount(n, ctx.symbol);
  const amt = fmt(ctx.amount);
  switch (ctx.type) {
    case 'expense':
      return `${amt} out of ${ctx.accountName} · ${ctx.category} · budget left after this: ${fmt(ctx.budgetTotal - ctx.spentSoFar - ctx.amount)}`;
    case 'income':
      return `${amt} into ${ctx.accountName} · ${ctx.category} · doesn't touch your budget`;
    case 'transfer':
      return `${ctx.accountName} → ${ctx.toAccountName} · your total money stays ${fmt(ctx.liquidTotal)}`;
    case 'lent':
      return `${ctx.person} will owe you ${fmt(ctx.outstandingToThem + ctx.amount)} · not counted as spending`;
    case 'repay_in':
      return `${ctx.person} would still owe ${fmt(Math.max(0, ctx.outstandingToThem - ctx.amount))} after this`;
    case 'borrowed':
      return `You'd owe ${ctx.person} ${fmt(ctx.owedToThem + ctx.amount)}`;
    case 'repay_out':
      return `You'd still owe ${ctx.person} ${fmt(Math.max(0, ctx.owedToThem - ctx.amount))}`;
  }
}

export const SAVE_TOAST_LABEL: Record<TransactionType, string> = {
  expense: 'Expense saved',
  income: 'Income saved',
  transfer: 'Transfer recorded',
  lent: 'Loan recorded',
  repay_in: 'Repayment recorded',
  borrowed: 'Borrowing recorded',
  repay_out: 'Payment recorded',
};
