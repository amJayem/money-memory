import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  formatAmount,
  formatMasked,
  formatSigned,
} from '@/domain/format';
import {
  isHiddenEverywhere,
  isHiddenOnScreen,
  peekToastText,
  privacyHintText,
  privacyOnToastText,
} from '@/domain/privacy';

/**
 * Wires the pure privacy rules in domain/privacy.ts to live peek-timer state.
 * `screen` should be the current route name (privacy scope 'dashboard' only
 * masks on 'home').
 */
export function usePrivacy(screen: string) {
  const privacy = useAppStore((s) => s.settings.privacy);
  const scope = useAppStore((s) => (s.settings.privacyScope === 'all' ? 'all' : 'dashboard')) as 'all' | 'dashboard';
  const peekUntil = useAppStore((s) => s.peekUntil);
  const startPeek = useAppStore((s) => s.startPeek);
  const cancelPeek = useAppStore((s) => s.cancelPeek);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [now, setNow] = useState(Date.now());
  const peeking = peekUntil !== null && peekUntil > now;
  const secondsLeft = peeking ? Math.max(0, Math.ceil((peekUntil! - now) / 1000)) : 0;

  useEffect(() => {
    if (!peekUntil) return;
    const remaining = peekUntil - Date.now();
    if (remaining <= 0) {
      cancelPeek();
      return;
    }
    // Tick once a second so the "hides again in Ns" hint counts down live,
    // instead of amounts just vanishing without warning when the timer ends.
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const id = setTimeout(() => {
      cancelPeek();
      setNow(Date.now());
    }, remaining);
    return () => {
      clearInterval(tick);
      clearTimeout(id);
    };
  }, [peekUntil, cancelPeek]);

  const symbol = useAppStore((s) => s.settings.currencySymbol);

  // hiddenEverywhere: scope === 'all' only — used by fmt(), which covers
  // almost every amount and must NOT mask under the default dashboard-only scope.
  // hiddenHere: scope === 'all', OR scope === 'dashboard' AND we're on Home —
  // used only by fmtTotal() (wallet cards + the report's closing balance).
  const hiddenEverywhere = isHiddenEverywhere(privacy, peeking, scope);
  const hiddenHere = isHiddenOnScreen(privacy, peeking, scope, screen);

  /** For almost every amount — masks only under the "Everything" privacy scope. */
  function fmt(amount: number, signed = false): string {
    if (hiddenEverywhere) return formatMasked();
    return signed ? formatSigned(amount, symbol) : formatAmount(amount, symbol);
  }

  /** For the Home wallet cards and the report's closing balance — also masks on Home under the dashboard-only scope. */
  function fmtTotal(amount: number): string {
    if (hiddenHere) return formatMasked();
    return formatAmount(amount, symbol);
  }

  /** Tap the eye icon: arm privacy, or peek/cancel-peek if already armed. */
  function tapEye(onToast: (text: string) => void) {
    if (!privacy) {
      updateSettings({ privacy: true });
      onToast(privacyOnToastText(scope));
      return;
    }
    if (peeking) {
      cancelPeek();
      return;
    }
    startPeek();
    onToast(peekToastText(scope));
  }

  return {
    privacy,
    peeking,
    scope,
    hiddenHere,
    hiddenEverywhere,
    fmt,
    fmtTotal,
    tapEye,
    hintText: privacyHintText(privacy, peeking, scope, secondsLeft),
    eyeGlyph: !privacy || peeking ? '◉' : '◠',
  };
}
