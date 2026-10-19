# Web — landing only

Single full-viewport first screen (no scroll).  
All copy lives in `src/content/site.ts`.

## Run

```bash
npm install
npm run dev
```

## Edit content

Open `src/content/site.ts`:

- brand name, nav links, CTAs
- headline / italic accent / subhead
- badge avatar + label
- “worked with” brands
- `backgroundImage` → put a file in `public/` (default `public/hero-bg.jpg`)

## Background image (Lever-style pixels)

Lever does **not** fake the pixel look only in CSS.  
They ship a **pre-dithered** asset (`hero-painting-dither.webp`).

Same approach here:

1. Put the source art at `public/bg.jpg`
2. Run:

```bash
npm run dither
```

3. That writes `public/bg-dither.jpg` (Bayer ordered dither + night palette)  
4. `src/content/site.ts` points `backgroundImage` at `/bg-dither.jpg`

A light vignette (Lever `.stage__vignette`) sits on top for text contrast.
