/**
 * App index. Add a row, or a block inside a row.
 * kind "crop" uses the shared night painting at `crop`.
 * kind "note" is a text block (are.na-style), no generated art.
 */

export type AppBlock = {
  id: string;
  title: string;
  meta: string;
  href: string;
  kind: "crop" | "note";
  /** CSS object-position when kind is crop */
  crop?: string;
};

export type AppRow = {
  id: string;
  title: string;
  countLabel: string;
  blocks: AppBlock[];
};

export const painting = "/bg-dither.jpg";

export const appHome: { rows: AppRow[] } = {
  rows: [
    {
      id: "artists",
      title: "Artists",
      countLabel: "6 walls",
      blocks: [
        { id: "johnny", title: "Johnny", meta: "12", href: "/app/artists/johnny", kind: "crop", crop: "18% 22%" },
        { id: "ninho", title: "Ninho", meta: "8", href: "/app/artists/ninho", kind: "note" },
        { id: "damso", title: "Damso", meta: "5", href: "/app/artists/damso", kind: "crop", crop: "72% 40%" },
        { id: "tiakola", title: "Tiakola", meta: "9", href: "/app/artists/tiakola", kind: "note" },
        { id: "sdm", title: "SDM", meta: "4", href: "/app/artists/sdm", kind: "crop", crop: "40% 78%" },
        { id: "werenoi", title: "Werenoi", meta: "7", href: "/app/artists/werenoi", kind: "note" },
      ],
    },
    {
      id: "beatmakers",
      title: "Beatmakers",
      countLabel: "5 profiles",
      blocks: [
        { id: "kay", title: "kay_beats", meta: "Paris", href: "/app/u/kay_beats", kind: "note" },
        { id: "luna", title: "luna.wav", meta: "Bruxelles", href: "/app/u/luna_wav", kind: "crop", crop: "8% 60%" },
        { id: "volt", title: "volt808", meta: "Lyon", href: "/app/u/volt808", kind: "note" },
        { id: "noir", title: "noirframe", meta: "Marseille", href: "/app/u/noirframe", kind: "crop", crop: "88% 18%" },
        { id: "moss", title: "moss_prod", meta: "Lille", href: "/app/u/moss_prod", kind: "note" },
      ],
    },
    {
      id: "rooms",
      title: "Rooms",
      countLabel: "empty",
      blocks: [],
    },
  ],
};
