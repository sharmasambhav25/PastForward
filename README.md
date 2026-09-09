# PastForward

Upcycled 12-inch vinyl wall decor, posters, prints and polaroids —
*designed from memory, made for now.*

Single-page, dependency-free storefront. All source lives in `src/` (+ data
from `catalogue.json`); `build.py` assembles everything into one shippable
file, `docs/index.html`, which is what GitHub Pages serves.

## Quick start

```bash
# 1. Rebuild the site (requires Python 3, no packages)
python3 build.py

# 2. Preview it
npm run preview          # serves docs/ on :8080 — open http://localhost:8080
```

## Repo layout

| Path | What it is |
|---|---|
| `src/core.js` | Helpers, cart, router, header/drawer/search chrome, Sound engine |
| `src/routes.js` | All views + per-route `mount*` functions |
| `src/style.css` | Full design system (tokens, record renderer, chapters) |
| `src/boot.js` | Chrome wiring + startup |
| `src/ripple.js` | WebGL hover ripple for product photography |
| `src/vinyllabel.js` | Live custom-label preview (custom page) |
| `src/albumscrub.js` | Hero-disc album crossfade on pointer move |
| `src/vinyl3d.js` | WebGL hero disc (ES module; Three.js inlined at build) |
| `vendor/` | Self-hosted Three.js — no CDN anywhere |
| `build_catalogue.py` | Parses `img/*.webp` filenames → `catalogue.json` + `audit.txt` |
| `catalogue.json` | Generated. 66 products / 128 variants / 53 artists — never hand-edit |
| `build.py` | Assembles `docs/index.html` from `src/` + data + assets |
| `docs/index.html` | Generated. The shipped site (~0.4 MB shell, assets lazy) |
| `docs/assets/` | Generated. Served product art, photos, fonts, Three.js |
| `dev/check-urls.js` | No-browser URL check: renders views, asserts every asset URL resolves |
| `verify.js` | Playwright QA: 15 routes × 3 viewports, cart maths, copy rules |
| `img/`, `photos/`, `brand/`, `fonts/` | Product art, photography, brand assets, self-hosted type |

## Builds

```bash
pip install pillow        # one-time: thumbnail generation for the build
python3 build.py          # docs/index.html + docs/assets/ (ships to Pages)
python3 build.py --standalone  # + dist/standalone.html (fully embedded
                               #   single file, ~5.5 MB, for offline use)
python3 build_catalogue.py  # regenerate catalogue.json + audit.txt from img/
npm run test:urls         # verify every rendered image URL resolves on disk
```

The default build keeps `docs/index.html` small (~0.4 MB: scripts, styles,
catalogue, embedded wordmark) and serves everything else as cacheable files
under `docs/assets/` with relative URLs — first paint fetches ~0.5 MB
instead of ~5.5 MB, and repeat visits are nearly free. Product art ships at
<=480px as-is (no thumb layer needed); photos get 320px thumbs for the PDP
thumbnail. Builds are deterministic: unchanged inputs produce byte-identical
`docs/index.html` (thumbnail bytes may vary by Pillow version).
`dist/` is gitignored scratch; `docs/` is the curated shipped copy.

## QA

```bash
npm install               # installs Playwright (Chromium downloads on first run)
npx playwright install chromium
npm test                  # runs verify.js — screenshots to qa/ (gitignored)
```

## House rules (enforced by `verify.js` — read before touching copy or UI)

- **No exclamation marks** in user-facing copy, except inside `[CONFIRM]` markers.
- **Banned hype-words:** elevate, transform your room, curated collection, premium, aesthetic, vibes, discover. **No emoji.**
- **`[CONFIRM]` honesty system:** anything unverified (prices, policies, dimensions, dispatch times) is marked `[CONFIRM]`, never invented. Hit a gap you can't verify from the repo? Add the marker, don't guess.
- **Reduced motion is mandatory:** every animation needs a `prefers-reduced-motion` path (see `RM()` in `core.js`). Never remove one.
- **Cart math:** `localStorage` key `pf_cart_v1`. Set-of-three offer: 3 distinct vinyl = ₹2,199 (saves ₹498). Preserve it.
- **Sound** is procedural Web Audio, **off by default**. Never autoplay.

## Data workflow

Product art is just files in `img/` with structured names
(`VINYL-<ARTIST>-<ALBUM>.webp`, `A3-POSTER-…`, `A5-…`, `10X10INCH-…`,
`POLAROID-…`). To add a product: drop the file in, run
`python3 build_catalogue.py`, check `audit.txt`, rebuild. Overrides and
exclusions live at the top of `build_catalogue.py`.
