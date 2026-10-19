import type { CSSProperties } from "react";

/** Deterministic cover gradient from a string seed (no images required). */

export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function coverStyle(seed: string): CSSProperties {
  const h = hashSeed(seed || "x");
  const hue = h % 360;
  const hue2 = (hue + 38 + (h % 50)) % 360;
  const sat = 28 + (h % 22);
  return {
    background: `
      radial-gradient(120% 90% at 18% 12%, hsl(${hue} ${sat}% 52% / 0.55) 0%, transparent 48%),
      radial-gradient(90% 80% at 88% 78%, hsl(${hue2} ${sat - 6}% 28% / 0.7) 0%, transparent 52%),
      linear-gradient(155deg, hsl(${hue} 22% 14%), #0a1220 70%)
    `,
  };
}

export function initials(title: string): string {
  const parts = title.trim().split(/[\s._-]+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "·";
}
