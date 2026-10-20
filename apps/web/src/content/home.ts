import { walls } from "./walls";

export type Tile = {
  id: string;
  title: string;
  meta: string;
  image?: string;
  href?: string;
};

export type Shelf = {
  id: string;
  title: string;
  kind: "artist" | "producer";
  tiles: Tile[];
};

export const shelves: Shelf[] = [
  {
    id: "artists",
    title: "Popular artists",
    kind: "artist",
    tiles: walls.map((w) => ({
      id: w.slug,
      title: w.name,
      meta: `${w.tracks.length} prods`,
      image: w.image,
      href: `/artists/${w.slug}`,
    })),
  },
  {
    id: "beatmakers",
    title: "Popular producers",
    kind: "producer",
    tiles: [
      { id: "kay_beats", title: "kay_beats", meta: "Los Angeles", href: "/users/kay_beats" },
      { id: "luna_wav", title: "luna.wav", meta: "London", href: "/users/luna_wav" },
      { id: "volt808", title: "volt808", meta: "Berlin", href: "/users/volt808" },
      { id: "noirframe", title: "noirframe", meta: "Tokyo", href: "/users/noirframe" },
      { id: "moss_prod", title: "moss_prod", meta: "Lagos", href: "/users/moss_prod" },
    ],
  },
];
