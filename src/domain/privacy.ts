// Privacy-mask rules (§3): a peek is a temporary reveal, not a lock.

import type { PrivacyScope } from './types';

/** "Should currently be masking" — privacy is on and we're not mid-peek. */
export function isArmed(privacy: boolean, peeking: boolean): boolean {
  return privacy && !peeking;
}

/** Masks every amount app-wide. */
export function isHiddenEverywhere(privacy: boolean, peeking: boolean, scope: PrivacyScope): boolean {
  return isArmed(privacy, peeking) && scope === 'all';
}

/** Masks only on the given screen (dashboard-only scope masks Home only). */
export function isHiddenOnScreen(privacy: boolean, peeking: boolean, scope: PrivacyScope, screen: string): boolean {
  if (!isArmed(privacy, peeking)) return false;
  if (scope === 'all') return true;
  return screen === 'home';
}

export const PEEK_DURATION_MS = 10_000;

export function privacyHintText(privacy: boolean, peeking: boolean, scope: PrivacyScope): string | null {
  if (!privacy) return null;
  if (peeking) return 'Revealed for a few seconds';
  if (scope === 'all') return 'All amounts hidden · tap the eye to reveal';
  return 'Hidden here · visible inside each account';
}

export function peekToastText(scope: PrivacyScope): string {
  return scope === 'all' ? 'Amounts revealed everywhere for 10 seconds' : 'Dashboard revealed for 10 seconds';
}

export function privacyOnToastText(scope: PrivacyScope): string {
  return scope === 'all' ? 'Privacy on · amounts hidden everywhere' : 'Privacy on · dashboard balances hidden';
}
