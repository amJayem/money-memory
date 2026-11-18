// Regression tests for the pre-launch review fixes. Dates are built with the local-time Date
// constructor on purpose, so these hold in whatever time zone the tests run in.

import { parseBackup } from '../backup';
import { parseDateKey, toDateKey } from '../dates';
import { newId } from '../id';
import { dueReminders, loanFulfillments } from '../money';
import { groupByDay } from '../search';
import { moneyFlow } from '../stats';
import type { Transaction } from '../types';

const t = (key: string) => key;

function tx(overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'amount' | 'at'>): Transaction {
  return { account: 'cash', ...overrides } as Transaction;
}

describe('date keys', () => {
  test('use the local calendar day at both ends of the day', () => {
    expect(toDateKey(new Date(2026, 10, 20, 0, 30))).toBe('2026-11-20');
    expect(toDateKey(new Date(2026, 10, 20, 23, 30))).toBe('2026-11-20');
  });

  test('round-trip through parseDateKey', () => {
    const d = parseDateKey('2026-03-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 1, 0]);
    expect(toDateKey(d)).toBe('2026-03-01');
  });
});

describe('newId', () => {
  test('never repeats within the same millisecond', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => newId('n')));
    expect(ids.size).toBe(5000);
  });
});

describe('dueReminders', () => {
  const loan = tx({ id: 'l1', type: 'lent', amount: 500, person: 'Rahim', dueDate: '2026-11-20', at: new Date(2026, 10, 1, 12).toISOString() });

  test('is not due the night before, is due from the first minute of the day', () => {
    expect(dueReminders([loan], new Date(2026, 10, 19, 23, 50))).toHaveLength(0);
    const due = dueReminders([loan], new Date(2026, 10, 20, 0, 10));
    expect(due).toHaveLength(1);
    expect(due[0].overdue).toBe(false);
  });

  test('turns overdue the day after', () => {
    expect(dueReminders([loan], new Date(2026, 10, 21, 0, 10))[0].overdue).toBe(true);
  });
});

describe('loanFulfillments', () => {
  test('a repayment late on the due date itself still counts as on time', () => {
    const txs = [
      tx({ id: 'l1', type: 'lent', amount: 500, person: 'Rahim', dueDate: '2026-11-20', at: new Date(2026, 10, 1, 12).toISOString() }),
      tx({ id: 'r1', type: 'repay_in', amount: 500, person: 'Rahim', at: new Date(2026, 10, 20, 23, 30).toISOString() }),
    ];
    expect(loanFulfillments(txs, 'lent', new Date(2026, 10, 25)).get('l1')?.fulfillment).toBe('onTime');
  });

  test('decimal repayments that add up to the loan clear it', () => {
    const txs = [
      tx({ id: 'l1', type: 'lent', amount: 0.3, person: 'Rahim', at: new Date(2026, 10, 1).toISOString() }),
      tx({ id: 'r1', type: 'repay_in', amount: 0.1, person: 'Rahim', at: new Date(2026, 10, 2).toISOString() }),
      tx({ id: 'r2', type: 'repay_in', amount: 0.2, person: 'Rahim', at: new Date(2026, 10, 3).toISOString() }),
    ];
    expect(loanFulfillments(txs, 'lent').get('l1')?.clearedAt).not.toBeNull();
  });
});

describe('moneyFlow', () => {
  test('subtracts the whole range\'s spending, not just this month\'s', () => {
    const now = new Date(2026, 10, 16, 12);
    const txs = [
      tx({ id: 'i1', type: 'income', amount: 1000, at: new Date(2026, 8, 5).toISOString() }),
      tx({ id: 'e1', type: 'expense', amount: 300, category: 'Food', at: new Date(2026, 8, 6).toISOString() }),
      tx({ id: 'e2', type: 'expense', amount: 200, category: 'Food', at: new Date(2026, 10, 2).toISOString() }),
    ];
    const landed = moneyFlow(txs, [], false, '3 months', t, t, now)[1];
    expect(landed.amount).toBe(500);
  });
});

describe('groupByDay', () => {
  test('the same day a year apart gets two distinct labels', () => {
    const now = new Date(2026, 10, 16, 12);
    const groups = groupByDay(
      [
        tx({ id: 'a', type: 'expense', amount: 1, at: new Date(2026, 10, 10, 9).toISOString() }),
        tx({ id: 'b', type: 'expense', amount: 1, at: new Date(2025, 10, 10, 9).toISOString() }),
      ],
      '৳',
      t,
      now,
    );
    expect(new Set(groups.map((g) => g.label)).size).toBe(2);
  });
});

describe('parseBackup', () => {
  const base = {
    app: 'money-memory',
    backupVersion: 1,
    exportedAt: '2026-11-16T00:00:00.000Z',
    accounts: [{ id: 'cash', name: 'Cash', type: 'cash', openingBalance: 100 }],
    transactions: [{ id: 't1', type: 'expense', amount: 50, account: 'cash', at: '2026-11-10T10:00:00.000Z' }],
    settings: { language: 'en' },
  };

  test('accepts a well-formed backup', () => {
    expect(parseBackup(JSON.stringify(base)).transactions).toHaveLength(1);
  });

  test.each([
    ['a transaction with no date', { transactions: [{ id: 't1', type: 'expense', amount: 50, account: 'cash' }] }],
    ['a transaction with a text amount', { transactions: [{ id: 't1', type: 'expense', amount: '50', account: 'cash', at: '2026-11-10T10:00:00.000Z' }] }],
    ['an unknown transaction type', { transactions: [{ id: 't1', type: 'gift', amount: 50, account: 'cash', at: '2026-11-10T10:00:00.000Z' }] }],
    ['an account with no balance', { accounts: [{ id: 'cash', name: 'Cash', type: 'cash' }] }],
    ['a null record', { transactions: [null] }],
  ])('rejects %s', (_label, patch) => {
    expect(() => parseBackup(JSON.stringify({ ...base, ...patch }))).toThrow();
  });

  test('drops wrongly-shaped settings instead of restoring them', () => {
    const parsed = parseBackup(JSON.stringify({ ...base, settings: { language: 'en', categories: 'Food', categoryBudgets: { Food: 'lots' }, monthlyBudget: 5000 } }));
    expect('categories' in parsed.settings).toBe(false);
    expect('categoryBudgets' in parsed.settings).toBe(false);
    expect(parsed.settings.monthlyBudget).toBe(5000);
  });
});

describe('decimal amounts', () => {
  const { balance, budgetStatus, outstandingFor, spent } = require('../money');

  test('a loan of 0.1 + 0.2 repaid with 0.3 is exactly cleared', () => {
    const txs = [
      tx({ id: 'l1', type: 'lent', amount: 0.1, person: 'Rahim', at: new Date(2026, 10, 1).toISOString() }),
      tx({ id: 'l2', type: 'lent', amount: 0.2, person: 'Rahim', at: new Date(2026, 10, 2).toISOString() }),
      tx({ id: 'r1', type: 'repay_in', amount: 0.3, person: 'Rahim', at: new Date(2026, 10, 3).toISOString() }),
    ];
    expect(outstandingFor(txs, 'lent', 'Rahim').out).toBe(0);
  });

  test('balances and budget totals do not drift', () => {
    const now = new Date(2026, 10, 16);
    const txs = Array.from({ length: 10 }, (_, i) => tx({ id: `e${i}`, type: 'expense', amount: 0.1, at: new Date(2026, 10, 5).toISOString() }));
    expect(balance({ id: 'cash', name: 'Cash', type: 'cash', openingBalance: 1 }, txs)).toBe(0);
    expect(spent(txs, false, now)).toBe(1);
    expect(budgetStatus(1, spent(txs, false, now)).exactBudget).toBe(true);
  });
});
