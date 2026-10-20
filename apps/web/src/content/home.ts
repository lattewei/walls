export type Tile = {
  id: string;
  title: string;
  meta: string;
  image?: string;
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
    tiles: [
      { id: "kendrick", title: "Kendrick Lamar", meta: "12 prods", image: "/artists/kendrick.jpg" },
      { id: "billie", title: "Billie Eilish", meta: "9 prods", image: "/artists/billie.jpg" },
      { id: "daftpunk", title: "Daft Punk", meta: "7 prods", image: "/artists/daftpunk.jpg" },
      { id: "frank", title: "Frank Ocean", meta: "6 prods", image: "/artists/frank.jpg" },
      { id: "weeknd", title: "The Weeknd", meta: "11 prods", image: "/artists/weeknd.jpg" },
    ],
  },
  {
    id: "beatmakers",
    title: "Popular producers",
    kind: "producer",
    tiles: [
      { id: "kay_beats", title: "kay_beats", meta: "Los Angeles" },
      { id: "luna_wav", title: "luna.wav", meta: "London" },
      { id: "volt808", title: "volt808", meta: "Berlin" },
      { id: "noirframe", title: "noirframe", meta: "Tokyo" },
      { id: "moss_prod", title: "moss_prod", meta: "Lagos" },
    ],
  },
];
