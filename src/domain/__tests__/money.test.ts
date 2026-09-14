import {
  balance,
  budgetStatus,
  creditLeft,
  liquid,
  monthlyReport,
  peopleAgg,
  spent,
  totalIOwe,
  totalOwedToMe,
  totalPosition,
} from '../money';
import type { Account, Transaction } from '../types';

function acc(overrides: Partial<Account> & Pick<Account, 'id' | 'type'>): Account {
  return { name: overrides.id, openingBalance: 0, ...overrides };
}

function tx(overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'amount' | 'account'>): Transaction {
  return { at: '2026-09-01T10:00:00.000Z', ...overrides };
}

const accounts: Account[] = [
  acc({ id: 'cash', type: 'cash', openingBalance: 10000 }),
  acc({ id: 'bank', type: 'bank', openingBalance: 20000 }),
  acc({ id: 'visa', type: 'credit', openingBalance: 0, limit: 50000 }),
];

describe('brief §2 non-negotiable money rules', () => {
  test('rule 1: lent money is not spending by default', () => {
    const txs = [tx({ id: 't1', type: 'expense', amount: 1000, account: 'cash', category: 'Food' }), tx({ id: 't2', type: 'lent', amount: 5000, account: 'cash', person: 'Rahim' })];
    expect(spent(txs, false)).toBe(1000);
  });

  test('rule 1: "count lent as spending" setting flips it', () => {
    const txs = [tx({ id: 't1', type: 'expense', amount: 1000, account: 'cash', category: 'Food' }), tx({ id: 't2', type: 'lent', amount: 5000, account: 'cash', person: 'Rahim' })];
    expect(spent(txs, true)).toBe(6000);
  });

  test('rule 2: transfers never affect spending', () => {
    const txs = [tx({ id: 't1', type: 'transfer', amount: 9000, account: 'bank', toAccount: 'cash' })];
    expect(spent(txs, true)).toBe(0);
  });

  test('rule 3: total available excludes lent-out money and credit accounts entirely', () => {
    const txs = [
      tx({ id: 't1', type: 'lent', amount: 5000, account: 'cash', person: 'Rahim' }),
      tx({ id: 't2', type: 'expense', amount: 2000, account: 'visa', category: 'Shopping' }),
    ];
    // cash: 10000 - 5000 = 5000; bank untouched: 20000; visa excluded entirely.
    expect(liquid(accounts, txs)).toBe(25000);
  });

  test('rule 4: credit left is limit minus used, and credit never enters liquid()', () => {
    const txs = [tx({ id: 't1', type: 'expense', amount: 15000, account: 'visa', category: 'Shopping' })];
    const visa = accounts.find((a) => a.id === 'visa')!;
    expect(creditLeft(visa, txs)).toBe(35000);
    expect(liquid(accounts, txs)).toBe(30000); // unaffected by the visa charge
  });

  test('rule 5: total position is liquid + owed, never conflated with liquid', () => {
    const txs = [tx({ id: 't1', type: 'lent', amount: 5000, account: 'cash', person: 'Rahim' })];
    const liq = liquid(accounts, txs);
    const pos = totalPosition(accounts, txs);
    expect(pos).toBe(liq + 5000);
    expect(pos).not.toBe(liq);
  });

  test('rule 6: lent and borrowed are independent ledgers per person, never netted', () => {
    const txs = [
      tx({ id: 't1', type: 'lent', amount: 3000, account: 'cash', person: 'Rahim' }),
      tx({ id: 't2', type: 'borrowed', amount: 1000, account: 'cash', person: 'Rahim' }),
    ];
    const lent = peopleAgg(txs, 'lent').find((p) => p.person === 'Rahim')!;
    const borrowed = peopleAgg(txs, 'borrowed').find((p) => p.person === 'Rahim')!;
    expect(lent.out).toBe(3000);
    expect(borrowed.out).toBe(1000);
    expect(totalOwedToMe(txs)).toBe(3000);
    expect(totalIOwe(txs)).toBe(1000);
  });

  test('rule 7: a fully repaid person is cleared (out === 0), not removed from the ledger', () => {
    const txs = [
      tx({ id: 't1', type: 'lent', amount: 4000, account: 'cash', person: 'Sakib' }),
      tx({ id: 't2', type: 'repay_in', amount: 4000, account: 'cash', person: 'Sakib' }),
    ];
    const sakib = peopleAgg(txs, 'lent').find((p) => p.person === 'Sakib')!;
    expect(sakib).toBeDefined();
    expect(sakib.out).toBe(0);
  });

  test('an over-repaid person floors to zero owed, never negative', () => {
    const txs = [
      tx({ id: 't1', type: 'lent', amount: 1000, account: 'cash', person: 'Karim' }),
      tx({ id: 't2', type: 'repay_in', amount: 1500, account: 'cash', person: 'Karim' }),
    ];
    expect(totalOwedToMe(txs)).toBe(0);
  });
});

describe('budgetStatus thresholds', () => {
  test('no budget set (<=0) short-circuits every other flag', () => {
    const s = budgetStatus(0, 5000);
    expect(s.noBudget).toBe(true);
    expect(s.overBudget).toBe(false);
    expect(s.nearBudget).toBe(false);
  });

  test('under 80% is "pos"', () => {
    expect(budgetStatus(10000, 5000).tone).toBe('pos');
  });

  test('at/above 80% but under budget is "warn"', () => {
    expect(budgetStatus(10000, 8000).tone).toBe('warn');
  });

  test('exactly at budget is "warn", not "pos" or "neg"', () => {
    const s = budgetStatus(10000, 10000);
    expect(s.exactBudget).toBe(true);
    expect(s.tone).toBe('warn');
  });

  test('over budget is "neg" and left is negative', () => {
    const s = budgetStatus(10000, 12000);
    expect(s.overBudget).toBe(true);
    expect(s.tone).toBe('neg');
    expect(s.left).toBe(-2000);
  });
});

describe('monthly reconciliation invariant', () => {
  test('opening + every movement row equals closing exactly', () => {
    const txs = [
      tx({ id: 't1', type: 'income', amount: 45000, account: 'bank', category: 'Salary' }),
      tx({ id: 't2', type: 'expense', amount: 3500, account: 'cash', category: 'Food' }),
      tx({ id: 't3', type: 'lent', amount: 4000, account: 'cash', person: 'Hasan' }),
      tx({ id: 't4', type: 'repay_in', amount: 1500, account: 'bank', person: 'Hasan' }),
      tx({ id: 't5', type: 'borrowed', amount: 2000, account: 'cash', person: 'Imran' }),
      tx({ id: 't6', type: 'repay_out', amount: 500, account: 'cash', person: 'Imran' }),
      tx({ id: 't7', type: 'transfer', amount: 5000, account: 'bank', toAccount: 'cash' }),
    ];
    const r = monthlyReport(accounts, txs);
    const net = r.income + r.repaidIn - r.expense - r.lent + r.borrowed - r.repaidOut;
    expect(r.opening + net).toBeCloseTo(r.closing);
    expect(r.closing).toBe(liquid(accounts, txs));
  });

  test('reconciles to a stable opening balance even with zero transactions', () => {
    const r = monthlyReport(accounts, []);
    expect(r.opening).toBe(r.closing);
  });
});

describe('balance()', () => {
  test('a transfer debits the source and credits the destination', () => {
    const txs = [tx({ id: 't1', type: 'transfer', amount: 5000, account: 'bank', toAccount: 'cash' })];
    const cash = accounts.find((a) => a.id === 'cash')!;
    const bank = accounts.find((a) => a.id === 'bank')!;
    expect(balance(cash, txs)).toBe(15000);
    expect(balance(bank, txs)).toBe(15000);
  });
});
