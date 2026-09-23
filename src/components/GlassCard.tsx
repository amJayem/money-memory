import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { RADII } from '@/theme/tokens';

interface Props extends ViewProps {
  radius?: number;
  padding?: number;
}

/**
 * The app's one recurring surface: a rounded card with a hairline border and
 * a lift shadow (brief §7). Balance/wallet cards are the deliberate
 * exception and use their own opaque gradient — they don't use this.
 *
 * The background is a flat opaque color (`theme.solid`), not a translucent
 * gradient or blur. Both were tried and both caused visible artifacts on
 * Android: a translucent BlurView/LinearGradient behind text made Android's
 * text renderer draw a faint but sharp-edged rectangle matching each text
 * line's own bounding box, and BlurView's live-capture blur mode separately
 * crashed the render thread outright during screen transitions. An opaque
 * background avoids both failure modes.
 *
 * The rounded clip and the elevation shadow are still split across two
 * nested Views rather than combined on one — `overflow: 'hidden'` plus
 * `elevation` on the same Android view is a separate known combination that
 * can fail to clip children to the rounded corners.
 */
export function GlassCard({ radius = RADII.card, padding = 18, style, children, ...rest }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius,
          shadowColor: theme.lift.shadowColor,
          shadowOpacity: theme.lift.shadowOpacity,
          shadowRadius: theme.lift.shadowRadius,
          shadowOffset: theme.lift.shadowOffset,
          elevation: 4,
        },
        style,
      ]}
      {...rest}
    >
      <View style={{ flex: 1, borderRadius: radius, borderWidth: 1, borderColor: theme.line, overflow: 'hidden', backgroundColor: theme.solid }}>
        <View style={{ flex: 1, padding }}>{children}</View>
      </View>
    </View>
  );
}
