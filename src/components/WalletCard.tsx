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
  /** Masked card-number readout, e.g. "•••• 4821" or "•••• ALL" for the total card. */
  digits: string;
  /** Small caption above the name — "All accounts" for the total card, "Account holder" otherwise. */
  holderLabel: string;
  palette: [string, string, string];
  isTotal?: boolean;
  onEyePress?: () => void;
  eyeGlyph?: string;
  hasMeter?: boolean;
  pctUsed?: number;
}

/**
 * Balance cards are the app's one deliberately opaque surface (brief §7) — a
 * physical bank card you swipe, never another glass panel: gold chip, NFC
 * wave, masked digits, cardholder row, with a diagonal shine sweep.
 */
export function WalletCard({ kicker, name, amount, sub, digits, holderLabel, palette, isTotal, onEyePress, eyeGlyph, hasMeter, pctUsed }: Props) {
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
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <AppText color="#fff" weight="manrope800" style={{ fontSize: 13, letterSpacing: 1.8 }}>
            MONEY MEMORY
          </AppText>
          {isTotal ? (
            <Pressable onPress={onEyePress} style={styles.eyeBtn}>
              <AppText color="#fff">{eyeGlyph ?? '◉'}</AppText>
            </Pressable>
          ) : (
            <View style={styles.kickerPill}>
              <AppText variant="label" color="#fff" style={{ letterSpacing: 1 }}>
                {kicker}
              </AppText>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 13 }}>
          <View style={styles.chip}>
            <View style={styles.chipBar} />
            <View style={styles.chipBar} />
            <View style={styles.chipBar} />
          </View>
          <View style={styles.wave}>
            <View style={[styles.waveArc, { width: 6, height: 6, top: 5.5, opacity: 0.9 }]} />
            <View style={[styles.waveArc, { width: 11, height: 11, top: 3, opacity: 0.7 }]} />
            <View style={[styles.waveArc, { width: 16, height: 16, top: 0.5, opacity: 0.48 }]} />
          </View>
          <AppText color="#fff" weight="manrope600" style={{ fontSize: 13.5, letterSpacing: 1.8 }}>
            {digits}
          </AppText>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="label" color="#fff" style={{ letterSpacing: 1.1 }}>
              {holderLabel}
            </AppText>
            <AppText variant="body" color="#fff" style={{ fontSize: 13.5, marginTop: 4 }} numberOfLines={1}>
              {name}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end', maxWidth: '62%' }}>
            <AppText variant="amount" color="#fff" style={{ fontSize: amount.length > 10 ? 24 : 29 }}>
              {amount}
            </AppText>
          </View>
        </View>
        <AppText variant="body2" color="rgba(255,255,255,0.82)" numberOfLines={1} style={{ marginTop: 7, fontSize: 10.5 }}>
          {sub}
        </AppText>
        {hasMeter ? (
          <View style={{ marginTop: 9 }}>
            <ProgressBar barPct={pctUsed ?? 0} tone={(pctUsed ?? 0) > 90 ? 'neg' : 'pos'} height={5} />
          </View>
        ) : null}
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
    height: 186,
    borderRadius: 22,
    padding: 16,
    paddingBottom: 15,
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
  kickerPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    maxWidth: 170,
  },
  chip: {
    width: 32,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: '#d8ab52',
  },
  chipBar: {
    height: 1.5,
    borderRadius: 2,
    backgroundColor: 'rgba(90,66,16,0.5)',
  },
  wave: {
    width: 15,
    height: 17,
  },
  waveArc: {
    position: 'absolute',
    left: 1,
    borderWidth: 1.6,
    borderColor: '#fff',
    borderRadius: 999,
    // Approximates the design's clip-path: inset(0 0 0 50%) — nested arcs
    // open on the left, like NFC/contactless signal waves fanning right.
    borderLeftColor: 'transparent',
  },
});
