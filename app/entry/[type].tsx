import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { Keypad } from '@/components/Keypad';
import { useAppStore } from '@/store/appStore';
import { useToastStore } from '@/store/toastStore';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type TransactionType } from '@/domain/types';
import { budgetStatus, liquid, outstandingFor, spent } from '@/domain/money';
import { echoLine, SAVE_TOAST_LABEL } from '@/domain/echo';
import { formatAmount } from '@/domain/format';

const NEEDS_CATEGORY: TransactionType[] = ['expense', 'income'];
const NEEDS_PERSON: TransactionType[] = ['lent', 'repay_in', 'borrowed', 'repay_out'];

const ACCOUNT_LABEL: Record<TransactionType, string> = {
  expense: 'Paid using',
  income: 'Into which account',
  transfer: 'Out of',
  lent: 'Paid using',
  borrowed: 'Into which account',
  repay_in: 'Into which account',
  repay_out: 'Paid using',
};

const TITLE: Record<TransactionType, string> = {
  expense: 'I spent money',
  income: 'I received money',
  transfer: 'I moved my own money',
  lent: 'I lent money to someone',
  borrowed: 'I borrowed money',
  repay_in: 'Someone paid me back',
  repay_out: 'I paid someone back',
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function EntryForm() {
  const { type: typeParam, person: personParam, editId } = useLocalSearchParams<{ type: string; person?: string; editId?: string }>();
  const type = typeParam as TransactionType;
  const theme = useTheme();
  const router = useRouter();
  const toast = useToastStore((s) => s.show);

  const accounts = useAppStore((s) => s.accounts);
  const transactions = useAppStore((s) => s.transactions);
  const settings = useAppStore((s) => s.settings);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const editing = editId ? transactions.find((t) => t.id === editId) : undefined;
  // Live previews (budget left, outstanding-to-them, total available) must not
  // double-count the record being edited — exclude it from every calculation below.
  const calcTransactions = editing ? transactions.filter((t) => t.id !== editing.id) : transactions;

  const nonCreditAccounts = accounts.filter((a) => a.type !== 'credit');
  const defaultAccountId = (settings.lastAccountId && accounts.some((a) => a.id === settings.lastAccountId) ? settings.lastAccountId : nonCreditAccounts[0]?.id) ?? accounts[0]?.id ?? '';

  const knownPeople = useMemo(() => Array.from(new Set(transactions.map((t) => t.person).filter((p): p is string => !!p))), [transactions]);

  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [category, setCategory] = useState(editing?.category ?? (type === 'income' ? 'Salary' : settings.lastCategory ?? EXPENSE_CATEGORIES[0]));
  const [account, setAccount] = useState(editing?.account ?? defaultAccountId);
  const [toAccount, setToAccount] = useState(editing?.toAccount ?? accounts.find((a) => a.id !== defaultAccountId)?.id ?? defaultAccountId);
  const decodedPersonParam = personParam ? decodeURIComponent(personParam) : undefined;
  const [person, setPerson] = useState(editing?.person ?? decodedPersonParam ?? knownPeople[0] ?? '');
  const [newPersonName, setNewPersonName] = useState('');
  const [note, setNote] = useState(editing?.note ?? '');
  const [date, setDate] = useState(editing ? new Date(editing.at) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const needsCategory = NEEDS_CATEGORY.includes(type);
  const needsPerson = NEEDS_PERSON.includes(type);
  const needsDest = type === 'transfer';
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const numericAmount = parseFloat(amount) || 0;
  const effectivePerson = needsPerson ? newPersonName.trim() || person : '';

  const accountName = accounts.find((a) => a.id === account)?.name ?? '';
  const toAccountName = accounts.find((a) => a.id === toAccount)?.name ?? '';

  const today = new Date();
  const isToday = isSameDay(date, today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = isSameDay(date, yesterday);

  const outstandingToThem = type === 'lent' || type === 'repay_in' ? outstandingFor(calcTransactions, 'lent', effectivePerson).out : 0;
  const owedToThem = type === 'borrowed' || type === 'repay_out' ? outstandingFor(calcTransactions, 'borrowed', effectivePerson).out : 0;

  const echo = effectivePerson || !needsPerson
    ? echoLine({
        type,
        amount: numericAmount,
        symbol: settings.currencySymbol,
        accountName,
        toAccountName,
        category,
        person: effectivePerson,
        budgetTotal: settings.monthlyBudget,
        spentSoFar: spent(calcTransactions, settings.countLentAsSpending),
        liquidTotal: liquid(accounts, calcTransactions),
        outstandingToThem,
        owedToThem,
      })
    : null;

  function save() {
    if (!numericAmount) {
      toast('Enter an amount first');
      return;
    }
    if (needsPerson && !effectivePerson) {
      toast('Add a person for this');
      return;
    }
    const patch = {
      type,
      amount: numericAmount,
      category: needsCategory ? category : undefined,
      account,
      toAccount: needsDest ? toAccount : undefined,
      person: needsPerson ? effectivePerson : undefined,
      note: note.trim() || undefined,
      at: date.toISOString(),
    };
    if (editing) {
      updateTransaction(editing.id, patch);
    } else {
      addTransaction({ id: `n${Date.now()}`, ...patch });
    }
    updateSettings({
      lastAccountId: account,
      ...(type === 'expense' ? { lastCategory: category } : {}),
    });
    toast(editing ? 'Transaction updated · everything recalculated' : `${SAVE_TOAST_LABEL[type]} · balances and budget updated`);
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6 }}>
          <AppText variant="heading">{editing ? 'Edit transaction' : TITLE[type]}</AppText>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <AppText variant="body2">Close</AppText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', paddingVertical: 14 }}>
            <AppText style={{ fontSize: amount.length > 7 ? 30 : amount.length > 5 ? 36 : 42 }} variant="amount">
              {settings.currencySymbol}
              {amount || '0'}
            </AppText>
          </View>

          {needsCategory ? (
            <Section label="Category">
              <ChipRow>
                {categories.map((c) => (
                  <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
                ))}
              </ChipRow>
            </Section>
          ) : null}

          {needsPerson ? (
            <Section label="Person">
              <ChipRow>
                {knownPeople.map((p) => (
                  <Chip key={p} label={p} active={!newPersonName && person === p} onPress={() => { setPerson(p); setNewPersonName(''); }} />
                ))}
              </ChipRow>
              <TextInput
                value={newPersonName}
                onChangeText={setNewPersonName}
                placeholder="or type a new name"
                placeholderTextColor={theme.ink3}
                style={{ marginTop: 10, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 14, padding: 12, color: theme.ink, fontSize: 13.5 }}
              />
            </Section>
          ) : null}

          <Section label={ACCOUNT_LABEL[type]}>
            <ChipRow>
              {/* Only expense/lent can be charged to a credit card (creditUsed() only counts those two);
                  every other type moves real money and must land in a non-credit account. */}
              {(type === 'expense' || type === 'lent' ? accounts : nonCreditAccounts).map((a) => (
                <Chip key={a.id} label={a.name} active={account === a.id} onPress={() => setAccount(a.id)} />
              ))}
            </ChipRow>
          </Section>

          {needsDest ? (
            <Section label="Into">
              <ChipRow>
                {nonCreditAccounts
                  .filter((a) => a.id !== account)
                  .map((a) => (
                    <Chip key={a.id} label={a.name} active={toAccount === a.id} onPress={() => setToAccount(a.id)} />
                  ))}
              </ChipRow>
            </Section>
          ) : null}

          <Section label="Date">
            <ChipRow>
              <Chip label="Today" active={isToday} onPress={() => setDate(new Date())} />
              <Chip label="Yesterday" active={isYesterday} onPress={() => setDate(yesterday)} />
              <Chip label={isToday || isYesterday ? 'Pick a date' : date.toLocaleDateString()} active={!isToday && !isYesterday} onPress={() => setShowDatePicker(true)} />
            </ChipRow>
            {showDatePicker ? (
              <DateTimePicker
                value={date}
                mode="date"
                maximumDate={new Date()}
                onValueChange={(_, selected) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  setDate(selected);
                }}
                onDismiss={() => setShowDatePicker(false)}
              />
            ) : null}
          </Section>

          <Section label="Note — optional, helps you remember">
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add a note"
              placeholderTextColor={theme.ink3}
              style={{ borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 14, padding: 12, color: theme.ink, fontSize: 13.5 }}
            />
          </Section>

          {echo ? (
            <View style={{ backgroundColor: theme.surface2, borderRadius: 16, padding: 13 }}>
              <AppText variant="body2">{echo}</AppText>
            </View>
          ) : null}

          <Keypad value={amount} onChange={setAmount} />

          <Pressable
            onPress={save}
            style={{ backgroundColor: theme.ink, borderRadius: 18, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText color={theme.solid} weight="manrope700">
              {numericAmount ? `Save ${formatAmount(numericAmount, settings.currencySymbol)}` : 'Save transaction'}
            </AppText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <AppText variant="label" style={{ marginBottom: 8 }}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}
