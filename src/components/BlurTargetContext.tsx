import { createContext, useContext } from 'react';
import type { RefObject } from 'react';
import type { View } from 'react-native';

/**
 * Android's blur (expo-blur's "dimezisBlurView" method) needs an explicit ref
 * to the view it should sample as its background — unlike iOS's compositor
 * blur, it can't just blur whatever sits behind it. Screen wraps its backdrop
 * in a BlurTargetView and provides the ref here so every GlassCard on that
 * screen can blur the same shared background layer.
 */
export const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function useBlurTarget() {
  return useContext(BlurTargetContext);
}
