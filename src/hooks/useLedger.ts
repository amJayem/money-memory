import { useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import * as money from '@/domain/money';

/** Derives the commonly-needed totals from the store's raw accounts/transactions once per change. */
export function useLedger() {
  const accounts = useAppStore((s) => s.accounts);
  const transactions = useAppStore((s) => s.transactions);
  const settings = useAppStore((s) => s.settings);

  return useMemo(() => {
    const spentAmount = money.spent(transactions, settings.countLentAsSpending);
    const liquid = money.liquid(accounts, transactions);
    const owed = money.totalOwedToMe(transactions);
    const iOwe = money.totalIOwe(transactions);
    const budget = money.budgetStatus(settings.monthlyBudget, spentAmount);
    return {
      accounts,
      transactions,
      settings,
      spentAmount,
      liquid,
      owed,
      iOwe,
      totalPosition: liquid + owed,
      budget,
    };
  }, [accounts, transactions, settings]);
}
