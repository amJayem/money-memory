import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { GlassCard } from '@/components/GlassCard';
import { IconButton } from '@/components/IconButton';
import { useTheme } from '@/theme/ThemeProvider';
import { useLedger } from '@/hooks/useLedger';
import { usePrivacy } from '@/hooks/usePrivacy';
import { peopleAgg, statusLabel, statusTone } from '@/domain/money';
import { MIN_TAP_TARGET } from '@/theme/tokens';

type LoanFilter = 'All' | 'Outstanding' | 'Cleared';

export default function LoansScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { transactions } = useLedger();
  const privacy = usePrivacy('loans');
  const [tab, setTab] = useState<'lent' | 'borrowed'>('lent');
  const [filter, setFilter] = useState<LoanFilter>('All');

  const people = peopleAgg(transactions, tab);
  const filtered = people.filter((p) => (filter === 'Outstanding' ? p.out > 0 : filter === 'Cleared' ? p.out <= 0 : true));
  const totalGiven = people.reduce((s, p) => s + p.given, 0);
  const totalBack = people.reduce((s, p) => s + p.back, 0);
  const outstandingTotal = people.reduce((s, p) => s + Math.max(0, p.out), 0);

  const headLabel = tab === 'lent' ? 'You are owed' : 'You owe';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <IconButton glyph="←" onPress={() => router.push('/')} />
        <AppText variant="title">Loans</AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: 4, backgroundColor: theme.surface2, borderRadius: 14, padding: 4 }}>
        {(['lent', 'borrowed'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setTab(k)}
            style={{
              flex: 1,
              minHeight: MIN_TAP_TARGET,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 11,
              backgroundColor: tab === k ? theme.solid : 'transparent',
              shadowColor: '#000',
              shadowOpacity: tab === k ? 0.08 : 0,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
            }}
          >
            <AppText variant="body" color={tab === k ? theme.ink : theme.ink3}>
              {k === 'lent' ? 'Money I lent' : 'Money I borrowed'}
            </AppText>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['All', 'Outstanding', 'Cleared'] as LoanFilter[]).map((f) => (
          <Chip
            key={f}
            label={`${f}${f !== 'All' ? ` (${people.filter((p) => (f === 'Outstanding' ? p.out > 0 : p.out <= 0)).length})` : ''}`}
            active={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </View>

      <GlassCard>
        <AppText variant="label">{headLabel}</AppText>
        <AppText variant="amount" style={{ fontSize: 31, marginTop: 8 }}>
          {privacy.fmt(outstandingTotal)}
        </AppText>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.line, paddingTop: 13, marginTop: 13 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="body2">{tab === 'lent' ? 'Total lent' : 'Total borrowed'}</AppText>
            <AppText variant="body" style={{ marginTop: 4 }}>
              {privacy.fmt(totalGiven)}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body2">{tab === 'lent' ? 'Recovered' : 'Paid back'}</AppText>
            <AppText variant="body" color={theme.tone('pos')} style={{ marginTop: 4 }}>
              {privacy.fmt(totalBack)}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body2">People</AppText>
            <AppText variant="body" style={{ marginTop: 4 }}>
              {people.length}
            </AppText>
          </View>
        </View>
      </GlassCard>

      {filtered.length === 0 ? (
        <View style={{ padding: 32, alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.lineStrong, borderRadius: 22 }}>
          <AppText variant="heading">{tab === 'lent' ? 'Nobody owes you yet' : "You haven't borrowed from anyone"}</AppText>
          <AppText variant="body2" style={{ textAlign: 'center' }}>
            {tab === 'lent' ? 'When you lend money to someone, they show up here.' : 'When you borrow money, it shows up here.'}
          </AppText>
        </View>
      ) : (
        <View style={{ gap: 9 }}>
          {filtered.map((p) => {
            const cleared = p.out <= 0;
            const tone = statusTone(p);
            return (
              <Pressable
                key={p.person}
                onPress={() => router.push(`/person/${encodeURIComponent(p.person)}?kind=${tab}`)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}
              >
                <GlassCard padding={13} style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: theme.toneBg(tone), alignItems: 'center', justifyContent: 'center' }}>
                      <AppText color={theme.tone(tone)} weight="manrope700">
                        {p.person[0]?.toUpperCase()}
                      </AppText>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                        <AppText variant="body" numberOfLines={1}>
                          {p.person}
                        </AppText>
                        <View style={{ backgroundColor: theme.toneBg(tone), borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                          <AppText variant="mono" color={theme.tone(tone)} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {statusLabel(p)}
                          </AppText>
                        </View>
                      </View>
                      <AppText variant="mono" style={{ marginTop: 3 }}>
                        {cleared ? 'Paid in full ✓' : `${privacy.fmt(p.given)} given · ${privacy.fmt(p.back)} back`}
                      </AppText>
                    </View>
                    <AppText variant="amount" style={{ fontSize: 15 }}>
                      {privacy.fmt(Math.max(0, p.out))}
                    </AppText>
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
