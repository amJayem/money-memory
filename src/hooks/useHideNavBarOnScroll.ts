import { useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useNavBarStore } from '@/store/navBarStore';

/** Wire onto a ScrollView's onScroll: scrolling down hides the global bottom nav bar, scrolling up (or near the top) reveals it. */
export function useHideNavBarOnScroll() {
  const show = useNavBarStore((s) => s.show);
  const hide = useNavBarStore((s) => s.hide);
  const lastY = useRef(0);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastY.current;
    if (y <= 24) {
      show();
    } else if (dy > 6) {
      hide();
    } else if (dy < -6) {
      show();
    }
    lastY.current = y;
  }

  return onScroll;
}
