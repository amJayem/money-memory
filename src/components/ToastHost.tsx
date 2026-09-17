import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useToastStore } from '@/store/toastStore';
import { AppText } from './AppText';

/** Mounted once at the app root; any screen calls useToastStore().show(text, action?). */
export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const message = useToastStore((s) => s.message);
  const action = useToastStore((s) => s.action);
  const hide = useToastStore((s) => s.hide);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: message ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [message, opacity]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: insets.bottom + 96, opacity },
      ]}
    >
      <Animated.View style={[styles.pill, { backgroundColor: theme.ink, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <AppText variant="body" color={theme.solid} style={{ textAlign: 'center', flexShrink: 1 }}>
          {message}
        </AppText>
        {action ? (
          <Pressable
            onPress={() => {
              action.onPress();
              hide();
            }}
            hitSlop={8}
          >
            <AppText variant="body" color={theme.tone('accent')} weight="manrope700">
              {action.label}
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  pill: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    maxWidth: '100%',
  },
});
