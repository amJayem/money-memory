import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/AppText';
import { ScreenBackground } from '@/components/Screen';
import { GhostButton } from '@/components/GhostButton';
import { useAppStore } from '@/store/appStore';
import type { AccountType, Language } from '@/domain/types';
import { ACCOUNT_TYPE_LABEL } from '@/theme/tokens';
import { useTranslation } from '@/i18n/useTranslation';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
];

const ACCOUNT_CHOICES: AccountType[] = ['cash', 'bank', 'wallet', 'credit'];
const DEFAULT_ON: AccountType[] = ['cash', 'bank', 'wallet'];

interface AccountDetail {
  name: string;
  amount: string;
}

export function OnboardingFlow() {
  const theme = useTheme();
  const updateSettings = useAppStore((s) => s.updateSettings);
  const addAccount = useAppStore((s) => s.addAccount);
  const loadSampleData = useAppStore((s) => s.loadSampleData);
  const language = useAppStore((s) => s.settings.language);
  const t = useTranslation('onboarding');
  // Asked once, up front, before the splash even shows — not a slide of its
  // own, since every other slide's text depends on the answer. Choosing a
  // language here just updates settings directly; there's nothing else to
  // "finish" about it, and it stays changeable from Settings afterward.
  const [languagePicked, setLanguagePicked] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [slide, setSlide] = useState(0);
  const SLIDES = [
    { title: t('slide1Title'), body: t('slide1Body') },
    { title: t('slide2Title'), body: t('slide2Body') },
    { title: t('slide3Title'), body: t('slide3Body') },
    { title: t('slide4Title'), body: t('slide4Body') },
  ];
  const [enabled, setEnabled] = useState<AccountType[]>(DEFAULT_ON);
  const [symbol, setSymbol] = useState('৳');
  // Empty (not a prefilled figure) — a monthly budget is only ever set here
  // if the user actually types one; left blank, onboarding leaves it unset
  // exactly like a real "no budget" account (see appStore's DEFAULT_SETTINGS).
  const [budgetInput, setBudgetInput] = useState('');
  // Starts empty per type — a checked account with nothing typed just falls
  // back to its default name and a zero balance; nothing here needs clearing
  // before someone can type their own values.
  const [details, setDetails] = useState<Record<string, AccountDetail>>({});

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  function toggle(type: AccountType) {
    setEnabled((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  function setDetail(type: AccountType, field: keyof AccountDetail, value: string) {
    setDetails((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  }

  function finish() {
    for (const type of enabled) {
      const detail = details[type];
      const name = detail?.name.trim() || ACCOUNT_TYPE_LABEL[type];
      const value = parseFloat(detail?.amount ?? '') || 0;
      addAccount({
        id: `${type}-${Date.now()}`,
        name,
        type,
        openingBalance: type === 'credit' ? 0 : value,
        limit: type === 'credit' ? value : undefined,
      });
    }
    updateSettings({
      hasOnboarded: true,
      currencySymbol: symbol.trim() || '৳',
      enabledAccountTypes: enabled,
      monthlyBudget: parseFloat(budgetInput) || 0,
    });
  }

  // For anyone who'd rather poke around before adding real accounts —
  // loads the same demo ledger a fresh install used to start with.
  function exploreWithSampleData() {
    loadSampleData();
  }

  if (!languagePicked) {
    return (
      <ScreenBackground edges={['top', 'bottom', 'left', 'right']} style={{ paddingHorizontal: 24 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <AppText variant="title" style={{ fontSize: 22, textAlign: 'center' }}>
              {t('languageTitle')}
            </AppText>
            <AppText variant="body2" style={{ textAlign: 'center' }}>
              {t('languageSubtitle')}
            </AppText>
          </View>
          <View style={{ width: '100%', gap: 10 }}>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => {
                  updateSettings({ language: l.code });
                  setLanguagePicked(true);
                }}
                style={{
                  borderWidth: 1,
                  borderColor: language === l.code ? theme.accentColor : theme.line,
                  backgroundColor: theme.surface2,
                  borderRadius: 18,
                  minHeight: 56,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="body" weight="manrope700" style={{ fontSize: 16 }}>
                  {l.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </ScreenBackground>
    );
  }

  if (showSplash) {
    return (
      <ScreenBackground edges={['top', 'bottom', 'left', 'right']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <View style={{ width: 66, height: 66, borderRadius: 24, backgroundColor: theme.tone('accent') }} />
          <View style={{ alignItems: 'center' }}>
            <AppText variant="title" style={{ fontSize: 26 }}>
              Money Memory
            </AppText>
            <AppText variant="mono" style={{ marginTop: 6 }}>
              {t('splashTagline')}
            </AppText>
          </View>
        </View>
      </ScreenBackground>
    );
  }

  const s = SLIDES[slide];
  const isSetup = slide === 3;
  const isLast = slide === SLIDES.length - 1;

  return (
    <ScreenBackground edges={['top', 'bottom', 'left', 'right']} style={{ paddingHorizontal: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 }}>
        <GhostButton label={t('skip')} onPress={finish} />
      </View>

      {/* justifyContent: 'center' here was actively fighting Android's adjustResize:
          each keyboard-driven window resize re-centers the flex content, which could
          shove the footer (Next button, progress dots) out of the shrunk viewport
          entirely — confirmed on-device, the footer dropped out of the layout tree
          while a lower field was focused. Top-aligned flow has no such instability. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={isSetup ? { gap: 26, paddingVertical: 12 } : { flexGrow: 1, justifyContent: 'center', gap: 26, paddingVertical: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <AppText variant="title" style={{ fontSize: 27 }}>
            {s.title}
          </AppText>
          <AppText variant="body2" style={{ marginTop: 10, lineHeight: 21 }}>
            {s.body}
          </AppText>
        </View>

        {isSetup ? (
          <View style={{ gap: 8 }}>
            <AppText variant="mono">{t('addBalanceHint')}</AppText>
            {ACCOUNT_CHOICES.map((type) => {
              const on = enabled.includes(type);
              const detail = details[type];
              return (
                <View key={type} style={{ borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, borderRadius: 18, overflow: 'hidden' }}>
                  <Pressable onPress={() => toggle(type)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body">{ACCOUNT_TYPE_LABEL[type]}</AppText>
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        borderWidth: 1.5,
                        borderColor: on ? theme.accentColor : theme.lineStrong,
                        backgroundColor: on ? theme.accentColor : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {on ? <AppText color="#fff" style={{ fontSize: 13 }}>✓</AppText> : null}
                    </View>
                  </Pressable>
                  {on ? (
                    <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 13, paddingBottom: 13 }}>
                      <TextInput
                        value={detail?.name ?? ''}
                        onChangeText={(v) => setDetail(type, 'name', v)}
                        placeholder={ACCOUNT_TYPE_LABEL[type]}
                        placeholderTextColor={theme.ink3}
                        style={{ flex: 1, borderWidth: 1, borderColor: theme.lineStrong, backgroundColor: theme.solid, borderRadius: 12, padding: 10, color: theme.ink, fontSize: 13 }}
                      />
                      <TextInput
                        value={detail?.amount ?? ''}
                        onChangeText={(v) => setDetail(type, 'amount', v.replace(/[^0-9.]/g, ''))}
                        keyboardType="numeric"
                        placeholder={type === 'credit' ? 'Limit' : '0'}
                        placeholderTextColor={theme.ink3}
                        style={{ width: 92, borderWidth: 1, borderColor: theme.lineStrong, backgroundColor: theme.solid, borderRadius: 12, padding: 10, color: theme.ink, fontSize: 13 }}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, borderRadius: 18, padding: 13, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="body">{t('currencySymbolLabel')}</AppText>
                <AppText variant="mono" style={{ marginTop: 2 }}>
                  {t('currencyPreview', { symbol: symbol || '৳' })}
                </AppText>
              </View>
              <PlainInput value={symbol} onChangeText={(v) => setSymbol(v.slice(0, 4))} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, borderRadius: 18, padding: 13 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="body">{t('monthlyBudgetLabel')}</AppText>
                <AppText variant="mono" style={{ marginTop: 2 }}>
                  {t('monthlyBudgetHint')}
                </AppText>
              </View>
              <TextInput
                value={budgetInput}
                onChangeText={(v) => setBudgetInput(v.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.ink3}
                style={{ width: 92, minHeight: 46, textAlign: 'center', borderWidth: 1, borderColor: theme.lineStrong, backgroundColor: theme.solid, borderRadius: 12, color: theme.ink, fontSize: 15, fontWeight: '700' }}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {isSetup ? (
        <Pressable onPress={exploreWithSampleData} style={{ alignSelf: 'center', paddingVertical: 6, marginBottom: 4 }}>
          <AppText variant="body2" color={theme.ink3} style={{ textDecorationLine: 'underline' }}>
            {t('exploreSampleData')}
          </AppText>
        </Pressable>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 18 }}>
        <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === slide ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === slide ? theme.ink : theme.lineStrong,
              }}
            />
          ))}
        </View>
        <Pressable
          onPress={() => (isLast ? finish() : setSlide((s2) => s2 + 1))}
          style={{ backgroundColor: theme.ink, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' }}
        >
          <AppText color={theme.solid} weight="manrope700">
            {isLast ? t('start') : t('next')}
          </AppText>
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

// A minimal text input kept local since this is the only free-text field in onboarding.
function PlainInput({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      maxLength={4}
      placeholder="৳"
      placeholderTextColor={theme.ink3}
      style={{
        width: 70,
        minHeight: 46,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: theme.line,
        backgroundColor: theme.solid,
        color: theme.ink,
        borderRadius: 14,
        fontSize: 19,
        fontWeight: '700',
      }}
    />
  );
}
