# Mr. G — Nuanu Cruise

Interactive pitch page for Nuanu: Mr. G brings top Indonesian creators to Nuanu, our crew films them, Nuanu pays for views.

## Run locally

Windows: double-click `Запустить сайт.bat` (starts a local server and opens http://localhost:5178).

Any OS:

    python -m http.server 5178 --directory site

Internet is needed for fonts and GSAP/Lenis from CDN.

## Contents

- `site/` — the page: `index.html`, `style.css`, `app.js`, `assets/` (WebP art, heads), `roster.html` (creator roster, list not final).
- `site/tools/` — scripts that built the assets (slicing sheets, cut-outs, heads, anchors) and checks (`test_interact.py`, `check_overlap.py`, `perf.py`, `shoot.py`).
- `mrg_faces/`, `mrg_photo_props/` — source generation sheets.
- `Nuanu_pitch_short.md` — current pitch text and payment scheme.

## Payment scheme (current)

Month 1 free. Months 2–6: $5,540/month team fee. Views bonus (cumulative over 6 months): nothing below 50M; from 50M the rate per 1M views = $3 × millions, capped at $300, applied to all views (50M → $7,500; 75M → $16,875; 100M → $30,000; 150M → $45,000).
Older schemes ("$10,000 fixed + $400 per 1M", "bonus only above 50M") are obsolete.
