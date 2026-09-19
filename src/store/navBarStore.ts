import { create } from 'zustand';

interface NavBarState {
  visible: boolean;
  show: () => void;
  hide: () => void;
}

/** Drives the global bottom nav bar's show/hide animation — set from a scrollable screen's onScroll (down hides, up shows). */
export const useNavBarStore = create<NavBarState>((set) => ({
  visible: true,
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
}));
