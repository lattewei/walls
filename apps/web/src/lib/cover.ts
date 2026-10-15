export function sleeveFrom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hue = Math.abs(h) % 360;
  const hue2 = (hue + 28 + (Math.abs(h) % 40)) % 360;
  return {
    background: `radial-gradient(120% 90% at 20% 10%, hsl(${hue} 62% 58%) 0%, transparent 46%),
      radial-gradient(90% 80% at 90% 80%, hsl(${hue2} 48% 28%) 0%, transparent 50%),
      linear-gradient(160deg, hsl(${hue} 28% 16%), #0c0b0a 72%)`,
  };
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "•";
}
