import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Account, Settings, Transaction } from '@/domain/types';
import { serializeBackup } from '@/domain/backup';

function backupFilename(): string {
  return `money-memory-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

function downloadOnWeb(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Writes the full ledger — accounts, transactions and settings, exactly as
 * stored — to a JSON file and hands it to the OS share sheet (native) or
 * triggers a browser download (web). Unlike the CSV export, this is meant
 * to be read back in by importBackup on another device, not opened in a
 * spreadsheet. Returns false when there's no way to share the file.
 */
export async function exportBackup(accounts: Account[], transactions: Transaction[], settings: Settings): Promise<boolean> {
  const json = serializeBackup(accounts, transactions, settings);
  const filename = backupFilename();

  if (Platform.OS === 'web') {
    downloadOnWeb(json, filename);
    return true;
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(json);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return false;
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export backup' });
  return true;
}
