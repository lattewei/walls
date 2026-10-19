export type Prod = {
  id: string;
  title: string;
  producer: string;
  duration: string;
};

export type Wall = {
  slug: string;
  name: string;
  genre: string;
  year: string;
  /** Darkened color sampled from this wall's artwork. Not a brand accent. */
  tone: string;
  cover:
    | { kind: "image"; src: string; position?: string }
    | { kind: "field" };
  tracks: Prod[];
};

export const walls: Wall[] = [
  {
    slug: "johnny",
    name: "Johnny",
    genre: "Rap",
    year: "2026",
    tone: "#1a2740",
    cover: { kind: "image", src: "/bg-dither.jpg", position: "22% 30%" },
    tracks: [
      { id: "j1", title: "Quai de nuit", producer: "kay_beats", duration: "2:41" },
      { id: "j2", title: "Lune basse", producer: "luna.wav", duration: "3:02" },
      { id: "j3", title: "Fenêtre", producer: "volt808", duration: "2:18" },
      { id: "j4", title: "Tour", producer: "noirframe", duration: "2:55" },
      { id: "j5", title: "Après minuit", producer: "moss_prod", duration: "3:11" },
      { id: "j6", title: "Toit", producer: "kay_beats", duration: "2:27" },
      { id: "j7", title: "Rue vide", producer: "luna.wav", duration: "2:49" },
      { id: "j8", title: "Dernier métro", producer: "volt808", duration: "3:06" },
    ],
  },
  {
    slug: "ninho",
    name: "Ninho",
    genre: "Rap",
    year: "2026",
    tone: "#3a2416",
    cover: { kind: "field" },
    tracks: [
      { id: "n1", title: "Miel", producer: "kay_beats", duration: "2:33" },
      { id: "n2", title: "Cuivre", producer: "moss_prod", duration: "2:58" },
      { id: "n3", title: "Chambre", producer: "noirframe", duration: "3:14" },
    ],
  },
  {
    slug: "damso",
    name: "Damso",
    genre: "Rap",
    year: "2026",
    tone: "#2a1824",
    cover: { kind: "field" },
    tracks: [
      { id: "d1", title: "Encre", producer: "luna.wav", duration: "2:44" },
      { id: "d2", title: "Silence", producer: "volt808", duration: "3:21" },
    ],
  },
  {
    slug: "tiakola",
    name: "Tiakola",
    genre: "Rap",
    year: "2026",
    tone: "#163028",
    cover: { kind: "field" },
    tracks: [
      { id: "t1", title: "Marée", producer: "moss_prod", duration: "2:36" },
      { id: "t2", title: "Sel", producer: "kay_beats", duration: "2:52" },
    ],
  },
];

export function getWall(slug: string) {
  return walls.find((w) => w.slug === slug) ?? null;
}

export function shade(hex: string, delta: number) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + delta);
  const g = clamp(((n >> 8) & 255) + delta);
  const b = clamp((n & 255) + delta);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
