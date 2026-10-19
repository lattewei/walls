/**
 * App home feed — edit rows & blocks here.
 * Add a new row anytime; the UI maps whatever is in `rows`.
 */

export type AppBlock = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  /** Optional image path under /public */
  image?: string;
  /** Seed for generated cover when no image */
  seed?: string;
};

export type AppRow = {
  id: string;
  title: string;
  /** Optional short note under the title */
  note?: string;
  blocks: AppBlock[];
};

export const appHome = {
  title: "Studio",
  searchPlaceholder: "Search walls, producers…",

  rows: [
    {
      id: "artists",
      title: "Popular artists",
      note: "Open walls — community pages first",
      blocks: [
        {
          id: "a-johnny",
          title: "Johnny",
          subtitle: "12 prods",
          href: "/app/artists/johnny",
          seed: "johnny",
        },
        {
          id: "a-ninho",
          title: "Ninho",
          subtitle: "8 prods",
          href: "/app/artists/ninho",
          seed: "ninho",
        },
        {
          id: "a-damso",
          title: "Damso",
          subtitle: "5 prods",
          href: "/app/artists/damso",
          seed: "damso",
        },
        {
          id: "a-tiakola",
          title: "Tiakola",
          subtitle: "9 prods",
          href: "/app/artists/tiakola",
          seed: "tiakola",
        },
        {
          id: "a-sdm",
          title: "SDM",
          subtitle: "4 prods",
          href: "/app/artists/sdm",
          seed: "sdm",
        },
        {
          id: "a-werenoi",
          title: "Werenoi",
          subtitle: "7 prods",
          href: "/app/artists/werenoi",
          seed: "werenoi",
        },
      ],
    },
    {
      id: "beatmakers",
      title: "Popular beatmakers",
      note: "Producers with public contact",
      blocks: [
        {
          id: "b-kay",
          title: "kay_beats",
          subtitle: "Paris",
          href: "/app/u/kay_beats",
          seed: "kay_beats",
        },
        {
          id: "b-luna",
          title: "luna.wav",
          subtitle: "Bruxelles",
          href: "/app/u/luna_wav",
          seed: "luna.wav",
        },
        {
          id: "b-volt",
          title: "volt808",
          subtitle: "Lyon",
          href: "/app/u/volt808",
          seed: "volt808",
        },
        {
          id: "b-noir",
          title: "noirframe",
          subtitle: "Marseille",
          href: "/app/u/noirframe",
          seed: "noirframe",
        },
        {
          id: "b-moss",
          title: "moss_prod",
          subtitle: "Lille",
          href: "/app/u/moss_prod",
          seed: "moss_prod",
        },
      ],
    },
    {
      id: "later",
      title: "Rooms",
      note: "Coming next — playlists, shortlists, collabs",
      blocks: [
        {
          id: "r-placeholder-1",
          title: "Night drills",
          subtitle: "Soon",
          href: "#",
          seed: "night-drills",
        },
        {
          id: "r-placeholder-2",
          title: "Melodic openers",
          subtitle: "Soon",
          href: "#",
          seed: "melodic-openers",
        },
        {
          id: "r-placeholder-3",
          title: "A&R shortlist",
          subtitle: "Soon",
          href: "#",
          seed: "ar-shortlist",
        },
      ],
    },
  ] satisfies AppRow[],
} as const;
