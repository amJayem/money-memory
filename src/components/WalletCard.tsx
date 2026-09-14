import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from './AppText';
import { ProgressBar } from './ProgressBar';
import { WALLET_PALETTE } from '@/theme/tokens';

interface Props {
  kicker: string;
  name: string;
  amount: string;
  sub: string;
  palette: [string, string, string];
  isTotal?: boolean;
  onEyePress?: () => void;
  eyeGlyph?: string;
  hasMeter?: boolean;
  pctUsed?: number;
}

/**
 * Balance cards are the app's one deliberately opaque surface (brief §7) — a
 * wallet you swipe, never another glass panel — with a diagonal shine sweep.
 */
export function WalletCard({ kicker, name, amount, sub, palette, isTotal, onEyePress, eyeGlyph, hasMeter, pctUsed }: Props) {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1700, easing: Easing.bezier(0.36, 0.1, 0.28, 1), useNativeDriver: true }),
        Animated.delay(28300),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-260, 340] });

  return (
    <View style={[styles.card, { backgroundColor: palette[1] }]}>
      <LinearGradient colors={palette} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.shine, { transform: [{ translateX }, { rotate: '20deg' }] }]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.34)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" color="rgba(255,255,255,0.72)">
              {kicker}
            </AppText>
            <AppText variant="body" color="#fff" style={{ fontSize: 14.5, marginTop: 6 }} numberOfLines={1}>
              {name}
            </AppText>
          </View>
          {isTotal ? (
            <Pressable onPress={onEyePress} style={styles.eyeBtn}>
              <AppText color="#fff">{eyeGlyph ?? '◉'}</AppText>
            </Pressable>
          ) : null}
        </View>
        <View>
          <AppText variant="amount" color="#fff" style={{ fontSize: 28 }}>
            {amount}
          </AppText>
          <AppText variant="body2" color="rgba(255,255,255,0.78)" numberOfLines={1} style={{ marginTop: 4 }}>
            {sub}
          </AppText>
          {hasMeter ? (
            <View style={{ marginTop: 12 }}>
              <ProgressBar barPct={pctUsed ?? 0} tone={(pctUsed ?? 0) > 90 ? 'neg' : 'pos'} height={6} />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function paletteFor(accountType: string): [string, string, string] {
  return WALLET_PALETTE[accountType] ?? WALLET_PALETTE.other;
}

const styles = StyleSheet.create({
  card: {
    width: 296,
    height: 176,
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: -80,
    left: 0,
    width: 90,
    height: 340,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});
