# A24 by Ravi Klaassens — a deep study for PastForward

> **Subject:** [a24.raviklaassens.com](https://a24.raviklaassens.com/) — an unofficial tribute to A24
> **Author:** Ravi Klaassens (R—K), Enschede, NL · Sep 2026
> **Awards:** Awwwards Site of the Day (Oct 26, 2026, score 7.65) + Developer Award, FWA of the Day, CSSDA Website of the Day, GSAP Site of the Week, Muzli Pick, Awwwards HM — 7 awards
> **Stack (per Awwwards tech tags):** GSAP · Three.js · Barba.js · WebGL
> **Why we're studying it:** it treats a *catalogue* the way we want to — every product is a physical disc you flip through and open.

Everything below is from direct fetches of the live site, its sitemap, the production pages, the 404, the author's case study, and the Awwwards/landing.love write-ups. Items marked *(inferred)* are conclusions from structure, not direct observation.

---

## 1. The core idea

From the author's case study:

> "The idea: give its catalogue the feel of a **shelf of physical media**, where every film and series is an **object you flip through and open**."

> "Every film and series is a disc. Flip from one title to the next, open it for the director, the cast and the reviews that defined it, and move between film and television in one continuous motion. **Even the 404 page plays along.**"

> "Built to feel like **holding the real thing**."

This is the whole site in one sentence: **the catalogue IS the interface.** There is no product grid, no card wall, no "shop" layout. The objects (discs) are lined up on a shelf; browsing = flipping through the shelf; a detail page = taking one out of its case. The commerce-adjacent actions (Watch online, Get in Blu-ray) sit inside the detail page like the sticker on a Blu-ray case.

**Why this matters to us:** PastForward *literally sells discs*. Our `.record` component already renders a physical vinyl record with grooves, dead wax, sheen and a printed centre label. A24 had to *invent* the physical-media metaphor; ours is the actual product.

---

## 2. Information architecture — 26 real URLs, one continuous experience

From `sitemap.xml` and `robots.txt`:

```
/                              Films library (the shelf)
/television                    TV library (same shelf, different wing)
/production/{slug}             24 detail pages (12 films + 12 series)
                               e.g. /production/hereditary
(anything else)                404 — "Empty Shelf"
```

- It is a **static multi-page site** — every production has a real, crawlable URL and a real `<title>` ("A24 — Hereditary"). SEO-clean, shareable.
- **Barba.js** is what makes 26 separate pages feel like one app: it intercepts link clicks, fetches the next page, and animates old→new inside a persistent shell. So the header/player chrome never reloads — the "Films → Television" transition happens inside one DOM.
- The **global chrome is the trailer player**: on *every* page (home, TV, production, 404) the DOM carries the same controls — `TAP FOR SOUND`, `CLOSE`, `PAUSE`, `00:00 / 00:00`, `SOUND`, `MAXIMIZE`. The player is a site-level singleton, not a per-page embed. *(inferred from identical markup on every URL)*

**The lesson:** SPA-feel with real URLs. We already have the inverse (a hash-routed single file). For a single-file build that's correct — but the *pattern* to keep is: global chrome that never re-renders (we have it: `#overlays`, header, drawer) + per-route content swaps.

---

## 3. Page-by-page anatomy

### 3.1 The library page (home = Films, `/television`)

Content, in order:

1. **H1:** "Discover the A24 library of Films" — plain, editorial, sets the room.
2. **The shelf.** Every title is a disc (`disc.webp`, square, on the CDN). The front-most disc is "in focus" and gets the full treatment:
   - Title (display type)
   - `DIRECTED BY` — names
   - `YEAR` — year
   - `STARRING` — cast list
   - **Two critic quotes**, each with publication name and a numeral rating: `The Playlist — "Something Far More Haunting" — 5`, `The Daily Beast — "Casts A Surrealistic Spell" — 4.5`
3. **Position counter:** "Hazbin Hotel, 1 of 12" — you always know where you are in the shelf.
4. **Keyboard hint, verbatim:**
   > "Use the left and right arrow keys to browse films. Press **Enter** to open the film in front, or **Space** to flip the disc over."
5. **Odometer strip:** repeated digit columns `0 1 2 3 4 5 6 7 8 9 …` under the labels "A24 Films" — a mechanical rolling-digit counter (each digit is a vertical strip of 0–9 that translates; the visible digit is the one in the window). Films ends up showing the year range of the shelf, TV its own. It's the site's playful "this is a machine" moment.

The **disc flip** (Space): the front disc turns over in 3D *(inferred: Three.js-rendered disc; the flip is one of the awarded interaction clips)* — the B-side carries the credits/reviews, exactly like flipping a Blu-ray to read the back.

### 3.2 The production page (`/production/{slug}`)

Anatomy of `/production/hereditary`, top to bottom:

1. **Title + credits stack** — the archival block, all stacked uppercase labels:
   `DIRECTED BY · WRITTEN BY · STARRING · YEAR · GENRE · LANGUAGES · RUNTIME`
   (runtime as `2:07:00` — tabular numerals).
2. **Outbound CTAs:** `WATCH ONLINE` (Apple TV link) · `GET IN BLU-RAY` (Amazon link) — the only "buy" gestures, styled like stickers on the case, not like e-commerce buttons.
3. **Trailer player:** poster still → `TAP FOR SOUND` (sound off by default — user-gesture gated), custom chrome (pause / scrubber `00:00 / 00:00` / sound toggle / maximize), a big typographic easter egg over the poster ("Iamyourmother!"), and a `WATCH TRAILER` button.
4. **Synopsis** — one plain paragraph, generously spaced.
5. **Awards list** — rows of `AWARD · ORGANISATION` (e.g. `BEST ACTRESS · GOTHAM AWARDS`), 7 rows for Hereditary. Pure type, no medal icons.
6. **A still / artwork** (`vector.webp`).
7. **Next-production link** — a huge "Lady Bird" → the next case. You never hit a dead end.
8. **The full library browser** — *every* film and series as a row: type (`Film`/`Television`), the disc image, slug, year, creators, genres, runtime-or-episode-count. The entire catalogue is reachable from every detail page, as *the same object type* you've been flipping.

**Asset conventions** (from CDN paths): one folder per title —
`a24/films/{slug}/disc.webp`, `trailer.webp`, `vector.webp`; `a24/tv/{slug}/…`; everything `.webp`, everything cache-busted `?v=7`, served from BunnyCDN with on-the-fly width params.

### 3.3 The 404 — "Empty Shelf"

- Headline: **"404 | Empty | Shelf"** — the metaphor carries into the error state.
- Below it: the full disc library, identical to the production-page browser. The message is "the shelf you wanted is empty — here's the whole library." No dead end, no apology wall.

---

## 4. The interaction model — keyboard-first, one object in focus

| Input | Action |
|---|---|
| `←` / `→` | Browse discs on the shelf |
| `Enter` | Open the disc in front (detail page) |
| `Space` | Flip the disc over (B-side: credits + reviews) |
| pointer/touch | Drag/swipe the shelf *(inferred, standard for the pattern)* |
| click a library row | Jump to that production |

Principles worth stealing wholesale:

1. **One object in focus at a time.** The front disc gets 100% of the type; neighbours are context, not competition.
2. **The keyboard is a first-class citizen, and the site says so** — the hint line is always on screen.
3. **You always know where you are** — "1 of 12".
4. **Physical verbs only**: flip, browse, open. Not "filter", "sort", "view options".
5. **Every screen ends in the library.** Detail pages and 404 both funnel back into the shelf.
6. **Sound is opt-in and gesture-gated** ("TAP FOR SOUND") — which is exactly our `Sound` module's philosophy (procedural, off by default).

---

## 5. Motion & craft details (the awarded elements)

Awwwards singled out four elements: **Preloader → Hero**, **Films → Television**, **Films → Detail page**, and **404** — i.e. the transitions *are* the features. What they do:

- **Preloader → Hero:** the loading state hands off directly into the hero composition (no cut — the counter/mask resolves into the first disc). *(detail from the awarded clip; we have our own preloader counter already)*
- **Films → Television:** "one continuous motion" — the shelf doesn't reload; the same motion carries you into the other wing. Disc-continuity: the object stays, the context changes.
- **Films → Detail:** the disc you were looking at *becomes* the hero of the detail page (object permanence through navigation). We already have a primitive of this: `captureFlip`/`playFlip` (card → PDP ghost flight).
- **Odometer digits:** mechanical rolling counters — motion used to make *data* feel physical.
- **Custom video chrome:** even the trailer player is in-world (monospace-ish micro-labels, no browser controls).

---

## 6. The design language

- **Exactly two colours** (Awwwards palette): `#000` and `#F2F2F2`. All depth comes from the WebGL disc, the imagery on the discs, and motion — not from surface decoration.
- **Archival editorial type system.** Every piece of text is one of three voices:
  1. *Whisper* — stacked uppercase micro-labels with wide tracking (`DIRECTED BY`, `YEAR`, `STARRING`) — the "tidy, archival feel" landing.love called out;
  2. *Shout* — large display titles (film names, "Lady Bird" next-link);
  3. *Numerals* — tabular, mono-spaced ratings (`5`, `4.5`), runtimes (`2:07:00`), counters ("1 of 12").
- **The disc is the only recurring object.** One square artwork format per title, reused at every scale (shelf focus, library rows, 404). No secondary imagery fighting it.
- **Content is the ornament.** Critic quotes, awards rows, credits — the "decoration" of every page is real, specific text about the object.
- **No card grid anywhere.** The shelf replaces the grid; the library browser replaces the sitemap.

---

## 7. What this means for PastForward — the mapping

| A24 | PastForward equivalent | Status |
|---|---|---|
| Film/series as a **Blu-ray disc** | Album as a **vinyl record** (our `.record`, drag-to-spin, scratch audio) | ✅ already built — ours is *more* physical |
| Flip through the shelf | Flip through **the crate** of featured vinyls | ❌ to build — the flagship gap |
| `Space` = flip disc to B-side (credits + reviews) | B-side = the "back of the sleeve": price, format specs, quick add | ❌ to build |
| `Enter` = open the case | Open the PDP | ✅ exists (`playFlip` ghost flight) |
| Critic quote + rating per title | A per-record editorial line ("why it's on the wall") + ₹ price as the numeral | ⚠️ partial (no quote data yet) |
| "Hazbin Hotel, 1 of 12" counter | "{album}, 1 of 12" + odometer digits | ❌ to build |
| Odometer year strip | Odometer stats: **66 artworks · 53 artists · 128 variants · estd 2025** | ❌ to build (we have `data-count`, not rolling digits) |
| Awards rows on the detail page | Spec/credits rows on PDP (`spec-retro` already looks the part) | ✅ close — restyle to full credits stack |
| Next production link ("Lady Bird") | "Next in the crate → {next album}" big serif link on PDP | ❌ to build |
| Full library browser under every detail page | "The Catalogue" shelf — every vinyl as a disc under the PDP | ⚠️ we show 4 "goes well with" cards |
| 404 "Empty Shelf" + full library | 404 "Not in the crate" — upgrade to the empty-shelf + whole-crate pattern | ⚠️ headline exists, library doesn't |
| Keyboard-first + on-screen hint | ←/→/Enter/Space in the crates section + hint line | ❌ to build |
| Films → Television continuous transition | Vinyl → Posters/Prints/Polaroids wing-switch inside the crates | ❌ to build (phase 2) |
| Trailer player | No video assets — our equivalent is already stronger: **drag-to-spin + procedural scratch audio** | ✅ keep ours |

## 8. What we should NOT copy

- **The two-colour palette.** Our ink/cream/oxblood system is a brand asset; A24's monochrome works because they're archiving someone else's colourful objects. Ours carries a warmer, "record shop" identity.
- **Barba.js.** It exists to fake SPA-feel across multi-page HTML. We *are* a single-file hash-routed app — adding Barba would be buying a second router to solve a problem we don't have.
- **Their typography.** Bodoni Moda / Anton / Pinyon / IBM Plex Mono is our identity; the takeaway is the *system* (whisper / shout / tabular numerals), which we already follow.
- **The video player.** No video content to justify it; our spin interaction is the in-world equivalent.

## 9. Proposed work, prioritized

**P1 — "The Crates": a flip-through record library** — ✅ **BUILT** *(see the `THE CRATES` section on the homepage; replaced the old "Make it yours" picker in beat 4)*
A fanned 3D shelf of every featured vinyl (8 records, rank order, opening on Dark Side). `←/→`, the arrow buttons, clicking a neighbour, or touch-swipe browse the shelf; `Space` (or tapping the record, or the "Turn over" control) flips the front disc in 3D to its **B-side** — a full back-of-record with a cream centre label carrying SIDE B / artist / album / price, plus a run-out etch; `Enter` opens the PDP and feeds the existing card→PDP flip animation. A rolling **odometer** counts "01 OF 08"; the info column pairs the A-side editorial line (the collection's own words — our honest stand-in for A24's critic quotes) with the B-side spec stack; `Add to crate` quick-adds with the fly-to-cart ghost. The front record keeps PastForward's drag-to-spin with scratch audio, and each record remembers its rotation. Keyboard arms when the section owns half the viewport or the pointer enters it — A24's model, scoped so it never fights scrolling. Files: `src/routes.js` (markup + controller), `src/style.css` (shelf/flip/odometer styles), `src/core.js` (one-line keydown hook); old picker markup, CSS and mount logic removed.

**P2 — PDP as "the open case"**
Restyle the spec block into the full archival credits stack (PRESSED FROM / DIAMETER / LABEL / EDITION rows), add the big "Next in the crate →" serif link, and replace the 4-card "Goes well with" with **The Catalogue** shelf (every vinyl as a small disc, one row, click = jump). Every PDP ends inside the library, A24-style.

**P3 — Odometer stats strip**
A reusable rolling-digit component (`data-odometer`): columns of 0–9 that translate to the target digit when scrolled into view. First use: a home beat "66 ARTWORKS · 53 ARTISTS · 128 VARIANTS · ESTD 2025"; also the "1 of 12" counter in P1.

**P4 — 404 "Empty Crate"**
Keep "This one's not in the crate." Add the A24 move: the whole crate as a shelf of mini-discs below it. Error page becomes the best discovery page on the site.

**P5 — Wing-switch transition (phase 2)**
Inside the crates, switching VINYL → POSTERS → PRINTS → POLAROIDS re-flows the shelf in one continuous motion (A24's Films→Television), instead of navigating to the shop grid.

---

## 10. Sources

- Live site: `a24.raviklaassens.com`, `/television`, `/production/hereditary`, `/sitemap.xml`, `/robots.txt`, a 404 URL
- Case study: `raviklaassens.com/work/a24` (idea, experience, services: WebGL / web design / web development / creative development)
- Awwwards SOTD page: palette `#000`/`#F2F2F2`, tech tags GSAP/Three.js/Barba.js, awarded elements (preloader→hero, films→TV, films→detail, 404), score breakdown
- landing.love review: "clean, editorial film index… stacked uppercase labels… tidy, archival feel… trailer player… Barba page transitions and GSAP scroll motion"
