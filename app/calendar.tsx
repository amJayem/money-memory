import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { TransactionRow } from '@/components/TransactionRow';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { calendarIntensity } from '@/domain/stats';
import { sortedTransactions, transactionSub, transactionTitle } from '@/domain/search';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { accounts, transactions, settings } = useLedger();
  const privacy = usePrivacy('calendar');
  const today = new Date();
  const [selected, setSelected] = useState(today.getDate());

  const year = today.getFullYear();
  const month = today.getMonth();
  const days = calendarIntensity(transactions, settings.countLentAsSpending, year, month);
  const firstWeekday = new Date(year, month, 1).getDay();

  const selectedDate = new Date(year, month, selected);
  const dayTx = sortedTransactions(
    transactions.filter((t) => {
      const at = new Date(t.at);
      return at.getFullYear() === year && at.getMonth() === month && at.getDate() === selected;
    }),
  );
  const dayTotal = dayTx.reduce((s, t) => s + (t.type === 'expense' || t.type === 'lent' || t.type === 'repay_out' ? -t.amount : t.amount), 0);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.back()} />
        <AppText variant="title">{today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</AppText>
      </View>

      <GlassCard>
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          {WEEKDAYS.map((d, i) => (
            <AppText key={i} variant="mono" style={{ flex: 1, textAlign: 'center' }}>
              {d}
            </AppText>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <View key={`pad${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
          ))}
          {days.map((d, i) => {
            const dayNum = i + 1;
            const isSelected = dayNum === selected;
            return (
              <Pressable key={dayNum} onPress={() => setSelected(dayNum)} style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <View style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? theme.ink : 'transparent' }}>
                  <AppText variant="body2" color={isSelected ? theme.solid : theme.ink}>
                    {dayNum}
                  </AppText>
                </View>
                <View style={{ width: d.barWidth, height: 3, borderRadius: 2, backgroundColor: d.amount > 0 ? theme.accentColor : 'transparent' }} />
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 }}>
        <AppText variant="label">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</AppText>
        <AppText variant="mono">{dayTx.length ? privacy.fmt(dayTotal, true) : '—'}</AppText>
      </View>

      <GlassCard padding={4}>
        {dayTx.length === 0 ? (
          <AppText variant="body2" style={{ padding: 28, textAlign: 'center' }}>
            No money moved that day.
          </AppText>
        ) : (
          dayTx.map((t) => (
            <TransactionRow
              key={t.id}
              title={transactionTitle(t, accounts)}
              sub={transactionSub(t, accounts)}
              amountText={privacy.fmt(t.type === 'expense' || t.type === 'lent' || t.type === 'repay_out' ? -t.amount : t.amount, true)}
              type={t.type}
              onPress={() => router.push(`/transaction/${t.id}`)}
            />
          ))
        )}
      </GlassCard>
    </Screen>
  );
}
