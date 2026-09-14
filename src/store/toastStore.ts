import { create } from 'zustand';

interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

// Bottom-anchored toast, auto-dismisses after 2.6s (§1 overlay layers).
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message });
    hideTimer = setTimeout(() => set({ message: null }), 2600);
  },
  hide: () => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message: null });
  },
}));
