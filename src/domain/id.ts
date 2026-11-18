let counter = 0;

/**
 * A record id that stays unique even when two records are created in the same millisecond —
 * a bare `Date.now()` id collided whenever one save wrote two transactions back to back
 * (a repayment plus the loan backfilled to cover its shortfall), after which editing or
 * deleting either one silently hit both.
 */
export function newId(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  const random = Math.floor(Math.random() * 0xffffff).toString(36);
  return `${prefix}${Date.now()}-${counter.toString(36)}${random}`;
}
