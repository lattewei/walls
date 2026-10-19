/**
 * Landing content — edit this file only.
 * All copy, links, and brands on the first screen live here.
 */

export const site = {
  name: "Lever",
  /**
   * Hero background. Lever bakes the pixel look into the asset
   * (`hero-painting-dither.webp`). We do the same with `bg-dither.jpg`
   * (generated from `bg.jpg` via `npm run dither`).
   */
  backgroundImage: "/bg-dither.jpg",

  nav: [
    { label: "Services", href: "#services" },
    { label: "Systems", href: "#systems" },
    { label: "Customers", href: "#customers" },
  ],

  navCta: {
    label: "Book a Call",
    href: "#contact",
  },

  badge: {
    label: "AI-native GTM engineer",
    /** Path under /public or full URL — leave empty for initials avatar */
    avatar: "",
    href: "#",
  },

  headline: {
    before: "Building the AI Operating System",
    /** Rendered in italic serif */
    accent: "behind your GTM team.",
  },

  subhead:
    "Content, outbound, revenue operations and account intelligence. Designed as one compounding system inside your stack.",

  primaryCta: {
    label: "Enter Studio",
    href: "/app",
  },

  socialProof: {
    label: "Worked with",
    brands: [
      { name: "Swan", href: "#", caseStudyLabel: "Case study" },
      { name: "FlexAI", href: "#", caseStudyLabel: "Case study" },
      { name: "Happypal", href: "#", caseStudyLabel: "Case study" },
    ],
  },

  /** App entry — used later when the product launches from this screen */
  appEntryHref: "/app",
} as const;

export type SiteContent = typeof site;
