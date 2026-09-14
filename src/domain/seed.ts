// Demo/dev fixture data, ported verbatim from the prototype's seed arrays
// (LEDGER_SPEC.md §4) so first-run behavior matches the design exactly.
// "today" in the design is day 6 of a 30-day month; here it's simply today,
// with each seed transaction dated `daysAgo` days back from that.

import type { Account, Transaction } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgoAt(daysAgo: number, hhmm: string): string {
  const [time, meridiem] = hhmm.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (meridiem === 'PM' && h !== 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setTime(d.getTime() - daysAgo * DAY_MS);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

// Seed transactions, day 1 = 5 days ago ... day 6 = today, matching the
// prototype's TODAY = 6 of a 6-day-old demo window.
const RAW_TX: { id: string; type: Transaction['type']; amount: number; category?: string; person?: string; account: string; toAccount?: string; note: string; day: number; time: string }[] = [
  { id: 't1', type: 'income', amount: 45000, category: 'Salary', account: 'dbbl', note: 'Monthly salary', day: 1, time: '10:05 AM' },
  { id: 't2', type: 'lent', amount: 10000, person: 'Rahim', account: 'cash', note: 'Emergency help', day: 1, time: '6:40 PM' },
  { id: 't3', type: 'expense', amount: 1000, category: 'Health', account: 'cash', note: 'Pharmacy', day: 1, time: '12:15 PM' },
  { id: 't4', type: 'expense', amount: 600, category: 'Entertainment', account: 'visa', note: 'Streaming subscription', day: 1, time: '9:02 AM' },
  { id: 't5', type: 'lent', amount: 4500, person: 'Karim', account: 'bkash', note: 'Rent gap', day: 2, time: '11:20 AM' },
  { id: 't6', type: 'expense', amount: 3500, category: 'Food', account: 'brac', note: 'Monthly groceries', day: 2, time: '8:10 PM' },
  { id: 't7', type: 'expense', amount: 1580, category: 'Transport', account: 'cash', note: 'Fuel', day: 2, time: '8:45 AM' },
  { id: 't8', type: 'borrowed', amount: 6000, person: 'Imran', account: 'bkash', note: 'Borrowed till salary', day: 2, time: '4:30 PM' },
  { id: 't9', type: 'income', amount: 20000, category: 'Freelance', account: 'brac', note: 'Logo project', day: 3, time: '2:00 PM' },
  { id: 't10', type: 'expense', amount: 3300, category: 'Bills', account: 'dbbl', note: 'Electricity', day: 3, time: '12:00 PM' },
  { id: 't11', type: 'expense', amount: 2000, category: 'Shopping', account: 'visa', note: 'Shirt', day: 3, time: '10:30 AM' },
  { id: 't12', type: 'lent', amount: 3000, person: 'Hasan', account: 'cash', note: 'Books', day: 3, time: '5:15 PM' },
  { id: 't13', type: 'expense', amount: 1250, category: 'Food', account: 'cash', note: 'Dinner out', day: 4, time: '8:20 PM' },
  { id: 't14', type: 'expense', amount: 900, category: 'Entertainment', account: 'bkash', note: 'Cinema', day: 4, time: '3:00 PM' },
  { id: 't15', type: 'transfer', amount: 5000, account: 'dbbl', toAccount: 'cash', note: 'Weekly cash', day: 4, time: '11:00 AM' },
  { id: 't16', type: 'expense', amount: 2450, category: 'Shopping', account: 'brac', note: 'Household', day: 5, time: '7:40 PM' },
  { id: 't17', type: 'expense', amount: 1200, category: 'Bills', account: 'dbbl', note: 'Internet', day: 5, time: '11:00 AM' },
  { id: 't18', type: 'repay_in', amount: 3000, person: 'Rahim', account: 'cash', note: 'First instalment', day: 5, time: '6:00 PM' },
  { id: 't19', type: 'repay_out', amount: 2000, person: 'Imran', account: 'bkash', note: 'Part payment', day: 5, time: '1:10 PM' },
  { id: 't20', type: 'repay_in', amount: 2000, person: 'Rahim', account: 'bkash', note: 'Second instalment', day: 6, time: '11:45 AM' },
  { id: 't21', type: 'expense', amount: 220, category: 'Transport', account: 'bkash', note: 'Ride to office', day: 6, time: '9:10 AM' },
  { id: 't23', type: 'lent', amount: 4000, person: 'Sakib', account: 'brac', note: 'Short-term help', day: 1, time: '3:20 PM' },
  { id: 't24', type: 'repay_in', amount: 4000, person: 'Sakib', account: 'brac', note: 'Settled in full', day: 4, time: '6:55 PM' },
  { id: 't22', type: 'expense', amount: 450, category: 'Food', account: 'cash', note: 'Lunch with colleagues', day: 6, time: '1:35 PM' },
];

const SEED_TODAY_DAY = 6;

export const SEED_TRANSACTIONS: Transaction[] = RAW_TX.map((t) => ({
  id: t.id,
  type: t.type,
  amount: t.amount,
  category: t.category,
  person: t.person,
  account: t.account,
  toAccount: t.toAccount,
  note: t.note,
  at: daysAgoAt(SEED_TODAY_DAY - t.day, t.time),
}));

/** Balance-effect helper mirroring money.ts's balance(), used only to solve for opening balances below. */
function netEffect(accountId: string, txs: typeof RAW_TX): number {
  let b = 0;
  for (const t of txs) {
    if (t.account === accountId) {
      if (t.type === 'income' || t.type === 'repay_in' || t.type === 'borrowed') b += t.amount;
      else if (t.type === 'expense' || t.type === 'lent' || t.type === 'repay_out' || t.type === 'transfer') b -= t.amount;
    }
    if (t.type === 'transfer' && t.toAccount === accountId) b += t.amount;
  }
  return b;
}

function netCreditUsed(accountId: string, txs: typeof RAW_TX): number {
  let u = 0;
  for (const t of txs) {
    if (t.account === accountId && (t.type === 'expense' || t.type === 'lent')) u += t.amount;
  }
  return u;
}

// Each account's opening balance is solved so that, after replaying the seed
// transactions, the account lands exactly on its intended "today" balance.
const TARGETS: Record<string, number> = { cash: 12500, dbbl: 35000, brac: 22250, bkash: 15000 };
const VISA_TARGET_USED = 15000;

export const SEED_ACCOUNTS: Account[] = [
  { id: 'cash', name: 'Cash wallet', type: 'cash', openingBalance: TARGETS.cash - netEffect('cash', RAW_TX) },
  { id: 'dbbl', name: 'Dutch-Bangla Bank', type: 'bank', openingBalance: TARGETS.dbbl - netEffect('dbbl', RAW_TX) },
  { id: 'brac', name: 'Brac Bank', type: 'bank', openingBalance: TARGETS.brac - netEffect('brac', RAW_TX) },
  { id: 'bkash', name: 'bKash', type: 'wallet', openingBalance: TARGETS.bkash - netEffect('bkash', RAW_TX) },
  {
    id: 'visa',
    name: 'Visa Card',
    type: 'credit',
    openingBalance: 0,
    limit: 60000,
    openingUsed: VISA_TARGET_USED - netCreditUsed('visa', RAW_TX),
  },
];
