import { calendarIntensity, categoryBreakdown, inRange, startOfRange } from '../stats';
import type { Transaction } from '../types';

function tx(overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'amount' | 'account' | 'at'>): Transaction {
  return overrides as Transaction;
}

describe('categoryBreakdown', () => {
  test('sorts descending and computes percent of the window total', () => {
    const now = new Date('2026-09-15T12:00:00.000Z');
    const txs = [
      tx({ id: '1', type: 'expense', amount: 3000, category: 'Food', account: 'cash', at: '2026-09-10T10:00:00.000Z' }),
      tx({ id: '2', type: 'expense', amount: 1000, category: 'Transport', account: 'cash', at: '2026-09-11T10:00:00.000Z' }),
      tx({ id: '3', type: 'income', amount: 50000, category: 'Salary', account: 'cash', at: '2026-09-11T10:00:00.000Z' }),
    ];
    const result = categoryBreakdown(txs, 'This month', now);
    expect(result).toEqual([
      { name: 'Food', amount: 3000, pct: 75 },
      { name: 'Transport', amount: 1000, pct: 25 },
    ]);
  });

  test('excludes transactions outside the range', () => {
    const now = new Date('2026-09-15T12:00:00.000Z');
    const txs = [tx({ id: '1', type: 'expense', amount: 1000, category: 'Food', account: 'cash', at: '2026-08-01T10:00:00.000Z' })];
    expect(categoryBreakdown(txs, 'This month', now)).toEqual([]);
  });
});

describe('startOfRange / inRange', () => {
  test('"This month" starts on the 1st', () => {
    const now = new Date('2026-09-15T12:00:00.000Z');
    const start = startOfRange('This month', now);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(8); // September, 0-indexed
  });

  test('"Today" excludes yesterday', () => {
    const now = new Date(2026, 8, 15, 12, 0, 0);
    const yesterday = tx({ id: '1', type: 'expense', amount: 100, account: 'cash', at: new Date(2026, 8, 14, 23, 0, 0).toISOString() });
    expect(inRange(yesterday, 'Today', now)).toBe(false);
  });
});

describe('calendarIntensity', () => {
  test('the biggest-spend day gets the max bar width (16px)', () => {
    const txs = [
      tx({ id: '1', type: 'expense', amount: 1000, account: 'cash', at: '2026-09-05T10:00:00.000Z' }),
      tx({ id: '2', type: 'expense', amount: 500, account: 'cash', at: '2026-09-06T10:00:00.000Z' }),
    ];
    const days = calendarIntensity(txs, false, 2026, 8); // September = month index 8
    expect(days[4].barWidth).toBe(16); // day 5
    expect(days[5].barWidth).toBe(8); // day 6, half of day 5's amount
    expect(days[0].barWidth).toBe(0); // no spend
  });
});
