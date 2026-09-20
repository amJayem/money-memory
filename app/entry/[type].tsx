import React, { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { Keypad } from '@/components/Keypad';
import { ScreenBackground } from '@/components/Screen';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAppStore } from '@/store/appStore';
import { useToastStore } from '@/store/toastStore';
import type { TransactionType } from '@/domain/types';
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
  const addCategory = useAppStore((s) => s.addCategory);
  const addIncomeCategory = useAppStore((s) => s.addIncomeCategory);

  const editing = editId ? transactions.find((t) => t.id === editId) : undefined;
  // Live previews (budget left, outstanding-to-them, total available) must not
  // double-count the record being edited — exclude it from every calculation below.
  const calcTransactions = editing ? transactions.filter((t) => t.id !== editing.id) : transactions;

  const nonCreditAccounts = accounts.filter((a) => a.type !== 'credit');
  const defaultAccountId = (settings.lastAccountId && accounts.some((a) => a.id === settings.lastAccountId) ? settings.lastAccountId : nonCreditAccounts[0]?.id) ?? accounts[0]?.id ?? '';

  const knownPeople = useMemo(() => Array.from(new Set(transactions.map((t) => t.person).filter((p): p is string => !!p))), [transactions]);

  // Editing through the sheet lets someone change a record's type entirely
  // (e.g. "expense" -> "income"). When that happens, category/account/person
  // defaults from the old record no longer make sense for the new type, so
  // only carry them over when the type is unchanged — amount and note still do.
  const typeChanged = !!editing && editing.type !== type;
  const accountPool = type === 'expense' || type === 'lent' ? accounts : nonCreditAccounts;

  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [category, setCategory] = useState(
    !typeChanged && editing?.category ? editing.category : type === 'income' ? 'Salary' : settings.lastCategory ?? settings.categories[0] ?? 'Other',
  );
  const [account, setAccount] = useState(!typeChanged && editing && accountPool.some((a) => a.id === editing.account) ? editing.account : defaultAccountId);
  const [toAccount, setToAccount] = useState(!typeChanged && editing?.toAccount ? editing.toAccount : accounts.find((a) => a.id !== defaultAccountId)?.id ?? defaultAccountId);
  const decodedPersonParam = personParam ? decodeURIComponent(personParam) : undefined;
  const [person, setPerson] = useState(!typeChanged && editing?.person ? editing.person : decodedPersonParam ?? knownPeople[0] ?? '');
  const [newPersonName, setNewPersonName] = useState('');
  const [note, setNote] = useState(editing?.note ?? '');
  // "Other" opens an inline field instead of silently filing the transaction
  // under the literal word "Other" — a typed name is remembered as a real
  // category, but leaving it blank still saves fine as "Other".
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState(editing ? new Date(editing.at) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Snapshot of what the form looked like on mount, so closing without
  // changing anything doesn't prompt for confirmation.
  const initial = useRef({ amount, category, account, toAccount, person, note, at: date.getTime() }).current;
  const isDirty = editing
    ? amount !== initial.amount ||
      category !== initial.category ||
      account !== initial.account ||
      toAccount !== initial.toAccount ||
      person !== initial.person ||
      note !== initial.note ||
      date.getTime() !== initial.at
    : amount !== '' || note.trim() !== '';

  // Falls back to Home if there's no real history to pop (e.g. this screen
  // was reached directly rather than via the sheet), so closing never errors.
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.push('/');
  }

  function close() {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    goBack();
  }

  const needsCategory = NEEDS_CATEGORY.includes(type);
  const needsPerson = NEEDS_PERSON.includes(type);
  const needsDest = type === 'transfer';
  const categories = type === 'income' ? settings.incomeCategories : settings.categories;

  const numericAmount = parseFloat(amount) || 0;
  // A typed name that only differs from an existing person by case or spacing
  // ("Rahim" vs "rahim ") reuses that person's exact casing instead of
  // silently starting a second, separate loan ledger for the same person.
  const typedPerson = newPersonName.trim();
  const matchedPerson = typedPerson ? knownPeople.find((p) => p.toLowerCase() === typedPerson.toLowerCase()) : undefined;
  const effectivePerson = needsPerson ? matchedPerson ?? (typedPerson || person) : '';

  // Same idea for "Other": a typed name that matches an existing category by
  // case reuses it instead of creating a near-duplicate; an empty field just
  // keeps the transaction filed under the literal "Other".
  const typedCategory = customCategory.trim();
  const matchedCategory = typedCategory ? categories.find((c) => c.toLowerCase() === typedCategory.toLowerCase()) : undefined;
  const effectiveCategory = category === 'Other' ? matchedCategory ?? (typedCategory || 'Other') : category;

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
        category: effectiveCategory,
        person: effectivePerson,
        budgetTotal: settings.monthlyBudget,
        spentSoFar: spent(calcTransactions, settings.countLentAsSpending),
        liquidTotal: liquid(accounts, calcTransactions),
        outstandingToThem,
        owedToThem,
      })
    : null;

  function save() {
    if (saving) return;
    if (!numericAmount) {
      toast('Enter an amount first');
      return;
    }
    if (needsPerson && !effectivePerson) {
      toast('Add a person for this');
      return;
    }
    setSaving(true);
    // A typed "Other" name that isn't already a known category gets saved as
    // one, so it shows up as a normal chip the next time instead of having
    // to be retyped under "Other" every time.
    if (needsCategory && category === 'Other' && typedCategory && !matchedCategory) {
      if (type === 'income') addIncomeCategory(typedCategory);
      else addCategory(typedCategory);
    }
    const patch = {
      type,
      amount: numericAmount,
      category: needsCategory ? effectiveCategory : undefined,
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
      ...(type === 'expense' ? { lastCategory: effectiveCategory } : {}),
    });
    toast(editing ? 'Transaction updated · everything recalculated' : `${SAVE_TOAST_LABEL[type]} · balances and budget updated`);
    goBack();
  }

  return (
    <ScreenBackground blobs={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6 }}>
          <AppText variant="heading">{editing ? 'Edit transaction' : TITLE[type]}</AppText>
          <IconButton glyph="✕" onPress={close} />
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
                  <Chip
                    key={c}
                    label={c}
                    active={category === c}
                    onPress={() => {
                      setCategory(c);
                      if (c !== 'Other') setCustomCategory('');
                    }}
                  />
                ))}
              </ChipRow>
              {category === 'Other' ? (
                <TextInput
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="Name this category — optional, stays as Other if blank"
                  placeholderTextColor={theme.ink3}
                  style={{ marginTop: 10, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 14, padding: 12, color: theme.ink, fontSize: 13.5 }}
                />
              ) : null}
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
              {nonCreditAccounts.filter((a) => a.id !== account).length === 0 ? (
                <AppText variant="body2">You need a second account to move money between accounts.</AppText>
              ) : (
                <ChipRow>
                  {nonCreditAccounts
                    .filter((a) => a.id !== account)
                    .map((a) => (
                      <Chip key={a.id} label={a.name} active={toAccount === a.id} onPress={() => setToAccount(a.id)} />
                    ))}
                </ChipRow>
              )}
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
            disabled={saving}
            style={{
              backgroundColor: numericAmount ? theme.ink : theme.lineStrong,
              borderRadius: 18,
              minHeight: 52,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: saving ? 0.6 : 1,
            }}
          >
            <AppText color={numericAmount ? theme.solid : theme.ink3} weight="manrope700">
              {numericAmount ? `Save ${formatAmount(numericAmount, settings.currencySymbol)}` : 'Save transaction'}
            </AppText>
          </Pressable>
        </ScrollView>

      <ConfirmDialog
        visible={confirmDiscard}
        title="Discard this entry?"
        body="What you've entered here hasn't been saved yet."
        confirmLabel="Discard"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          goBack();
        }}
      />
    </ScreenBackground>
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
