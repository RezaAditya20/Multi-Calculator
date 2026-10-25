# Multi Calculator — Harga per Satuan

React app to compare promo prices by **price per unit** (ml, gram, pcs, ...).

```
10.000 / 100 = Rp 100 /ml
```

## Features

- **Tabs / daftar**: add, rename (pencil icon or double-click) and delete lists —
  e.g. one tab per product or per shop. Every tab keeps its own rows.
- List of items, each with two inputs: **harga** (price) and **ukuran** (size in
  ml, decimals allowed: `750,5`).
- Live result per row: `Rp <price per size>`.
- Cheapest row is highlighted with a `Termurah` badge, others show `+%` vs it.
- Summary cards: termurah / termahal / selisih — including **which row is
  cheapest, with its price and size** (e.g. `#3 · Rp 8.500 untuk 500 ml`).
- Quick size chips: 50, 100, 250, 500, 800, 1000 ml.
- Data is saved to `localStorage`, so it is still there on the next visit.
- Dark (black + blue accent, PSprices-style) / light theme toggle.
- PWA: installable on iOS/Android, works offline (service worker).

## Deploy to GitHub Pages

A workflow is included (`.github/workflows/deploy.yml`):

1. Push the project to a GitHub repository (default branch `main` or `master`).
2. Repo **Settings → Pages → Source**: select **GitHub Actions**.
3. Every push now builds `dist/` and deploys it automatically.

The build uses `base: "./"` (relative URLs), so it works at
`https://<user>.github.io/<repo>/` without configuration. If you host it at the
domain root instead, everything still works.

Manual alternative:

```bash
npm run build          # then publish the dist/ folder with any static host
```

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server
npm run build      # production build -> dist/
npm run preview    # serve the production build
npm run icons      # regenerate PWA icons (scripts/generate-icons.mjs)
```

## Install on iPhone

iOS only allows "Add to Home Screen" / PWA install over **HTTPS** (or `localhost`).

1. `npm run build`
2. Deploy `dist/` to any HTTPS host (Netlify, Vercel, GitHub Pages, Cloudflare
   Pages), or serve it locally through an HTTPS tunnel.
3. Open the URL in Safari → Share → **Add to Home Screen**.

Relevant files:

| File | Purpose |
| --- | --- |
| `index.html` | viewport `viewport-fit=cover` + apple/PWA meta tags |
| `public/manifest.webmanifest` | install manifest |
| `public/sw.js` | service worker (network first, cache fallback) |
| `scripts/generate-icons.mjs` | dependency-free PNG icon generator |
| `src/App.jsx` | state, persistence, theme, layout |
| `src/components/PriceRow.jsx` | one comparison row |
| `src/lib/format.js` | id-ID number parsing/formatting + per-ml math |
