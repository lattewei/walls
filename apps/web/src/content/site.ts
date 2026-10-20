/**
 * Landing content — edit this file only.
 */

export const site = {
  name: "Walls",

  backgroundImage: "/bg-dither.jpg",

  headline: {
    before: "You made the beat for them.",
    accent: "Put it on their wall.",
  },

  subhead:
    "Open an artist page, upload the instrumental, tag their name. They play it in the browser and write you if they want it.",

  primaryCta: {
    label: "See the walls",
    href: "/app",
  },
} as const;

export type SiteContent = typeof site;
