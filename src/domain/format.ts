// Currency formatting (§3 of the extracted spec, `raw`/`sym`). Amounts are
// always whole units (no decimals shown anywhere) with Indian digit grouping,
// and the symbol prefixes the number with no space.

const MASK = '•••••';

export function currencySymbol(userSymbol: string | null | undefined): string {
  const trimmed = (userSymbol ?? '').trim();
  return trimmed || '৳';
}

/** Unsigned amount as "{symbol}{grouped digits}", e.g. "৳1,250". */
export function formatAmount(amount: number, symbol: string): string {
  const grouped = Math.abs(Math.round(amount)).toLocaleString('en-IN');
  return `${symbol}${grouped}`;
}

/** Signed amount using U+2212 MINUS SIGN (not a hyphen), e.g. "−৳450" / "+৳2,000". */
export function formatSigned(amount: number, symbol: string): string {
  const sign = amount < 0 ? '−' : '+';
  return `${sign}${formatAmount(amount, symbol)}`;
}

export function formatMasked(): string {
  return MASK;
}
