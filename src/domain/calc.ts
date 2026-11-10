export const OPERATORS = ['+', '−', '×', '÷'] as const;

export function isOperator(ch: string): boolean {
  return (OPERATORS as readonly string[]).includes(ch);
}

export function hasOperator(expr: string): boolean {
  return [...expr].some(isOperator);
}

/**
 * Evaluates the entry keypad's expression ("500+1200×2") with × and ÷ binding tighter than + and −.
 * A trailing operator is ignored so the live total stays stable mid-typing. Rounded to 2 decimals and
 * floored at 0, since an amount is always positive; division by zero yields 0.
 */
export function evaluateExpression(expr: string): number {
  const tokens = expr.match(/\d*\.?\d+|\d+\.|[+−×÷]/g) ?? [];
  while (tokens.length && isOperator(tokens[tokens.length - 1])) tokens.pop();
  if (!tokens.length) return 0;

  const terms: number[] = [];
  let sign = 1;
  let current = parseFloat(tokens[0] ?? '') || 0;
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const n = parseFloat(tokens[i + 1] ?? '') || 0;
    if (op === '×') current *= n;
    else if (op === '÷') current = n === 0 ? 0 : current / n;
    else {
      terms.push(sign * current);
      sign = op === '+' ? 1 : -1;
      current = n;
    }
  }
  terms.push(sign * current);
  const total = terms.reduce((s, x) => s + x, 0);
  return Math.max(0, Math.round(total * 100) / 100);
}
