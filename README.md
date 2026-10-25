# Multi Calculator — Harga per Satuan

React app to compare promo prices by **price per unit** (ml, gram, pcs, ...).

```
10.000 / 100 = Rp 100 /ml
```

## Features

- List of items, each with two inputs: **harga** (price) and **ukuran** (ml).
- Live result per row: `Rp <price per ml>`.
- Cheapest row is highlighted with a `Termurah` badge, others show `+%` vs it.
- Summary cards: termurah / termahal / selisih.
- Quick size chips: 50, 100, 250, 500, 800, 1000 ml.
- Data is saved to `localStorage`, so it is still there on the next visit.
- Dark / light theme toggle (dark by default, PSprices-style design).
- PWA: installable on iOS/Android, works offline (service worker).

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
