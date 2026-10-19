export type Tile = {
  id: string;
  title: string;
  meta: string;
  /** Crop of the shared night painting. Omit for a plain square. */
  crop?: string;
};

export type Shelf = {
  id: string;
  title: string;
  tiles: Tile[];
};

export const painting = "/bg-dither.jpg";

export const shelves: Shelf[] = [
  {
    id: "artists",
    title: "Artistes populaires",
    tiles: [
      { id: "johnny", title: "Johnny", meta: "12 prods", crop: "20% 28%" },
      { id: "ninho", title: "Ninho", meta: "8 prods" },
      { id: "damso", title: "Damso", meta: "5 prods", crop: "78% 36%" },
      { id: "tiakola", title: "Tiakola", meta: "9 prods" },
      { id: "sdm", title: "SDM", meta: "4 prods", crop: "42% 72%" },
      { id: "werenoi", title: "Werenoi", meta: "7 prods" },
    ],
  },
  {
    id: "beatmakers",
    title: "Beatmakers populaires",
    tiles: [
      { id: "kay", title: "kay_beats", meta: "Paris" },
      { id: "luna", title: "luna.wav", meta: "Bruxelles", crop: "8% 62%" },
      { id: "volt", title: "volt808", meta: "Lyon" },
      { id: "noir", title: "noirframe", meta: "Marseille", crop: "90% 16%" },
      { id: "moss", title: "moss_prod", meta: "Lille" },
    ],
  },
  {
    id: "later",
    title: "Plus tard",
    tiles: [],
  },
];
