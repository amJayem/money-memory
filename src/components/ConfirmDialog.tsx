import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';

interface Props {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Rendered via RN's Modal (a portal) so it reliably overlays the viewport regardless of the caller's scroll position. */
export function ConfirmDialog({ visible, title, body, confirmLabel, onConfirm, onCancel }: Props) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(10,10,12,0.5)', alignItems: 'center', justifyContent: 'center', padding: 30 }} onPress={onCancel}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: theme.solid, borderRadius: 22, padding: 20, width: '100%', maxWidth: 420, gap: 14 }}>
          <AppText variant="heading">{title}</AppText>
          <AppText variant="body2">{body}</AppText>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={onCancel} style={{ flex: 1, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}>
              <AppText variant="body">Keep it</AppText>
            </Pressable>
            <Pressable onPress={onConfirm} style={{ flex: 1, backgroundColor: theme.tone('neg'), borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}>
              <AppText color="#fff" weight="manrope700">
                {confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
