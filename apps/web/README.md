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

## Background image

Drop a night city / moody photo at:

```text
public/hero-bg.jpg
```

If missing, the page still works (dark gradient + dots).
