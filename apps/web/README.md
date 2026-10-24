# Web — Walls

Landing (`/`) and the authenticated app (`/app`, walls, profiles, upload, settings).

Shelves, walls, and profiles are loaded from the Go API. Landing copy lives in `src/content/site.ts`.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

The API must be running on `:8080`. In local dev the browser calls `/api/v1/*` on the same origin; Next proxies those requests to Go.

## Hero background

Source art: `public/bg.jpg`  
Dithered asset used on the landing: `public/bg-dither.jpg`

Regenerate after changing the source:

```bash
npm run dither
```
