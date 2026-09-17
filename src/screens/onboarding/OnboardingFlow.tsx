import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/components/AppText';
import { ScreenBackground } from '@/components/Screen';
import { GhostButton } from '@/components/GhostButton';
import { useAppStore } from '@/store/appStore';
import type { AccountType } from '@/domain/types';
import { ACCOUNT_TYPE_LABEL } from '@/theme/tokens';

const SLIDES = [
  {
    title: 'Know where your money actually went',
    body: 'Every rupee, taka or dollar you spend, earn or move — searchable months later, not just this week.',
  },
  {
    title: "Never forget who owes you — or who you owe",
    body: 'Lend, borrow and get paid back without losing track. Money out to a friend stays your money, not a loss.',
  },
  {
    title: 'Plan a month you can keep',
    body: 'A simple budget that tells you plainly when you’re close, and never lies by counting loans as spending.',
  },
  {
    title: "Let's set up your money",
    body: 'Pick the kinds of accounts you actually use, and tell us your currency symbol.',
  },
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
  const [showSplash, setShowSplash] = useState(true);
  const [slide, setSlide] = useState(0);
  const [enabled, setEnabled] = useState<AccountType[]>(DEFAULT_ON);
  const [symbol, setSymbol] = useState('৳');
  // Starts empty per type — a checked account with nothing typed just falls
  // back to its default name and a zero balance; nothing here needs clearing
  // before someone can type their own values.
  const [details, setDetails] = useState<Record<string, AccountDetail>>({});

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(t);
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
    updateSettings({ hasOnboarded: true, currencySymbol: symbol.trim() || '৳', enabledAccountTypes: enabled });
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
              a searchable memory for your money
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
        <GhostButton label="Skip" onPress={finish} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center', gap: 26 }}>
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
            <AppText variant="mono">
              Add a starting balance now, or leave it and add it later from Accounts.
            </AppText>
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
                <AppText variant="body">Currency symbol</AppText>
                <AppText variant="mono" style={{ marginTop: 2 }}>
                  amounts will read {symbol || '৳'}1,250
                </AppText>
              </View>
              <PlainInput value={symbol} onChangeText={(v) => setSymbol(v.slice(0, 4))} />
            </View>
          </View>
        ) : null}
      </View>

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
            {isLast ? 'Start using Money Memory' : 'Next'}
          </AppText>
        </Pressable>
      </View>
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
