import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { GlassCard } from '@/components/GlassCard';
import { IconButton } from '@/components/IconButton';
import { DonutChart } from '@/components/DonutChart';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { categoryBreakdown, methodBreakdown, moneyFlow, spendingByDay, type StatRange } from '@/domain/stats';
import { categoryColor, methodColor } from '@/theme/tokens';
import { formatAmount } from '@/domain/format';

const RANGES: StatRange[] = ['Today', 'This week', 'This month', '3 months', 'This year'];

export default function StatsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { accounts, transactions, settings } = useLedger();
  const privacy = usePrivacy('stats');
  const [range, setRange] = useState<StatRange>('This month');

  const cats = categoryBreakdown(transactions, range);
  const methods = methodBreakdown(transactions, accounts, range);
  const flow = moneyFlow(transactions, accounts, settings.countLentAsSpending, range);
  const days = spendingByDay(transactions, settings.countLentAsSpending, 6);
  const statTotal = cats.reduce((s, c) => s + c.amount, 0);
  const maxDay = Math.max(1, ...days.map((d) => d.amount));
  const today = new Date();

  const topCat = cats[0];
  const insight = statTotal === 0
    ? 'Not enough data yet. Record a few transactions to unlock insights.'
    : `You spent ${formatAmount(statTotal, settings.currencySymbol)} in this period. ${topCat.name} took the biggest share at ${topCat.pct}% — ${formatAmount(topCat.amount, settings.currencySymbol)}.`;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.push('/')} />
        <AppText variant="title">Statistics</AppText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {RANGES.map((r) => (
          <Chip key={r} label={r} active={range === r} onPress={() => setRange(r)} />
        ))}
      </View>

      {statTotal === 0 ? (
        <View style={{ padding: 32, alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.lineStrong, borderRadius: 22 }}>
          <AppText variant="heading">Not enough data yet</AppText>
          <AppText variant="body2" style={{ textAlign: 'center' }}>
            Record a few transactions and this fills in with where your money goes, how you pay and when you spend.
          </AppText>
        </View>
      ) : (
        <>
          <GlassCard>
            <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
              <View>
                <DonutChart
                  slices={cats.map((c) => ({ amount: c.amount, color: categoryColor(c.name, theme.mode) }))}
                  trackColor={theme.surface2}
                />
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                  <AppText variant="label" style={{ fontSize: 9.5 }}>
                    Spent
                  </AppText>
                  <AppText variant="amount" style={{ fontSize: 15, marginTop: 3 }}>
                    {privacy.fmt(statTotal)}
                  </AppText>
                </View>
              </View>
              <View style={{ flex: 1, gap: 7 }}>
                {cats.slice(0, 5).map((c) => (
                  <View key={c.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: categoryColor(c.name, theme.mode) }} />
                    <AppText variant="body2" style={{ flex: 1 }} numberOfLines={1}>
                      {c.name}
                    </AppText>
                    <AppText variant="body" style={{ fontSize: 12.5 }}>
                      {privacy.fmt(c.amount)}
                    </AppText>
                    <AppText variant="mono" style={{ width: 32, textAlign: 'right' }}>
                      {c.pct}%
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
            <AppText variant="body2" style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.line }}>
              {insight}
            </AppText>
          </GlassCard>

          {methods.length > 0 ? (
            <GlassCard>
              <AppText variant="heading">How the money left</AppText>
              <View style={{ gap: 12, marginTop: 14 }}>
                {methods.map((m, i) => (
                  <View key={m.name}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <AppText variant="body">{m.name}</AppText>
                      <AppText variant="body">{privacy.fmt(m.amount)}</AppText>
                    </View>
                    <View style={{ height: 7, borderRadius: 999, backgroundColor: theme.surface2, overflow: 'hidden', marginTop: 6 }}>
                      <View style={{ width: `${(m.amount / Math.max(1, methods[0].amount)) * 100}%`, height: '100%', backgroundColor: methodColor(i, theme.mode) }} />
                    </View>
                  </View>
                ))}
              </View>
            </GlassCard>
          ) : null}

          <GlassCard>
            <AppText variant="heading">Money flow</AppText>
            <View style={{ gap: 4, marginTop: 14 }}>
              {flow.map((f, i) => {
                const dotColor = theme.tone(f.tone);
                const amountColor = f.tone === 'neutral' ? theme.ink : dotColor;
                return (
                  <View key={f.label} style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ width: 26, alignItems: 'center' }}>
                      <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: dotColor, marginTop: 5 }} />
                      {i < flow.length - 1 ? <View style={{ width: 1, flex: 1, backgroundColor: theme.lineStrong, marginTop: 2 }} /> : null}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <AppText variant="body">{f.label}</AppText>
                        <AppText variant="body" color={amountColor}>
                          {privacy.fmt(f.amount)}
                        </AppText>
                      </View>
                      <AppText variant="mono" style={{ marginTop: 2 }}>
                        {f.sub}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard>
            <AppText variant="heading">Spending by day</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 16, height: 80 }}>
              {days.map((d) => {
                const isToday = d.date.toDateString() === today.toDateString();
                return (
                  <View key={d.date.toISOString()} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                    <View style={{ width: '100%', height: Math.max(4, (d.amount / maxDay) * 64), borderRadius: 6, backgroundColor: isToday ? theme.accentColor : theme.surface2 }} />
                    <AppText variant="mono" style={{ fontSize: 9.5 }}>
                      {d.date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </AppText>
                  </View>
                );
              })}
            </View>
          </GlassCard>
        </>
      )}
    </Screen>
  );
}
