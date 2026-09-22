import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './AppText';
import { MIN_TAP_TARGET } from '@/theme/tokens';

interface Option {
  value: string;
  label: string;
}

interface Props {
  visible: boolean;
  title: string;
  options: Option[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function SelectModal({ visible, title, options, value, onSelect, onClose }: Props) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(10,10,12,0.45)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={{ backgroundColor: theme.solid, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: theme.line }}>
            <SafeAreaView edges={['bottom']}>
              <View style={{ padding: 18, gap: 6 }}>
                <AppText variant="heading" style={{ marginBottom: 8 }}>
                  {title}
                </AppText>
                {options.map((o) => (
                  <Pressable
                    key={o.value}
                    onPress={() => {
                      onSelect(o.value);
                      onClose();
                    }}
                    android_ripple={{ color: theme.line }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: MIN_TAP_TARGET,
                      paddingHorizontal: 10,
                      borderRadius: 12,
                      backgroundColor: pressed ? theme.surface2 : 'transparent',
                    })}
                  >
                    <AppText variant="body">{o.label}</AppText>
                    {value === o.value ? <AppText color={theme.accentColor}>✓</AppText> : null}
                  </Pressable>
                ))}
              </View>
            </SafeAreaView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
