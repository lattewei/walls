export type Prod = {
  id: string;
  title: string;
  meta: string;
  metaHref?: string;
  duration: string;
};

export type Profile = {
  handle: string;
  displayName: string;
  bio?: string;
  genres: string[];
  email?: string;
  instagram?: string;
  links: { label: string; url: string }[];
  tracks: Prod[];
};

export const profiles: Profile[] = [
  {
    handle: "kay_beats",
    displayName: "Kay",
    bio: "Beats for the night shift. Los Angeles.",
    genres: ["rap", "r&b"],
    email: "kay@example.com",
    instagram: "https://instagram.com/kay_beats",
    links: [{ label: "SoundCloud", url: "https://soundcloud.com/kay_beats" }],
    tracks: [
      { id: "k1", title: "Quai", meta: "Kendrick Lamar", metaHref: "/artists/kendrick", duration: "2:41" },
      { id: "k2", title: "After hours", meta: "The Weeknd", metaHref: "/artists/weeknd", duration: "3:02" },
      { id: "k3", title: "Glass", meta: "Frank Ocean", metaHref: "/artists/frank", duration: "2:18" },
      { id: "k4", title: "Low moon", meta: "Billie Eilish", metaHref: "/artists/billie", duration: "2:55" },
    ],
  },
  {
    handle: "luna_wav",
    displayName: "Luna",
    bio: "Soft drums, hard rooms. London.",
    genres: ["alt", "electronic"],
    links: [],
    tracks: [
      { id: "l1", title: "Harbour", meta: "Billie Eilish", metaHref: "/artists/billie", duration: "2:33" },
      { id: "l2", title: "Wire", meta: "Daft Punk", metaHref: "/artists/daftpunk", duration: "2:58" },
    ],
  },
  {
    handle: "volt808",
    displayName: "Volt",
    bio: "808s from Berlin basements.",
    genres: ["electronic", "rap"],
    instagram: "https://instagram.com/volt808",
    links: [],
    tracks: [
      { id: "v1", title: "Grid", meta: "Daft Punk", metaHref: "/artists/daftpunk", duration: "3:11" },
      { id: "v2", title: "Kite", meta: "The Weeknd", metaHref: "/artists/weeknd", duration: "2:27" },
    ],
  },
  {
    handle: "noirframe",
    displayName: "Noir",
    genres: ["rap"],
    links: [{ label: "Bandcamp", url: "https://bandcamp.com" }],
    tracks: [
      { id: "n1", title: "Ink", meta: "Kendrick Lamar", metaHref: "/artists/kendrick", duration: "2:44" },
    ],
  },
  {
    handle: "moss_prod",
    displayName: "Moss",
    bio: "Still writing. Lagos.",
    genres: ["afrobeats", "rap"],
    links: [],
    tracks: [],
  },
];

export function getProfile(handle: string) {
  const key = decodeURIComponent(handle).toLowerCase();
  return profiles.find((p) => p.handle.toLowerCase() === key) ?? null;
}
