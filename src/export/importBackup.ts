import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { parseBackup, type BackupFile } from '@/domain/backup';

function readWebAsset(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (asset.file) return asset.file.text();
  // base64 data URL fallback when `file` isn't populated.
  return fetch(asset.uri).then((r) => r.text());
}

/**
 * Opens the system file picker for a Money Memory backup (.json) and
 * returns its parsed, validated contents — or null if the user cancelled
 * or the file wasn't a valid backup (a toast-worthy message is thrown).
 */
export async function pickBackupFile(): Promise<BackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/json', 'text/plain'], copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  const raw = Platform.OS === 'web' ? await readWebAsset(asset) : await new File(asset.uri).text();
  return parseBackup(raw);
}
