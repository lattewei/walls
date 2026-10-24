# Web — Walls

Landing (`/`) and the authenticated app (`/app`, walls, profiles, upload, settings).

Shelves, walls, and profiles are loaded from the Go API. Landing copy lives in `src/content/site.ts`. The landing background is `public/bg-dither.jpg`.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

The API must be running on `:8080`. In local dev the browser calls `/api/v1/*` on the same origin; Next proxies those requests to Go.
