/* ============================================================
   PastForward — route views
   ============================================================ */
const photo = (k) => (window.__PHOTOS__ || {})[k] || '';
const hasPhotos = () => Object.keys(window.__PHOTOS__ || {}).length > 0;
const figure = (k, cap, cls = '') => photo(k) ? `<figure class="shot ${cls}">
  <img src="${photo(k)}" alt="${esc(cap)}" loading="lazy" decoding="async">
  <figcaption class="mono-xs dim">${esc(cap)}</figcaption></figure>` : '';

const FORMAT_PHOTO = { 'vinyl':'record-in-hand', 'poster-a3':'wall-white', 'poster-a5':'wall-white',
                       'print-10':'wall-full', 'polaroid':'stall-red' };

/* ---------- v2 composition helpers ---------- */

/* the brand collage, at a strength you can actually see */
const col = (kind = 'g', cls = '') => photo('col-' + kind)
  ? `<div class="col col--${kind === 'r' ? 'r' : 'g'} ${cls}" style="background-image:url(${photo('col-' + kind)})"></div>` : '';
/* the postcard's hard 50/50 split — grey left, red right */
const split = () => (photo('col-g') && photo('col-r'))
  ? `<div class="split"><i style="background-image:url(${photo('col-g')})"></i><i style="background-image:url(${photo('col-r')})"></i></div>` : '';

/* PHOTOGRAPH — no border, no card, no shadow.
   caption in tiny mono, OUTSIDE the frame, above-left. */
const plate = (key, cap, cls = '', style = '') => photo(key)
  ? `<figure class="plate reveal ${cls}" style="${style}">
      ${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}
      <img src="${photo(key)}" alt="${esc(cap || '')}" loading="lazy" decoding="async"></figure>` : '';

/* THE ARTWORK WALL — the catalogue hung on shelves, not photographs of it.
   Each entry is [product, kind, width%, rotation, vertical nudge]. Pieces hang
   from a shared baseline and keep their true proportions: nothing is cropped. */
const hangShelf = (items, cls = '') => `<div class="shelf ${cls}">
  ${items.map(([p, kind, w, rot, dy], i) => {
    if (!p) return '';
    const v = kind === 'pola' ? variant(p, 'polaroid')
            : kind === 'rec' ? variant(p, 'vinyl')
            : (variant(p, 'poster-a3') || variant(p, 'poster-a5') || variant(p, 'print-10'));
    if (!v) return '';
    const inner = kind === 'rec'
      ? recordHTML(p, { size: 300, style: 'width:100%' })
      : kind === 'pola' ? polaroidHTML(v) : frameHTML(v);
    return `<a class="hw hw--${kind} ${i > 2 ? 'hw--hide' : ''}" href="#/product/${p.slug}"
       data-cursor="VIEW" style="width:${w}%;--rot:${rot || 0}deg;--dy:${dy || 0}px;--d:${i * 60}ms">
      ${inner}<span class="hw__t">${esc(p.artist)}</span></a>`;
  }).join('')}
</div>`;

const hangWall = (shelves) => `<div class="hang-wall" id="hangwall">
  ${shelves.map((row, i) => hangShelf(row, i ? '' : 'shelf--top')).join('')}</div>`;

/* a block of type that lives inside a photo field, so the air carries something */
const isle = (cap, html, cls = '') => `<div class="isle reveal ${cls}">
  <span class="cap">${esc(cap)}</span>${html}</div>`;

/* the ad-card lockup: script over didone caps over grotesque */
const lockup = (script, caps, tag, cls = '') => `<div class="lockup ${cls}">
  <span class="lockup__script">${esc(script)}</span>
  <span class="lockup__caps">${esc(caps)}</span>
  ${tag ? `<span class="lockup__tag">${esc(tag)}</span>` : ''}</div>`;

/* a line of type cropped by the viewport on both sides */
const marq = (text, variant, speed) => `<div class="marq ${variant}" data-marq="${speed}">
  <div class="marq__t">${Array(6).fill(`<span>${esc(text)}</span>`).join('')}</div></div>`;

const bleed = (key, cap, sub, cls = '') => photo(key) ? `<div class="bleed ${cls}">
  <img src="${photo(key)}" alt="${esc(cap)}" loading="lazy" decoding="async">
  <div class="bleed__cap">${sub ? `<div class="d-s">${esc(sub)}</div>` : ''}
  <div class="mono-xs dim" style="margin-top:8px">${esc(cap)}</div></div></div>` : '';
const step = (n, key, title, body) => photo(key) ? `<div class="step reveal">
  <div class="step__media"><img src="${photo(key)}" alt="${esc(title)}" loading="lazy" decoding="async"></div>
  <div class="step__info"><div class="step__n">${n}</div><h3>${esc(title)}</h3>
  <p class="body-s dim step__desc">${esc(body)}</p></div></div>` : '';

const eyebrow = t => `<div class="mono dim" data-txt="${esc(t)}"></div>`;
const secHead = (eb, head, sub) => `${eyebrow(eb)}<h2 class="d-l reveal" style="margin:14px 0 0">${head}</h2>${sub ? `<p class="body-l dim reveal measure" style="margin-top:16px">${sub}</p>` : ''}`;

/* a transition band between two chapter grounds */
const seam = (kind) => `<div class="seam seam--${kind}">${photo('col-g')
  ? `<div class="seam__col" style="background-image:url(${photo('col-g')})"></div>` : ''}</div>`;

/* the tagline, set the way the brand sets it on the flex */
const TAGLINE = `<span class="tagline">designed from <em>memory,</em> made for <em>now</em></span>`;

/* ============================== HOME ============================== */
function viewHome() {
  const feat = withVinyl.filter(p => p.featured).sort((a, b) => a.rank - b.rank);
  const pickers = feat.slice(0, 8);
  const posters = [], polas = [];   /* filled for the catalogue wall */
  const pickStart = pickers.find(p => p.slug === 'pink-floyd-the-dark-side-of-the-moon-1973') || pickers[2];
  const closeRec  = pickers.find(p => p.slug === 'karan-aujla-at-peace') || pickers[3];

  const seenArt = new Set();
  P.filter(p => variant(p, 'poster-a3') && !seenArt.has(p.artist))
   .slice(0, 3).forEach(p => { posters.push(p); seenArt.add(p.artist); });
  P.filter(p => variant(p, 'polaroid') && p.artist !== 'The Weeknd' && !seenArt.has(p.artist))
   .slice(0, 5).forEach(p => { polas.push(p); seenArt.add(p.artist); });

  return `
  ${crateHTML()}

  ${seam('in-ink')}

  <!-- 5 ============ COMPANIONS ============ -->
  <section class="sec ground g-paper" data-section="THE REST OF THE WALL" style="padding-bottom:clamp(56px,7vw,96px)">
    <div class="wrap">
      <div class="cap">THE REST OF THE WALL</div>
      ${lockup('Everything', 'Posters & Polaroids', 'Wall Decor', 'lockup--left')}
      <p class="body-l dim reveal measure" style="margin-top:22px">One record starts it. The wall around it is where it gets personal.</p>
      <div class="mono-xs dim" style="margin-top:14px;display:flex;gap:20px"><span>POSTERS FROM ₹199</span><span>POLAROID PACKS ₹149</span></div>
    </div>
    <div class="wallbuild" id="wallbuild">
      <div class="wallbuild__inner">
        ${posters.map((p, i) => {
          const v = variant(p, 'poster-a3');
          const pos = ['left:1%;top:8%;width:27%;--rot:-1.4deg;--par:.10',
                       'left:31%;top:0%;width:31%;--rot:.8deg;--par:.20',
                       'right:2%;top:14%;width:23%;--rot:-.6deg;--par:.05'][i];
          return `<a class="wb wb--poster" href="#/product/${p.slug}" style="${pos}" data-cursor="VIEW" data-par>
            ${frameHTML(v, { style: 'width:100%;aspect-ratio:.707' })}
            <span class="wb__tag mono-xs">${esc(p.artist)} · A3</span></a>`;
        }).join('')}
        ${polas.map((p, i) => {
          const v = variant(p, 'polaroid');
          const pos = ['left:22%;top:47%;width:14%;--rot:-7deg;--par:.30',
                       'left:57%;top:41%;width:13%;--rot:5deg;--par:.26',
                       'left:7%;top:55%;width:12.5%;--rot:3deg;--par:.36',
                       'right:10%;top:52%;width:13.5%;--rot:-4.5deg;--par:.22',
                       'left:40%;top:58%;width:12%;--rot:8deg;--par:.42'][i];
          return `<a class="wb wb--pola" href="#/product/${p.slug}" style="${pos}" data-cursor="VIEW" data-par>
            ${polaroidHTML(v, { style: 'width:100%' })}
            <span class="wb__tag mono-xs">${esc(p.artist)}</span></a>`;
        }).join('')}
      </div>
      <div class="wallbuild__floor"></div>
    </div>
  </section>

  ${seam('to-ink')}

  <!-- 6 ============ THE AD CARD, AS A SECTION ============
       Script over didone caps over grotesque, white, on a darkened
       photograph of the real wall. Straight out of the brand's own ads. -->
  <section class="stage" data-section="WALL DECOR">
    <div class="stage__img"><img src="${photo('wall-full')}" alt="A PastForward wall" loading="lazy"></div>
    <div class="stage__in">
      ${lockup('Classic', 'Vinyl Records', 'Wall Decor')}
      <div style="text-align:center;margin-top:34px">
        <a class="btn btn--primary" href="#/vinyl"><span class="btn__mag">Build your wall</span></a>
      </div>
      <div class="cap" style="text-align:center;margin-top:26px">PHOTOGRAPHED AT THE STAND · NOT A RENDER</div>
    </div>
  </section>

  <!-- 7 ============ THE MANIFESTO ============
       Heavy grotesque with a few words swapped into display italic. -->
  <section class="ground g-crimson" data-section="WHY" style="padding-block:clamp(72px,11vw,150px);overflow:hidden">
    ${col('r', 'col--soft')}
    <div class="wrap" style="text-align:center">
      <p class="manifesto reveal">Giving forgotten things a <b>future.</b> What once played the soundtrack to someone's youth now hangs on a <b>wall.</b></p>
      <div class="cap" style="margin-top:40px">EST. 2025 · MASTERS' UNION</div>
    </div>
  </section>

  <!-- 12 ============ THE DROP ============ -->
  <section class="sec ground" data-section="THE DROP" style="text-align:center;position:relative;overflow:hidden">
    ${split()}
    <div class="wrap" style="display:flex;flex-direction:column;align-items:center;gap:26px;position:relative;z-index:2">
      ${recordHTML(closeRec, { size: 300, big: true, id: 'droprec' })}
      <h2 class="d-l reveal" style="margin-top:10px">Be first to the next drop.</h2>
      <p class="body-l dim reveal">New records, limited runs, no spam.</p>
      <form data-form="newsletter" class="reveal" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;max-width:460px;width:100%">
        <input name="email" type="email" required placeholder="your@email.com" aria-label="Email"
          style="flex:1;min-width:200px;background:var(--elevated);border:1px solid var(--border);padding:14px;border-radius:2px">
        <button class="btn btn--primary"><span class="btn__mag">Notify me</span></button>
      </form><div data-form-msg></div>
      <div style="margin-top:14px">${TAGLINE}</div>
    </div>
  </section>`;
}

/* ============================== THE CRATE ==============================
   A diagonal row of records you flip through by scrolling (see vinylcrate.js).
   Real catalogue data only: artist, album, price, formats, collection. */
const CRATE_SCROLL = 3;   // records the page scroll moves through before carrying on down
const FMT_SHORT = { 'poster-a3': 'POSTER', 'poster-a5': 'POSTER', 'print-10': 'PRINT', 'polaroid': 'POLAROID' };
function crateList() {
  const ok = p => p.album !== '[CONFIRM]' && variant(p, 'vinyl');
  const feat = withVinyl.filter(p => p.featured && ok(p)).sort((a, b) => a.rank - b.rank);
  const rest = withVinyl.filter(p => !p.featured && ok(p)).sort((a, b) => b.variants.length - a.variants.length);
  return feat.concat(rest).slice(0, 10);
}
function crateFacts(p) {
  const col = COLS.find(c => p.tags.includes(c.slug));
  const also = [...new Set(p.variants.filter(v => v.format !== 'vinyl').map(v => FMT_SHORT[v.format]).filter(Boolean))];
  return {
    album: albumText(p), artist: p.artist,
    collection: col ? col.name : 'PastForward',
    price: money(variant(p, 'vinyl').price),
    otherLabel: also.length ? 'ALSO AS' : 'ARRIVES',
    other: also.length ? also.join(' · ') : 'Ready to hang'
  };
}
function crateHTML() {
  const list = crateList(), f0 = crateFacts(list[0]), n = list.length;
  return `
  <!-- 4 ============ MAKE IT YOURS: THE CRATE ============
       Records on a diagonal, like flipping through a crate at the stall.
       Arrows (or a swipe) bring the next one to the front; click it to open it. -->
  <section class="crate ground" id="crate" data-section="MAKE IT YOURS" style="--steps:${CRATE_SCROLL}">
    <!-- a live wallpaper behind the records (wallpaper.js); the collage shows if WebGL can't -->
    <div class="crate__stage" tabindex="-1">
      <div class="crate__bg" aria-hidden="true">
        <i style="background-image:url(${photo('col-g')})"></i>
        <i style="background-image:url(${photo('col-r')})"></i>
        <div class="crate__wall" id="cratewall"></div>
      </div>
      <div class="crate__gl" aria-hidden="true"></div>
      <svg class="crate__scribble" aria-hidden="true"><path pathLength="1"/></svg>
      <!-- the opening sequence (plays once, on first load of the home page) -->
      <div class="crate__intro" aria-hidden="true">
        <div class="ci-pill"><img class="ci-mark" src="${window.__WORDMARK__}" alt=""><span class="ci-state">Pressing</span><span class="ci-spin"></span></div>
        <div class="ci-side ci-side--l">PastForward Records</div>
        <div class="ci-side ci-side--r"><span class="ci-roll">${esc(list[list.length - 1].artist)}</span></div>
        <div class="ci-count">${[0, 1, 2].map(k => `<span class="ci-slot" data-slot="${k}"><span class="ci-col">${k === 0 ? '<i>&nbsp;</i>' : ''}${Array.from({ length: 10 }, (_, d) => `<i>${d}</i>`).join('')}</span></span>`).join('')}</div>
      </div>
      <div class="crate__meta">
        <div class="cap crate__eyebrow">MAKE IT YOURS</div>
        <h1 class="crate__head">Pick the one that's yours.</h1>
        <dl class="crate__rows" aria-live="polite">
          <div><dt>ALBUM</dt><dd><span data-cm="album">${esc(f0.album)}</span></dd></div>
          <div><dt>ARTIST</dt><dd><span data-cm="artist">${esc(f0.artist)}</span></dd></div>
          <div><dt>COLLECTION</dt><dd><span data-cm="collection">${esc(f0.collection)}</span></dd></div>
        </dl>
        <div class="crate__hint mono-xs" aria-hidden="true"><span class="crate__hint-d">SCROLL OR USE THE ARROWS TO FLIP THROUGH<br>CLICK THE RECORD TO OPEN IT</span><span class="crate__hint-m">SWIPE OR USE THE ARROWS · TAP TO OPEN</span></div>
      </div>
      <div class="crate__facts">
        <div><div class="crate__fl">THE RECORD</div><div class="crate__fv"><span data-cm="price">${f0.price}</span></div></div>
        <div><div class="crate__fl"><span data-cm="otherLabel">${f0.otherLabel}</span></div><div class="crate__fv"><span data-cm="other">${esc(f0.other)}</span></div></div>
      </div>
      <div class="crate__nav">
        <button class="crate__arrow" type="button" data-crate-prev aria-label="Previous record" disabled>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
        <span class="crate__count mono-xs" aria-hidden="true"><span data-cm="n">01</span> / ${String(n).padStart(2, '0')}</span>
        <button class="crate__arrow" type="button" data-crate-next aria-label="Next record">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
      </div>
      <a class="crate__open sr-focus" href="#/product/${list[0].slug}" data-crate-open>Open ${esc(f0.album)} by ${esc(f0.artist)}</a>
    </div>
  </section>`;
}
/* The opening sequence, after the reference's loader: a counter rolls 0→100 and drifts
   up the screen, the first record turns from edge-on to face you, then everything
   lands at once — the record grows into place, its neighbours slide in, the details,
   controls, header and wallpaper arrive. Plays once per visit, only from the top of the
   home page, never under reduced motion. Any scroll, key or tap skips ahead. */
function playCrateIntro(root, api, list, onUnmount) {
  const html = document.documentElement;
  const skip = RM() || window.__crateIntroDone || scrollY > 20 || location.search.includes('nopre') || !api.setIntro;
  if (skip) { window.__crateIntroDone = true; return; }
  const ov = root.querySelector('.crate__intro');
  const slots = [...root.querySelectorAll('.ci-slot')];
  const count = root.querySelector('.ci-count'), roll = root.querySelector('.ci-roll');
  root.classList.add('is-intro'); html.classList.add('crate-intro');
  ov.classList.add('is-on');
  api.setIntro(0, 0);
  const lock = e => { e.preventDefault(); hurry(); };
  const keys = e => { if ([' ', 'ArrowDown', 'PageDown', 'Enter', 'Escape'].includes(e.key)) { e.preventDefault(); hurry(); } };
  addEventListener('wheel', lock, { passive: false });
  addEventListener('touchmove', lock, { passive: false });
  addEventListener('keydown', keys);
  ov.addEventListener('pointerdown', hurry);
  const COUNT = 2900, FLIP0 = 650, FLIP1 = 2700, LAND = 3150, BUILD = 1000, DONE = LAND + BUILD + 250;
  let t0 = performance.now(), offset = 0, alive = true, landed = false, lastRoll = 0, ri = 0, shown = -1;
  function hurry() { const t = performance.now() - t0 + offset; if (t < LAND - 150) offset += LAND - 150 - t; }
  const cl = k => Math.max(0, Math.min(1, k)), io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  function setCount(n) {
    if (n === shown) return; shown = n;
    const str = String(n).padStart(3, ' ');
    slots.forEach((el, k) => {
      const ch = str[k];
      // the first slot has a blank row on top so "  7" doesn't show leading zeros
      const idx = k === 0 ? (ch === ' ' ? 0 : +ch + 1) : (ch === ' ' ? 0 : +ch);
      el.style.setProperty('--n', idx);
      el.classList.toggle('is-blank', ch === ' ' && k !== 0);
    });
  }
  function finish(interrupted) {
    if (!alive) return; alive = false;
    // counted as played only once it's run its course: the first load renders home twice
    // (the address gains its #/), and the first, torn-down render mustn't use it up
    if (!interrupted) window.__crateIntroDone = true;
    removeEventListener('wheel', lock); removeEventListener('touchmove', lock); removeEventListener('keydown', keys);
    root.classList.remove('is-intro'); html.classList.remove('crate-intro');
    api.setIntro(1, 1);
    setTimeout(() => ov.remove(), 600);
  }
  onUnmount(() => { if (alive) finish(true); });
  (function tick(now) {
    if (!alive) return;
    const t = now - t0 + offset;
    // counter: eased count, drifting from low on the screen up toward the top
    const kc = io(cl(t / COUNT));
    setCount(Math.round(kc * 100));
    count.style.setProperty('--x', (34 + 20 * kc).toFixed(2) + '%');
    count.style.setProperty('--y', (76 - 62 * kc).toFixed(2) + '%');
    // right label: the crate's artists flick past, landing on the first one
    if (t < COUNT && now - lastRoll > 150) { lastRoll = now; roll.textContent = list[(ri++) % list.length].artist; roll.classList.remove('is-tick'); void roll.offsetWidth; roll.classList.add('is-tick'); }
    if (t >= COUNT && roll.textContent !== list[0].artist) roll.textContent = list[0].artist;
    // the record turns to face you while the count runs
    const flip = cl((t - FLIP0) / (FLIP1 - FLIP0));
    const build = cl((t - LAND) / BUILD);
    api.setIntro(flip, build);
    if (t >= LAND && !landed) {
      landed = true;
      ov.classList.add('is-out');            // counter, labels and pill leave
      root.classList.add('is-landing');      // details, controls, header, wallpaper arrive
      root.classList.remove('is-intro'); html.classList.remove('crate-intro');
      ['.hdr', '.needle', '#corners'].forEach((sel, k) => { const el = document.querySelector(sel);
        if (el) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 200 + k * 120, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }); });
    }
    if (t >= DONE) { root.classList.remove('is-landing'); finish(); return; }
    requestAnimationFrame(tick);
  })(t0);
}

function mountCrateSection(onUnmount) {
  const root = document.getElementById('crate'); if (!root) return null;
  const list = crateList(), facts = list.map(crateFacts);
  const cm = k => root.querySelector(`[data-cm="${k}"]`);
  const prevB = root.querySelector('[data-crate-prev]'), nextB = root.querySelector('[data-crate-next]');
  const openA = root.querySelector('[data-crate-open]');
  let shown = 0;
  const swap = (i) => {
    prevB.disabled = i <= 0; nextB.disabled = i >= list.length - 1;
    cm('n').textContent = String(i + 1).padStart(2, '0');
    openA.href = '#/product/' + list[i].slug;
    openA.textContent = `Open ${facts[i].album} by ${facts[i].artist}`;
    if (i === shown) return; const dir = i > shown ? 1 : -1; shown = i;
    const f = facts[i];
    ['album', 'artist', 'collection', 'price', 'otherLabel', 'other'].forEach((k, j) => {
      const el = cm(k); if (!el || el.textContent === f[k]) return;
      el.textContent = f[k];
      if (!RM()) el.animate([{ transform: `translateY(${dir * 105}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 420, delay: j * 28, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    });
  };
  let api = null;
  if (window.mountCrate) {
    try {
      api = window.mountCrate(root, list.map(p => ({ slug: p.slug, image: imgSrc(variant(p, 'vinyl').image) })), {
        reducedMotion: RM(),
        onActive: (_, i) => swap(i),
        onOpen: (item) => { try { Sound.needleDrop(); } catch (e) {} go('#/product/' + item.slug); }
      });
    } catch (e) { api = null; }
  }
  // the live wallpaper; ?wall=dots|chrome|blobs previews the other looks
  const wallHost = document.getElementById('cratewall');
  if (wallHost && window.mountWallpaper) {
    try {
      const mode = new URLSearchParams(location.search).get('wall') || new URLSearchParams(location.hash.split('?')[1] || '').get('wall') || 'contours';
      const wall = window.mountWallpaper(wallHost, { mode, focus: innerWidth / innerHeight < 0.8 ? [0.5, 0.48] : [0.56, 0.5], reducedMotion: RM() });
      if (wall) { root.classList.add('crate--live'); onUnmount(() => wall.cleanup()); }
    } catch (e) {}
  }
  if (!api) { root.classList.add('crate--flat'); return null; }
  onUnmount(() => api.cleanup());
  const tick = () => { try { Sound.tick(); } catch (e) {} };
  prevB.addEventListener('click', () => { tick(); api.prev(); });
  nextB.addEventListener('click', () => { tick(); api.next(); });
  // ←/→ while anything in the crate has focus
  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); api.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); api.prev(); }
  });
  playCrateIntro(root, api, list, onUnmount);
  return api;
}

/* ============================== CATALOGUE ============================== */
const FORMAT_ROUTES = { vinyl: ['vinyl'], posters: ['poster-a3', 'poster-a5', 'print-10'], prints: ['print-10'], polaroids: ['polaroid'] };
function filterProducts(params, routeFormats, requiredTag) {
  const fmts = (params.getAll('format').length ? params.getAll('format') : routeFormats) || [];
  const cols = params.getAll('collection');
  const price = params.get('price');
  let list = P.filter(p => {
    if (requiredTag && !p.tags.includes(requiredTag)) return false;
    if (fmts.length && !p.variants.some(v => fmts.includes(v.format))) return false;
    if (cols.length && !cols.some(c => p.tags.includes(c))) return false;
    if (price) {
      const matchVariants = fmts.length ? p.variants.filter(v => fmts.includes(v.format)) : p.variants;
      const f = matchVariants.length ? Math.min(...matchVariants.map(v => v.price)) : p.from;
      if (price === 'u200' && f >= 200) return false;
      if (price === '200-500' && (f < 200 || f > 500)) return false;
      if (price === '500-1000' && (f < 500 || f > 1000)) return false;
      if (price === '1000+' && f < 1000) return false;
    }
    return true;
  });
  const sort = params.get('sort') || 'featured';
  if (sort === 'price-asc') list.sort((a, b) => {
    const pa = fmts.length ? Math.min(...a.variants.filter(v => fmts.includes(v.format)).map(v => v.price), a.from) : a.from;
    const pb = fmts.length ? Math.min(...b.variants.filter(v => fmts.includes(v.format)).map(v => v.price), b.from) : b.from;
    return pa - pb;
  });
  else if (sort === 'price-desc') list.sort((a, b) => {
    const pa = fmts.length ? Math.max(...a.variants.filter(v => fmts.includes(v.format)).map(v => v.price), a.from) : a.from;
    const pb = fmts.length ? Math.max(...b.variants.filter(v => fmts.includes(v.format)).map(v => v.price), b.from) : b.from;
    return pb - pa;
  });
  else if (sort === 'artist') list.sort((a, b) => a.artist.localeCompare(b.artist));
  else list.sort((a, b) => (b.featured - a.featured) || a.artist.localeCompare(b.artist));
  return list;
}
function viewCatalog(category, subType, params) {
  let routeFormats = [];
  let h1 = '', sub = '';
  let targetFormat = null;
  let requiredTag = null;

  if (category === 'vinyl') {
    routeFormats = ['vinyl'];
    targetFormat = 'vinyl';
    h1 = 'Vinyls.';
    sub = 'Upcycled 12-inch records with the album set into the label. Made to hang, not to play.';
  } else if (category === 'polaroids') {
    routeFormats = ['polaroid'];
    targetFormat = 'polaroid';
    h1 = 'Polaroids.';
    sub = 'Small, cheap, and the reason a wall stops looking planned.';
  } else if (category === 'posters') {
    h1 = 'Posters.';
    sub = 'A3 and A5 posters, and 10×10 square prints of the albums that mattered.';

    let selSizes = params.getAll('size').filter(s => s !== 'all');
    if (!selSizes.length && subType) {
      if (subType === 'a3' || subType === 'poster-a3') selSizes = ['poster-a3'];
      else if (subType === 'a5' || subType === 'poster-a5') selSizes = ['poster-a5'];
      else if (subType === '10x10' || subType === 'print-10' || subType === 'prints') selSizes = ['print-10'];
    }

    if (selSizes.length) {
      routeFormats = selSizes;
      targetFormat = selSizes.length === 1 ? selSizes[0] : 'posters';
    } else {
      routeFormats = ['poster-a3', 'poster-a5', 'print-10'];
      targetFormat = 'posters';
    }
  } else if (category === 'collections') {
    const colSlug = subType || 'the-classics';
    const c = COLS.find(x => x.slug === colSlug) || COLS[0];
    requiredTag = c.slug;
    h1 = `${c.name}.`;
    sub = c.desc;
    const reqFmts = params.getAll('format');
    if (reqFmts.length === 1) {
      targetFormat = reqFmts[0];
      routeFormats = reqFmts;
    } else if (reqFmts.length > 1) {
      targetFormat = null;
      routeFormats = reqFmts;
    } else {
      targetFormat = null;
      routeFormats = [];
    }
  } else {
    routeFormats = ['vinyl'];
    targetFormat = 'vinyl';
    h1 = 'Vinyls.';
    sub = 'Upcycled 12-inch records with the album set into the label. Made to hang, not to play.';
  }

  const list = filterProducts(params, routeFormats, requiredTag);
  const cnt = f => P.filter(p => p.variants.some(v => v.format === f)).length;
  const posterTotal = P.filter(p => p.variants.some(v => ['poster-a3', 'poster-a5', 'print-10'].includes(v.format))).length;
  const on = (k, v) => params.getAll(k).includes(v) ? 'checked' : '';
  const shown = +(params.get('n') || 24);

  let railContentHTML = '';
  if (category === 'collections') {
    const colSlug = requiredTag;
    const countInCol = f => P.filter(p => p.tags.includes(colSlug) && p.variants.some(v => v.format === f)).length;
    railContentHTML = `
      <div class="rail__grp"><h4>Collection</h4>
        ${COLS.map(c => `
          <label class="chk">
            <input type="radio" name="col_nav" data-f="col_nav" value="${c.slug}" ${c.slug === colSlug ? 'checked' : ''}>
            <span>${esc(c.name)}</span>
            <span class="n num">${P.filter(p => p.tags.includes(c.slug)).length}</span>
          </label>
        `).join('')}
      </div>
      <div class="rail__grp"><h4>Format</h4>
        ${[
          ['vinyl', 'Vinyls', countInCol('vinyl')],
          ['poster-a3', 'A3 Poster', countInCol('poster-a3')],
          ['poster-a5', 'A5 Poster', countInCol('poster-a5')],
          ['print-10', '10×10 Format', countInCol('print-10')],
          ['polaroid', 'Polaroids', countInCol('polaroid')]
        ].map(([v, l, count]) => `
          <label class="chk">
            <input type="checkbox" data-f="format" value="${v}" ${on('format', v)}>
            <span>${l}</span>
            <span class="n num">${count}</span>
          </label>
        `).join('')}
      </div>
    `;
  } else {
    let sizeFilterHTML = '';
    if (category === 'posters') {
      const hasExplicitSize = params.has('size') ? params.getAll('size').filter(s => s !== 'all').length > 0 : Boolean(subType);
      const isAllChecked = !hasExplicitSize;
      const isA3Checked = hasExplicitSize && routeFormats.includes('poster-a3');
      const isA5Checked = hasExplicitSize && routeFormats.includes('poster-a5');
      const is10x10Checked = hasExplicitSize && routeFormats.includes('print-10');

      sizeFilterHTML = `
        <div class="rail__grp"><h4>Size</h4>
          <label class="chk">
            <input type="checkbox" data-f="size" value="all" ${isAllChecked ? 'checked' : ''}>
            <span>All Poster</span>
            <span class="n num">${posterTotal}</span>
          </label>
          <label class="chk">
            <input type="checkbox" data-f="size" value="poster-a3" ${isA3Checked ? 'checked' : ''}>
            <span>A3 Poster</span>
            <span class="n num">${cnt('poster-a3')}</span>
          </label>
          <label class="chk">
            <input type="checkbox" data-f="size" value="poster-a5" ${isA5Checked ? 'checked' : ''}>
            <span>A5 Poster</span>
            <span class="n num">${cnt('poster-a5')}</span>
          </label>
          <label class="chk">
            <input type="checkbox" data-f="size" value="print-10" ${is10x10Checked ? 'checked' : ''}>
            <span>10×10 Format</span>
            <span class="n num">${cnt('print-10')}</span>
          </label>
        </div>`;
    }

    railContentHTML = `
      ${sizeFilterHTML}
      <div class="rail__grp"><h4>Collection</h4>
        ${COLS.map(c => `<label class="chk"><input type="checkbox" data-f="collection" value="${c.slug}" ${on('collection', c.slug)}><span>${esc(c.name)}</span><span class="n num">${P.filter(p => p.tags.includes(c.slug) && p.variants.some(v => routeFormats.includes(v.format))).length}</span></label>`).join('')}
      </div>
    `;
  }

  return `<div class="wrap sec" style="padding-top:calc(var(--nav-h) + 40px)">
    <div class="masthead" style="border:0;padding-bottom:32px">
      <h1 class="d-l">${h1}</h1>
      <p class="body-l dim measure" style="margin-top:14px">${sub}</p>
    </div>
    <div class="shop">
      <aside class="rail" id="rail" aria-label="Filters">
        ${railContentHTML}
      </aside>
      <div>
        <div class="shop__bar">
          <div style="display:flex;align-items:center;gap:12px">
            <button class="btn btn--secondary filterbtn" id="filtertgl" aria-expanded="false" aria-controls="rail">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
              <span>Filter</span>
            </button>
            <span class="mono dim num">${list.length} piece${list.length === 1 ? '' : 's'}</span>
          </div>
          <select class="sort" id="sort" aria-label="Sort">
            ${[['featured', 'Featured'], ['price-asc', 'Price low→high'], ['price-desc', 'Price high→low'], ['artist', 'Artist A→Z']]
              .map(([v, l]) => `<option value="${v}" ${(params.get('sort') || 'featured') === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        ${activePills(params)}
        ${list.length ? `<div class="grid" id="grid">${list.slice(0, shown).map(p => cardHTML(p, targetFormat)).join('')}</div>
          ${list.length > shown ? `<div style="text-align:center;margin-top:48px"><button class="btn btn--secondary" id="loadmore"><span class="btn__mag">Load more</span></button></div>` : ''}`
        : `<div style="padding:80px 0;text-align:center">
            <p class="d-s">Nothing matches that combination.</p>
            <p class="body-s dim" style="margin:8px 0 20px">Loosen a filter.</p>
            <button class="btn btn--secondary" data-clear><span class="btn__mag">Clear all</span></button></div>`}
      </div>
    </div></div>`;
}
function viewShop(routeKey, params) {
  return viewCatalog(routeKey || 'vinyl', null, params);
}
function activePills(params) {
  const items = [];
  params.getAll('size').forEach(v => {
    const lbl = v === 'poster-a3' ? 'A3 Poster' : v === 'poster-a5' ? 'A5 Poster' : v === 'print-10' ? '10×10 Format' : v;
    if (v !== 'all') items.push(['size', v, lbl]);
  });
  params.getAll('format').forEach(v => {
    const lbl = v === 'vinyl' ? 'Vinyls' : v === 'poster-a3' ? 'A3 Poster' : v === 'poster-a5' ? 'A5 Poster' : v === 'print-10' ? '10×10 Format' : v === 'polaroid' ? 'Polaroids' : (FMT[v] ? FMT[v].label : v);
    items.push(['format', v, lbl]);
  });
  params.getAll('collection').forEach(v => { const c = COLS.find(c => c.slug === v); items.push(['collection', v, c ? c.name : v]); });
  if (params.get('price')) items.push(['price', params.get('price'), params.get('price')]);
  if (!items.length) return '';
  return `<div class="pills">${items.map(([k, v, l]) => `<button class="pill" data-unset="${k}|${v}">${esc(l)} ×</button>`).join('')}
    <button class="pill" data-clear style="border-color:var(--oxblood)">Clear all</button></div>`;
}

/* ============================== PDP ============================== */
function viewProduct(p, params) {
  const sel = params.get('format') && variant(p, params.get('format')) ? params.get('format') : primary(p).format;
  const v = variant(p, sel);
  const col = COLS.find(c => p.tags.includes(c.slug));
  const related = P.filter(x => x.slug !== p.slug && (col ? x.tags.includes(col.slug) : x.artist === p.artist)).slice(0, 4);
  const rel2 = related.length ? related : P.filter(x => x.slug !== p.slug).slice(0, 4);
  return `<div class="pliq" id="pliq" aria-hidden="true"></div>
  <div class="wrap sec pdp-wrap" style="padding-top:calc(var(--nav-h) + 24px)">
    <div class="mono-xs dim" style="margin-bottom:24px">
      <a href="#/vinyl">CATALOGUE</a> / ${col ? `<a href="#/collections/${col.slug}">${esc(col.name.toUpperCase())}</a> / ` : ''}<span>${esc(albumText(p).toUpperCase())}</span>
    </div>
    <div class="pdp">
      <div>
        <div class="pdp__stage" id="stage"><div class="roomlight"></div>
          <div id="stagemedia" style="position:relative">${stageMedia(p, sel)}</div>
        </div>
        <div class="pdp__thumbs">
          ${p.variants.map(x => `<button class="pdp__thumb ${x.format === sel ? 'is-on' : ''}" data-fmt="${x.format}" aria-label="${esc(x.label)}">
            <img src="${imgSrc(x.image)}" alt=""><span>${esc(x.badge)}</span></button>`).join('')}
          ${(p.colourway || []).map(c => `<button class="pdp__thumb" data-cw="${esc(c.image)}" aria-label="${esc(c.name)} colourway"><img src="${imgSrc(c.image)}" alt=""></button>`).join('')}
          ${photo(FORMAT_PHOTO[sel]) ? `<button class="pdp__thumb pdp__thumb--photo" data-shot aria-label="Photograph of the real thing">
            <img src="${photo(FORMAT_PHOTO[sel])}" alt=""><span>PHOTO</span></button>` : ''}
        </div>
      </div>
      <div>
        <div class="card__artist">${esc(p.artist)}</div>
        <h1 class="d-m" style="margin:6px 0 16px">${albumOf(p)}</h1>
        <div class="num" id="pdpprice" style="font-size:1.3rem">${money(v.price)}${v.confirmPrice ? ' ' + CONFIRM('Price for this format not set yet') : ''}</div>

        <div class="fmt" style="margin-top:28px">
          ${Object.entries(FMT).map(([k, f]) => {
            const has = variant(p, k);
            return `<button data-fmt="${k}" class="${k === sel ? 'is-on' : ''}" ${has ? '' : 'disabled'} aria-pressed="${k === sel}">
              <span class="f-name">${esc(f.label)}</span>
              <span class="f-size">${f.size === '[CONFIRM]' ? '[CONFIRM]' : esc(f.size)}</span>
              <span class="f-price num">${has ? money(f.price) : '—'}</span></button>`;
          }).join('')}
        </div>

        <div style="display:flex;gap:12px;margin-top:26px;flex-wrap:wrap">
          <span class="qty"><button data-pq="-1" aria-label="Decrease">−</button><span class="num" id="pdpqty">1</span><button data-pq="1" aria-label="Increase">+</button></span>
          <button class="btn btn--primary" style="flex:1;min-width:180px" id="pdpadd"><span class="btn__mag">Add to cart</span></button>
        </div>

        <div class="spec" style="margin-top:32px">
          <div id="whatyouget">${sel === 'vinyl' ? 'Upcycled 12-inch record, printed centre label' : sel === 'polaroid' ? 'Polaroid-style card, cream border' : '300gsm matte poster stock ' + CONFIRM('Paper stock not confirmed with the printer')}</div>
          <div>Ready to hang</div>
          <div>Ships in ${CONFIRM('Dispatch time not set')} business days across India</div>
        </div>

        <div style="margin-top:28px">
          <div class="acc"><button aria-expanded="false">Shipping &amp; returns <span>+</span></button>
            <div class="panel"><div class="panel__in">Delivery windows and the returns policy are still being set. ${CONFIRM('Shipping and returns terms to be supplied')} — see <a href="#/policies/shipping" style="color:var(--ember)">shipping</a>.</div></div></div>
          <div class="acc"><button aria-expanded="false">How it hangs <span>+</span></button>
            <div class="panel"><div class="panel__in">Mounting method ${CONFIRM('Adhesive strips, hooks, or nothing supplied — must match what actually ships')}. We will not promise a fixing we do not include.</div></div></div>
          <div class="acc"><button aria-expanded="false">Care <span>+</span></button>
            <div class="panel"><div class="panel__in">Wipe with a dry cloth. Keep it out of direct sunlight — same as the original.</div></div></div>
        </div>
      </div>
    </div>

    <section class="sec" data-section="SCALE">
      ${eyebrow('SCALE')}
      <h2 class="d-m reveal" style="margin:12px 0 24px">How big it actually is.</h2>
      <div class="scaleview" id="scaleview">${scaleSVG(sel)}</div>
      <p class="mono-xs dim" style="margin-top:14px">A 12-inch record is 30.5 centimetres across. Wider than most keyboards.</p>
    </section>

    <section class="sec" style="padding-top:0">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:24px">
        <h2 class="d-s">Goes well with</h2>
        ${col ? `<a class="mono-xs" href="#/collections/${col.slug}" style="color:var(--muted)">PART OF ${esc(col.name.toUpperCase())} →</a>` : ''}
      </div>
      <div class="grid">${rel2.map(cardHTML).join('')}</div>
    </section>

    <div class="buybar" id="buybar">
      <span class="num" id="barprice">${money(v.price)}</span>
      <button class="btn btn--primary" style="flex:1" id="baradd"><span class="btn__mag">Add to cart</span></button>
    </div></div>`;
}
function stageMedia(p, fmt) {
  const v = variant(p, fmt);
  if (fmt === 'vinyl') return recordHTML(p, { size: 400, sheen: true, big: true, cls: 'pdp-record' });
  if (fmt === 'polaroid') return polaroidHTML(v, { big: true, style: 'width:min(300px,72vw)' });
  return frameHTML(v, { big: true, style: `width:min(${fmt === 'print-10' ? 380 : 330}px,72vw);aspect-ratio:${v.ratio}` });
}
function scaleSVG(sel) {
  const O = { 'poster-a3': [297, 420, 'A3 POSTER', '297 × 420 MM'], 'poster-a5': [148, 210, 'A5 POSTER', '148 × 210 MM'],
    'print-10': [254, 254, '10×10 PRINT', '254 × 254 MM'], vinyl: [305, 305, '12-INCH RECORD', '12-INCH'],
    polaroid: [100, 162, 'POLAROID', 'SIZE [CONFIRM]'] };
  const baseline = 470, order = [];
  if (sel !== 'vinyl' && sel !== 'poster-a3') order.push(sel);
  order.push('poster-a3', 'vinyl');
  let x = 30; const nodes = [];
  order.forEach(k => {
    const [w, h, name, dim] = O[k]; const y = baseline - h; const on = k === sel;
    if (k === 'vinyl') nodes.push(`<circle class="obj ${on ? 'is-on' : ''}" cx="${x + w / 2}" cy="${y + h / 2}" r="${w / 2}"/>
      <circle cx="${x + w / 2}" cy="${y + h / 2}" r="${w * .15}" fill="none" stroke="${on ? 'var(--oxblood)' : 'var(--border-2)'}"/>`);
    else nodes.push(`<rect class="obj ${on ? 'is-on' : ''}" x="${x}" y="${y}" width="${w}" height="${h}" ${k === 'polaroid' ? 'stroke-dasharray="6 5"' : ''}/>`);
    nodes.push(`<path class="dim-line" d="M${x} ${baseline + 14} L${x} ${baseline + 30} M${x + w} ${baseline + 14} L${x + w} ${baseline + 30}"/>
      <path class="dim-line" d="M${x} ${baseline + 22} L${x + w} ${baseline + 22}" marker-start="url(#a)" marker-end="url(#a)"/>
      <text class="${on ? 'on' : ''}" x="${x}" y="${baseline + 48}">${name}</text>
      <text class="sub" x="${x}" y="${baseline + 64}">${dim}</text>`);
    x += w + 56;
  });
  const total = x + 20;
  return `<svg viewBox="0 0 ${total} 600" role="img" aria-label="Relative size diagram">
    <defs><marker id="a" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
      <path d="M0 3.5 L7 1 L7 6 Z" fill="var(--muted)"/></marker></defs>
    ${nodes.join('')}
    <path class="dim-line" d="M30 ${baseline + 92} L130 ${baseline + 92} M30 ${baseline + 86} L30 ${baseline + 98} M130 ${baseline + 86} L130 ${baseline + 98}"/>
    <text class="sub" x="138" y="${baseline + 96}">100 MM REFERENCE</text></svg>`;
}

/* ============================== COLLECTION ============================== */
function viewCollection(slug, params) {
  return viewCatalog('collections', slug || 'the-classics', params);
}

/* ============================== CUSTOM ============================== */
function viewCustom() {
  return `<div class="wrap sec" style="padding-top:calc(var(--nav-h) + 56px)">
    <div style="display:grid;gap:56px" id="customgrid">
      <style>#customgrid{grid-template-columns:1fr} @media(min-width:1000px){#customgrid{grid-template-columns:1fr 320px;gap:80px}}</style>
      <div>
        <h1 class="d-l" style="max-width:14ch">Not in the catalogue? Say the word.</h1>
        <p class="body-l dim measure" style="margin-top:18px">The album that actually means something to you might not be one we've made yet. Tell us what it is and we'll quote you.</p>
        <form data-form="custom" data-success="Got it. We'll be in touch." style="margin-top:40px;display:grid;gap:18px;max-width:560px">
          <div style="display:grid;gap:18px;grid-template-columns:1fr 1fr">
            <label class="field"><span>Name</span><input name="name" required></label>
            <label class="field"><span>Email</span><input name="email" type="email" required></label>
          </div>
          <div style="display:grid;gap:18px;grid-template-columns:1fr 1fr">
            <label class="field"><span>WhatsApp (optional)</span><input name="whatsapp"></label>
            <label class="field"><span>Format</span><select name="format">${Object.entries(FMT).map(([k, f]) => `<option value="${k}">${esc(f.label)}</option>`).join('')}</select></label>
          </div>
          <div style="display:grid;gap:18px;grid-template-columns:1fr 1fr">
            <label class="field"><span>Artist</span><input name="artist" required></label>
            <label class="field"><span>Album or track</span><input name="album" required></label>
          </div>
          <label class="field"><span>Reference link (optional)</span><input name="ref"></label>
          <label class="field"><span>Notes</span><textarea name="notes" rows="3"></textarea></label>
          <button class="btn btn--primary" style="justify-self:start"><span class="btn__mag">Send the request</span></button>
        </form>
        <div data-form-msg></div>
        <p class="body-s dim" style="margin-top:24px">We'll come back to you within ${CONFIRM('Response time not set')} hours. If we can't print it, we'll say so straight.</p>
        <div class="steps" style="margin-top:64px">
          ${[['01', 'You send the album'], ['02', 'We quote and mock it up'], ['03', 'We make it and ship it']].map(([n, t]) =>
            `<div class="reveal"><div class="mono num" style="color:var(--oxblood)">${n}</div>
              <div class="d-s" style="margin-top:8px">${t}</div>${wave('wave--divider', 'margin-top:14px')}</div>`).join('')}
        </div>
      </div>
      <aside>
        <div style="max-width:280px;margin:0 auto 8px">
          <div id="customlabel"></div>
          <p class="mono-xs dim" style="text-align:center;margin-top:12px">A PREVIEW OF YOUR LABEL — UPDATES AS YOU TYPE</p>
        </div>
        <figure class="shot offright" style="margin:32px 0 8px">
          <img src="${photo('printer')}" alt="Artwork printing to order" loading="lazy">
          <figcaption class="mono-xs dim">EVERY ORDER IS PRINTED TO ORDER</figcaption></figure>
        <h4 class="mono dim" style="margin:26px 0 14px">Formats we can make</h4>
        <div class="spec">${Object.values(FMT).map(f => `<div>${esc(f.label)} · ${f.size === '[CONFIRM]' ? '[CONFIRM]' : esc(f.size)}</div>`).join('')}</div>
        <p class="body-s dim" style="margin-top:20px">Custom pricing depends on the artwork and the format. We quote before anything is made.</p>
      </aside>
    </div></div>`;
}
function mountCustom() {
  const host = $('#customlabel');
  if (!host || !window.mountVinylLabel) return;
  const form = document.querySelector('form[data-form="custom"]');
  if (!form) return;
  const artistInput = form.querySelector('[name="artist"]'), titleInput = form.querySelector('[name="album"]');
  let label;
  try { label = window.mountVinylLabel(host, { artist: artistInput?.value, title: titleInput?.value }); }
  catch (e) { return; }
  const sync = () => label.update(artistInput?.value, titleInput?.value);
  artistInput?.addEventListener('input', sync);
  titleInput?.addEventListener('input', sync);
}

/* ============================== STORY ============================== */
function viewStory() {
  const objectRec = bySlug['travis-scott-utopia'] || withVinyl.find(p => p.featured) || withVinyl[0];
  const mu = 'VINYL-PASTFORWARDxMasters\' Union.webp';
  return `<!-- THE OBJECT -->
  <section class="sec ground" data-section="THE OBJECT" style="overflow:hidden;padding-top:calc(var(--nav-h) + clamp(16px, 2.5vw, 32px));padding-bottom:clamp(28px, 4vw, 56px)">
    ${col('g', 'col--soft col--mask')}
    <div class="wrap beat3-wrap">
      <div id="beat3">
        <div class="reveal beat3__visual" style="position:relative">
          <div class="beat3__discwrap">
            ${recordHTML(objectRec, { size: 300, big: true, id: 'beat3rec', style: 'width:100%' })}
          </div>
          ${plate('board-display', 'HUNG, NOT SPUN', 'f-m', 'position:relative;z-index:1;width:52%;margin:-14% 0 0 auto')}
        </div>
        <div class="beat3__copy">
          <div class="cap">THE OBJECT</div>
          <h2 class="d-l reveal" style="margin:14px 0 20px">A record you don't play.</h2>
          <p class="body-l dim reveal measure">A real 12-inch record that already had a life, pulled from a crate, cleaned up, and given the album that actually means something to you at its centre. Hung, not spun. It's the loudest thing in the room and it never makes a sound.</p>
          <div class="spec-retro reveal" role="list">
            <div class="spec-retro__item" role="listitem">
              <span class="spec-retro__bullet" aria-hidden="true"></span>
              <span class="spec-retro__text">12-INCH DIAMETER</span>
            </div>
            <div class="spec-retro__item" role="listitem">
              <span class="spec-retro__bullet" aria-hidden="true"></span>
              <span class="spec-retro__text">UPCYCLED RECORD<span class="spec-retro__dot">·</span>PRINTED CENTRE LABEL</span>
            </div>
            <div class="spec-retro__item" role="listitem">
              <span class="spec-retro__bullet" aria-hidden="true"></span>
              <span class="spec-retro__text">READY TO HANG</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="wrap col-720" style="padding-top:clamp(28px, 4vw, 48px);padding-bottom:12px">
    ${eyebrow('WHERE THEY END UP')}
    <h2 class="d-l" style="margin:12px 0 0">On somebody's wall.</h2>
  </div>
  <div class="wrap" style="max-width:1120px">
    <div class="pair">
      <figure class="pair__a reveal"><img src="${photo('wall-person')}" alt="Someone looking at a finished PastForward wall" loading="lazy"></figure>
      <figure class="pair__b reveal"><img src="${photo('board-closeup')}" alt="Prints and polaroids up close" loading="lazy"></figure>
    </div>
  </div>

  <div class="wrap sec col-720" style="padding-top:clamp(24px, 3.5vw, 44px)">
    <h2 class="d-s" style="margin-top:16px">Artefacts</h2>
    <div style="display:grid;gap:24px;grid-template-columns:1fr 1fr;margin-top:22px">
      <figure style="margin:0"><div style="display:grid;place-items:center;background:var(--elevated);border:1px solid var(--border);padding:20px">
        <img src="${imgSrc(mu)}" alt="PastForward × Masters' Union record" style="width:78%;border-radius:50%" loading="lazy"></div>
        <figcaption class="mono-xs dim" style="margin-top:10px">PASTFORWARD × MASTERS' UNION — NOT FOR SALE</figcaption></figure>
      <figure style="margin:0"><div style="display:grid;place-items:center;background:var(--elevated);border:1px solid var(--border);padding:20px;height:100%">
        <img src="${imgSrc('PastForward Logo.webp')}" alt="The PastForward record-label mark" style="width:70%" loading="lazy"></div>
        <figcaption class="mono-xs dim" style="margin-top:10px">THE LABEL MARK, ESTD 2025</figcaption></figure>
    </div>
  </div>

  <!-- THE CUT: two lines of type running opposite ways, cropped by the page -->
  <section id="storymarquee" style="padding-block:clamp(34px,6vw,74px);position:relative;overflow:hidden">
    ${col('r', 'col--soft col--mask')}
    <div style="position:relative;z-index:2">
      ${marq('Designed from memory  ·  Made for now  ·', 'marq--serif', '-1')}
      <div style="height:clamp(6px,1.4vw,20px)"></div>
      ${marq('THE ALBUM THAT RAISED YOU  ·  ON YOUR WALL  ·', 'marq--shout marq--out', '1')}
    </div>
  </section>`;
}

/* ============================== FAQ / CONTACT ============================== */
function viewFaq() {
  const qs = [
    ['Is it a real vinyl record?', `Yes. A real 12-inch upcycled record. Every record we sell already had a life before it got to you; we clean it up and set the artwork into the centre label. Nothing is pressed new for decor.`],
    ['Can I play it?', `It's sold to hang, not to play. These are real records, so the grooves are real — but we make no promise about what's on them or how it sounds, and the label carries our artwork rather than the original. Treat it as a wall piece.`],
    ['Why upcycled and not new?', `Because a record that already had a life is the whole point of the name. It also means no two are identical, and nothing new gets pressed just to hang on a wall.`],
    ['What sizes do you make?', `<div class="spec" style="margin-top:6px">${Object.values(FMT).map(f => `<div>${esc(f.label)} · ${f.size === '[CONFIRM]' ? CONFIRM('Polaroid card dimensions not measured yet') : esc(f.size)}</div>`).join('')}</div>`],
    ['How does it hang?', `${CONFIRM('Mounting method not decided — adhesive strips, hooks, or nothing supplied')}`],
    ['How long does delivery take?', `${CONFIRM('Dispatch and delivery windows not set')}, across India.`],
    ['Do you ship outside India?', `${CONFIRM('International shipping not decided')}`],
    ['Can I return it?', `${CONFIRM('Returns window and conditions not set')}`],
    ['Can you make one that isn\'t on the site?', `Yes. That's what <a href="#/custom" style="color:var(--ember)">custom orders</a> are for — tell us the album and we'll quote you.`],
    ['How do I look after it?', `Wipe with a dry cloth. Keep it out of direct sunlight — same as the original.`]
  ];
  return `<div class="wrap sec col-720" style="padding-top:calc(var(--nav-h) + 64px)">
    <h1 class="d-l">Questions.</h1>
    <p class="body-l dim" style="margin:16px 0 40px">Some of these we can't answer honestly yet. Those are marked, not guessed.</p>
    ${qs.map(([q, a]) => `<div class="acc"><button aria-expanded="false">${esc(q)} <span>+</span></button>
      <div class="panel"><div class="panel__in">${a}</div></div></div>`).join('')}</div>`;
}
function viewContact() {
  return `<div class="wrap sec col-720" style="padding-top:calc(var(--nav-h) + 64px)">
    <h1 class="d-l">Talk to us.</h1>
    <p class="body-l dim" style="margin:16px 0 36px">Two reasons people usually write: an order that's already placed, or an album we haven't made yet.</p>
    <div class="spec" style="margin-bottom:40px">
      <div>Order questions — DM <a href="https://instagram.com/pastforward.shop" target="_blank" rel="noopener" style="color:var(--ember)">@pastforward.shop</a></div>
      <div>Something not in the catalogue — <a href="#/custom" style="color:var(--ember)">custom orders</a></div>
      <div>Email — ${CONFIRM('Contact email not set')}</div>
    </div>
    <form data-form="contact" data-success="Message sent. We'll reply." style="display:grid;gap:18px;max-width:520px">
      <label class="field"><span>Name</span><input name="name" required></label>
      <label class="field"><span>Email</span><input name="email" type="email" required></label>
      <label class="field"><span>Message</span><textarea name="message" rows="4" required></textarea></label>
      <button class="btn btn--primary" style="justify-self:start"><span class="btn__mag">Send</span></button>
    </form><div data-form-msg></div>
    <p class="body-s dim" style="margin-top:20px">We reply within ${CONFIRM('Response time not set')}.</p></div>`;
}

/* ============================== SEARCH / CART / WALL / POLICY / 404 ============================== */
function viewSearch(params) {
  const q = params.get('q') || '';
  return `<div class="wrap sec searchwrap" style="padding-top:calc(var(--nav-h) + 56px)">
    <h1 class="d-l" style="margin-bottom:20px">Search.</h1>
    <input id="pagesearch" value="${esc(q)}" placeholder="ARTIST OR ALBUM" aria-label="Search the catalogue" autocomplete="off">
    <div id="pagesearchres" style="margin-top:36px">${searchResults(q)}</div></div>`;
}
function viewCart() {
  const m = cartMaths();
  return `<div class="wrap sec col-720" style="padding-top:calc(var(--nav-h) + 64px)">
    <h1 class="d-l">The crate.</h1>
    ${!cart.length ? `<p class="body-l dim" style="margin:20px 0 26px">Nothing in it yet.</p>
      <a class="btn btn--secondary" href="#/vinyl"><span class="btn__mag">Browse the catalogue</span></a>`
    : `<div class="mono-xs dim num" style="margin:16px 0 26px">${cartCount()} IN THE CRATE</div>
      ${cartLinesHTML()}
      <div class="receipt" style="margin-top:32px">
        <div class="row"><span>Subtotal</span><span>${money(m.sub)}</span></div>
        ${m.sets ? `<div class="row" style="color:var(--success)"><span>Set of three applied ×${m.sets}</span><span>−${money(m.saved)}</span></div>` : ''}
        <div class="row"><span>Shipping</span><span>${CONFIRM('Shipping cost not set')}</span></div>
        <div class="row total"><span>Total</span><span>${money(m.total)}</span></div>
      </div>
      <button class="btn btn--primary" style="width:100%;margin-top:24px" data-checkout><span class="btn__mag">Checkout</span></button>
      <p class="mono-xs dim" style="margin-top:14px;line-height:1.8">Checkout is the next step we're wiring. Everything before it works.</p>
      <h2 class="d-s" style="margin:64px 0 20px">You might also want</h2>
      <div class="grid">${P.filter(p => p.featured).slice(0, 4).map(cardHTML).join('')}</div>`}</div>`;
}
function viewWall() {
  const ratios = [1, .707, .617, 1, .707, .617, 1, .707];
  return `<div class="wrap sec" style="padding-top:calc(var(--nav-h) + 64px)">
    <h1 class="d-l">Send us a wall.</h1>
    <p class="body-l dim measure" style="margin:16px 0 40px">Tag @pastforward.shop or send us a photo — the good ones go up here.</p>
    </div>
    ${bleed('wall-white', 'OURS, TO START — THE STAND, 2025', 'Ours, to start.')}
    <div class="wrap" style="padding-top:56px">
    <div class="grid">${ratios.map((r, i) => `<div class="emptyframe" style="aspect-ratio:${r}">AWAITING WALL №${i + 1}</div>`).join('')}</div>
    <p class="mono-xs dim" style="margin-top:32px">This page is empty on purpose. Nothing here is a stock photo.</p></div>`;
}
function viewPolicy(slug) {
  const t = { shipping: 'Shipping', returns: 'Returns', privacy: 'Privacy', terms: 'Terms' }[slug];
  if (!t) return view404();
  return `<div class="wrap sec col-720" style="padding-top:calc(var(--nav-h) + 64px)">
    <h1 class="d-l">${t}.</h1>
    <div class="mono-xs dim" style="margin-top:14px">LAST UPDATED — ${CONFIRM('Not published yet')}</div>
    <div style="border:1px dashed var(--border-2);padding:28px;margin-top:36px">
      <p class="body-l" style="margin:0">${CONFIRM(t + ' policy copy must be supplied by PastForward')} — legal copy to be supplied by PastForward.</p>
      <p class="body-s dim" style="margin:14px 0 0">This page is deliberately unwritten. Inventing a ${slug === 'returns' ? 'returns window' : slug === 'privacy' ? 'privacy commitment' : 'term'} would create an obligation nobody agreed to.</p>
    </div></div>`;
}
function view404() {
  const p = withVinyl[3] || withVinyl[0];
  return `<div class="wrap sec" style="padding-top:calc(var(--nav-h) + 80px);position:relative;min-height:70vh">
    <div class="roomlight"></div>
    <div style="position:absolute;right:6%;top:20%;opacity:.5">${recordHTML(p, { size: 260, cls: 'spin-slow' })}</div>
    <h1 class="d-l" style="max-width:12ch;position:relative">This one's not in the crate.</h1>
    <p class="body-l dim" style="margin:18px 0 30px;position:relative">The page you're after doesn't exist, or moved.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;position:relative">
      <a class="btn btn--primary" href="#/vinyl"><span class="btn__mag">Back to the catalogue</span></a>
      <a class="btn btn--secondary" href="#/"><span class="btn__mag">Home</span></a></div></div>`;
}

/* ============================== MOUNT ============================== */
window.__mount = function (seg, params) {
  const page = seg[0] || 'home';
  const needle = $('#needlelabel'); if (needle) needle.textContent = (page === 'home' ? 'HOME' : page.toUpperCase());

  if (page === 'home') {
    mountHome();
    const crate = mountCrateSection(onUnmount);
    if (crate) {
      // the first CRATE_SCROLL records slide past as you scroll through the pinned section
      const root = document.getElementById('crate');
      const onCrate = () => {
        const r = root.getBoundingClientRect(), span = root.offsetHeight - innerHeight;
        if (span > 0 && r.top < innerHeight && r.bottom > 0) crate.fromScroll(Math.min(1, Math.max(0, -r.top / span)) * CRATE_SCROLL);
      };
      const prev = window.__onScroll;
      window.__onScroll = y => { if (prev) prev(y); onCrate(); };
      onCrate();
    }
  }
  if (page === 'vinyl' || page === 'posters' || page === 'polaroids' || page === 'shop' || page === 'collections') mountCatalog(seg, params);
  if (page === 'product') mountProduct(bySlug[seg[1]], params);
  if (page === 'collections') mountCollection();
  if (page === 'search') mountSearchPage();
  if (page === 'custom') mountCustom();
  if (page === 'story') mountStory();
  mountAccordions();
  mountMarquees();
};

function mountStory() {
  const host = document.getElementById('beat3rec');
  const disc = host && host.querySelector('[data-disc]');
  if (!disc || RM()) return;
  let alive = true, angle = 0, rate = 7.5, last = performance.now();
  host.addEventListener('pointerenter', () => { rate = 0; });
  host.addEventListener('pointerleave', () => { rate = 7.5; });
  host.addEventListener('pointermove', e => {
    const bx = host.getBoundingClientRect();
    host.style.setProperty('--sheen-a', (Math.atan2(e.clientY - (bx.top + bx.height / 2), e.clientX - (bx.left + bx.width / 2)) * 180 / Math.PI - 30) + 'deg');
  });
  onUnmount(() => { alive = false; });
  (function spin(t) {
    if (!alive) return;
    angle += rate * Math.min(64, t - last) / 1000; last = t;
    disc.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    requestAnimationFrame(spin);
  })(last);
}

function mountMarquees() {
  const marqs = $$('[data-marq]').map(m => ({
    el: m, t: m.querySelector('.marq__t'),
    dir: parseFloat(m.dataset.marq) || 1, x: 0, w: 0
  }));
  if (!marqs.length || RM()) return;
  marqs.forEach(m => { m.w = m.t.scrollWidth / 6; });
  let mlast = performance.now();
  let alive = true;
  let boost = 0;
  let lastY = window.scrollY || 0;
  const onScroll = () => {
    const y = window.scrollY || 0;
    const dy = Math.abs(y - lastY);
    lastY = y;
    boost = Math.min(180, boost + dy * 0.45);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onUnmount(() => {
    alive = false;
    window.removeEventListener('scroll', onScroll);
  });
  (function mloop(t) {
    if (!alive) return;
    const dt = Math.min(64, t - mlast); mlast = t;
    boost = Math.max(0, boost - dt * 0.12);
    marqs.forEach(m => {
      if (!m.w || m.w < 20) m.w = m.t.scrollWidth / 6;
      m.x -= m.dir * (26 + boost * 0.18) * dt / 1000;
      if (m.w) { if (m.x <= -m.w) m.x += m.w; if (m.x >= 0) m.x -= m.w; }
      m.t.style.transform = `translate3d(${m.x.toFixed(1)}px,0,0)`;
    });
    requestAnimationFrame(mloop);
  })(performance.now());
}

function mountAccordions() {
  $$('.acc button').forEach(b => {
    if (b.__b) return; b.__b = 1;
    b.addEventListener('click', () => {
      const panel = b.nextElementSibling, open = b.getAttribute('aria-expanded') === 'true';
      $$('.acc button').forEach(o => { if (o !== b) { o.setAttribute('aria-expanded', 'false'); o.nextElementSibling.style.height = '0px'; const s = $('span', o); if (s) s.textContent = '+'; } });
      b.setAttribute('aria-expanded', String(!open));
      panel.style.height = open ? '0px' : panel.firstElementChild.offsetHeight + 'px';
      const s = $('span', b); if (s) s.textContent = open ? '+' : '−';
    });
  });
}

function mountHome() {
  /* One rAF loop drives every disc. Each keeps its own angle, so no two records
     are ever in phase. Rate = idle spin + scroll boost + drag momentum. */
  const spins = [];
  const addSpin = (id, rate, opt = {}) => {
    const host = document.getElementById(id);
    const el = host && host.querySelector('[data-disc]');
    if (el) spins.push(Object.assign({ host, el, rate, base: rate, angle: 0, kick: 0, mom: 0 }, opt));
  };
  addSpin('droprec', 12, { boost: true, stopper: true });

  /* the flex hero disc: same drag/momentum/scratch-sound loop as every other record —
     rendered in WebGL when available (a real lit, physical disc), falling back to the
     original CSS-composited disc if WebGL can't be created for any reason. */
  (function () {
    const host = document.getElementById('fdisc');
    if (!host) return;
    const glHost = document.getElementById('fdiscgl');
    let vinylApi = null;
    if (glHost && window.mountVinyl) {
      try { vinylApi = window.mountVinyl(glHost); } catch (e) { vinylApi = null; }
    }
    if (vinylApi) {
      onUnmount(() => vinylApi.cleanup());
      host.classList.add('is-gl');
      spins.push({ host, vinylApi, rate: 9, base: 9, angle: 0, kick: 0, mom: 0, boost: true });
    } else {
      const el = document.getElementById('fdiscspin');
      if (el) spins.push({ host, el, rate: 9, base: 9, angle: 0, kick: 0, mom: 0, boost: true });
    }
  })();

  let boost = 0, last = performance.now(), lastY = scrollY;

  let homeAlive = true;
  onUnmount(() => { homeAlive = false; });   // stop this loop when leaving the home page
  if (!RM() && spins.length) {
    (function loop(t) {
      if (!homeAlive) return;
      const dt = Math.min(64, t - last); last = t;
      // decay is defined per 60fps frame below (0.93, 0.94, 0.88 all assume a ~16.7ms
      // tick) — raise each factor to the number of 60fps frames actually elapsed so a
      // flick dies at the same real-world speed on a 120Hz screen as on a 60Hz one.
      const f = dt / 16.6667;
      boost *= Math.pow(0.94, f);
      for (const s of spins) {
        if (s.stopping) {
          const k = Math.min(1, (t - s.stopAt) / 1800);
          s.rate = s.stopFrom * Math.pow(1 - k, 2.6);
          if (k === 1) { s.stopping = false; s.stopped = true; s.base = 0; s.rate = 0; }
        }
        const paint = () => s.vinylApi ? s.vinylApi.setAngleDeg(s.angle) : (s.el.style.transform = `rotate(${s.angle}deg)`);
        if (s.dragging) { paint(); continue; }
        let rate = s.rate + (s.boost && !s.stopped ? boost : 0) + s.mom;
        s.angle += rate * dt / 1000;
        if (s.mom) { s.mom *= Math.pow(0.93, f); if (Math.abs(s.mom) < 1) s.mom = 0; }
        if (s.kick) { const step = s.kick * (1 - Math.pow(0.88, f)); s.kick -= step; s.angle += step; if (Math.abs(s.kick) < 0.2) s.kick = 0; }
        paint();
      }
      requestAnimationFrame(loop);
    })(performance.now());
  }

  /* --- drag to spin: the disc (and the artwork on it) follows the pointer --- */
  const angleAt = (host, e) => {
    const r = host.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  };
  spins.forEach(s => {
    if (RM()) return;
    s.host.setAttribute('data-cursor', 'SPIN');
    s.host.style.cursor = 'grab';
    s.host.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;      // never fight touch scrolling
      e.preventDefault();
      s.dragging = true; s.mom = 0; s.kick = 0;
      s.stopping = false; s.stopped = true;        // a dragged record is under the user's control
      s.grabAngle = angleAt(s.host, e); s.grabFrom = s.angle;
      s.lastA = s.grabAngle; s.lastT = performance.now(); s.vel = 0;
      s.host.style.cursor = 'grabbing';
      s.host.setPointerCapture(e.pointerId);
      Sound.scratchStart();
    });
    s.host.addEventListener('pointermove', e => {
      if (!s.dragging) return;
      let cur = angleAt(s.host, e);
      let d = cur - s.lastA;
      if (d > 180) d -= 360; else if (d < -180) d += 360;   // unwrap across ±180
      const now = performance.now(), dt = Math.max(8, now - s.lastT);
      s.vel = Math.max(-1400, Math.min(1400, d / (dt / 1000)));
      s.angle += d; s.lastA = cur; s.lastT = now;
      Sound.scratchUpdate(s.vel);
    });
    const release = () => {
      if (!s.dragging) return;
      s.dragging = false;
      s.host.style.cursor = 'grab';
      s.mom = s.vel;                                // flick carries through
      if (!s.stopper) { s.stopped = false; s.rate = s.base; }
      Sound.scratchStop();
    };
    s.host.addEventListener('pointerup', release);
    s.host.addEventListener('pointercancel', release);
  });

  // the examined record pauses under the pointer, but not while being dragged
  spins.filter(s => s.hover).forEach(s => {
    s.host.addEventListener('pointerenter', () => { if (!s.dragging) s.rate = 0; });
    s.host.addEventListener('pointerleave', () => { if (!s.dragging) s.rate = s.base; });
  });
  // pointer-tracked specular highlight (the light stays fixed while the disc turns)
  $$('.record--lg').forEach(rec => {
    rec.addEventListener('pointermove', e => {
      if (RM()) return;
      const bx = rec.getBoundingClientRect();
      const ang = Math.atan2(e.clientY - (bx.top + bx.height / 2), e.clientX - (bx.left + bx.width / 2)) * 180 / Math.PI;
      rec.style.setProperty('--sheen-a', (ang - 30) + 'deg');
    });
  });

  const hint = $('#scrollhint');
  const build = $('#wallbuild');
  const parallaxEls = $$('[data-par]');
  if (build) {
    if (window.__wbSwapTimer) {
      clearInterval(window.__wbSwapTimer);
      window.__wbSwapTimer = null;
    }

    const posterEls = Array.from(build.querySelectorAll('.wb--poster'));
    const polaEls = Array.from(build.querySelectorAll('.wb--pola'));

    const DESKTOP_POSTER_SLOTS = [
      { left: '1%', top: '8%', width: '27%', rot: -1.4, par: 0.10, z: 1 },
      { left: '31%', top: '0%', width: '31%', rot: 0.8, par: 0.20, z: 2 },
      { left: '75%', top: '14%', width: '23%', rot: -0.6, par: 0.05, z: 1 }
    ];

    const DESKTOP_POLA_SLOTS = [
      { left: '22%', top: '47%', width: '14%', rot: -7, par: 0.30, z: 10 },
      { left: '57%', top: '41%', width: '13%', rot: 5, par: 0.26, z: 11 },
      { left: '7%', top: '55%', width: '12.5%', rot: 3, par: 0.36, z: 12 },
      { left: '76.5%', top: '52%', width: '13.5%', rot: -4.5, par: 0.22, z: 13 },
      { left: '40%', top: '58%', width: '12%', rot: 8, par: 0.42, z: 14 }
    ];

    const MOBILE_POSTER_SLOTS = [
      { left: '1%', top: '4%', width: '48%', rot: -2, z: 1 },
      { left: '25%', top: '0%', width: '52%', rot: 1, z: 2 },
      { left: '51%', top: '6%', width: '48%', rot: -1.5, z: 1 }
    ];

    const MOBILE_POLA_SLOTS = [
      { left: '2%', top: '48%', width: '29%', rot: -6, z: 10 },
      { left: '23%', top: '40%', width: '28%', rot: 5, z: 11 },
      { left: '45%', top: '47%', width: '29%', rot: -3, z: 13 },
      { left: '69%', top: '42%', width: '28%', rot: 6, z: 12 },
      { left: '32%', top: '58%', width: '32%', rot: 2, z: 15 }
    ];

    let posterStep = 0;
    let polaStep = 0;
    let isPaused = false;

    const applySlots = () => {
      if (!document.getElementById('wallbuild')) {
        clearInterval(window.__wbSwapTimer);
        window.__wbSwapTimer = null;
        return;
      }
      const isMob = window.innerWidth < 768;
      const pSlots = isMob ? MOBILE_POSTER_SLOTS : DESKTOP_POSTER_SLOTS;
      const oSlots = isMob ? MOBILE_POLA_SLOTS : DESKTOP_POLA_SLOTS;

      posterEls.forEach((el, i) => {
        const slotIdx = (i + posterStep) % pSlots.length;
        const slot = pSlots[slotIdx];
        el.style.left = slot.left;
        el.style.right = 'auto';
        el.style.top = slot.top;
        el.style.width = slot.width;
        el.style.zIndex = slot.z;
        el.style.setProperty('--rot', slot.rot + 'deg');
        if (slot.par !== undefined) el.style.setProperty('--par', slot.par);
        el.style.transform = `rotate(${slot.rot}deg) translateY(var(--py,0px))`;
      });

      polaEls.forEach((el, i) => {
        const slotIdx = (i + polaStep) % oSlots.length;
        const slot = oSlots[slotIdx];
        el.style.left = slot.left;
        el.style.right = 'auto';
        el.style.top = slot.top;
        el.style.width = slot.width;
        el.style.zIndex = slot.z;
        el.style.setProperty('--rot', slot.rot + 'deg');
        if (slot.par !== undefined) el.style.setProperty('--par', slot.par);
        el.style.transform = `rotate(${slot.rot}deg) translateY(var(--py,0px))`;
      });
    };

    applySlots();

    $$('.wb', build).forEach((el, i) => el.style.setProperty('--d', (i * 70) + 'ms'));
    const onEnter = () => {
      build.classList.add('is-in');
      setTimeout(() => {
        $$('.wb', build).forEach(el => el.style.setProperty('--d', '0ms'));
      }, 900);
    };

    if (RM()) onEnter();
    else new IntersectionObserver((es, io) => es.forEach(e => {
      if (e.isIntersecting) { onEnter(); io.disconnect(); }
    }), { threshold: 0.12 }).observe(build);

    build.addEventListener('pointerenter', () => { isPaused = true; });
    build.addEventListener('pointerleave', () => { isPaused = false; });
    window.addEventListener('resize', applySlots, { passive: true });

    window.__wbSwapTimer = setInterval(() => {
      if (isPaused) return;
      if (!document.getElementById('wallbuild')) {
        clearInterval(window.__wbSwapTimer);
        window.__wbSwapTimer = null;
        return;
      }
      posterStep = (posterStep + 1) % 3;
      polaStep = (polaStep + 1) % 5;
      applySlots();
    }, 2000);
  }

  window.__onScroll = (y) => {
    const dy = Math.abs(y - lastY); lastY = y;
    boost = Math.min(220, boost + dy * 0.5);
    if (hint && y > 40) hint.style.opacity = '0';

    if (!RM() && innerWidth >= 768) {
      parallaxEls.forEach(el => {
        const f = parseFloat(getComputedStyle(el).getPropertyValue('--par')) || 0;
        const r1 = el.getBoundingClientRect();
        const off = (r1.top + r1.height / 2 - innerHeight / 2) / innerHeight;
        el.style.setProperty('--py', (-off * f * 150).toFixed(1) + 'px');
      });
    }
    /* the closing record: carries scroll velocity in, then loses all of it */
    const drop = spins.find(s => s.stopper);
    if (drop && !drop.stopping && !drop.stopped && drop.host.getBoundingClientRect().top < innerHeight * 0.72) {
      drop.stopping = true;
      drop.stopAt = performance.now();
      drop.stopFrom = drop.rate + boost;          // freeze whatever speed it arrived at
      drop.boost = false;
    }
  };

  /* ---- photographs: greyscale until they arrive, then colour ---- */
  const plates = $$('.plate');
  if (plates.length) {
    if (RM()) plates.forEach(pl => pl.classList.add('is-in'));
    else {
      const pio = new IntersectionObserver((es) => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); pio.unobserve(e.target); }
      }), { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
      plates.forEach(pl => pio.observe(pl));
    }
  }

  /* ---- the artwork wall hangs itself, piece by piece ---- */
  const hw = $('#hangwall');
  if (hw) {
    if (RM()) hw.classList.add('is-in');
    else new IntersectionObserver((es, io) => es.forEach(e => {
      if (e.isIntersecting) { hw.classList.add('is-in'); io.disconnect(); }
    }), { threshold: 0.08 }).observe(hw);
  }

  /* ---- annotation markers over the hero record ---- */
  const annot = $('#heroannot');
  if (annot) annot.classList.add('is-in');

}

function setParams(mut) {
  const { path, params } = parseHash(); mut(params);
  const q = params.toString();
  location.hash = path + (q ? '?' + q : '');
}
function mountCatalog(seg, params) {
  const currentPath = '#' + (seg.join('/') || 'vinyl');
  const grid = $('#grid');
  const ftgl = $('#filtertgl'), rail = $('#rail');
  if (ftgl && rail) {
    ftgl.addEventListener('click', () => {
      const open = rail.classList.toggle('is-open');
      ftgl.setAttribute('aria-expanded', String(open));
      const sp = ftgl.querySelector('span');
      if (sp) sp.textContent = open ? 'Hide filters' : 'Filter';
    });
  }
  const rects = grid ? new Map($$('.card', grid).map(c => [c.dataset.card, c.getBoundingClientRect()])) : null;
  $$('#rail input').forEach(inp => inp.addEventListener('change', () => {
    const { path, params: pp } = parseHash();
    let targetPath = path;
    if (path.startsWith('/posters')) targetPath = '/posters';

    if (inp.dataset.f === 'col_nav') {
      location.hash = '#/collections/' + inp.value;
      return;
    }

    if (inp.dataset.f === 'price') {
      inp.checked ? pp.set('price', inp.value) : pp.delete('price');
    } else if (inp.dataset.f === 'size') {
      if (inp.value === 'all') {
        pp.delete('size');
      } else {
        let cur = pp.getAll('size').filter(v => v !== 'all' && v !== inp.value);
        if (!pp.has('size') && path.startsWith('/posters/')) {
          const sub = path.split('/')[2];
          const map = { 'a3': 'poster-a3', 'a5': 'poster-a5', '10x10': 'print-10' };
          if (map[sub] && map[sub] !== inp.value) cur.push(map[sub]);
        }
        if (inp.checked) cur.push(inp.value);
        pp.delete('size');
        cur.forEach(v => pp.append('size', v));
      }
    } else {
      const cur = pp.getAll(inp.dataset.f).filter(v => v !== inp.value);
      if (inp.checked) cur.push(inp.value);
      pp.delete(inp.dataset.f); cur.forEach(v => pp.append(inp.dataset.f, v));
    }
    pp.delete('n');
    const q = pp.toString();
    location.hash = targetPath + (q ? '?' + q : '');
  }));
  const sort = $('#sort'); if (sort) sort.addEventListener('change', () => setParams(pp => pp.set('sort', sort.value)));
  $$('[data-unset]').forEach(b => b.addEventListener('click', () => {
    const [k, v] = b.dataset.unset.split('|');
    const { path, params: pp } = parseHash();
    let targetPath = path;
    if (path.startsWith('/posters')) targetPath = '/posters';
    const cur = pp.getAll(k).filter(x => x !== v);
    pp.delete(k); cur.forEach(x => pp.append(k, x));
    const q = pp.toString();
    location.hash = targetPath + (q ? '?' + q : '');
  }));
  $$('[data-clear]').forEach(b => b.addEventListener('click', () => {
    const { path } = parseHash();
    const basePath = path.startsWith('/posters') ? '/posters' : path;
    location.hash = basePath;
  }));
  const more = $('#loadmore'); if (more) more.addEventListener('click', () => setParams(pp => pp.set('n', String((+(pp.get('n') || 24)) + 24))));
  // FLIP re-flow
  if (grid && window.__lastGridRects && !RM()) {
    $$('.card', grid).forEach(c => {
      const old = window.__lastGridRects.get(c.dataset.card); if (!old) {
        c.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
          { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)', delay: Math.random() * 120 });
        return;
      }
      const now = c.getBoundingClientRect();
      const dx = old.left - now.left, dy = old.top - now.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        c.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }],
          { duration: 400, easing: 'cubic-bezier(.76,0,.24,1)' });
      }
    });
  }
  window.__lastGridRects = rects;
}
function mountShop(routeKey, params) { mountCatalog(['shop', routeKey].filter(Boolean), params); }

function mountProduct(p, params) {
  if (!p) return;
  /* the liquid backdrop: the album art flowing behind the page (see liquid.js) */
  const liq = $('#pliq');
  if (liq && window.mountLiquid) {
    const artV = variant(p, 'print-10') || variant(p, 'vinyl') || primary(p);
    try {
      const api = window.mountLiquid(liq, imgSrc(artV.image, true), { round: artV.format === 'vinyl', reducedMotion: RM() });
      if (api) onUnmount(() => api.cleanup());
    } catch (e) {}
  }
  playFlip($('#stagemedia'));
  let qty = 1, sel = params.get('format') && variant(p, params.get('format')) ? params.get('format') : primary(p).format;
  if (sel === 'vinyl') setTimeout(() => Sound.needleDrop(), 260);
  /* a subtle WebGL ripple on the framed/polaroid stage photo — vinyl stays a real
     composited record, not an <img>, so it's untouched */
  let rippleCleanup = null;
  const mountRipple = () => {
    if (rippleCleanup) { try { rippleCleanup(); } catch (e) {} rippleCleanup = null; }
    // vinyl's own <img> is the label art inside a composited, draggable, sound-wired
    // record — wrapping it for the ripple shader would fight that, so skip it there.
    if (sel === 'vinyl') return;
    const img = $('#stagemedia img');
    if (!img || !window.mountImageRipple) return;
    try { rippleCleanup = window.mountImageRipple(img); } catch (e) { rippleCleanup = null; }
  };
  if (!RM()) mountRipple();
  const setFmt = f => {
    if (!variant(p, f)) return; sel = f;
    const v = variant(p, f);
    if (f === 'vinyl') Sound.needleDrop(); else Sound.tick();
    $('#stagemedia').innerHTML = stageMedia(p, f);
    if (!RM()) mountRipple();
    $('#pdpprice').innerHTML = money(v.price) + (v.confirmPrice ? ' ' + CONFIRM('Price for this format not set yet') : '');
    $('#barprice').textContent = money(v.price);
    $('#whatyouget').innerHTML = f === 'vinyl' ? 'Upcycled 12-inch record, printed centre label'
      : f === 'polaroid' ? 'Polaroid-style card, cream border'
      : '300gsm matte poster stock ' + CONFIRM('Paper stock not confirmed with the printer');
    $$('.fmt button').forEach(b => { b.classList.toggle('is-on', b.dataset.fmt === f); b.setAttribute('aria-pressed', String(b.dataset.fmt === f)); });
    $$('.pdp__thumb').forEach(b => b.classList.toggle('is-on', b.dataset.fmt === f));
    const pt = $('.pdp__thumb--photo'); if (pt && photo(FORMAT_PHOTO[f])) { $('img', pt).src = photo(FORMAT_PHOTO[f]); }
    $('#scaleview').innerHTML = scaleSVG(f);
    drawScale();
    setParams(pp => pp.set('format', f));
  };
  $$('.fmt button').forEach(b => b.addEventListener('click', () => setFmt(b.dataset.fmt)));
  $$('.pdp__thumb[data-fmt]').forEach(b => b.addEventListener('click', () => setFmt(b.dataset.fmt)));
  $$('.pdp__thumb[data-cw]').forEach(b => b.addEventListener('click', () => {
    const img = $('#stagemedia img'); if (img) img.src = imgSrc(b.dataset.cw);
    $$('.pdp__thumb').forEach(x => x.classList.remove('is-on')); b.classList.add('is-on');
  }));
  const shotBtn = $('.pdp__thumb--photo');
  if (shotBtn) shotBtn.addEventListener('click', () => {
    $$('.pdp__thumb').forEach(x => x.classList.remove('is-on'));
    shotBtn.classList.add('is-on');
    $('#stagemedia').innerHTML = `<img class="stagephoto" src="${photo(FORMAT_PHOTO[sel])}" alt="A PastForward ${esc(FMT[sel].label)} photographed at the stand">`;
  });
  $$('[data-pq]').forEach(b => b.addEventListener('click', () => {
    qty = Math.max(1, qty + (+b.dataset.pq)); $('#pdpqty').textContent = qty;
  }));
  const add = e => addToCart(p.slug, sel, qty, e.currentTarget);
  $('#pdpadd').addEventListener('click', add);
  $('#baradd').addEventListener('click', add);
  const bar = $('#buybar');
  window.__onScroll = y => { if (bar) bar.classList.toggle('is-on', y > innerHeight * .6); };
  function drawScale() {
    if (RM()) return;
    const svg = $('#scaleview svg'); if (!svg) return;
    $$('#scaleview .obj, #scaleview .dim-line').forEach((el, i) => {
      const len = el.getTotalLength ? el.getTotalLength() : 0;
      if (!len) return;
      el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
      el.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: 700, delay: i * 22, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
    });
  }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { drawScale(); io.disconnect(); } }), { threshold: .25 });
  const sv = $('#scaleview'); if (sv) io.observe(sv);
}

function mountCollection() {
  const s = $('#sleeve'); if (!s || RM()) { if (s) s.style.clipPath = 'none'; return; }
  s.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }],
    { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
}
function mountSearchPage() {
  const i = $('#pagesearch'), r = $('#pagesearchres'); if (!i) return;
  i.focus();
  i.addEventListener('input', () => {
    r.innerHTML = searchResults(i.value);
    bindEffects(r);
    setParams(pp => i.value ? pp.set('q', i.value) : pp.delete('q'));
  });
}
