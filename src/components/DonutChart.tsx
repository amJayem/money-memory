import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Slice {
  color: string;
  amount: number;
}

interface Props {
  slices: Slice[];
  size?: number;
  strokeWidth?: number;
  trackColor: string;
}

/** A simple ring chart built from stroke-dasharray segments — the RN-safe stand-in for CSS conic-gradient. */
export function DonutChart({ slices, size = 118, strokeWidth = 16, trackColor }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((s, x) => s + x.amount, 0);

  let offset = 0;
  const segments = slices.map((slice, i) => {
    const fraction = total > 0 ? slice.amount / total : 0;
    const length = fraction * circumference;
    const dashOffset = -offset;
    offset += length;
    return { ...slice, length, dashOffset };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        {segments.map((seg, i) => (
          <Circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={seg.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${seg.length} ${circumference - seg.length}`}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </Svg>
    </View>
  );
}
