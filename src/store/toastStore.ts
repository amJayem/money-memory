import { create } from 'zustand';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastState {
  message: string | null;
  action: ToastAction | null;
  show: (message: string, action?: ToastAction) => void;
  hide: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

// Bottom-anchored toast, auto-dismisses after 2.6s — or 5s when it carries an
// action (e.g. "Undo"), so there's time to actually tap it.
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  action: null,
  show: (message, action) => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message, action: action ?? null });
    hideTimer = setTimeout(() => set({ message: null, action: null }), action ? 5000 : 2600);
  },
  hide: () => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message: null, action: null });
  },
}));
