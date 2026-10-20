export type WallTrack = {
  id: string;
  title: string;
  producer: string;
  producerHandle: string;
  duration: string;
};

export type Wall = {
  slug: string;
  name: string;
  image?: string;
  bio?: string;
  genres: string[];
  badge: "community" | "claimed";
  tracks: WallTrack[];
};

export const walls: Wall[] = [
  {
    slug: "kendrick",
    name: "Kendrick Lamar",
    image: "/artists/kendrick.jpg",
    bio: "Open wall for beats tagged Kendrick.",
    genres: ["rap"],
    badge: "community",
    tracks: [
      { id: "w-k1", title: "Quai", producer: "Kay", producerHandle: "kay_beats", duration: "2:41" },
      { id: "w-k2", title: "Ink", producer: "Noir", producerHandle: "noirframe", duration: "2:44" },
      { id: "w-k3", title: "Compton air", producer: "Volt", producerHandle: "volt808", duration: "3:06" },
      { id: "w-k4", title: "Mirror", producer: "Luna", producerHandle: "luna_wav", duration: "2:52" },
    ],
  },
  {
    slug: "billie",
    name: "Billie Eilish",
    image: "/artists/billie.jpg",
    bio: "Soft rooms and low drums.",
    genres: ["alt", "pop"],
    badge: "community",
    tracks: [
      { id: "w-b1", title: "Low moon", producer: "Kay", producerHandle: "kay_beats", duration: "2:55" },
      { id: "w-b2", title: "Harbour", producer: "Luna", producerHandle: "luna_wav", duration: "2:33" },
      { id: "w-b3", title: "Green room", producer: "Moss", producerHandle: "moss_prod", duration: "2:19" },
    ],
  },
  {
    slug: "daftpunk",
    name: "Daft Punk",
    image: "/artists/daftpunk.jpg",
    genres: ["electronic"],
    badge: "community",
    tracks: [
      { id: "w-d1", title: "Wire", producer: "Luna", producerHandle: "luna_wav", duration: "2:58" },
      { id: "w-d2", title: "Grid", producer: "Volt", producerHandle: "volt808", duration: "3:11" },
      { id: "w-d3", title: "Helmet", producer: "Noir", producerHandle: "noirframe", duration: "2:40" },
    ],
  },
  {
    slug: "frank",
    name: "Frank Ocean",
    image: "/artists/frank.jpg",
    bio: "Late channels only.",
    genres: ["r&b", "alt"],
    badge: "community",
    tracks: [
      { id: "w-f1", title: "Glass", producer: "Kay", producerHandle: "kay_beats", duration: "2:18" },
      { id: "w-f2", title: "Channel", producer: "Luna", producerHandle: "luna_wav", duration: "3:04" },
    ],
  },
  {
    slug: "weeknd",
    name: "The Weeknd",
    image: "/artists/weeknd.jpg",
    genres: ["r&b", "pop"],
    badge: "community",
    tracks: [
      { id: "w-w1", title: "After hours", producer: "Kay", producerHandle: "kay_beats", duration: "3:02" },
      { id: "w-w2", title: "Kite", producer: "Volt", producerHandle: "volt808", duration: "2:27" },
      { id: "w-w3", title: "Neon", producer: "Moss", producerHandle: "moss_prod", duration: "2:48" },
    ],
  },
];

export function getWall(slug: string) {
  const key = decodeURIComponent(slug).toLowerCase();
  return walls.find((w) => w.slug.toLowerCase() === key) ?? null;
}
