export type Tile = {
  id: string;
  title: string;
  meta: string;
  image?: string;
};

export type Shelf = {
  id: string;
  title: string;
  tiles: Tile[];
};

export const shelves: Shelf[] = [
  {
    id: "artists",
    title: "Artistes populaires",
    tiles: [
      { id: "ninho", title: "Ninho", meta: "8 prods", image: "/artists/ninho.jpg" },
      { id: "damso", title: "Damso", meta: "5 prods", image: "/artists/damso.jpg" },
      { id: "tiakola", title: "Tiakola", meta: "9 prods", image: "/artists/tiakola.jpg" },
      { id: "sdm", title: "SDM", meta: "4 prods", image: "/artists/sdm.jpg" },
      { id: "werenoi", title: "Werenoi", meta: "7 prods", image: "/artists/werenoi.jpg" },
    ],
  },
  {
    id: "beatmakers",
    title: "Beatmakers populaires",
    tiles: [
      { id: "kay", title: "kay_beats", meta: "Paris" },
      { id: "luna", title: "luna.wav", meta: "Bruxelles" },
      { id: "volt", title: "volt808", meta: "Lyon" },
      { id: "noir", title: "noirframe", meta: "Marseille" },
      { id: "moss", title: "moss_prod", meta: "Lille" },
    ],
  },
  {
    id: "later",
    title: "Plus tard",
    tiles: [],
  },
];
