import { evaluateExpression, hasOperator } from '../calc';

describe('evaluateExpression', () => {
  test('a plain number is just itself', () => {
    expect(evaluateExpression('1500')).toBe(1500);
    expect(evaluateExpression('')).toBe(0);
  });

  test('sums several small costs', () => {
    expect(evaluateExpression('500+1200+300')).toBe(2000);
  });

  test('× and ÷ bind tighter than + and −', () => {
    expect(evaluateExpression('100+50×3')).toBe(250);
    expect(evaluateExpression('1000−600÷2')).toBe(700);
  });

  test('a trailing operator is ignored mid-typing', () => {
    expect(evaluateExpression('500+')).toBe(500);
  });

  test('decimals round to 2 places', () => {
    expect(evaluateExpression('10÷3')).toBe(3.33);
    expect(evaluateExpression('2.5+0.25')).toBe(2.75);
  });

  test('never negative, and dividing by zero gives 0 rather than Infinity', () => {
    expect(evaluateExpression('100−500')).toBe(0);
    expect(evaluateExpression('100÷0')).toBe(0);
  });
});

describe('hasOperator', () => {
  test('detects whether the amount is an expression', () => {
    expect(hasOperator('1200')).toBe(false);
    expect(hasOperator('1200+5')).toBe(true);
  });
});
