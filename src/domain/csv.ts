import type { Account, Transaction } from './types';

const CSV_HEADER = ['Date', 'Time', 'Type', 'Amount', 'Currency', 'Category', 'Account', 'To account', 'Person', 'Note'];

function escapeCsvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toRow(values: string[]): string {
  return values.map(escapeCsvField).join(',');
}

/** One row per transaction, oldest first — matches how a spreadsheet reader would expect a running ledger. */
export function transactionsToCsv(transactions: Transaction[], accounts: Account[], currencySymbol: string): string {
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  const rows = [...transactions]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((t) => {
      const when = new Date(t.at);
      return toRow([
        when.toISOString().slice(0, 10),
        when.toTimeString().slice(0, 5),
        t.type,
        String(t.amount),
        currencySymbol,
        t.category ?? '',
        accountName(t.account),
        t.toAccount ? accountName(t.toAccount) : '',
        t.person ?? '',
        t.note ?? '',
      ]);
    });
  return [toRow(CSV_HEADER), ...rows].join('\n');
}
