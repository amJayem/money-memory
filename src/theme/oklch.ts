// React Native's StyleSheet has no concept of CSS color functions, so every
// oklch() value from the design spec is converted to sRGB hex once here
// (Björn Ottosson's OKLab reference transform) instead of at each call site.

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function linearToSrgb(c: number): number {
  const v = clamp01(c);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/** L in [0,1], C (chroma) typically 0-0.4, H in degrees. Returns "#rrggbb". */
export function oklch(l: number, c: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const toHex = (v: number) => {
    const srgb = Math.round(linearToSrgb(v) * 255);
    return Math.min(255, Math.max(0, srgb)).toString(16).padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

/** oklch() with an alpha channel, returned as "#rrggbbaa". */
export function oklcha(l: number, c: number, hDeg: number, alpha: number): string {
  const hex = oklch(l, c, hDeg);
  const a = Math.round(clamp01(alpha) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
