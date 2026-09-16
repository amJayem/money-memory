import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { SWITCH } from '@/theme/tokens';

interface Props {
  value: boolean;
  onValueChange: (v: boolean) => void;
}

/** Custom switch matching the spec's exact geometry — RN's built-in Switch can't hit these numbers on both platforms. */
export function AppSwitch({ value, onValueChange }: Props) {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value, anim]);

  const knobLeft = anim.interpolate({ inputRange: [0, 1], outputRange: [SWITCH.knobInset, SWITCH.trackWidth - SWITCH.knobSize - SWITCH.knobInset] });
  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: [theme.switchOffTrack, theme.accentColor] });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={{ width: SWITCH.hitArea, height: SWITCH.hitArea, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={{
          width: SWITCH.trackWidth,
          height: SWITCH.trackHeight,
          borderRadius: SWITCH.trackHeight / 2,
          backgroundColor: trackColor as unknown as string,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            left: knobLeft,
            width: SWITCH.knobSize,
            height: SWITCH.knobSize,
            borderRadius: SWITCH.knobSize / 2,
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
