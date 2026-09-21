import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Account, Transaction } from '@/domain/types';
import { transactionsToCsv } from '@/domain/csv';

function csvFilename(): string {
  return `money-memory-export-${new Date().toISOString().slice(0, 10)}.csv`;
}

function downloadOnWeb(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Writes every transaction to a CSV file and hands it to the OS share sheet
 * (native) or triggers a browser download (web) — the app never picks a
 * save location itself, since "saved by you" is the whole point.
 * Returns false when there's nothing to export or no way to share the file.
 */
export async function exportTransactionsCsv(transactions: Transaction[], accounts: Account[], currencySymbol: string): Promise<boolean> {
  if (transactions.length === 0) return false;
  const csv = transactionsToCsv(transactions, accounts, currencySymbol);
  const filename = csvFilename();

  if (Platform.OS === 'web') {
    downloadOnWeb(csv, filename);
    return true;
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return false;
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export transactions' });
  return true;
}
