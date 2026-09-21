import { transactionsToCsv } from '../csv';
import type { Account, Transaction } from '../types';

function acc(overrides: Partial<Account> & Pick<Account, 'id' | 'type'>): Account {
  return { name: overrides.id, openingBalance: 0, ...overrides };
}

function tx(overrides: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'amount' | 'account'>): Transaction {
  return { at: '2026-09-01T10:00:00.000Z', ...overrides };
}

describe('transactionsToCsv', () => {
  const accounts = [acc({ id: 'cash', type: 'cash', name: 'Cash wallet' })];

  it('writes a header row and one row per transaction', () => {
    const csv = transactionsToCsv(
      [tx({ id: '1', type: 'expense', amount: 500, account: 'cash', category: 'Food' })],
      accounts,
      '৳'
    );
    const lines = csv.split('\n');
    const localTime = new Date('2026-09-01T10:00:00.000Z').toTimeString().slice(0, 5);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Date,Time,Type,Amount,Currency,Category,Account,To account,Person,Note');
    expect(lines[1]).toBe(`2026-09-01,${localTime},expense,500,৳,Food,Cash wallet,,,`);
  });

  it('resolves account ids to names, including transfer destinations', () => {
    const bank = acc({ id: 'bank', type: 'bank', name: 'Bank account' });
    const csv = transactionsToCsv(
      [tx({ id: '1', type: 'transfer', amount: 200, account: 'cash', toAccount: 'bank' })],
      [...accounts, bank],
      '৳'
    );
    const row = csv.split('\n')[1];
    expect(row).toContain('Cash wallet,Bank account');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = transactionsToCsv([tx({ id: '1', type: 'expense', amount: 100, account: 'cash', note: 'Lunch, with "friends"' })], accounts, '৳');
    const row = csv.split('\n')[1];
    expect(row).toContain('"Lunch, with ""friends"""');
  });

  it('sorts rows oldest first regardless of input order', () => {
    const csv = transactionsToCsv(
      [
        tx({ id: 'later', type: 'expense', amount: 1, account: 'cash', at: '2026-09-02T00:00:00.000Z' }),
        tx({ id: 'earlier', type: 'expense', amount: 1, account: 'cash', at: '2026-09-01T00:00:00.000Z' }),
      ],
      accounts,
      '৳'
    );
    const [, first, second] = csv.split('\n');
    expect(first).toContain('2026-09-01');
    expect(second).toContain('2026-09-02');
  });
});
