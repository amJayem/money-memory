import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { SWITCH } from '@/theme/tokens';

interface Props {
  value: boolean;
  onValueChange: (v: boolean) => void;
  /** Settings' rows are denser than elsewhere, so it uses a smaller geometry (48x30 track, 22px knob) — the 44x44 hit area is unchanged. */
  compact?: boolean;
}

const COMPACT = { trackWidth: 48, trackHeight: 30, knobSize: 22, knobInset: SWITCH.knobInset };

/** Custom switch matching the spec's exact geometry — RN's built-in Switch can't hit these numbers on both platforms. */
export function AppSwitch({ value, onValueChange, compact }: Props) {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const geo = compact ? COMPACT : SWITCH;

  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value, anim]);

  const knobLeft = anim.interpolate({ inputRange: [0, 1], outputRange: [geo.knobInset, geo.trackWidth - geo.knobSize - geo.knobInset] });
  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: [theme.switchOffTrack, theme.accentColor] });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={{ width: SWITCH.hitArea, height: SWITCH.hitArea, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={{
          width: geo.trackWidth,
          height: geo.trackHeight,
          borderRadius: geo.trackHeight / 2,
          backgroundColor: trackColor as unknown as string,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            left: knobLeft,
            width: geo.knobSize,
            height: geo.knobSize,
            borderRadius: geo.knobSize / 2,
            backgroundColor: '#ffffff',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
