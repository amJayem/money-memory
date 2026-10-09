import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { GlassCard } from '@/components/GlassCard';
import { ProgressBar } from '@/components/ProgressBar';
import { AppSwitch } from '@/components/AppSwitch';
import { DonutChart } from '@/components/DonutChart';
import { Keypad } from '@/components/Keypad';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { useAppStore } from '@/store/appStore';
import { budgetStatus } from '@/domain/money';
import { recentMonthSpending, type Translate } from '@/domain/stats';
import { formatAmount } from '@/domain/format';
import { Chip } from '@/components/Chip';
import { useTranslation } from '@/i18n/useTranslation';

export default function BudgetScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { transactions, settings, spentAmount, budget } = useLedger();
  const privacy = usePrivacy('budget');
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setCategoryBudget = useAppStore((s) => s.setCategoryBudget);
  const removeCategoryBudget = useAppStore((s) => s.removeCategoryBudget);
  const [budgetEditorOpen, setBudgetEditorOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  // null = picking which category to add; a string = editing/removing that
  // category's existing budget. Either way the modal below handles both.
  const [catEditorTarget, setCatEditorTarget] = useState<string | null>(null);
  const [catEditorOpen, setCatEditorOpen] = useState(false);
  const [catBudgetInput, setCatBudgetInput] = useState('');
  const t = useTranslation('budget');
  const tc = useTranslation('common') as unknown as Translate;

  const monthLabel = tc(`monthShort${new Date().getMonth()}`);
  const lentThisMonth = transactions.filter((tx) => tx.type === 'lent').reduce((s, tx) => s + tx.amount, 0);
  const history = recentMonthSpending(transactions, settings.countLentAsSpending, tc);
  const budgetedCategories = Object.keys(settings.categoryBudgets);
  const unbudgetedCategories = settings.categories.filter((c) => !(c in settings.categoryBudgets));

  function openBudgetEditor() {
    setBudgetInput('');
    setBudgetEditorOpen(true);
  }

  function saveBudget() {
    const value = parseFloat(budgetInput);
    if (value > 0) updateSettings({ monthlyBudget: value });
    setBudgetEditorOpen(false);
  }

  function openCategoryEditor(name: string | null) {
    setCatEditorTarget(name);
    setCatBudgetInput(name && name in settings.categoryBudgets ? String(settings.categoryBudgets[name]) : '');
    setCatEditorOpen(true);
  }

  function saveCategoryBudget() {
    const value = parseFloat(catBudgetInput);
    if (catEditorTarget && value > 0) setCategoryBudget(catEditorTarget, value);
    setCatEditorOpen(false);
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.back()} />
        <AppText variant="title">{t('title', { month: monthLabel })}</AppText>
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
            <Pressable onPress={openBudgetEditor} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <AppText variant="label">{t('leftToSpend')}</AppText>
              <AppText variant="amount" color={theme.tone(budget.tone)} style={{ fontSize: 22, marginTop: 4 }}>
                {privacy.fmt(Math.max(0, budget.left))}
              </AppText>
              <AppText variant="body2" style={{ marginTop: 3 }}>
                {budget.noBudget ? t('notSet') : `${budget.pct}%`}
              </AppText>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 14 }}>
            <Stat label={t('budgetLabel')} value={privacy.fmt(budget.budget)} />
            <Divider />
            <Stat label={t('spentLabel')} value={privacy.fmt(budget.spent)} />
            <Divider />
            <Stat label={t('lentOut')} value={privacy.fmt(lentThisMonth)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, width: '100%', backgroundColor: theme.surface2, borderRadius: 16, padding: 12 }}>
            <AppText variant="body2" style={{ flex: 1 }}>
              {t('adjustThisMonth')}
            </AppText>
            <StepButton glyph="−" onPress={() => updateSettings({ monthlyBudget: Math.max(0, settings.monthlyBudget - 2500) })} />
            <StepButton glyph="+" onPress={() => updateSettings({ monthlyBudget: settings.monthlyBudget + 2500 })} />
          </View>
          <AppText variant="body2" style={{ textAlign: 'center' }}>
            {t('pastMonthsHint', { month: monthLabel })}
          </AppText>
        </View>
      </GlassCard>

      <GlassCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="heading">{t('categoryBudgets')}</AppText>
          <AppText variant="mono">{t('optional')}</AppText>
        </View>
        {budgetedCategories.length === 0 ? (
          <AppText variant="body2" style={{ marginTop: 10 }}>
            {t('noneSetHint')}
          </AppText>
        ) : (
          <View style={{ gap: 14, marginTop: 14 }}>
            {budgetedCategories.map((name) => {
              const catBudget = settings.categoryBudgets[name];
              const spent = transactions.filter((t) => t.type === 'expense' && !t.excludeFromBudget && t.category === name).reduce((s, t) => s + t.amount, 0);
              const status = budgetStatus(catBudget, spent);
              return (
                <Pressable key={name} onPress={() => openCategoryEditor(name)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText variant="body">{name}</AppText>
                    <AppText variant="mono" color={theme.tone(status.tone)}>
                      {status.overBudget ? t('overAmount', { amount: privacy.fmt(-status.left) }) : t('leftAmount', { amount: privacy.fmt(status.left) })}
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
        )}
        {unbudgetedCategories.length > 0 ? (
          <Pressable
            onPress={() => openCategoryEditor(null)}
            style={{ marginTop: 14, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 14, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText variant="body" color={theme.accentColor} weight="manrope600">
              {t('addCategoryBudget')}
            </AppText>
          </Pressable>
        ) : null}
      </GlassCard>

      {history.some((h) => h.spent > 0) ? (
        <GlassCard>
          <AppText variant="heading">{t('budgetHistory')}</AppText>
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
                    {status.overBudget ? t('overAmount', { amount: privacy.fmt(-status.left) }) : t('leftAmount', { amount: privacy.fmt(status.left) })}
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
            <AppText variant="body">{t('countLentAsSpending')}</AppText>
            <AppText variant="body2" style={{ marginTop: 3 }}>
              {settings.countLentAsSpending ? t('countLentOnHint') : t('countLentOffHint')}
            </AppText>
          </View>
          <AppSwitch value={settings.countLentAsSpending} onValueChange={(v) => updateSettings({ countLentAsSpending: v })} />
        </View>
      </GlassCard>

      <Modal visible={budgetEditorOpen} transparent animationType="fade" onRequestClose={() => setBudgetEditorOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(10,10,12,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={() => setBudgetEditorOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: theme.solid, borderRadius: 22, padding: 20, width: '100%', maxWidth: 420, gap: 14 }}>
            <AppText variant="heading">{t('setMonthBudget', { month: monthLabel })}</AppText>
            <AppText variant="body2">{t('currentlyHint', { amount: privacy.fmt(settings.monthlyBudget) })}</AppText>
            <View style={{ alignItems: 'center', paddingVertical: 6 }}>
              <AppText style={{ fontSize: budgetInput.length > 7 ? 30 : 42 }} variant="amount">
                {settings.currencySymbol}
                {budgetInput || '0'}
              </AppText>
            </View>
            <Keypad value={budgetInput} onChange={setBudgetInput} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setBudgetEditorOpen(false)} style={{ flex: 1, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}>
                <AppText variant="body">{tc('cancel')}</AppText>
              </Pressable>
              <Pressable
                onPress={saveBudget}
                disabled={!budgetInput}
                style={{ flex: 1, backgroundColor: budgetInput ? theme.ink : theme.lineStrong, borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}
              >
                <AppText color={budgetInput ? theme.solid : theme.ink3} weight="manrope700">
                  {budgetInput ? t('setAmount', { amount: formatAmount(parseFloat(budgetInput) || 0, settings.currencySymbol) }) : t('setBudget')}
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={catEditorOpen} transparent animationType="fade" onRequestClose={() => setCatEditorOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(10,10,12,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={() => setCatEditorOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: theme.solid, borderRadius: 22, padding: 20, width: '100%', maxWidth: 420, gap: 14 }}>
            {catEditorTarget ? (
              <>
                <AppText variant="heading">{t('categoryBudgetTitle', { category: catEditorTarget })}</AppText>
                <AppText variant="body2">{t('currentlyHint', { amount: privacy.fmt(settings.categoryBudgets[catEditorTarget] ?? 0) })}</AppText>
                <View style={{ alignItems: 'center', paddingVertical: 6 }}>
                  <AppText style={{ fontSize: catBudgetInput.length > 7 ? 30 : 42 }} variant="amount">
                    {settings.currencySymbol}
                    {catBudgetInput || '0'}
                  </AppText>
                </View>
                <Keypad value={catBudgetInput} onChange={setCatBudgetInput} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {catEditorTarget in settings.categoryBudgets ? (
                    <Pressable
                      onPress={() => {
                        removeCategoryBudget(catEditorTarget);
                        setCatEditorOpen(false);
                      }}
                      style={{ flex: 1, borderWidth: 1, borderColor: theme.tone('neg'), borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <AppText color={theme.tone('neg')} weight="manrope600">
                        {t('remove')}
                      </AppText>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => setCatEditorOpen(false)} style={{ flex: 1, borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}>
                      <AppText variant="body">{tc('cancel')}</AppText>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={saveCategoryBudget}
                    disabled={!catBudgetInput}
                    style={{ flex: 1, backgroundColor: catBudgetInput ? theme.ink : theme.lineStrong, borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <AppText color={catBudgetInput ? theme.solid : theme.ink3} weight="manrope700">
                      {catBudgetInput ? t('setAmount', { amount: formatAmount(parseFloat(catBudgetInput) || 0, settings.currencySymbol) }) : t('setBudget')}
                    </AppText>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <AppText variant="heading">{t('whichCategory')}</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {unbudgetedCategories.map((c) => (
                    <Chip key={c} label={c} onPress={() => openCategoryEditor(c)} />
                  ))}
                </View>
                <Pressable onPress={() => setCatEditorOpen(false)} style={{ borderWidth: 1, borderColor: theme.lineStrong, borderRadius: 14, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}>
                  <AppText variant="body">{tc('cancel')}</AppText>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function StepButton({ glyph, onPress }: { glyph: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: 13, borderWidth: 1, borderColor: theme.lineStrong, backgroundColor: theme.solid, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
    >
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
