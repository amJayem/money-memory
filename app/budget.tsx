import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { ProgressBar } from '@/components/ProgressBar';
import { AppSwitch } from '@/components/AppSwitch';
import { DonutChart } from '@/components/DonutChart';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { useAppStore } from '@/store/appStore';
import { budgetStatus } from '@/domain/money';
import { recentMonthSpending } from '@/domain/stats';
import { CATEGORY_BUDGETS } from '@/domain/types';

export default function BudgetScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { transactions, settings, spentAmount, budget } = useLedger();
  const privacy = usePrivacy('budget');
  const updateSettings = useAppStore((s) => s.updateSettings);

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long' });
  const lentThisMonth = transactions.filter((t) => t.type === 'lent').reduce((s, t) => s + t.amount, 0);
  const history = recentMonthSpending(transactions, settings.countLentAsSpending);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.back()} />
        <AppText variant="title">{monthLabel} budget</AppText>
      </View>

      <GlassCard>
        <View style={{ alignItems: 'center', gap: 16 }}>
          <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
            <DonutChart
              size={180}
              strokeWidth={16}
              trackColor={theme.surface2}
              slices={
                budget.noBudget
                  ? []
                  : budget.overBudget
                    ? [{ amount: 1, color: theme.tone('neg') }]
                    : [
                        { amount: budget.spent, color: theme.tone(budget.tone) },
                        { amount: Math.max(0, budget.budget - budget.spent), color: theme.surface2 },
                      ]
              }
            />
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <AppText variant="label">left to spend</AppText>
              <AppText variant="amount" color={theme.tone(budget.tone)} style={{ fontSize: 22, marginTop: 4 }}>
                {privacy.fmt(Math.max(0, budget.left))}
              </AppText>
              <AppText variant="body2" style={{ marginTop: 3 }}>
                {budget.noBudget ? 'not set' : `${budget.pct}%`}
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 14 }}>
            <Stat label="Budget" value={privacy.fmt(budget.budget)} />
            <Divider />
            <Stat label="Spent" value={privacy.fmt(budget.spent)} />
            <Divider />
            <Stat label="Lent out" value={privacy.fmt(lentThisMonth)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, width: '100%', backgroundColor: theme.surface2, borderRadius: 16, padding: 12 }}>
            <AppText variant="body2" style={{ flex: 1 }}>
              Adjust this month
            </AppText>
            <StepButton glyph="−" onPress={() => updateSettings({ monthlyBudget: Math.max(0, settings.monthlyBudget - 2500) })} />
            <StepButton glyph="+" onPress={() => updateSettings({ monthlyBudget: settings.monthlyBudget + 2500 })} />
          </View>
          <AppText variant="body2" style={{ textAlign: 'center' }}>
            Past months keep the budget they were planned with — editing now only changes {monthLabel}.
          </AppText>
        </View>
      </GlassCard>

      <GlassCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="heading">Category budgets</AppText>
          <AppText variant="mono">optional</AppText>
        </View>
        <View style={{ gap: 14, marginTop: 14 }}>
          {CATEGORY_BUDGETS.map(([name, catBudget]) => {
            const spent = transactions.filter((t) => t.type === 'expense' && t.category === name).reduce((s, t) => s + t.amount, 0);
            const status = budgetStatus(catBudget, spent);
            return (
              <Pressable key={name} onPress={() => router.push(`/history?category=${name}`)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="body">{name}</AppText>
                  <AppText variant="mono" color={theme.tone(status.tone)}>
                    {status.overBudget ? `${privacy.fmt(-status.left)} over` : `${privacy.fmt(status.left)} left`}
                  </AppText>
                </View>
                <View style={{ marginTop: 7 }}>
                  <ProgressBar barPct={status.barPct} overPct={status.overPct} tone={status.tone} height={8} />
                </View>
                <AppText variant="mono" style={{ marginTop: 6 }}>
                  {privacy.fmt(spent)} of {privacy.fmt(catBudget)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      {history.some((h) => h.spent > 0) ? (
        <GlassCard>
          <AppText variant="heading">Budget history</AppText>
          <View style={{ gap: 12, marginTop: 13 }}>
            {history.map((h) => {
              const status = budgetStatus(settings.monthlyBudget, h.spent);
              return (
                <View key={h.month} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                  <AppText variant="body" style={{ width: 34 }}>
                    {h.month}
                  </AppText>
                  <View style={{ flex: 1 }}>
                    <ProgressBar barPct={status.barPct} overPct={status.overPct} tone={status.tone} height={8} />
                  </View>
                  <AppText variant="mono" color={theme.tone(status.overBudget ? 'neg' : 'pos')} style={{ width: 76, textAlign: 'right' }}>
                    {status.overBudget ? `${privacy.fmt(-status.left)} over` : `${privacy.fmt(status.left)} left`}
                  </AppText>
                </View>
              );
            })}
          </View>
        </GlassCard>
      ) : null}

      <GlassCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="body">Count money lent as spending</AppText>
            <AppText variant="body2" style={{ marginTop: 3 }}>
              {settings.countLentAsSpending ? 'Lent money now counts against your budget.' : 'Lent money leaves your account but stays your money — off by default.'}
            </AppText>
          </View>
          <AppSwitch value={settings.countLentAsSpending} onValueChange={(v) => updateSettings({ countLentAsSpending: v })} />
        </View>
      </GlassCard>
    </Screen>
  );
}

function StepButton({ glyph, onPress }: { glyph: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={{ width: 44, height: 44, borderRadius: 13, borderWidth: 1, borderColor: theme.lineStrong, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient colors={theme.surfaceGradient as unknown as [string, string]} style={StyleSheet.absoluteFill} />
      <AppText variant="heading">{glyph}</AppText>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <AppText variant="body2">{label}</AppText>
      <AppText variant="body" style={{ marginTop: 3 }}>
        {value}
      </AppText>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ width: 1, backgroundColor: theme.line }} />;
}
