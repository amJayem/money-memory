import { useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useNavBarStore } from '@/store/navBarStore';

/** Wire onto a ScrollView's onScroll: scrolling down hides the global bottom nav bar, scrolling
 * up (or near the top) reveals it — and so does reaching the bottom of the content, so there's
 * never a dead gap at the end of a screen with no nav bar visible and nothing left to scroll to. */
export function useHideNavBarOnScroll() {
  const show = useNavBarStore((s) => s.show);
  const hide = useNavBarStore((s) => s.hide);
  const lastY = useRef(0);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const y = contentOffset.y;
    const dy = y - lastY.current;
    // Screen's content reserves ~140px of bottom padding (safe-area inset + tab bar/FAB
    // clearance) so cards never sit behind the nav bar while it's visible — meaning the
    // scrollable "end" is well past the last real card. A tight threshold here (e.g. 24px)
    // never fired until the user dragged into that dead padding, defeating the point.
    const nearBottom = y + layoutMeasurement.height >= contentSize.height - 140;
    if (y <= 24 || nearBottom) {
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
