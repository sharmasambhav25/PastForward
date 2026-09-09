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
| `docs/index.html` | Generated. The shipped site (fully embedded, works offline) |
| `verify.js` | Playwright QA: 15 routes × 3 viewports, cart maths, copy rules |
| `img/`, `photos/`, `brand/`, `fonts/` | Product art, photography, brand assets, self-hosted type |

## Builds

```bash
python3 build.py          # docs/index.html (embedded standalone — ships)
python3 build.py --local  # + dist/index.html (loads art from img/, for dev;
                          #   serve the repo root and open /dist/index.html)
python3 build.py --all    # + dist/artifact.html and dist/qa.html variants
python3 build_catalogue.py  # regenerate catalogue.json + audit.txt from img/
```

Builds are deterministic: unchanged inputs produce byte-identical outputs.
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
