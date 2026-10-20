/**
 * Landing content — edit this file only.
 */

export const site = {
  name: "Walls",

  backgroundImage: "/bg-dither.jpg",

  headline: {
    before: "Every beat tagged for an artist,",
    accent: "on one open wall.",
  },

  subhead:
    "Create a page for any artist. Upload your production. They listen in the browser and contact you directly — no marketplace, no middleman.",

  primaryCta: {
    label: "Enter Walls",
    href: "/app",
  },
} as const;

export type SiteContent = typeof site;
