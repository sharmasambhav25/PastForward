/* ============================================================
   PastForward — core: helpers, components, chrome, router
   ============================================================ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const RM = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const money = n => '₹' + Number(n).toLocaleString('en-IN');
const CONFIRM = (what) => `<span data-confirm title="${esc(what)}">[CONFIRM]</span>`;

const CAT = window.__CATALOGUE__;
const P = CAT.products, FMT = CAT.formats, COLS = CAT.collections, COUNTS = CAT.counts;
const bySlug = Object.fromEntries(P.map(p => [p.slug, p]));
const withVinyl = P.filter(p => p.variants.some(v => v.format === 'vinyl'));

function imgSrc(file, big) {
  if (window.__IMG_DATA__) return window.__IMG_DATA__[file] || '';
  const base = (big && window.__IMG_BASE_LG__) || window.__IMG_BASE__ || '';
  return base + encodeURIComponent(file);
}
const variant = (p, f) => p.variants.find(v => v.format === f);
const primary = p => p.variants[0];
const albumOf = p => p.album === '[CONFIRM]' ? CONFIRM('Album name not recorded for this design — confirm before publishing') : esc(p.album);
const albumText = p => p.album === '[CONFIRM]' ? '[CONFIRM]' : p.album;

/* ---------- soundwave mark ---------- */
const WAVE_PATHS = [
  'M0 36C20 8 40 8 60 36S100 64 120 36 160 8 180 36 220 64 240 36',
  'M0 36C20 16 40 16 60 36S100 56 120 36 160 16 180 36 220 56 240 36',
  'M0 36C20 24 40 24 60 36S100 48 120 36 160 24 180 36 220 48 240 36'
];
function wave(cls = '', style = '') {
  return `<svg class="wave ${cls}" viewBox="0 0 240 72" preserveAspectRatio="none" aria-hidden="true" style="${style}">
    ${WAVE_PATHS.map(d => `<path d="${d}"/>`).join('')}</svg>`;
}

/* ---------- the record ---------- */
let __uid = 0;
function recordHTML(p, o = {}) {
  const uid = ++__uid;
  const size = o.size || 320;
  const v = p ? variant(p, 'vinyl') : null;
  const src = o.src || (v ? imgSrc(v.image, o.big) : '');
  const alt = o.alt !== undefined ? o.alt : (v ? v.alt : '');
  const lg = size >= 300 ? ' record--lg' : '';
  return `<div class="record${lg} ${o.cls || ''}" style="--size:${size}px${o.style ? ';' + o.style : ''}" ${o.id ? `id="${o.id}"` : ''}>
    <div class="record__disc" data-disc>
      <div class="record__grooves" data-layer="grooves"></div>
      <div class="record__grooves2" data-layer="grooves-fine"></div>
      <div class="record__deadwax" data-layer="deadwax"></div>
      <svg class="record__etch" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <path id="pfT${uid}" d="M50 50 m -27 0 a 27 27 0 0 1 54 0" fill="none"/>
          <path id="pfB${uid}" d="M50 50 m -30 0 a 30 30 0 0 0 60 0" fill="none"/>
        </defs>
        <text><textPath href="#pfT${uid}" startOffset="50%" text-anchor="middle">PASTFORWARD · ESTD 2025</textPath></text>
        <text><textPath href="#pfB${uid}" startOffset="50%" text-anchor="middle">33⅓ RPM · NOT FOR PLAYBACK</textPath></text>
      </svg>
      <div class="record__label" data-layer="label">
        <img class="record__art" src="${src}" alt="${esc(alt)}" ${o.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
        <div class="record__labelring"></div>
      </div>
      <div class="record__spindle" data-layer="spindle"></div>
    </div>
    <div class="record__sheen"></div>
    <div class="record__rim" data-layer="rim"></div>
  </div>`;
}
function frameHTML(v, o = {}) {
  return `<div class="frame ${o.cls || ''}" style="${o.style || ''}">
    <img src="${imgSrc(v.image, o.big)}" alt="${esc(v.alt)}" loading="lazy" decoding="async">
    ${o.badge === false ? '' : ''}</div>`;
}
function polaroidHTML(v, o = {}) {
  return `<div class="polaroid ${o.cls || ''}" style="${o.style || ''}">
    <img src="${imgSrc(v.image, o.big)}" alt="${esc(v.alt)}" loading="lazy" decoding="async"></div>`;
}
function mediaHTML(p, size) {
  const v = primary(p);
  if (v.format === 'vinyl') return recordHTML(p, { size });
  if (v.format === 'polaroid') return polaroidHTML(v, { style: `width:${size * .62}px` });
  return frameHTML(v, { style: `width:${size * .72}px;aspect-ratio:${v.ratio}` });
}

/* ---------- product card ---------- */
function cardHTML(p) {
  const v = primary(p);
  const ar = v.format === 'vinyl' || v.format === 'print-10' ? 1 : v.ratio;
  return `<a class="card" href="#/product/${p.slug}" data-card="${p.slug}" data-cursor="VIEW">
    <div class="card__media" style="aspect-ratio:${ar}" data-media>
      <span class="card__badge badge">${esc(v.badge)}</span>
      ${v.format === 'vinyl' ? recordHTML(p, { size: 210 })
        : v.format === 'polaroid' ? polaroidHTML(v, { style: 'width:78%' })
        : frameHTML(v, { style: 'height:100%;width:auto;aspect-ratio:' + v.ratio })}
      <button class="card__add" data-add="${p.slug}|${v.format}" aria-label="Quick add ${esc(albumText(p))}">Quick add · ${money(v.price)}</button>
    </div>
    <div class="card__meta">
      <span class="card__artist">${esc(p.artist)}</span>
      <span class="card__album">${albumOf(p)}</span>
      <span class="card__size">${esc(v.label)} · ${v.size === '[CONFIRM]' ? CONFIRM('Polaroid card dimensions not measured yet') : esc(v.size)}</span>
      <span class="card__price num">${money(v.price)}${p.variants.length > 1 ? `<span class="card__more">${p.variants.length} formats · from ${money(p.from)}</span>` : ''}</span>
    </div></a>`;
}

/* ---------- cart ---------- */
const CART_KEY = 'pf_cart_v1';
let cart = [];
try { const raw = localStorage.getItem(CART_KEY); if (raw) cart = JSON.parse(raw).filter(l => bySlug[l.slug] && FMT[l.format]); } catch (e) { cart = []; }
function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} }
function cartCount() { return cart.reduce((n, l) => n + l.qty, 0); }
function addToCart(slug, format, qty = 1) {
  const p = bySlug[slug], v = variant(p, format); if (!v) return;
  const line = cart.find(l => l.slug === slug && l.format === format);
  if (line) line.qty += qty; else cart.push({ slug, format, qty, price: v.price });
  saveCart(); syncCart();
  toast(`Added — ${albumText(p)}, ${v.label}`);
  Sound.tick();
  const badge = $('#cartcount'); if (badge && !RM()) { badge.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.34,1.32,.64,1)' }); }
  if (window.matchMedia('(max-width:1023px)').matches) openDrawer();
}
function cartMaths() {
  let sub = 0; cart.forEach(l => sub += l.price * l.qty);
  const distinctVinyl = new Set(cart.filter(l => l.format === 'vinyl').map(l => l.slug)).size;
  const sets = Math.floor(distinctVinyl / 3);
  const saved = sets * (899 * 3 - 2199);
  return { sub, sets, saved, total: sub - saved };
}
function syncCart() {
  const n = cartCount(), badge = $('#cartcount');
  if (badge) { badge.textContent = n; badge.style.display = n ? 'grid' : 'none'; }
  const body = $('#drawerbody'); if (body) body.innerHTML = cartLinesHTML();
  const ft = $('#drawerft'); if (ft) ft.innerHTML = cartFootHTML();
  if (location.hash.startsWith('#/cart')) render();
}
function cartLinesHTML() {
  if (!cart.length) return `<div style="padding:56px 0;text-align:center">
      <p class="d-s" style="margin-bottom:8px">Nothing in the crate yet.</p>
      <a class="btn btn--secondary" href="#/shop" data-close>Browse the catalogue</a></div>`;
  return cart.map((l, i) => {
    const p = bySlug[l.slug], v = variant(p, l.format);
    return `<div class="line">
      <div class="line__img">${v.format === 'vinyl' ? recordHTML(p, { size: 60 }) : `<img src="${imgSrc(v.image)}" alt="">`}</div>
      <div style="flex:1;min-width:0">
        <div class="card__artist">${esc(p.artist)}</div>
        <div style="font-family:var(--display);font-size:1rem;line-height:1.25">${albumOf(p)}</div>
        <div class="card__size" style="margin-top:3px">${esc(v.label)} · ${v.size === '[CONFIRM]' ? '[CONFIRM]' : esc(v.size)}</div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:10px">
          <span class="qty"><button data-q="${i}|-1" aria-label="Decrease">−</button><span class="num">${l.qty}</span><button data-q="${i}|1" aria-label="Increase">+</button></span>
          <span class="num" style="font-size:.75rem">${money(l.price * l.qty)}</span>
          <button class="btn--ghost mono-xs" data-rm="${i}" style="margin-left:auto;background:none;border:0;cursor:pointer;color:var(--muted)">Remove</button>
        </div></div></div>`;
  }).join('');
}
function cartFootHTML() {
  if (!cart.length) return '';
  const m = cartMaths();
  return `<div class="receipt" style="margin-bottom:16px">
      <div class="row"><span>${cartCount()} in the crate</span><span>${money(m.sub)}</span></div>
      ${m.sets ? `<div class="row" style="color:var(--success)"><span>Set of three applied ×${m.sets}</span><span>−${money(m.saved)}</span></div>` : ''}
      <div class="row total"><span>Total</span><span>${money(m.total)}</span></div></div>
    <button class="btn btn--primary" style="width:100%" data-checkout><span class="btn__mag">Checkout</span></button>
    <p class="mono-xs dim" style="margin:12px 0 0;line-height:1.7">Checkout is the next step we're wiring. Everything before it works.</p>`;
}

/* ---------- toast ---------- */
function toast(msg) {
  const wrap = $('#toasts'); if (!wrap) return;
  while (wrap.children.length >= 2) wrap.firstElementChild.remove();
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = `${esc(msg)}<span class="toast__bar"></span>`;
  wrap.appendChild(t); setTimeout(() => t.remove(), 4000);
}

/* ---------- drawer / overlays ---------- */
let lastFocus = null;
function openDrawer() { lastFocus = document.activeElement; $('#drawer').classList.add('is-open'); $('#scrim').classList.add('is-open'); document.body.style.overflow = 'hidden'; const b = $('#drawer button'); if (b) b.focus(); }
function closeAll() {
  ['#drawer', '#menu', '#search'].forEach(s => { const el = $(s); if (el) el.classList.remove('is-open'); });
  $('#scrim').classList.remove('is-open'); $('#mega').classList.remove('is-open');
  document.body.style.overflow = '';
  if (lastFocus) { try { lastFocus.focus(); } catch (e) {} lastFocus = null; }
}

/* ---------- chrome ---------- */
function chromeHTML() {
  const fmtLinks = [['vinyl', 'Vinyl'], ['posters', 'Posters'], ['prints', 'Prints'], ['polaroids', 'Polaroids']];
  return `
  <a class="skip" href="#main">Skip to content</a>
  <header class="hdr" id="hdr"><div class="wrap hdr__in">
    <a class="hdr__mark" href="#/" aria-label="PastForward home"><img src="${window.__WORDMARK__}" alt="PastForward"></a>
    <nav class="hdr__nav" aria-label="Main">
      <a class="navlink" href="#/shop" data-nav="shop">Shop${wave('wave--under')}</a>
      <button class="navlink" id="megabtn" aria-expanded="false" style="background:none;border:0;cursor:pointer">Collections${wave('wave--under')}</button>
      <a class="navlink" href="#/custom" data-nav="custom">Custom${wave('wave--under')}</a>
      <a class="navlink" href="#/story" data-nav="story">Story${wave('wave--under')}</a>
    </nav>
    <div class="hdr__acts">
      <button class="iconbtn" id="searchbtn" aria-label="Search"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button>
      <button class="iconbtn" id="cartbtn" aria-label="Open cart"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16l-1.2 12H5.2z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg><span class="cartcount num" id="cartcount" aria-live="polite" style="display:none">0</span></button>
      <button class="iconbtn" id="menubtn" aria-label="Menu"><svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path d="M3 7h18M3 12h18M3 17h18"/></svg></button>
    </div>
    <div class="hdr__prog" id="hdrprog"></div>
  </div></header>

  <div class="mega" id="mega"><div class="wrap mega__grid">
    <div><h4>Collections</h4>${COLS.slice(0, 4).map(c => `<a href="#/collections/${c.slug}">${esc(c.name)}</a>`).join('')}</div>
    <div><h4>&nbsp;</h4>${COLS.slice(4).map(c => `<a href="#/collections/${c.slug}">${esc(c.name)}</a>`).join('')}</div>
    <div><h4>Format</h4>${fmtLinks.map(([s, l]) => `<a href="#/shop/${s}">${l}</a>`).join('')}</div>
    <div><h4>In the crate</h4><p class="body-s dim" style="margin:0 0 14px">${COUNTS.products} artworks across ${COUNTS.variants} formats. Everything we've ever printed.</p><a href="#/shop" style="color:var(--cream)">See everything →</a></div>
  </div></div>

  <div id="overlays">
  <div class="scrim" id="scrim"></div>
  <aside class="drawer" id="drawer" role="dialog" aria-label="Cart" aria-modal="true">
    <div class="drawer__hd"><span class="mono">The crate</span><button class="iconbtn" data-close aria-label="Close cart">×</button></div>
    <div class="drawer__body" id="drawerbody"></div>
    <div class="drawer__ft" id="drawerft"></div>
  </aside>
  <nav class="menu" id="menu" aria-label="Mobile">
    <button class="iconbtn" data-close aria-label="Close menu" data-x style="position:absolute;top:12px;right:16px">×</button>
    <a href="#/shop">Shop</a><a href="#/collections/the-classics">Collections</a>
    <a href="#/custom">Custom</a><a href="#/story">Story</a><a href="#/faq">FAQ</a><a href="#/contact">Contact</a>
    <div style="margin-top:auto;border-top:1px solid var(--border);padding-top:20px">
      <a href="#/custom" class="mono" style="font-family:var(--mono);font-size:.7rem">Custom orders</a>
      <a href="https://instagram.com/pastforward.shop" target="_blank" rel="noopener" class="mono" style="font-family:var(--mono);font-size:.7rem">@pastforward.shop</a>
    </div>
  </nav>
  <div class="menu" id="search" role="dialog" aria-label="Search">
    <button class="iconbtn" data-close aria-label="Close search" style="position:absolute;top:12px;right:16px">×</button>
    <div class="wrap searchwrap" style="padding-top:6vh">
      <input id="searchinput" placeholder="ARTIST OR ALBUM" aria-label="Search the catalogue" autocomplete="off">
      <div class="mono-xs dim" style="margin-top:10px">Esc to close</div>
      <div id="searchres" style="margin-top:32px;max-height:58vh;overflow:auto"></div>
    </div>
  </div>
  </div>
  <div class="toasts" id="toasts" aria-live="polite"></div>
  <div class="needle" id="needle" aria-hidden="true">
    <div class="needle__label" id="needlelabel">HOME</div>
    <div class="needle__track"><div class="needle__fill" id="needlefill"></div></div>
  </div>
  <div class="cursor" id="cursor" aria-hidden="true"><div class="cursor__ring"><span class="cursor__lbl"></span></div><div class="cursor__dot"></div></div>
  <canvas id="grain" aria-hidden="true"></canvas><div id="vignette" aria-hidden="true"></div>
  <div id="field" aria-hidden="true"></div>
  <div id="corners" aria-hidden="false">
    <div class="cnr-bl"><button id="soundtgl" aria-pressed="false">SOUND <b>OFF</b></button></div>
    <div class="cnr-br" id="cnrscroll" hidden>SCROLL TO EXPLORE</div>
  </div>`;
}

/* the substrate: two sets of very large, very faint groove arcs.
   the brand's own line-work, so the page always sits on a record. */
function grooveField() {
  const arcs = (n, o, step) => {
    let d = '';
    for (let i = 0; i < n; i++) d += `<circle cx="500" cy="500" r="${o + i * step}"/>`;
    return d;
  };
  const svg = (n, o, step, w, a) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">` +
    `<g fill="none" stroke="rgb(243,239,232)" stroke-opacity="${a}" stroke-width="${w}">` +
    arcs(n, o, step) + `</g></svg>`;
  const enc = v => 'url("data:image/svg+xml;utf8,' + encodeURIComponent(v) + '")';
  const el = document.getElementById('field');
  if (el) el.style.backgroundImage = enc(svg(46, 60, 9.4, .8, .085)) + ',' + enc(svg(34, 90, 12, .7, .06));
}

/* ---------- preloader: black, the mark, and a very large counter ---------- */
function initPre() {
  if (RM()) return;
  const el = document.createElement('div');
  el.id = 'pre';
  el.innerHTML = `<div class="pre__bar"></div>
    <img class="pre__mark" src="${window.__WORDMARK__}" alt="">
    <div class="pre__n num">00</div>
    <div class="pre__cap mono-xs dim">DESIGNED FROM MEMORY, MADE FOR NOW</div>`;
  document.body.appendChild(el);
  const n = el.querySelector('.pre__n'), bar = el.querySelector('.pre__bar');
  const t0 = performance.now(), DUR = 1500;
  (function tick(t) {
    const k = Math.min(1, (t - t0) / DUR);
    const e = 1 - Math.pow(1 - k, 2.2);
    n.textContent = String(Math.round(e * 100)).padStart(2, '0');
    bar.style.width = (e * 100) + '%';
    if (k < 1) requestAnimationFrame(tick);
    else { el.classList.add('is-out'); setTimeout(() => el.remove(), 700); }
  })(t0);
}

/* ---------- sound: procedural, reactive, off by default, and it stays off unless asked.
   No ambient bed, no drone — nothing plays on its own. Every sound here fires in
   direct response to something the visitor does: spinning a record, clicking a
   control, adding something to the crate. All synthesized at runtime with the
   Web Audio API — no external audio file, no licensing question. ---------- */
const Sound = (() => {
  let ctx = null, enabled = false, scratch = null;

  function ensureCtx() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function noiseBuffer(seconds) {
    const rate = ctx.sampleRate, buf = ctx.createBuffer(1, Math.max(1, Math.floor(rate * seconds)), rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  /* the needle touching down: a soft low thump plus a brief touchdown scratch —
     plays once when a vinyl format lands on screen, never on a loop */
  function needleDrop() {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.setValueAtTime(190, t); osc.frequency.exponentialRampToValueAtTime(65, t + 0.2);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    osc.connect(og); og.connect(ctx.destination); osc.start(t); osc.stop(t + 0.26);
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.14);
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 2500; band.Q.value = 1.1;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.07, t + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    n.connect(band); band.connect(ng); ng.connect(ctx.destination); n.start(t); n.stop(t + 0.16);
  }
  /* a small, dry tick for UI moments — a button, a tab, placing something in the crate */
  function tick() {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.02);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1100;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    n.connect(hp); hp.connect(g); g.connect(ctx.destination); n.start(t); n.stop(t + 0.04);
  }
  /* live turntable scratch, wired to how fast/which way the visitor is actually
     dragging a record — starts on grab, tracks velocity in real time, stops on release */
  function scratchStart() {
    if (!enabled || !ctx || scratch) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(2); src.loop = true;
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 500; band.Q.value = 5;
    const gain = ctx.createGain(); gain.gain.value = 0.0001;
    src.connect(band); band.connect(gain); gain.connect(ctx.destination); src.start();
    scratch = { src, band, gain };
  }
  function scratchUpdate(vel) {
    if (!enabled || !ctx || !scratch) return;
    const speed = Math.min(1, Math.abs(vel) / 900);
    const t = ctx.currentTime;
    scratch.band.frequency.setTargetAtTime(400 + speed * 2600, t, 0.03);
    scratch.band.Q.setTargetAtTime(6 - speed * 3.5, t, 0.03);
    scratch.gain.gain.setTargetAtTime(speed > 0.03 ? 0.03 + speed * 0.05 : 0.0001, t, 0.04);
  }
  function scratchStop() {
    if (!scratch) return;
    const { src, gain } = scratch, t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.09);
    setTimeout(() => { try { src.stop(); } catch (e) {} }, 120);
    scratch = null;
  }
  function enable() { if (!ensureCtx()) return false; enabled = true; tick(); return true; }
  function disable() { enabled = false; scratchStop(); }
  return { enable, disable, needleDrop, tick, scratchStart, scratchUpdate, scratchStop, get enabled() { return enabled; } };
})();

function initSound() {
  const btn = document.getElementById('soundtgl');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const turningOn = !Sound.enabled;
    if (turningOn) { if (!Sound.enable()) return; } else { Sound.disable(); }
    btn.setAttribute('aria-pressed', String(Sound.enabled));
    btn.innerHTML = 'SOUND <b>' + (Sound.enabled ? 'ON' : 'OFF') + '</b>';
    window.__sound = Sound.enabled;
  });
}

/* the page has chapters on different grounds; the fixed chrome follows them */
function initGrounds() {
  const lights = () => Array.from(document.querySelectorAll('.g-paper'));
  const test = () => {
    const hint = document.getElementById('cnrscroll');
    if (hint) {
      const home = location.hash === '#/' || location.hash === '' || location.hash === '#';
      hint.hidden = !home || scrollY > innerHeight * 0.7;
    }
    const mid = innerHeight * 0.5;
    const on = lights().some(el => { const r = el.getBoundingClientRect(); return r.top < mid && r.bottom > mid; });
    document.documentElement.toggleAttribute('data-light', on);
  };
  window.__onGround = test;
  test();
}

function footerHTML() {
  return `<footer class="ftr"><div class="wrap">
    <div class="ftr__grid">
      <div>
        <div class="hdr__mark hdr__mark--ftr"><img src="${window.__WORDMARK__}" alt="PastForward"></div>
        <p class="body-s dim" style="margin:6px 0 16px">designed from memory, made for now</p>
        ${wave('', 'width:120px;height:36px;opacity:.6')}
      </div>
      <div><h4>Shop</h4>
        <a href="#/shop/vinyl">Vinyl</a><a href="#/shop/posters">Posters</a>
        <a href="#/shop/prints">Prints</a><a href="#/shop/polaroids">Polaroids</a><a href="#/custom">Custom orders</a></div>
      <div><h4>Brand</h4>
        <a href="#/story">Our story</a><a href="#/faq">FAQ</a><a href="#/contact">Contact</a><a href="#/wall">Customer walls</a></div>
      <div><h4>Newsletter</h4>
        <p class="body-s dim" style="margin:0 0 12px">New records, limited runs, no spam.</p>
        <form data-form="newsletter" style="display:flex;gap:8px;flex-wrap:wrap">
          <input name="email" type="email" required placeholder="your@email.com" aria-label="Email"
            style="flex:1;min-width:150px;background:var(--elevated);border:1px solid var(--border);padding:12px;border-radius:2px">
          <button class="btn btn--primary"><span class="btn__mag">Notify me</span></button>
        </form><div data-form-msg></div></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;margin-top:44px;padding-top:20px;border-top:1px solid var(--border)" class="mono-xs dim">
      <span>© 2026 PastForward</span><span>estd 2025</span>
      <a href="https://instagram.com/pastforward.shop" target="_blank" rel="noopener">@pastforward.shop</a>
      <span style="display:flex;gap:14px">
        <a href="#/policies/shipping">Shipping</a><a href="#/policies/returns">Returns</a>
        <a href="#/policies/privacy">Privacy</a><a href="#/policies/terms">Terms</a></span>
    </div></div></footer>`;
}

/* ---------- effects ---------- */
function initGrain() {
  const c = $('#grain'); if (!c) return;
  const S = 128; c.width = S; c.height = S;
  c.style.width = '100%'; c.style.height = '100%';
  const ctx = c.getContext('2d');
  const tiles = [];
  for (let t = 0; t < 4; t++) {
    const d = ctx.createImageData(S, S);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 90 + Math.random() * 76;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    ctx.putImageData(d, 0, 0); tiles.push(c.toDataURL('image/png'));
  }
  const el = document.createElement('div');
  el.id = 'grain'; el.style.cssText = c.style.cssText;
  c.replaceWith(el);
  const g = $('#grain');
  g.style.backgroundImage = `url(${tiles[0]})`;
  if (RM()) return;
  let i = 0;
  setInterval(() => { i = (i + 1) % 4; g.style.backgroundImage = `url(${tiles[i]})`; }, 83);
}

/* ------------------------------------------------------------------
   Mouse drag-to-scroll for a horizontal strip (the home picker's
   thumbnail rail, the mobile "wall" fallback): grab anywhere on the
   strip and it tracks the pointer 1:1; let go and it keeps going at
   the release velocity, decelerating like a flick-scroll; overshoot
   past either end resists with the same rubber-band curve Apple uses
   for scroll bounce, then eases back. Never fights native touch
   scrolling (it bails on touch pointers immediately) and sits out
   entirely under reduced motion, where the plain overflow-x scrollbar
   is left to do the job. */
function mountDragScroll(el) {
  if (!el || el.__dragScroll || RM()) return;
  el.__dragScroll = true;
  const BAND = 0.55; // resistance constant — higher = softer edge
  const rubber = (over, dim) => (over * dim * BAND) / (dim + BAND * Math.abs(over));
  const maxScroll = () => Math.max(0, el.scrollWidth - el.clientWidth);
  let dragging = false, moved = false, pid = null;
  let startX = 0, startScroll = 0, lastX = 0, lastT = 0, vel = 0;
  let over = 0, raf = 0, tickT = 0;

  function setOver(px) { over = px; el.style.transform = px ? `translate3d(${px.toFixed(1)}px,0,0)` : ''; }

  function frame(t) {
    const dt = Math.min(.048, Math.max(.001, (t - tickT) / 1000)); tickT = t;
    const f = dt * 60; // elapsed time in 60fps-frame units, so decay is refresh-rate independent
    let alive = false;
    if (!dragging && Math.abs(vel) > 3) {
      const max = maxScroll(), next = el.scrollLeft - vel * dt;
      if (next < 0) { setOver(rubber(-next, el.clientWidth || 1)); el.scrollLeft = 0; vel *= Math.pow(0.05, f); }
      else if (next > max) { setOver(-rubber(next - max, el.clientWidth || 1)); el.scrollLeft = max; vel *= Math.pow(0.05, f); }
      else { el.scrollLeft = next; vel *= Math.pow(0.9, f); if (over) setOver(0); }
      if (Math.abs(vel) < 3) vel = 0;
      alive = true;
    } else if (!dragging) {
      vel = 0;
    }
    if (!dragging && !vel && over) {
      const next = over * Math.pow(0.001, f);
      setOver(Math.abs(next) < .4 ? 0 : next);
      alive = true;
    }
    raf = alive ? requestAnimationFrame(frame) : 0;
  }
  function wake() { if (!raf) { tickT = performance.now(); raf = requestAnimationFrame(frame); } }

  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;      // never fight native touch scrolling
    cancelAnimationFrame(raf); raf = 0;
    dragging = true; moved = false; pid = e.pointerId;
    startX = e.clientX; startScroll = el.scrollLeft;
    lastX = e.clientX; lastT = performance.now(); vel = 0;
    el.setPointerCapture(pid);
    el.classList.add('is-dragging');
  });
  el.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== pid) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    const max = maxScroll(), target = startScroll - dx;
    if (target < 0) { setOver(rubber(-target, el.clientWidth || 1)); el.scrollLeft = 0; }
    else if (target > max) { setOver(-rubber(target - max, el.clientWidth || 1)); el.scrollLeft = max; }
    else { el.scrollLeft = target; if (over) setOver(0); }
    const now = performance.now(), mdt = Math.max(8, now - lastT);
    vel = (e.clientX - lastX) / (mdt / 1000);
    lastX = e.clientX; lastT = now;
  });
  function release(e) {
    if (!dragging || (e && e.pointerId !== pid)) return;
    dragging = false;
    el.classList.remove('is-dragging');
    if (moved) {
      // swallow the click a drag-release generates on whatever's under the pointer,
      // so letting go over a thumbnail doesn't also select it
      const swallow = ev => { ev.preventDefault(); ev.stopPropagation(); };
      el.addEventListener('click', swallow, { capture: true, once: true });
    }
    wake();
  }
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
}

function initCursor() {
  const cur = $('#cursor'); if (!cur || !window.matchMedia('(hover:hover) and (pointer:fine)').matches || RM()) { if (cur) cur.style.display = 'none'; return; }
  const dot = $('.cursor__dot', cur), ring = $('.cursor__ring', cur), lbl = $('.cursor__lbl', cur);
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY;
    const t = e.target.closest('[data-cursor]');
    cur.classList.toggle('is-lg', !!t);
    if (t) lbl.textContent = t.dataset.cursor;
  }, { passive: true });
  (function loop() {
    rx += (x - rx) * .18; ry += (y - ry) * .18;
    dot.style.transform = `translate(${x}px,${y}px)`;
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(loop);
  })();
}

function initScroll() {
  const hdr = $('#hdr'), prog = $('#hdrprog'), fill = $('#needlefill'), lab = $('#needlelabel');
  let ticking = false;
  function upd() {
    ticking = false;
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    const p = h > 0 ? Math.min(1, y / h) : 0;
    if (prog) prog.style.transform = `scaleX(${p})`;
    if (fill) fill.style.height = (p * 100) + '%';
    const home = location.hash === '#/' || location.hash === '' || location.hash === '#';
    const solid = home ? y > innerHeight * .78 : true;
    hdr.classList.toggle('is-solid', solid);
    hdr.classList.toggle('is-hero', home && !solid);
    let name = '';
    $$('[data-section]').forEach(s => { const r = s.getBoundingClientRect(); if (r.top <= innerHeight * .5 && r.bottom > innerHeight * .35) name = s.dataset.section; });
    if (lab && name && lab.textContent !== name) { lab.textContent = name; }
    if (typeof window.__onGround === 'function') window.__onGround();
    if (typeof window.__onScroll === 'function') window.__onScroll(y);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  addEventListener('resize', upd, { passive: true });
  upd();
}

const revealIO = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); } });
}, { threshold: .16, rootMargin: '0px 0px -8% 0px' });

const GLYPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·#';
function scramble(el) {
  if (RM()) { el.textContent = el.dataset.txt; return; }
  const final = el.dataset.txt; let i = 0;
  const id = setInterval(() => {
    i++;
    el.textContent = final.slice(0, i) + Array.from({ length: Math.max(0, final.length - i) },
      () => GLYPH[(Math.random() * GLYPH.length) | 0]).join('');
    if (i >= final.length) { clearInterval(id); el.textContent = final; }
  }, 24);
}
const scrambleIO = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { scramble(e.target); scrambleIO.unobserve(e.target); } });
}, { threshold: .5 });

function countUp(el) {
  const target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '', pre = el.dataset.pre || '';
  if (RM()) { el.textContent = pre + target.toLocaleString('en-IN') + suffix; return; }
  const t0 = performance.now(), dur = 900;
  (function step(t) {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
    el.textContent = pre + Math.round(target * e).toLocaleString('en-IN') + (k === 1 ? suffix : '');
    if (k < 1) requestAnimationFrame(step);
  })(performance.now());
}
const countIO = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { countUp(e.target); countIO.unobserve(e.target); } });
}, { threshold: .6 });

function bindEffects(root = document) {
  $$('.reveal', root).forEach(el => revealIO.observe(el));
  $$('.lines', root).forEach(el => revealIO.observe(el));
  $$('[data-txt]', root).forEach(el => { el.textContent = ''; scrambleIO.observe(el); });
  $$('[data-count]', root).forEach(el => countIO.observe(el));
  $$('.btn--primary, .btn--secondary', root).forEach(btn => {
    if (RM() || btn.__mag) return; btn.__mag = 1;
    const inner = $('.btn__mag', btn); if (!inner) return;
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d < 90) inner.style.transform = `translate(${dx * .06}px,${dy * .06}px)`;
    });
    btn.addEventListener('pointerleave', () => { inner.style.transform = ''; });
  });
}

/* ---------- FLIP: card → PDP ---------- */
let flipSource = null;
function captureFlip(card) {
  const media = $('[data-media]', card); if (!media || RM()) return;
  const r = media.getBoundingClientRect();
  flipSource = { html: media.innerHTML, rect: r };
}
function playFlip(target) {
  if (!flipSource || RM() || !target) { flipSource = null; return; }
  const { html, rect } = flipSource; flipSource = null;
  const to = target.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;
    z-index:940;pointer-events:none;display:grid;place-items:center;overflow:hidden`;
  ghost.innerHTML = html;
  $$('.card__add, .card__badge', ghost).forEach(n => n.remove());
  document.body.appendChild(ghost);
  target.style.opacity = '0';
  const sx = to.width / rect.width, sy = to.height / rect.height, s = Math.min(sx, sy);
  ghost.animate([
    { transform: 'translate(0,0) scale(1)' },
    { transform: `translate(${to.left + to.width / 2 - (rect.left + rect.width / 2)}px,${to.top + to.height / 2 - (rect.top + rect.height / 2)}px) scale(${s})` }
  ], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => {
    ghost.remove(); target.style.opacity = '';
  };
}

/* ---------- forms ---------- */
function submitForm(type, payload) {
  /* SINGLE INTEGRATION POINT — wire to Shopify / Formspree / webhook here.
     Receives: (type: 'newsletter'|'custom'|'contact', payload: object) */
  console.log('[PastForward] submitForm stub', type, payload);
  return Promise.resolve({ ok: true });
}
function checkout(lines) {
  /* SINGLE INTEGRATION POINT — build a Shopify permalink / cart payload and redirect.
     Needs: [{ sku, slug, format, qty, price }] */
  console.log('[PastForward] checkout stub', lines);
  toast('Checkout is not wired yet — this is the integration point');
}

/* ---------- router ---------- */
function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, q] = raw.split('?');
  return { path: path.replace(/\/+$/, '') || '/', params: new URLSearchParams(q || '') };
}
function render() {
  const { path, params } = parseHash();
  const seg = path.split('/').filter(Boolean);
  const main = $('#main');
  let out, title = 'PastForward — designed from memory, made for now';
  if (!seg.length) { out = viewHome(); }
  else if (seg[0] === 'shop') { out = viewShop(seg[1], params); title = 'The catalogue | PastForward'; }
  else if (seg[0] === 'product' && bySlug[seg[1]]) { const p = bySlug[seg[1]]; out = viewProduct(p, params); title = `${albumText(p)} — ${p.artist} | PastForward`; }
  else if (seg[0] === 'collections') { out = viewCollection(seg[1]); }
  else if (seg[0] === 'custom') { out = viewCustom(); title = 'Custom orders | PastForward'; }
  else if (seg[0] === 'story') { out = viewStory(); title = 'Our story | PastForward'; }
  else if (seg[0] === 'faq') { out = viewFaq(); title = 'FAQ | PastForward'; }
  else if (seg[0] === 'contact') { out = viewContact(); title = 'Contact | PastForward'; }
  else if (seg[0] === 'search') { out = viewSearch(params); title = 'Search | PastForward'; }
  else if (seg[0] === 'cart') { out = viewCart(); title = 'The crate | PastForward'; }
  else if (seg[0] === 'wall') { out = viewWall(); title = 'Customer walls | PastForward'; }
  else if (seg[0] === 'policies') { out = viewPolicy(seg[1]); }
  else { out = view404(); title = 'Not found | PastForward'; }

  document.title = title;
  main.innerHTML = out;
  bindEffects(main);
  $$('.hdr__nav [data-nav]').forEach(a => a.classList.toggle('is-active', a.dataset.nav === seg[0]));
  if (typeof window.__afterRender === 'function') window.__afterRender(seg, params);
  window.__onScroll = null;
  if (typeof window.__mount === 'function') window.__mount(seg, params);
  if (!RM()) main.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
    { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
}
function go(hash) { location.hash = hash; }

/* ---------- global events ---------- */
addEventListener('hashchange', () => { const p = parseHash().path; if (!p.startsWith('/product')) scrollTo(0, 0); else scrollTo(0, 0); render(); });
document.addEventListener('click', e => {
  const card = e.target.closest('[data-card]');
  if (card && !e.target.closest('[data-add]')) captureFlip(card);
  const add = e.target.closest('[data-add]');
  if (add) { e.preventDefault(); const [s, f] = add.dataset.add.split('|'); addToCart(s, f); return; }
  if (e.target.closest('[data-close]') || e.target.id === 'scrim') { closeAll(); return; }
  const q = e.target.closest('[data-q]');
  if (q) { const [i, d] = q.dataset.q.split('|').map(Number); cart[i].qty += d; if (cart[i].qty < 1) cart.splice(i, 1); saveCart(); syncCart(); return; }
  const rm = e.target.closest('[data-rm]');
  if (rm) { cart.splice(+rm.dataset.rm, 1); saveCart(); syncCart(); return; }
  if (e.target.closest('[data-checkout]')) { checkout(cart.map(l => ({ ...l, sku: variant(bySlug[l.slug], l.format).sku }))); return; }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(f));
  const btn = $('button', f); if (btn) btn.disabled = true;
  submitForm(f.dataset.form, data).then(() => {
    const msg = f.parentElement.querySelector('[data-form-msg]');
    const success = f.dataset.success || "You're on the list.";
    if (msg) { msg.innerHTML = `<p class="d-s" style="margin-top:14px" role="status">${esc(success)}</p>`; f.style.display = 'none'; }
    if (!RM() && msg) msg.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.16,1,.3,1)' });
  });
});
addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAll();
  if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
});
function openSearch() {
  lastFocus = document.activeElement;
  $('#search').classList.add('is-open'); document.body.style.overflow = 'hidden';
  const i = $('#searchinput'); i.value = ''; $('#searchres').innerHTML = searchResults('');
  setTimeout(() => i.focus(), 60);
}
function searchResults(q) {
  const list = searchProducts(q);
  if (!q) return `<div class="mono-xs dim" style="margin-bottom:14px">People searched</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${COLS.slice(0, 3).map(c => `<a class="pill" href="#/collections/${c.slug}" data-close>${esc(c.name)}</a>`).join('')}</div>
    <div class="grid" style="margin-top:28px">${P.filter(p => p.featured).slice(0, 4).map(cardHTML).join('')}</div>`;
  if (!list.length) return `<p class="d-s">Nothing under that name yet.</p>
    <p class="body-s dim">We can still make it — <a href="#/custom" data-close style="color:var(--ember)">ask for a custom one</a>.</p>`;
  return `<div class="mono-xs dim" style="margin-bottom:14px">${list.length} result${list.length > 1 ? 's' : ''}</div>
    <div class="grid">${list.slice(0, 12).map(cardHTML).join('')}</div>`;
}
function norm(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, ''); }
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function searchProducts(q) {
  const nq = norm(q).trim(); if (!nq) return [];
  return P.filter(p => {
    const hay = norm(p.artist + ' ' + p.album);
    if (hay.includes(nq)) return true;
    return nq.split(' ').every(t => hay.split(' ').some(w => lev(w, t) <= (t.length > 5 ? 2 : 1)));
  });
}
