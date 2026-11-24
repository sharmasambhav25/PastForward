/* ============================================================
   PastForward — core: helpers, components, chrome, router
   ============================================================ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const RM = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const money = n => '₹' + Number(n).toLocaleString('en-IN');
/* The facts the site repeats (email, delivery time, shipping, payments, FAQ, policies, page titles)
   live in src/site.json and arrive here as window.__SITE__. Change them there, not here. */
const SITE = window.__SITE__ || {};
// phones get the same wordmark at 900px wide (35 KB) instead of 1400px (85 KB)
if (window.__WORDMARK_SM__ && window.matchMedia('(max-width:767px)').matches) window.__WORDMARK__ = window.__WORDMARK_SM__;
const SHIP = SITE.shipping || {};
// vinyl sale: the MRP is shown struck through beside the sale price, everywhere a vinyl price appears
const MRP = SITE.mrp || {};
const priceHTML = (format, price) => MRP[format] && MRP[format] > price
  ? `<s class="mrp num">${money(MRP[format])}</s> <span class="sale num">${money(price)}</span>` : money(price);
// sizes not measured yet (the polaroid card) show nothing rather than a placeholder
// the poster family, one heading per size (header menu + tabs on the posters pages)
const SIZE_TABS = [
  { key: 'a3', name: 'A3 Posters', short: 'A3', f: 'poster-a3', href: '/posters/a3', dim: '297 × 420mm' },
  { key: 'a5', name: 'A5 Posters', short: 'A5', f: 'poster-a5', href: '/posters/a5', dim: '148 × 210mm' },
  { key: '10x10', name: '10×10 Prints', short: '10×10', f: 'print-10', href: '/posters/10x10', dim: '254 × 254mm' },
  { key: 'polaroid', name: 'Polaroids', short: 'Polaroid', f: 'polaroid', href: '/polaroids', dim: 'Pocket-size prints' },
];
const sizeOf = f => (f && f.size && f.size !== '[CONFIRM]') ? f.size : '';
/* custom page: the record is just "12-inch", no millimetres */
const customSize = f => f === FMT.vinyl ? '12-inch record' : sizeOf(f);
const CONTACT_EMAIL = SITE.email;
const DELIVERY = SITE.delivery;
/* "Order today, arrives Thu 27 Nov – Sun 30 Nov": the stated delivery window (site.json) turned into dates */
function arriveWindow(from = new Date()) {
  const m = String(DELIVERY).match(/(\d+)\D+(\d+)/); if (!m) return '';
  const d = n => { const x = new Date(from); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); };
  return `${d(+m[1])} – ${d(+m[2])}`;
}
const IG_URL = 'https://instagram.com/' + SITE.instagram;
const waLink = text => 'https://wa.me/' + SITE.whatsapp + (text ? '?text=' + encodeURIComponent(text) : '');
const mailLink = (subject, body) => 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) + (body ? '&body=' + encodeURIComponent(body) : '');
const isPhone = () => window.matchMedia('(max-width:767px)').matches;
/* WebGL without a real GPU behind it (graphics acceleration switched off, a virtual machine, a
   blocklisted driver) draws the 3D record at about a frame a second and freezes the page for
   seconds while it sets up. Those machines get the CSS record and still backdrops instead.
   ?gl=1 forces the WebGL path (used by verify_site.js, which only has a software renderer). */
const fastGL = (() => {
  let v;
  return () => {
    if (v !== undefined) return v;
    if (/[?&]gl=1\b/.test(location.search)) return (v = true);
    try {
      const c = document.createElement('canvas'), o = { failIfMajorPerformanceCaveat: true };
      const gl = c.getContext('webgl2', o) || c.getContext('webgl', o);
      // some browsers hand back a software renderer without calling it a caveat; its name gives it away
      const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
      const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      v = !!gl && !/swiftshader|llvmpipe|software|basic render/i.test(name);
      const lose = gl && gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    } catch (e) { v = false; }
    return v;
  };
})();
const ICON_LOCK = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const ICON_CHECK = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICON_TRUCK = '<svg class="ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7"/><circle cx="6" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/></svg>';
/* the reassurance line: only things that are true today, read from site.json */
function assureHTML(format, cls = '') {
  const items = [SHIP.label, 'Delivered in ' + DELIVERY, format === 'vinyl' ? 'Wall hook included' : '', 'Arrives damaged? We replace it'].filter(Boolean);
  return `<ul class="assure ${cls}">${items.map(t => `<li>${ICON_CHECK}<span>${esc(t)}</span></li>`).join('')}</ul>`;
}
const payLine = () => `${ICON_LOCK}<span>Secure checkout · ${esc(SITE.payments)}${SITE.cod ? ' · Cash on delivery' : ''}</span>`;
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
window.imgSrc = imgSrc;
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
        </defs>
        <text><textPath href="#pfT${uid}" startOffset="50%" text-anchor="middle">PASTFORWARD · ESTD 2025</textPath></text>
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
function cardHTML(p, targetFormat) {
  let v;
  if (targetFormat === 'posters') {
    v = p.variants.find(x => ['poster-a3', 'poster-a5', 'print-10'].includes(x.format)) || primary(p);
  } else if (Array.isArray(targetFormat)) {
    v = targetFormat.map(f => p.variants.find(x => x.format === f)).find(Boolean) || primary(p);
  } else if (targetFormat) {
    v = p.variants.find(x => x.format === targetFormat) || primary(p);
  } else {
    v = primary(p);
  }
  const ar = v.format === 'vinyl' || v.format === 'print-10' ? 1 : v.ratio;

  /* Clean card (Nov 2026): the picture, then album, artist and price in plain type, and a round
     add button on the picture's corner. A record is shown close up so its label can be read. */
  const kind = v.format === 'vinyl' ? '' : v.format === 'polaroid' ? 'Polaroid' : esc(v.label);
  const bag = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/><path d="M12 12v4M10 14h4"/></svg>';
  return `<a class="card card--${v.format === 'vinyl' ? 'rec' : v.format === 'polaroid' ? 'pol' : 'art'}" href="/product/${p.slug}?format=${v.format}" data-card="${p.slug}" data-cursor="VIEW">
    <div class="card__media" style="aspect-ratio:${v.format === 'vinyl' ? 1 : '4/5'}" data-media>
      ${v.format === 'vinyl' ? recordHTML(p, { size: 210 })
        : v.format === 'polaroid' ? polaroidHTML(v, { style: 'width:62%' })
        : frameHTML(v, { style: 'height:100%;width:auto;aspect-ratio:' + ar })}
    </div>
    <div class="card__meta">
      <span class="card__album">${albumOf(p)}</span>
      <span class="card__artist">${esc(p.artist)}${kind ? ` · ${kind}` : ''}</span>
      <span class="card__price num">${priceHTML(v.format, v.price)}</span>
    </div>
    <button class="card__add" data-add="${p.slug}|${v.format}" aria-label="Add ${esc(albumText(p))} to cart, ${money(v.price)}">${bag}<span class="card__addt">Add to cart</span></button></a>`;
}

/* a size chip on a poster card: same design, other size. Swaps picture, price, link and add button. */
function pickChip(chip) {
  const [slug, f] = chip.dataset.chip.split('|'), p = bySlug[slug], v = p && variant(p, f);
  const card = chip.closest('.ag'); if (!v || !card) return;
  card.querySelectorAll('[data-chip]').forEach(c => { const on = c === chip; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
  const head = card.querySelector('.ag__head'); if (head) head.setAttribute('href', `/product/${slug}?format=${f}`);
  const media = card.querySelector('.ag__media');
  if (media) { media.style.aspectRatio = f === 'print-10' ? '1' : '3/4'; media.innerHTML = frameHTML(v, { style: 'height:100%;width:auto;aspect-ratio:' + v.ratio }); }
  const price = card.querySelector('.ag__sub'); if (price) price.innerHTML = `<span>${priceHTML(f, v.price)}</span>`;
  const add = card.querySelector('.ag__quick');
  if (add) { add.dataset.add = `${slug}|${f}`; add.setAttribute('aria-label', `Add ${albumText(p)} ${v.label} to cart, ${money(v.price)}`); }
}

/* ---------- cart ---------- */
const CART_KEY = 'pf_cart_v1';
let cart = [];
try { const raw = localStorage.getItem(CART_KEY); if (raw) cart = JSON.parse(raw).filter(l => bySlug[l.slug] && FMT[l.format]); } catch (e) { cart = []; }
function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} }
function cartCount() { return cart.reduce((n, l) => n + l.qty, 0); }
function addToCart(slug, format, qty = 1, originEl, opt = {}) {
  const p = bySlug[slug], v = variant(p, format); if (!v) return;
  const line = cart.find(l => l.slug === slug && l.format === format);
  if (line) line.qty += qty; else cart.push({ slug, format, qty, price: v.price });
  saveCart(); syncCart(true);
  /* Phones: adding from a product page opens the crate (its own confirmation). A quick add from a
     grid stays on the page, so three records for a bundle is three taps, and the crate bar at the
     bottom keeps count. Laptops get a toast either way. */
  const phone = window.matchMedia('(max-width:1023px)').matches;
  const drawerOpens = phone && !opt.quiet && !(opt.stay && $('#cratebar') && $('#cratebar').classList.contains('is-on'));
  if (!phone) toast(`Added — ${albumText(p)}, ${v.label}`);
  if (originEl && opt.stay) { originEl.classList.add('is-added'); setTimeout(() => originEl.classList.remove('is-added'), 1300); }
  Track.add(p, v, qty);
  Sound.tick();
  const bounceBadge = () => { const badge = $('#cartcount'); if (badge && !RM() && badge.animate) { try { badge.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.34,1.32,.64,1)' }); } catch (e) {} } };
  flyToCart(originEl, bounceBadge);
  if (drawerOpens) openDrawer();
}
/* Flies a small ghost from the clicked element to the cart icon — the
   visual "causality" link between pressing Add and the cart updating.
   Falls back to firing onLand immediately when there's nothing to
   animate from, under reduced motion, or if either rect is empty. */
function flyToCart(originEl, onLand) {
  const cartBtn = $('#cartbtn');
  if (RM() || !originEl || !cartBtn) { if (onLand) onLand(); return; }
  const from = originEl.getBoundingClientRect(), to = cartBtn.getBoundingClientRect();
  if (!from.width || !to.width) { if (onLand) onLand(); return; }
  const ghost = document.createElement('div');
  ghost.className = 'fly-ghost'; ghost.setAttribute('aria-hidden', 'true');
  ghost.style.left = (from.left + from.width / 2 - 8) + 'px';
  ghost.style.top = (from.top + from.height / 2 - 8) + 'px';
  document.body.appendChild(ghost);
  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
  const arc = -Math.max(60, Math.abs(dy) * .6);
  const anim = ghost.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0 },
    { transform: `translate(${dx * .55}px, ${dy * .55 + arc}px) scale(.65)`, opacity: 1, offset: .6 },
    { transform: `translate(${dx}px, ${dy}px) scale(.15)`, opacity: 0, offset: 1 }
  ], { duration: 620, easing: 'cubic-bezier(.32,.8,.42,1)' });
  anim.onfinish = () => { ghost.remove(); if (onLand) onLand(); };
}
/* ---------- bundles (site.json > bundles) ----------
   Shopify takes one discount code per order and each bundle code applies once,
   so the crate gets the single bundle that saves the most. */
const BUNDLES = ((SITE.bundles || {}).list || []);
const LIVE_BUNDLES = BUNDLES.filter(b => b.live);
function bundleCounts(lines) {
  const n = {}; lines.forEach(l => { n[l.format] = (n[l.format] || 0) + l.qty; }); return n;
}
function bundleFits(b, lines) {
  // BUNDLEPAIR in Shopify: buy any record, get ₹149 off any 10×10 print (once per order)
  if (b.pair) return lines.some(l => l.format === 'vinyl') && lines.some(l => l.format === 'print-10');
  const n = bundleCounts(lines);
  return Object.entries(b.need || {}).every(([f, k]) => (n[f] || 0) >= k);
}
function bestBundle(lines) {
  return LIVE_BUNDLES.filter(b => bundleFits(b, lines)).sort((a, b) => b.off - a.off)[0] || null;
}
/* the closest bundle that would save more than what the crate gets now: "add 1 more record" */
function bundleNudge(lines, current) {
  const n = bundleCounts(lines); let best = null;
  LIVE_BUNDLES.forEach(b => {
    if (b.pair || (current && b.off <= current.off)) return;
    const [f, k] = Object.entries(b.need || {})[0] || []; if (!f) return;
    const left = k - (n[f] || 0);
    if (left > 0 && left < k && left <= 2 && (!best || b.off > best.b.off)) best = { b, f, left };
  });
  return best;
}
function bundleWord(f, k) {
  const w = { vinyl: ['record', 'records'], 'poster-a3': ['A3 poster', 'A3 posters'], 'poster-a5': ['A5 poster', 'A5 posters'], 'print-10': ['10×10 print', '10×10 prints'], polaroid: ['polaroid', 'polaroids'] }[f] || ['piece', 'pieces'];
  return k === 1 ? w[0] : w[1];
}
function cartMaths() {
  let sub = 0; cart.forEach(l => sub += l.price * l.qty);
  const bundle = bestBundle(cart), saved = bundle ? bundle.off : 0;
  const goods = sub - saved;
  // the delivery fee checkout will add (site.json > shipping), so the crate total matches what they pay
  const ship = SHIP.free && SHIP.freeFrom && SHIP.fee && goods > 0 && goods < SHIP.freeFrom ? SHIP.fee : 0;
  return { sub, bundle, saved, sets: bundle ? 1 : 0, goods, ship, total: goods + ship, nudge: bundleNudge(cart, bundle) };
}
function bundleRowsHTML(m) {
  const nudge = m.nudge ? `<a class="bnudge" href="${m.nudge.b.href}" data-close>Add ${m.nudge.left} more ${bundleWord(m.nudge.f, m.nudge.left)} · <b>${esc(m.nudge.b.name)} for ${money(m.nudge.b.price)}</b><span aria-hidden="true">→</span></a>` : '';
  return (m.bundle ? `<div class="row bundle-row"><span>Bundle · ${esc(m.bundle.name)}</span><span>−${money(m.saved)}</span></div>` : '') + nudge;
}
/* ---------- the crate bar (phones and tablets): what's in the crate, one tap from checkout ---------- */
function crateBarHTML() {
  const m = cartMaths(), n = cartCount();
  const thumbs = cart.slice(-3).map(l => { const p = bySlug[l.slug], v = variant(p, l.format);
    return `<i class="cratebar__th${v.format === 'vinyl' ? ' is-rec' : ''}"><img src="${imgSrc(v.image)}" alt="" decoding="async"></i>`; }).join('');
  // short enough to read at a glance on a 360px phone
  const sub = m.nudge ? `${m.nudge.left} more = ${m.nudge.b.short || m.nudge.b.name} ${money(m.nudge.b.price)}`
    : m.bundle ? `Bundle on · you save ${money(m.saved)}`
    : SHIP.freeFrom && m.goods < SHIP.freeFrom ? `${money(SHIP.freeFrom - m.goods)} more for free delivery` : 'Free delivery';
  return `<button class="cratebar__open" data-opencrate aria-label="Open your crate: ${n} ${n === 1 ? 'piece' : 'pieces'}, ${money(m.total)}">
      <span class="cratebar__stack" aria-hidden="true">${thumbs}</span>
      <span class="cratebar__txt"><b>${n} in your crate</b><i>${esc(sub)}</i></span></button>
    <button class="cratebar__go" data-checkout><span>Checkout</span><span class="num">${money(m.total)}</span></button>`;
}
function syncCrateBar(bump) {
  const el = $('#cratebar'); if (!el) return;
  const seg = (parseHash().path.split('/')[1] || '');
  const small = window.matchMedia('(max-width:1023px)').matches;
  // pages with their own bottom bar or a form keep the space; the home hero stays clean until you scroll
  const blocked = ['product', 'cart', 'build-your-wall', 'custom'].includes(seg) || (!seg && scrollY < innerHeight * .55);
  const on = small && cartCount() > 0 && !blocked;
  if (on) el.innerHTML = crateBarHTML();
  el.classList.toggle('is-on', on); el.setAttribute('aria-hidden', String(!on));
  document.body.classList.toggle('has-cratebar', on);
  if (on && bump && !RM() && el.animate) { try { el.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-6px) scale(1.025)' }, { transform: 'translateY(0) scale(1)' }], { duration: 420, easing: 'cubic-bezier(.3,1.6,.5,1)' }); } catch (e) {} }
}
let crateTick = 0;
addEventListener('scroll', () => { if (crateTick) return; crateTick = requestAnimationFrame(() => { crateTick = 0; if (!parseHash().path.split('/')[1]) syncCrateBar(); }); }, { passive: true });
addEventListener('resize', () => syncCrateBar(), { passive: true });

function syncCart(bump) {
  syncCrateBar(bump);
  const n = cartCount(), badge = $('#cartcount');
  if (badge) { badge.textContent = n; badge.style.display = n ? 'grid' : 'none'; }
  const body = $('#drawerbody'); if (body) body.innerHTML = cartLinesHTML();
  const ft = $('#drawerft'); if (ft) ft.innerHTML = cartFootHTML();
  if (routeHash().startsWith('#/cart') && $('#main')) { const y = scrollY; render({ quiet: true }); scrollTo({ top: y, left: 0, behavior: 'instant' }); }
}
function cartLinesHTML() {
  if (!cart.length) return `<div style="padding:56px 0;text-align:center">
      <p class="d-s" style="margin-bottom:8px">Nothing in the crate yet.</p>
      <a class="btn btn--secondary" href="/vinyl" data-close>Browse the catalogue</a></div>`;
  return cart.map((l, i) => {
    const p = bySlug[l.slug], v = variant(p, l.format);
    return `<div class="line">
      <div class="line__img">${v.format === 'vinyl' ? recordHTML(p, { size: 60 }) : `<img src="${imgSrc(v.image)}" alt="">`}</div>
      <div style="flex:1;min-width:0">
        <div class="card__artist">${esc(p.artist)}</div>
        <div class="line__alb">${albumOf(p)}</div>
        <div class="card__size" style="margin-top:3px">${esc(v.label)}${sizeOf(v) ? ' · ' + esc(sizeOf(v)) : ''}</div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:10px">
          <span class="qty"><button data-q="${i}|-1" aria-label="Decrease">−</button><span class="num">${l.qty}</span><button data-q="${i}|1" aria-label="Increase">+</button></span>
          <span class="num line__amt">${money(l.price * l.qty)}</span>
          <button class="line__rm" data-rm="${i}" aria-label="Remove ${esc(albumText(p))}">Remove</button>
        </div></div></div>`;
  }).join('');
}
/* what delivery will cost for this cart, as the checkout will charge it (site.json > shipping) */
function shippingRow(total) {
  if (!SHIP.free) return '<span class="dim">Shown at checkout</span>';
  if (!SHIP.freeFrom || total >= SHIP.freeFrom) return '<span class="ok">Free</span>';
  return SHIP.fee ? `<span>${money(SHIP.fee)} <span class="dim">· free over ${money(SHIP.freeFrom)}</span></span>`
    : `<span class="dim">Free over ${money(SHIP.freeFrom)}</span>`;
}
/* how far the crate is from free delivery (0 when it's already free or there's no fee) */
function shipGap(m) { return SHIP.fee && SHIP.freeFrom && m.goods > 0 && m.goods < SHIP.freeFrom ? SHIP.freeFrom - m.goods : 0; }
/* the free-delivery meter: how much more, what it saves, and a bar that fills */
function freeShipHTML(m) {
  if (!SHIP.fee || !SHIP.freeFrom || !m.goods) return '';
  const gap = shipGap(m), pct = Math.min(100, Math.round(m.goods / SHIP.freeFrom * 100));
  return `<div class="fship${gap ? '' : ' is-done'}" role="status">
      <div class="fship__t">${gap ? `Add <b>${money(gap)}</b> more and delivery is free <span class="dim">· saves ${money(SHIP.fee)}</span>`
        : `Delivery is free on this order`}</div>
      <div class="fship__bar" aria-hidden="true"><i style="width:${pct}%"></i></div></div>`;
}
/* one add-on worth offering: the same album in a cheaper format that isn't in the cart yet.
   When the crate is short of free delivery, prefer the cheapest one that gets it over the line. */
function cartAddon() {
  const gap = shipGap(cartMaths());
  if (gap) {
    const opts = [];
    for (const l of cart) {
      const p = bySlug[l.slug];
      ['polaroid', 'poster-a5', 'print-10', 'poster-a3', 'vinyl'].forEach(f => { const x = variant(p, f);
        if (x && x.price >= gap && !cart.some(c => c.slug === p.slug && c.format === x.format)) opts.push({ p, v: x, clears: true }); });
    }
    opts.sort((a, b) => a.v.price - b.v.price);
    if (opts[0]) return opts[0];
  }
  for (const l of cart) {
    const p = bySlug[l.slug];
    const v = ['polaroid', 'poster-a5', 'poster-a3', 'print-10'].map(f => variant(p, f))
      .find(x => x && x.price < l.price && !cart.some(c => c.slug === p.slug && c.format === x.format));
    if (v) return { p, v };
  }
  return null;
}
function addonHTML() {
  const a = cartAddon(); if (!a) return '';
  return `<div class="addon">
      <img src="${imgSrc(a.v.image)}" alt="" loading="lazy" decoding="async">
      <div class="addon__t"><span class="mono-xs dim">${a.clears ? 'Add this and delivery is free' : 'Goes with it'}</span><span>${albumOf(a.p)} · ${esc(a.v.label)}</span></div>
      <button class="addon__b" data-add="${a.p.slug}|${a.v.format}" aria-label="Add ${esc(albumText(a.p))}, ${esc(a.v.label)}">Add · ${money(a.v.price)}</button>
    </div>`;
}
function cartFootHTML() {
  if (!cart.length) return '';
  const m = cartMaths();
  return `${freeShipHTML(m)}${addonHTML()}<div class="receipt" style="margin-bottom:16px">
      <div class="row"><span>${cartCount()} in the crate</span><span>${money(m.sub)}</span></div>
      ${bundleRowsHTML(m)}
      <div class="row"><span>Delivery</span>${shippingRow(m.goods)}</div>
      <div class="row eta-row"><span>Arrives</span><span>${arriveWindow()}</span></div>
      <div class="row total"><span>Total</span><span>${money(m.total)}</span></div></div>
    <button class="btn btn--primary" style="width:100%" data-checkout><span class="btn__mag">Checkout</span><span class="btn__amt num">${money(m.total)}</span></button>
    <p class="payline mono-xs dim">${payLine()}</p>`;
}

/* ---------- toast ---------- */
function toast(msg) {
  const wrap = $('#toasts'); if (!wrap) return;
  while (wrap.children.length >= 2) removeToast(wrap.firstElementChild, true);
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = `${esc(msg)}<span class="toast__bar"></span>`;
  wrap.appendChild(t); setTimeout(() => removeToast(t), 4000);
}
/* Removes a toast with a spring-out instead of just vanishing, then lets
   any sibling left in the stack slide smoothly into its new spot (a small
   FLIP) rather than snapping up when the gap closes. `instant` skips the
   exit animation for the forced eviction when a third toast arrives. */
function removeToast(t, instant) {
  if (!t || !t.parentNode) return;
  const wrap = t.parentNode;
  const settle = () => {
    const siblings = Array.from(wrap.children).filter(c => c !== t);
    const before = siblings.map(c => c.getBoundingClientRect().top);
    t.remove();
    if (RM()) return;
    siblings.forEach((c, i) => {
      const dy = before[i] - c.getBoundingClientRect().top;
      if (Math.abs(dy) > .5 && c.animate) { try { c.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.3,1.6,.5,1)' }); } catch (e) {} }
    });
  };
  if (instant || RM()) { settle(); return; }
  if (t.animate) {
    try {
      t.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(6px) scale(.96)' }],
        { duration: 220, easing: 'cubic-bezier(.4,0,1,1)' }).onfinish = settle;
    } catch (e) { settle(); }
  } else { settle(); }
}

/* ---------- drawer / overlays ---------- */
let lastFocus = null;
/* While the cart, menu or search is open, everything behind it is inert: no focus, no clicks,
   hidden from screen readers. aria-modal alone doesn't stop Tab from wandering out. */
function backdropInert(on) {
  ['#hdr', '#mega', '#megaposters', '#cratebar', '#main', '.ftr', '.wafab', '.skip'].forEach(s => { const el = $(s); if (el) el.inert = on; });
}
/* phones: the crate is a bottom sheet. Drag the handle or header down; past a third of its height,
   or flicked faster than 0.5px/ms, it closes. Otherwise it settles back. */
function initSheetDrag() {
  const d = $('#drawer'); if (!d || d.dataset.drag) return; d.dataset.drag = '1';
  const phone = () => matchMedia('(max-width:767px)').matches;
  let y0 = 0, t0 = 0, dy = 0, on = false;
  const start = e => {
    if (!phone() || !d.classList.contains('is-open') || !e.target.closest('.drawer__grab,.drawer__hd') || e.target.closest('button')) return;
    on = true; y0 = e.clientY; t0 = performance.now(); dy = 0; d.classList.add('is-dragging');
    try { d.setPointerCapture(e.pointerId); } catch (er) {}
  };
  const move = e => {
    if (!on) return;
    dy = e.clientY - y0;
    const y = dy > 0 ? dy : dy * 0.2;   // a little give upward, like rubber
    d.style.transform = `translateY(${y}px)`;
    const scrim = $('#scrim'); if (scrim) scrim.style.opacity = String(Math.max(0, 1 - dy / d.offsetHeight));
  };
  const end = () => {
    if (!on) return; on = false; d.classList.remove('is-dragging');
    const v = dy / Math.max(1, performance.now() - t0);
    d.style.transform = ''; const scrim = $('#scrim'); if (scrim) scrim.style.opacity = '';
    if (dy > d.offsetHeight / 3 || v > 0.5) closeAll();
  };
  d.addEventListener('pointerdown', start);
  d.addEventListener('pointermove', move);
  d.addEventListener('pointerup', end);
  d.addEventListener('pointercancel', end);
}
function openDrawer() { initSheetDrag(); backdropInert(true); lastFocus = document.activeElement; $('#drawer').classList.add('is-open'); $('#scrim').classList.add('is-open'); document.body.style.overflow = 'hidden'; const b = $('#drawer button'); if (b) b.focus(); }
function closeAll() {
  ['#drawer', '#menu', '#search'].forEach(s => { const el = $(s); if (el) el.classList.remove('is-open'); });
  $('#scrim').classList.remove('is-open'); $('#mega').classList.remove('is-open');
  const mp = $('#megaposters'); if (mp) mp.classList.remove('is-open');
  document.body.style.overflow = '';
  backdropInert(false);
  if (lastFocus) { try { lastFocus.focus(); } catch (e) {} lastFocus = null; }
}

/* ---------- vinyl sale: running tape ribbon ---------- */
function saleTapeRun(n = 4) {
  const ship = SHIP.label ? `<b>${esc(SHIP.label.split(' ').slice(0, 2).join(' '))}</b><span>${esc(SHIP.label.split(' ').slice(2).join(' '))}</span>` : '';
  // "SALE" and a struck price only while site.json has a real MRP above the selling price
  const onSale = MRP.vinyl > FMT.vinyl.price;
  const one = onSale
    ? `<span class="tape__i"><b>SALE</b><span>Vinyls <s>${money(MRP.vinyl)}</s> <em>${money(FMT.vinyl.price)}</em></span><b>SALE</b><span>Every record</span>${ship}</span>`
    : `<span class="tape__i"><b>Every record</b><span><em>${money(FMT.vinyl.price)}</em></span><b>Wall hook</b><span>included</span>${ship}</span>`;
  const b = LIVE_BUNDLES[0];
  const bun = b ? `<span class="tape__i"><b>BUNDLE</b><span>${esc(b.name)} <em>${money(b.price)}</em></span></span>` : '';
  return (one + bun).repeat(n);
}
function saleRibbon() {
  return `<a class="salebar tape" href="/vinyl" aria-label="${MRP.vinyl > FMT.vinyl.price ? `Vinyl sale: every record ${money(FMT.vinyl.price)}, was ${money(MRP.vinyl)}` : `Every record ${money(FMT.vinyl.price)}`}${SHIP.label ? '. ' + esc(SHIP.label) : ''}"><span class="tape__t" aria-hidden="true">${saleTapeRun()}${saleTapeRun()}</span></a>`;
}
/* The call-to-action pill. `alt` is a second line the label rolls to (decoration: the link is named by `label`). */
function ctaShop(label, href, alt = '', o = {}) {
  const roll = alt ? `<b>${label}</b><b aria-hidden="true">${alt}</b><b aria-hidden="true">${label}</b>` : `<b>${label}</b>`;
  return `<a class="cta-shop${o.sm ? ' cta-shop--sm' : ''}${o.cls ? ' ' + o.cls : ''}" href="${href}"${o.attrs || ''}>
    <span class="cta-shop__fill" aria-hidden="true"></span>
    ${o.sm ? '' : '<span class="cta-shop__disc" aria-hidden="true"><i></i></span>'}
    <span class="cta-shop__txt"><span class="cta-shop__roll${alt ? ' cta-shop__roll--2' : ''}">${roll}</span></span>
    <span class="cta-shop__arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span>
  </a>`;
}
/* ---------- chrome ---------- */
function chromeHTML() {
  return `
  <a class="skip" href="#main">Skip to content</a>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <filter id="spray" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="7" result="rough"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed="9" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.45" result="holes"/>
      <feComposite in="rough" in2="holes" operator="in"/>
    </filter></defs></svg>
  <header class="hdr" id="hdr">${saleRibbon()}<div class="wrap hdr__in">
    <a class="hdr__mark" href="/" aria-label="PastForward home"><img src="${window.__WORDMARK__}" alt="PastForward"></a>
    <nav class="hdr__nav" aria-label="Main">
      <a class="navlink" href="/vinyl" data-nav="vinyl">Vinyls${wave('wave--under')}</a>
      <a class="navlink" href="/posters" data-nav="posters" id="postersbtn" aria-expanded="false">Posters${wave('wave--under')}</a>
      <a class="navlink navlink--hot" href="/bundles" data-nav="bundles">Bundles${wave('wave--under')}</a>
      <a class="navlink" href="/custom" data-nav="custom">Custom Vinyls${wave('wave--under')}</a>
      <a class="navlink" href="/story" data-nav="story">Our Story${wave('wave--under')}</a>
    </nav>
    <div class="hdr__acts">
      <button class="iconbtn" id="searchbtn" aria-label="Search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button>
      <button class="iconbtn" id="cartbtn" aria-label="Open cart"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16l-1.2 12H5.2z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg><span class="cartcount num" id="cartcount" aria-live="polite" style="display:none">0</span></button>
      <button class="iconbtn" id="menubtn" aria-label="Menu"><svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path d="M3 7h18M3 12h18M3 17h18"/></svg></button>
    </div>
    <div class="hdr__prog" id="hdrprog"></div>
  </div></header>

  <div class="mega mega--posters" id="megaposters">
    <h4>Poster Formats</h4>
    <a href="/posters/a3" class="mega__format-link">
      <span class="mega__format-title">A3 Posters</span>
      <span class="mega__format-size">297 × 420mm</span>
    </a>
    <a href="/posters/a5" class="mega__format-link">
      <span class="mega__format-title">A5 Posters</span>
      <span class="mega__format-size">148 × 210mm</span>
    </a>
    <a href="/posters/10x10" class="mega__format-link">
      <span class="mega__format-title">10×10 Format</span>
      <span class="mega__format-size">254 × 254mm</span>
    </a>
    <a href="/polaroids" class="mega__format-link">
      <span class="mega__format-title">Polaroids</span>
      <span class="mega__format-size">Pocket-size prints</span>
    </a>
  </div>

  <div class="mega mega--collections" id="mega">
    <h4>Our Collections</h4>
    <div class="mega__cols-list">
      <div>${COLS.slice(0, 4).map(c => `<a href="/collections/${c.slug}">${esc(c.name)}</a>`).join('')}</div>
      <div>${COLS.slice(4).map(c => `<a href="/collections/${c.slug}">${esc(c.name)}</a>`).join('')}</div>
    </div>
  </div>

  <div id="overlays">
  <div class="scrim" id="scrim"></div>
  <aside class="drawer" id="drawer" role="dialog" aria-label="Cart" aria-modal="true">
    <div class="drawer__grab" aria-hidden="true"><i></i></div>
    <div class="drawer__hd"><span class="drawer__title">The crate</span><button class="iconbtn" data-close aria-label="Close cart">×</button></div>
    <div class="drawer__body" id="drawerbody"></div>
    <div class="drawer__ft" id="drawerft"></div>
  </aside>
  <nav class="menu" id="menu" aria-label="Mobile">
    <button class="iconbtn" data-close aria-label="Close menu" data-x style="position:absolute;top:calc(12px + env(safe-area-inset-top, 0px));right:calc(16px + env(safe-area-inset-right, 0px))">×</button>
    <a href="/vinyl">Vinyls</a>
    <a href="/posters">Posters</a>
    <a href="/bundles" class="menu__hot"><span class="menu__tape">Bundles</span> <span class="menu__tag">${LIVE_BUNDLES[0] ? 'from ' + money(Math.min(...LIVE_BUNDLES.map(b => b.price))) : ''}</span></a>
    <a href="/custom">Custom Vinyls</a>
    <a href="/story">Our Story</a>
    <a href="/faq">FAQ</a>
    <a href="/contact">Contact</a>
    <div style="margin-top:auto;border-top:1px solid var(--border);padding-top:10px;padding-bottom:4px">
      <a href="https://instagram.com/pastforward.shop" target="_blank" rel="noopener" class="mono" style="font-family:var(--mono);font-size:.66rem;color:var(--muted);padding:0">@pastforward.shop ↗</a>
    </div>
  </nav>
  <div class="menu" id="search" role="dialog" aria-label="Search">
    <button class="iconbtn" data-close aria-label="Close search" style="position:absolute;top:calc(12px + env(safe-area-inset-top, 0px));right:calc(16px + env(safe-area-inset-right, 0px))">×</button>
    <div class="searchwrap">
      <div class="searchbar">
        <svg class="searchbar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="searchinput" placeholder="Search by artist, album, or collection..." aria-label="Search the catalogue" autocomplete="off">
        <span class="searchbar__hint mono-xs dim">ESC</span>
      </div>
      <div id="searchres" style="margin-top:24px;max-height:calc(82vh - 100px);overflow-y:auto;-webkit-overflow-scrolling:touch"></div>
    </div>
  </div>
  </div>
  <div class="cratebar" id="cratebar" aria-hidden="true"></div>
  <div class="toasts" id="toasts" aria-live="polite"></div>
  <div class="needle" id="needle" aria-hidden="true">
    <div class="needle__label" id="needlelabel">HOME</div>
    <div class="needle__track"><div class="needle__fill" id="needlefill"></div></div>
  </div>
  <canvas id="grain" aria-hidden="true"></canvas><div id="vignette" aria-hidden="true"></div>
  <div id="field" aria-hidden="true"></div>
  <div id="corners" aria-hidden="false">
  </div>
  ${SITE.whatsapp ? `<a class="wafab" href="${waLink('Hi PastForward, I have a question: ')}" target="_blank" rel="noopener" aria-label="Questions? Message us on WhatsApp"><svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.5-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6.3-.5c.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.6 5.8 5.1 2.8 1.1 3.4.9 4 .8.6-.1 1.9-.8 2.2-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4z"/></svg></a>` : ''}`;
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

/* ---------- preloader: black, the mark, and a very large counter ----------
   Home only, once per visit. It used to run a fixed 1.5s whatever the connection; now the
   counter tracks real readiness (fonts, the hero) and leaves as soon as the page can be seen,
   with a short floor so it still reads as an entrance rather than a flash. Every other page
   (a product someone tapped through to from an ad) opens straight onto its content. */
function initPre(ready) {
  const boot = document.getElementById('boot');
  const done = () => { if (boot) { boot.classList.add('is-out'); setTimeout(() => boot.remove(), 420); } };
  let seen = false;
  try { seen = sessionStorage.getItem('pf_pre') === '1'; sessionStorage.setItem('pf_pre', '1'); } catch (e) {}
  const home = isHome();
  if (RM() || seen || !home || location.search.includes('nopre')) { Promise.resolve(ready).then(done, done); return; }
  const el = document.createElement('div');
  el.id = 'pre'; if (boot) el.className = 'pre--warm';
  el.innerHTML = `<div class="pre__bar"></div>
    <img class="pre__mark" src="${window.__WORDMARK__}" alt="">
    <div class="pre__n num">00</div>
    <div class="pre__cap mono-xs dim">DESIGNED FROM MEMORY, MADE FOR NOW</div>`;
  document.body.appendChild(el);
  if (boot) boot.remove();
  const n = el.querySelector('.pre__n'), bar = el.querySelector('.pre__bar');
  const t0 = performance.now(), MIN = 420, CAP = 3000, OUT = 180;
  let readyAt = 0, from = 0, v = 0;
  const onReady = () => { readyAt = performance.now(); from = v; };
  Promise.resolve(ready).then(onReady, onReady);
  (function tick(t) {
    const age = t - t0;
    if (!readyAt && age > CAP) onReady();                      // never a hang
    // creeps toward 90 while the page gets ready, then runs out to 100 in a fixed quarter second.
    // Both are clocked in time, not frames, so a slow device finishes as promptly as a fast one.
    const k = readyAt ? Math.min(1, (t - readyAt) / OUT) : 0;
    v = readyAt ? from + (100 - from) * k : 90 * (1 - Math.exp(-age / 700));
    n.textContent = String(Math.round(v)).padStart(2, '0');
    bar.style.width = v.toFixed(1) + '%';
    if (k >= 1 && age >= MIN) { el.classList.add('is-out'); setTimeout(() => el.remove(), 420); }
    else requestAnimationFrame(tick);
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
    if (ctx && ctx.state === 'suspended') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
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
      const home = isHome();
      hint.hidden = !home || scrollY > innerHeight * 0.7;
    }
    const mid = innerHeight * 0.5;
    const on = lights().some(el => { const r = el.getBoundingClientRect(); return r.top < mid && r.bottom > mid; });
    document.documentElement.toggleAttribute('data-light', on);
  };
  window.__onGround = test;
  test();
}

/* The list. With a form endpoint set (site.json > forms.endpoint) this is an email box that
   really posts; without one it is an Instagram follow button, because a box that says
   "you're on the list" and stores nothing is worse than no box. */
function listHTML(cls = '') {
  if (SITE.forms && SITE.forms.endpoint) return `<form data-form="newsletter" class="listform ${cls}">
      <input name="email" type="email" required placeholder="your@email.com" aria-label="Email" autocomplete="email">
      <button class="btn btn--primary"><span class="btn__mag">Notify me</span></button>
    </form><div data-form-msg></div>`;
  return `<a class="btn btn--secondary listbtn ${cls}" href="${IG_URL}" target="_blank" rel="noopener"><span class="btn__mag">Follow @${esc(SITE.instagram)}</span></a>`;
}
function popularLinks() {
  const top = new Set(['Travis Scott', 'Karan Aujla', 'Seedhe Maut', 'Diljit Dosanjh', 'Taylor Swift', 'The Weeknd',
                       'Frank Ocean', 'Billie Eilish', 'Lana Del Rey', 'Kanye West', 'AP Dhillon', 'Anuv Jain',
                       'Arctic Monkeys', 'Pink Floyd', 'Coldplay', 'Drake']);
  const landing = Object.entries(SITE.landing || {}).map(([u, L]) => [L.h1.replace(/\.$/, ''), u]);
  const artists = Object.entries(SITE.artistPages || {})
    .filter(([s, A]) => top.has(A.name) || (A.items && A.items.length >= 2))
    .map(([s, A]) => [A.name, '/artist/' + s]);
  return landing.concat(artists);
}
function popularLinksHTML() {
  const l = popularLinks();
  return l.length ? `<nav class="ftr__more" aria-label="Popular"><h4>Popular</h4><div class="ftr__morel">${l.map(([n, u]) => `<a href="${u}">${esc(n)}</a>`).join('')}</div></nav>` : '';
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
        <a href="/vinyl">Vinyls</a><a href="/posters/a3">A3 posters</a><a href="/posters/a5">A5 posters</a>
        <a href="/posters/10x10">10×10 prints</a><a href="/polaroids">Polaroids</a><a href="/custom">Custom vinyls</a></div>
      <div><h4>Help</h4>
        <a href="/faq">Questions</a><a href="/policies/shipping">Shipping</a><a href="/policies/returns">Returns</a>
        <a href="/contact">Contact</a><a href="/story">Our story</a></div>
      <div><h4>New drops</h4>
        <p class="body-s dim" style="margin:0 0 12px">New records and limited runs.</p>
        ${listHTML()}
        <ul class="ftr__facts mono-xs dim">${[SHIP.label, 'Delivered in ' + DELIVERY, 'Secure checkout'].filter(Boolean).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
    </div>
    ${popularLinksHTML()}
    <div class="ftr__base mono-xs dim">
      <span>© 2026 PastForward · estd 2025</span>
      <a href="${IG_URL}" target="_blank" rel="noopener">@${esc(SITE.instagram)}</a>
      <span class="ftr__legal">
        <a href="/policies/privacy">Privacy</a><a href="/policies/terms">Terms</a></span>
    </div></div></footer>`;
}

/* ---------- effects ---------- */
function initGrain() {
  try {
    const c = $('#grain'); if (!c) return;
    const S = 128; c.width = S; c.height = S;
    c.style.width = '100%'; c.style.height = '100%';
    const ctx = c.getContext('2d');
    if (!ctx) return;
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
    if (g && tiles[0]) {
      g.style.backgroundImage = `url(${tiles[0]})`;
      if (RM() || window.matchMedia('(max-width:767px)').matches) return;
      let i = 0;
      setInterval(() => { i = (i + 1) % 4; g.style.backgroundImage = `url(${tiles[i]})`; }, 83);
    }
  } catch (e) {}
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

  let hasCapture = false;
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;      // never fight native touch scrolling
    cancelAnimationFrame(raf); raf = 0;
    dragging = true; moved = false; hasCapture = false; pid = e.pointerId;
    startX = e.clientX; startScroll = el.scrollLeft;
    lastX = e.clientX; lastT = performance.now(); vel = 0;
  });
  el.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== pid) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 6) {
      moved = true;
      if (!hasCapture) {
        try { el.setPointerCapture(pid); hasCapture = true; } catch (err) {}
        el.classList.add('is-dragging');
      }
    }
    if (!moved) return;
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
    if (hasCapture) {
      try { el.releasePointerCapture(pid); } catch (err) {}
      hasCapture = false;
    }
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
  return;   // the site uses the normal system pointer
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
    const home = isHome();
    const threshold = innerHeight * .78;
    const hp = home ? Math.min(1, Math.max(0, y / threshold)) : 1;
    hdr.style.setProperty('--hdrp', hp.toFixed(3));
    hdr.classList.toggle('is-solid', hp >= 1);
    hdr.classList.toggle('is-hero', home && hp < .98);
    let name = '';
    if (window.innerWidth >= 1280) $$('[data-section]').forEach(s => { const r = s.getBoundingClientRect(); if (r.top <= innerHeight * .5 && r.bottom > innerHeight * .35) name = s.dataset.section; });
    if (lab && name && lab.textContent !== name) { lab.textContent = name; }
    if (typeof window.__onGround === 'function') window.__onGround();
    if (typeof window.__onScroll === 'function') window.__onScroll(y);
  }
  addEventListener('scroll', () => { window.__lastScrollAt = performance.now(); if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  addEventListener('resize', upd, { passive: true });
  upd();
}

const revealIO = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); } });
}, { threshold: .16, rootMargin: '0px 0px -8% 0px' });

const GLYPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·#';
function scramble(el) {
  const final = el.dataset.txt || el.textContent;
  if (!final) return;
  if (RM()) { el.textContent = final; return; }
  let i = 0;
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
  $$('[data-txt]', root).forEach(el => { if (!el.textContent) el.textContent = el.dataset.txt || ''; scrambleIO.observe(el); });
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
  // the call-to-action pill: floods from where it's touched, and leans toward a mouse
  $$('.cta-shop', root).forEach(b => {
    if (b.__cta) return; b.__cta = 1;
    const at = e => { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', (e.clientX - r.left) + 'px'); b.style.setProperty('--my', (e.clientY - r.top) + 'px'); };
    b.addEventListener('pointerenter', at);
    b.addEventListener('pointerdown', e => { at(e); if (e.pointerType !== 'mouse') { b.classList.add('is-press'); clearTimeout(b.__pt); b.__pt = setTimeout(() => b.classList.remove('is-press'), 700); } });
    b.addEventListener('pointercancel', () => b.classList.remove('is-press'));
    if (RM()) return;
    b.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = b.getBoundingClientRect();
      b.style.setProperty('--tx', ((e.clientX - (r.left + r.width / 2)) * .14).toFixed(1) + 'px');
      b.style.setProperty('--ty', ((e.clientY - (r.top + r.height / 2)) * .22).toFixed(1) + 'px');
    });
    b.addEventListener('pointerleave', () => { b.style.removeProperty('--tx'); b.style.removeProperty('--ty'); });
  });
}

/* ---------- FLIP: card → PDP ---------- */
let flipSource = null;
function captureFlip(card) {
  // phones: no card-to-page zoom (the small card image blown up across a page change reads as a glitch)
  const media = $('[data-media]', card); if (!media || RM() || window.matchMedia('(max-width:767px)').matches) return;
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
  if (ghost.animate) {
    try {
      ghost.animate([
        { transform: 'translate(0,0) scale(1)' },
        { transform: `translate(${to.left + to.width / 2 - (rect.left + rect.width / 2)}px,${to.top + to.height / 2 - (rect.top + rect.height / 2)}px) scale(${s})` }
      ], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => {
        ghost.remove(); target.style.opacity = '';
      };
    } catch (e) { ghost.remove(); target.style.opacity = ''; }
  } else { ghost.remove(); target.style.opacity = ''; }
}

/* ---------- Shopify Configuration & Checkout Integration ---------- */
const SHOPIFY_CONFIG = {
  storeDomain: window.SHOPIFY_STORE_DOMAIN || 'shop.pastforward.shop',

  // Catalogue SKU -> Shopify variant id (generated into shopify_variants.json, injected by build.py)
  variantIds: window.__SHOPIFY_VARIANTS__ || {},

  // Shopify Variant IDs for each custom-order format:
  // Dynamically resolves from shopify_variants.json (by SKU or format key) with live store fallbacks
  variants: {
    'vinyl': (window.__SHOPIFY_VARIANTS__ && (window.__SHOPIFY_VARIANTS__['PF-CUSTOM-VINYL'] || window.__SHOPIFY_VARIANTS__['vinyl'])) || '46630610108460',
    'poster-a3': (window.__SHOPIFY_VARIANTS__ && (window.__SHOPIFY_VARIANTS__['PF-CUSTOM-POSTER-A3'] || window.__SHOPIFY_VARIANTS__['poster-a3'])) || '46630610141228',
    'print-10': (window.__SHOPIFY_VARIANTS__ && (window.__SHOPIFY_VARIANTS__['PF-CUSTOM-PRINT-10'] || window.__SHOPIFY_VARIANTS__['print-10'])) || '46630610173996',
    'poster-a5': (window.__SHOPIFY_VARIANTS__ && (window.__SHOPIFY_VARIANTS__['PF-CUSTOM-POSTER-A5'] || window.__SHOPIFY_VARIANTS__['poster-a5'])) || '46630610206764',
    'polaroid': (window.__SHOPIFY_VARIANTS__ && (window.__SHOPIFY_VARIANTS__['PF-CUSTOM-POLAROID'] || window.__SHOPIFY_VARIANTS__['polaroid'])) || '46630610239532'
  }
};
window.SHOPIFY_CONFIG = SHOPIFY_CONFIG;

/* ---------- measurement ----------
   The Meta Pixel is off until site.json > tracking.metaPixelId is filled in. The Shopify checkout
   already runs it; without it here too, Meta never sees the product view or the add-to-cart.
   While the id is empty no script is loaded. Campaign tags (utm_*, fbclid) are carried to the
   checkout either way, so Shopify and the checkout's own pixel can still credit the right ad. */
const Track = (() => {
  /* Measurement only runs on the real site. A local preview (localhost, 127.0.0.1, a file:// open)
     and anything Playwright drives in verify_site.js would otherwise fire PageView, ViewContent,
     AddToCart and InitiateCheckout into the live pixel. Meta optimises a sales campaign on exactly
     those events, so a build loop teaches it to find people who add to cart and never buy. Keep
     this gate in front of every sender; a new one that skips it poisons the account quietly. */
  const PROD = /(^|\.)pastforward\.shop$/.test(location.hostname);
  const id = PROD && SITE.tracking && SITE.tracking.metaPixelId;
  const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
  // Where this visit came from (the tags an ad or a shared link put in the address). Kept for this
  // tab only and handed to the Shopify checkout, so an order shows which ad or post produced it.
  // This part runs with or without the pixel: it loads nothing and tells no third party anything.
  let src = {};
  try { src = JSON.parse(sessionStorage.getItem('pf_src') || '{}'); } catch (e) {}
  const q0 = new URLSearchParams(location.search);
  KEYS.forEach(k => { if (q0.get(k)) src[k] = q0.get(k).slice(0, 200); });
  try { if (Object.keys(src).length) sessionStorage.setItem('pf_src', JSON.stringify(src)); } catch (e) {}
  if (id) {
    (function (f, b, e, v, n, t, x) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      /* The queue above holds init and every event. The script is fetched after the first screen has
         rendered (or on the first touch, whichever comes first), so it never competes with the page. */
      let sent = false;
      const load = () => {
        if (sent) return; sent = true;
        try {
          t = b.createElement(e); t.async = true; t.src = v;
          x = b.getElementsByTagName(e)[0];
          if (x && x.parentNode) x.parentNode.insertBefore(t, x);
          else (b.head || b.body || b.documentElement).appendChild(t);
        } catch (err) {}
      };
      f.__pfPixel = load;
      ['pointerdown', 'keydown', 'scroll'].forEach(ev => addEventListener(ev, load, { once: true, passive: true, capture: true }));
      setTimeout(load, 6000);                                   // never later than this
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
  }
  const fire = (name, data) => { if (id && window.fbq) { try { window.fbq('track', name, data); } catch (e) {} } };
  const vid = v => String((window.__SHOPIFY_VARIANTS__ || {})[v.sku] || v.sku);
  /* Shopify analytics: the same events a Shopify theme sends, so Shopify Admin's sessions, reports and
     Live View count visitors here, not only those who reach checkout. Visitor and visit ids live in
     Shopify's own cookies on .pastforward.shop, which the checkout on shop.pastforward.shop shares. */
  const T = SITE.tracking || {}, SA = window.__PFShopify, shopOn = !!(PROD && SA && T.shopifyShopId);
  const shopCookies = () => {
    const get = n => (document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]+)')) || [])[1];
    const dom = /(^|\.)pastforward\.shop$/.test(location.hostname) ? '; domain=.pastforward.shop' : '';
    const y = get('_shopify_y') || SA.buildUUID(), s = get('_shopify_s') || SA.buildUUID();
    document.cookie = `_shopify_y=${y}; max-age=31536000; path=/; SameSite=Lax${dom}`;
    document.cookie = `_shopify_s=${s}; max-age=1800; path=/; SameSite=Lax${dom}`;   // a visit ends after 30 quiet minutes
  };
  const shopLine = (p, v, qty) => ({ variantGid: 'gid://shopify/ProductVariant/' + vid(v), sku: v.sku, name: albumText(p) + ' — ' + p.artist,
    variantName: (FMT[v.format] || {}).label || '', brand: 'PastForward', price: String(v.price), quantity: qty || 1 });
  const shop = (eventName, extra) => {
    if (!shopOn) return;
    try {
      shopCookies();
      SA.sendShopifyAnalytics({ eventName, payload: { ...SA.getClientBrowserParameters(), hasUserConsent: true, analyticsAllowed: true,
        marketingAllowed: true, saleOfDataAllowed: true, shopifySalesChannel: 'headless', shopId: 'gid://shopify/Shop/' + T.shopifyShopId,
        storefrontId: String(T.shopifyStorefrontId || '0'), currency: 'INR', acceptedLanguage: 'en', ...extra } }, T.shopifyDomain).catch(() => {});
    } catch (e) {}
  };
  const pageType = seg => !seg || !seg[0] ? 'index' : seg[0] === 'product' ? 'product' : seg[0] === 'search' ? 'search' : seg[0] === 'cart' ? 'cart'
    : seg[0] === 'policies' ? 'policy' : seg[0] === '404' ? '404' : ['vinyl', 'posters', 'polaroids', 'collections', 'artist', 'bundles'].includes(seg[0]) ? 'collection' : 'page';
  return {
    on: !!id,
    page: (seg, p, v) => {
      fire('PageView');
      const t = pageType(seg);
      shop('PAGE_VIEW', t === 'product' && p && v ? { pageType: t, resourceId: 'gid://shopify/ProductVariant/' + vid(v), products: [shopLine(p, v)], totalValue: v.price }
        : { pageType: t, ...(t === 'collection' ? { collectionHandle: seg.join('/') } : {}) });
    },
    view: (p, v) => fire('ViewContent', { content_ids: [vid(v)], content_type: 'product', content_name: albumText(p) + ' — ' + p.artist, value: v.price, currency: 'INR' }),
    add: (p, v, qty) => {
      fire('AddToCart', { content_ids: [vid(v)], content_type: 'product', content_name: albumText(p) + ' — ' + p.artist, value: v.price * qty, currency: 'INR' });
      shop('ADD_TO_CART', { products: [shopLine(p, v, qty)], totalValue: v.price * qty });
    },
    checkout: (lines, total) => fire('InitiateCheckout', { content_ids: lines.map(l => String((window.__SHOPIFY_VARIANTS__ || {})[l.sku] || l.sku)), content_type: 'product', num_items: lines.reduce((n, l) => n + l.qty, 0), value: total, currency: 'INR' }),
    // campaign tags, carried to the Shopify checkout so an order shows which ad it came from
    params: () => { const o = new URLSearchParams(); KEYS.forEach(k => { if (src[k]) o.set(k, src[k]); }); return o.toString(); }
  };
})();

/* ---------- forms ----------
   One rule: a form never claims something happened that didn't.
   - custom:      a paid Shopify checkout when the custom-order product exists in Shopify
                  (SKUs PF-CUSTOM-* in shopify_variants.json); otherwise the request goes out
                  over WhatsApp or email, already written, from the visitor's own app.
   - contact:     WhatsApp or email, already written.
   - newsletter:  only rendered when site.json > forms.endpoint is set (see listHTML). */
function customVariantId(fKey) {
  const ids = SHOPIFY_CONFIG.variantIds || {};
  return SHOPIFY_CONFIG.variants[fKey] || ids[`PF-CUSTOM-${fKey.toUpperCase()}`] || ids[fKey] || '';
}
function customBrief(d) {
  const f = FMT[d.format] || FMT.vinyl;
  const L = ["Hi PastForward, I'd like a custom piece.", '', `Artist: ${d.artist || ''}`, `Album: ${d.album || ''}`, `Track: ${d.track || ''}`, `Format: ${f.label} (${money(f.price)})`];
  if (d.ref) L.push(`Reference: ${d.ref}`);
  if (d.refimg && d.refimg.size) L.push('Reference image: sending it in this chat');
  if (d.notes) L.push(`Notes: ${d.notes}`);
  L.push('', `Name: ${d.name || ''}`);
  if (d.email) L.push(`Email: ${d.email}`);
  if (d.whatsapp) L.push(`WhatsApp: ${d.whatsapp}`);
  return L.join('\n');
}
function postForm(type, payload) {
  return fetch(SITE.forms.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(Object.assign({ form: type, page: location.pathname }, payload)) })
    .then(r => ({ ok: r.ok })).catch(() => ({ ok: false }));
}
function submitForm(type, payload, via) {
  const endpoint = SITE.forms && SITE.forms.endpoint;
  if (type === 'custom') {
    const fKey = payload.format || 'vinyl', f = FMT[fKey] || FMT.vinyl, variantId = customVariantId(fKey);
    if (payload.whatsapp && !/^\+/.test(payload.whatsapp)) payload.whatsapp = '+91 ' + payload.whatsapp;
    const file = payload.refimg && payload.refimg.size ? payload.refimg : null;
    delete payload.refimg;
    /* pressing Pay again (back from checkout, or a double tap) must not add a second copy:
       the same request within the hour goes straight back to the checkout it already has */
    const sig = [fKey, payload.artist, payload.album, payload.track, payload.whatsapp, payload.ref, payload.notes, file ? file.name + file.size : ''].join('|');
    let last = null; try { last = JSON.parse(sessionStorage.getItem('pf_custom_sent') || 'null'); } catch (e) {}
    if (SHOPIFY_CONFIG.storeDomain && variantId && last && last.sig === sig && Date.now() - last.t < 36e5) {
      const tags = Track.params();
      location.href = `https://${SHOPIFY_CONFIG.storeDomain}/checkout${tags ? '?' + tags : ''}`;
      return Promise.resolve({ ok: true, redirected: true });
    }
    try { sessionStorage.setItem('pf_custom_sent', JSON.stringify({ sig, t: Date.now() })); } catch (e) {}
    if (SHOPIFY_CONFIG.storeDomain && variantId && file) {
      /* with an image: post a real form to the store's cart so Shopify uploads the image and
         attaches it to the order line, then go straight on to checkout */
      const fm = document.createElement('form');
      fm.method = 'post'; fm.enctype = 'multipart/form-data'; fm.action = `https://${SHOPIFY_CONFIG.storeDomain}/cart/add`; fm.style.display = 'none';
      const add = (n, v) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = n; i.value = v; fm.appendChild(i); };
      add('id', variantId); add('quantity', '1');
      [['Artist', payload.artist], ['Album', payload.album], ['Track', payload.track], ['Name', payload.name], ['WhatsApp', payload.whatsapp], ['Email', payload.email], ['Reference link', payload.ref], ['Notes', payload.notes]]
        .forEach(([k, v]) => { if (v) add(`properties[${k}]`, v); });
      const fi = document.createElement('input'); fi.type = 'file'; fi.name = 'properties[Reference image]';
      const dt = new DataTransfer(); dt.items.add(file); fi.files = dt.files; fm.appendChild(fi);
      const tags = Track.params();
      add('return_to', '/checkout' + (tags ? '?' + tags : ''));
      document.body.appendChild(fm); fm.submit();
      return Promise.resolve({ ok: true, redirected: true });
    }
    if (SHOPIFY_CONFIG.storeDomain && variantId) {
      const params = new URLSearchParams();
      if (payload.email) params.set('checkout[email]', payload.email);
      if (payload.name) params.set('checkout[shipping_address][first_name]', payload.name);
      if (payload.whatsapp) params.set('checkout[shipping_address][phone]', payload.whatsapp);
      // cart attributes: shown on the order in Shopify admin
      params.set('attributes[Format]', f.label);
      params.set('attributes[Artist]', payload.artist || '');
      params.set('attributes[Album]', payload.album || '');
      params.set('attributes[Track]', payload.track || '');
      params.set('attributes[WhatsApp]', payload.whatsapp || '');
      if (payload.ref) params.set('attributes[Reference Link]', payload.ref);
      if (payload.notes) params.set('attributes[Notes]', payload.notes);
      params.set('note', `CUSTOM ORDER: ${payload.artist || ''} — ${payload.album || ''} — ${payload.track || ''} (${f.label})` + (payload.ref ? `\nReference: ${payload.ref}` : '') + (payload.notes ? `\nNotes: ${payload.notes}` : ''));
      const tags = Track.params();
      location.href = `https://${SHOPIFY_CONFIG.storeDomain}/cart/${variantId}:1?${params.toString()}${tags ? '&' + tags : ''}`;
      return Promise.resolve({ ok: true, redirected: true });
    }
    const brief = customBrief(payload);
    if (endpoint) postForm('custom', payload);   // a copy for the sheet, if one is wired up
    window.open(via === 'email' ? mailLink(`Custom order: ${payload.artist || ''} — ${payload.album || ''}`, brief) : waLink(brief), via === 'email' ? '_self' : '_blank', 'noopener');
    return Promise.resolve({ ok: true, opened: via === 'email' ? 'email' : 'WhatsApp' });
  }
  if (type === 'contact') {
    const text = `${payload.message || ''}\n\n${payload.name || ''}${payload.email ? ' · ' + payload.email : ''}`;
    if (endpoint && !via) return postForm('contact', payload);
    window.open(via === 'email' ? mailLink('A question for PastForward', text) : waLink(text), via === 'email' ? '_self' : '_blank', 'noopener');
    return Promise.resolve({ ok: true, opened: via === 'email' ? 'email' : 'WhatsApp' });
  }
  if (endpoint) return postForm(type, payload);
  return Promise.resolve({ ok: false });
}
/* Sends lines to Shopify checkout through a cart permalink: /cart/{variantId}:{qty},... */
function checkoutUrl(lines) {
  const ids = SHOPIFY_CONFIG.variantIds, parts = [];
  for (const l of lines) {
    const id = ids[l.sku];
    if (!id) return null;
    parts.push(id + ':' + l.qty);
  }
  if (!parts.length) return null;
  const b = lines.every(l => l.format) ? bestBundle(lines) : null;
  const q = [b ? 'discount=' + encodeURIComponent(b.code) : '', Track.params()].filter(Boolean).join('&');
  return 'https://' + SHOPIFY_CONFIG.storeDomain + '/cart/' + parts.join(',') + (q ? '?' + q : '');
}
function checkout(lines, btn) {
  const url = checkoutUrl(lines);
  if (!url) { toast('Sorry, one item in your crate can’t be checked out right now.'); return; }
  const bb = lines.every(l => l.format) ? bestBundle(lines) : null;
  Track.checkout(lines, lines.reduce((n, l) => n + l.price * l.qty, 0) - (bb ? bb.off : 0));
  (btn ? [btn] : $$('[data-checkout]')).forEach(b => {
    b.disabled = true; b.classList.add('is-loading'); b.setAttribute('aria-busy', 'true');
    const span = b.querySelector('.btn__mag');
    if (span) span.textContent = 'Opening checkout…';
  });
  // coming back with the browser's Back button must not leave the button stuck
  addEventListener('pageshow', e => { if (e.persisted) { syncCart(); $$('[data-buynow]').forEach(b => { b.disabled = false; b.classList.remove('is-loading'); b.removeAttribute('aria-busy'); const t = b.querySelector('.btn__mag'); if (t) t.textContent = 'Buy now'; }); } }, { once: true });
  location.href = url;
}

/* ---------- router ---------- */
function parseHash() {
  const raw = routeHash().replace(/^#/, '') || '/';
  const [path, q] = raw.split('?');
  return { path: path.replace(/\/+$/, '') || '/', params: new URLSearchParams(q || '') };
}
/* true on the home page whatever is in the query string. Ad clicks always arrive with one
   (?fbclid=..., ?utm_source=...), and comparing the raw address to "#/" used to miss them:
   the hero header state and scroll hint never switched on for exactly the visitors paid for. */
function isHome() { return parseHash().path === '/'; }
window.__unmounts = [];
function onUnmount(fn) { window.__unmounts.push(fn); }
const ORIGIN = (SITE.url || 'https://pastforward.shop').replace(/\/$/, '');
const absUrl = u => /^(https?:|data:)/.test(u) ? u : ORIGIN + (u.startsWith('/') ? u : '/' + u);
function updatePageSEO({ title, description, canonical, ogImage, noindex }) {
  document.title = title;
  const set = (sel, make, attr, val) => {
    let el = $(sel);
    if (!el) { el = make(); document.head.appendChild(el); }
    el.setAttribute(attr, val);
  };
  const meta = (k, name, val) => set(`meta[${k}="${name}"]`, () => { const m = document.createElement('meta'); m.setAttribute(k, name); return m; }, 'content', val);
  meta('name', 'description', description);
  set('link[rel="canonical"]', () => { const l = document.createElement('link'); l.rel = 'canonical'; return l; }, 'href', canonical);
  meta('property', 'og:title', title); meta('property', 'og:description', description); meta('property', 'og:url', canonical);
  meta('name', 'twitter:title', title); meta('name', 'twitter:description', description);
  if (ogImage) { meta('property', 'og:image', absUrl(ogImage)); meta('name', 'twitter:image', absUrl(ogImage)); }
  const robots = $('meta[name="robots"]');
  if (noindex) meta('name', 'robots', 'noindex,follow'); else if (robots) robots.remove();
}

/* the static page that was served carries structured data for ITS route; once the visitor
   moves on inside the app it no longer describes what is on screen, so it goes */
let firstRender = true;
/* Photos come as a ladder of sizes in WebP and AVIF (window.__PHOTO_SETS__, made by the build).
   Each <img> becomes a <picture>: the browser takes AVIF if it can, and from the ladder the lightest
   copy that covers 1.5× the screen (sizes="150vw"), so nothing ever looks softer than the screen.
   picture{display:contents} keeps the layout exactly as it was with the bare <img>. */
function withPhotoSets(html) {
  const sets = window.__PHOTO_SETS__;
  if (!sets) return html;
  return html.replace(/<img\b[^>]*>/g, tag => {
    const m = tag.match(/\ssrc="([^"]+)"/), set = m && sets[m[1]];
    if (!set || /\ssrcset=/.test(tag)) return tag;
    const img = tag.replace(/^<img\b/, `<img srcset="${set.webp}" sizes="150vw"`);
    return set.avif ? `<picture class="pic"><source type="image/avif" srcset="${set.avif}" sizes="150vw">${img}</picture>` : img;
  });
}
function render(opt = {}) {
  const { path, params } = parseHash();
  let seg = path.split('/').filter(Boolean);
  const main = $('#main');
  const M = SITE.meta || {};
  let out, m = M[path] || M['/'] || {}, noindex = !!(M[path] && M[path].noindex);
  let canonical = ORIGIN + (path === '/' ? '/' : path);
  let ogImage = ORIGIN + '/og.jpg';
  let currentProduct = null;

  // Shopify-style addresses (/products/<handle>, as catalogue ads and the Shopify side link them) are ours at /product/<slug>
  if (seg[0] === 'products' && seg[1]) {
    replaceUrl('/product/' + seg[1] + (params.toString() ? '?' + params.toString() : ''));
    return render(opt);
  }
  // the Shopify-only custom product lives on our Custom page
  if ((seg[0] === 'product' || seg[0] === 'products') && seg[1] === 'custom-album-artwork') { replaceUrl('/custom'); return render(opt); }
  // products that were renamed keep their old address
  if (seg[0] === 'product' && !bySlug[seg[1]] && CAT.aliases && bySlug[CAT.aliases[seg[1]]]) {
    replaceUrl('/product/' + CAT.aliases[seg[1]] + (params.toString() ? '?' + params.toString() : ''));
    return render(opt);
  }

  if (!seg.length) out = viewHome();
  else if (seg[0] === 'vinyl') out = viewCatalog('vinyl', null, params);
  else if (seg[0] === 'vinyl-by-artist') out = viewCatalog('vinyl', 'artists', params);
  else if (seg[0] === 'posters') {
    out = viewCatalog('posters', seg[1], params);
    if (!seg[1]) { m = M['/posters/a3'] || m; canonical = ORIGIN + '/posters/a3'; }
  }
  else if (seg[0] === 'polaroids') out = viewCatalog('polaroids', null, params);
  else if (seg[0] === 'shop') { replaceUrl('/vinyl'); return render(opt); }
  else if (seg[0] === 'product' && bySlug[seg[1]]) {
    const p = currentProduct = bySlug[seg[1]];
    out = viewProduct(p, params);
    m = p.seo || m;
    ogImage = imgSrc(primary(p).image, true);
  }
  else if (seg[0] === 'collections') {
    const targetSlug = (seg[1] === '3-am' ? 'three-am' : seg[1]) || 'the-classics';
    const c = COLS.find(x => x.slug === targetSlug) || COLS[0];
    out = viewCatalog('collections', c.slug, params);
    m = c.seo || m; canonical = ORIGIN + '/collections/' + c.slug;
  }
  else if (seg[0] === 'artist' && (SITE.artistPages || {})[seg[1]]) {
    const A = SITE.artistPages[seg[1]];
    out = viewCatalog('landing', A, params);
    m = A; canonical = ORIGIN + '/artist/' + seg[1];
    const p0 = bySlug[A.items[0]]; if (p0) ogImage = imgSrc(primary(p0).image, true);
  }
  else if (seg.length === 1 && (SITE.landing || {})[path]) {
    const L = SITE.landing[path];
    out = viewCatalog('landing', L, params);
    m = L;
    const p0 = bySlug[L.items[0]]; if (p0) ogImage = imgSrc(primary(p0).image, true);
  }
  else if (seg[0] === 'custom') out = viewCustom();
  else if (seg[0] === 'story') out = viewStory();
  else if (seg[0] === 'faq') out = viewFaq();
  else if (seg[0] === 'contact') out = viewContact();
  else if (seg[0] === 'search') out = viewSearch(params);
  else if (seg[0] === 'cart') out = viewCart();
  else if (seg[0] === 'wall') out = viewWall();
  else if (seg[0] === 'build-your-wall') { replaceUrl('/'); return render(opt); }   // Build Your Wall is switched off for now
  else if (seg[0] === 'bundles') out = viewBundles();
  else if (seg[0] === 'policies' && SITE.policies[seg[1]]) out = viewPolicy(seg[1]);
  else { out = view404(); m = { title: 'Page not found | PastForward', desc: (M['/'] || {}).desc || '' }; noindex = true; canonical = ORIGIN + '/'; seg = ['404']; }

  updatePageSEO({ title: m.title, description: m.desc, canonical, ogImage, noindex });
  if (!firstRender && !opt.quiet) { const ld = document.getElementById('route-schema'); if (ld) ld.remove(); }
  // tear down the page we're leaving: WebGL contexts, frame loops, observers
  (window.__unmounts || []).splice(0).forEach(f => { try { f(); } catch (e) {} });
  main.innerHTML = withPhotoSets(out);
  bindEffects(main);
  $$('.hdr__nav [data-nav]').forEach(a => {
    const isAct = a.dataset.nav === seg[0] || (seg[0] === 'vinyl-by-artist' && a.dataset.nav === 'vinyl') || (seg[0] === 'collections' && a.dataset.nav === 'collection');
    a.classList.toggle('is-active', isAct);
  });
  if (typeof window.__afterRender === 'function') window.__afterRender(seg, params);
  window.__onScroll = null;
  if (typeof window.__mount === 'function') window.__mount(seg, params);
  if (params.get('scroll')) {
    const target = document.getElementById(params.get('scroll'));
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'center' });
  }
  syncCrateBar();
  const curV = currentProduct && variant(currentProduct, formatFromParams(currentProduct, params));
  if (!opt.quiet) Track.page(seg, currentProduct, curV);
  if (currentProduct && !opt.quiet) Track.view(currentProduct, curV);
  // the page arrives with a short rise; a filter or "load more" on the same page doesn't replay it
  if (!RM() && !opt.quiet && !opt.viaTransition && !firstRender && main.animate) {
    try {
      main.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
        { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
    } catch (e) {}
  }
  firstRender = false;
}
function go(hash) { navigate(hash); }

/* ---------- global events ---------- */
// jump (not glide) to the top: html has scroll-behavior:smooth, and a glide gets cut short
// by the new page rendering, leaving you halfway down it
/* ---------- URLs ----------
   On the live site (window.__CLEAN_URLS__) pages live in the path: pastforward.shop/vinyl.
   Old #/ links are converted on arrival. Other builds (artifact, file) keep #/ routing. */
function cleanUrls() { return !!window.__CLEAN_URLS__ && /^https?:$/.test(location.protocol); }
function routeHash() {
  if (!cleanUrls()) return location.hash;
  return '#' + (location.pathname.replace(/\/+$/, '') || '/') + location.search;
}
function onRoute(opt = {}) {
  if (opt.keepScroll) { const y = scrollY; render({ quiet: true }); scrollTo({ top: y, left: 0, behavior: 'instant' }); return; }
  const turn = () => { scrollTo({ top: 0, left: 0, behavior: 'instant' }); render({ viaTransition: !!viaVT }); };
  /* a page change dissolves: the old page fades as the new one rises, and the header stays put
     (View Transitions). Browsers without it, or with reduced motion, get the plain swap. */
  const viaVT = document.startViewTransition && !RM() && !firstRender;
  if (viaVT) { try { document.startViewTransition(turn); return; } catch (e) {} }
  turn();
}
/* navigate(to)                      a new page: history entry, scroll to top, entrance
   navigate(to, {replace, keepScroll}) the same page in a new state (a filter, a sort, load more):
                                     no history entry, no jump, no entrance */
let hashSilent = false;
function navigate(to, opt = {}) {
  let p = String(to).replace(/^#/, ''); if (!p.startsWith('/')) p = '/' + p;
  if (!cleanUrls()) {
    if (opt.replace) { hashSilent = true; try { history.replaceState(null, '', '#' + p); } catch (e) {} hashSilent = false; onRoute(opt); }
    else location.hash = p;
    return;
  }
  if (p === location.pathname + location.search) return;
  try { history[opt.replace ? 'replaceState' : 'pushState'](null, '', p); } catch (e) {}
  onRoute(opt);
}
/* change the address without touching the page (the product page's format switch does its own DOM work) */
function replaceUrl(to) {
  try {
    let p = String(to).replace(/^#/, ''); if (!p.startsWith('/')) p = '/' + p;
    history.replaceState(null, '', cleanUrls() ? p : '#' + p);
  } catch (e) {}
}
function cleanHomeUrl() {
  try {
    const h = location.hash;
    if (cleanUrls() && h.startsWith('#/')) history.replaceState(null, '', h.slice(1));
    else if (h === '#/' || h === '#') history.replaceState(null, '', location.pathname + location.search);
  } catch (e) {}
}
addEventListener('hashchange', () => { if (hashSilent) return; cleanHomeUrl(); onRoute(); });
addEventListener('popstate', () => { if (cleanUrls()) onRoute(); });
/* In-site links navigate by path without a page reload. Registered on window so it
   runs after the document click handlers below (which may preventDefault, e.g. Add to cart). */
addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest && e.target.closest('a[href^="/"], a[href^="#/"]');
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
  const href = a.getAttribute('href');
  if (href.startsWith('//') || /\.(?:html?|xml|txt|webp|png|jpe?g|gif|svg|pdf|json|css|js|ico|woff2?|ttf|mp4)$/i.test(href.split(/[?#]/)[0])) return;
  e.preventDefault(); navigate(href);
});
document.addEventListener('click', e => {
  const card = e.target.closest('[data-card]');
  if (card && !e.target.closest('[data-add]')) captureFlip(card);
  const add = e.target.closest('[data-add]');
  if (add) { e.preventDefault(); const [s, f] = add.dataset.add.split('|'); addToCart(s, f, 1, add, { stay: add.classList.contains('card__add') || add.classList.contains('ag__quick') || add.classList.contains('pao__add'), quiet: add.classList.contains('pao__add') }); return; }
  const chip = e.target.closest('[data-chip]');
  if (chip) { e.preventDefault(); pickChip(chip); return; }
  if (e.target.closest('[data-opencrate]')) { openDrawer(); return; }
  if (e.target.closest('[data-close]') || e.target.id === 'scrim') { closeAll(); return; }
  const q = e.target.closest('[data-q]');
  if (q) { const [i, d] = q.dataset.q.split('|').map(Number); cart[i].qty += d; if (cart[i].qty < 1) cart.splice(i, 1); saveCart(); syncCart(); return; }
  const rm = e.target.closest('[data-rm]');
  if (rm) { cart.splice(+rm.dataset.rm, 1); saveCart(); syncCart(); return; }
  if (e.target.closest('[data-checkout]')) { checkout(cart.map(l => ({ ...l, sku: variant(bySlug[l.slug], l.format).sku }))); return; }
  const share = e.target.closest('[data-share]');
  if (share) {
    const data = { title: document.title, url: location.href.split('#')[0] };
    if (navigator.share) navigator.share(data).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(data.url).then(() => toast('Link copied'), () => {});
  }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(f));
  const via = e.submitter && e.submitter.dataset.via;
  const btns = $$('button', f); btns.forEach(b => { b.disabled = true; });
  const msg = f.parentElement.querySelector('[data-form-msg]');
  const say = (html, hide) => {
    if (!msg) return;
    msg.innerHTML = `<p class="formnote" role="status">${html}</p>`;
    if (hide) f.style.display = 'none';
    if (!RM() && msg.animate) {
      try {
        msg.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.16,1,.3,1)' });
      } catch (e) {}
    }
  };
  submitForm(f.dataset.form, data, via).then(res => {
    btns.forEach(b => { b.disabled = false; });
    if (res && res.redirected) return;
    if (res && res.opened) say(`Your message is written out in ${res.opened}. Press send there and it reaches us.`);
    else if (res && res.ok) say(esc(f.dataset.success || "You're on the list."), true);
    else say(`That didn't go through. Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> and we'll pick it up.`);
  });
});
addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAll();
  if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
});
function openSearch() {
  backdropInert(true);
  lastFocus = document.activeElement;
  $('#search').classList.add('is-open'); document.body.style.overflow = 'hidden';
  const i = $('#searchinput'); i.value = ''; $('#searchres').innerHTML = searchResults('');
  setTimeout(() => i.focus(), 60);
}
/* Someone who searched for an album we don't stock is the most useful email on this site: they are
   telling us what to make next, by name. The custom page asks for ₹999 up front, which is the wrong
   ask for someone still browsing, so this catches the ones who aren't ready to buy yet and records
   the album alongside the address. Dormant until site.json > forms.endpoint is set, like every other
   form here, so nothing a visitor types is ever silently dropped. */
function wantHTML(q) {
  if (!(SITE.forms && SITE.forms.endpoint)) return '';
  return `<div style="max-width:420px;margin:34px auto 0;text-align:left">
    <p class="mono-xs dim" style="margin-bottom:10px">OR WE'LL TELL YOU WHEN IT EXISTS</p>
    <form data-form="wishlist" data-success="Got it. We'll email you when it exists." class="listform">
      <input type="hidden" name="album" value="${esc(q)}">
      <input name="email" type="email" required placeholder="your@email.com" aria-label="Email" autocomplete="email">
      <button class="btn btn--primary"><span class="btn__mag">Email me</span></button>
    </form><div data-form-msg></div></div>`;
}
/* "not here? we'll make it": the way out when the catalogue doesn't have someone's album.
   Carries what they typed into the custom form. */
function anyAlbumHTML(q = '', fmt = 'vinyl', close = false) {
  const f = (typeof FMT !== 'undefined' && FMT[fmt]) || FMT.vinyl;
  const qs = new URLSearchParams(); if (q) qs.set('q', q); qs.set('format', fmt in FMT ? fmt : 'vinyl');
  return `<a class="anyalbum" href="/custom?${qs}"${close ? ' data-close' : ''}>
    <span class="anyalbum__k mono-xs">${q ? `Not the one?` : `Don't see your album?`}</span>
    <span class="anyalbum__t">We'll make any album as a ${esc(f.label.toLowerCase())} <span class="num">· ${money(f.price)}</span></span>
    <span class="anyalbum__go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a>`;
}
function searchResults(q) {
  const list = searchProducts(q);
  if (!q) return `<div class="mono-xs dim" style="margin-bottom:12px">Suggested Collections</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${COLS.slice(0, 5).map(c => `<a class="pill" href="/collections/${c.slug}" data-close>${esc(c.name)}</a>`).join('')}</div>
    <div class="mono-xs dim" style="margin-top:28px;margin-bottom:14px">Featured in the crate</div>
    <div class="grid">${P.filter(p => p.featured).slice(0, 4).map(cardHTML).join('')}</div>`;
  if (!list.length) return `<div style="padding:40px 0 48px;text-align:center"><p class="d-s">Nothing matches "${esc(q)}"</p>
    <p class="body-s dim" style="margin:8px 0 20px">Not in the catalogue yet. We can still make it for you.</p>
    <a class="btn btn--primary" href="/custom?${new URLSearchParams({ q, format: 'vinyl' })}" data-close><span class="btn__mag">Make “${esc(q)}” for ${money(FMT.vinyl.price)}</span></a>
    ${wantHTML(q)}</div>`;
  return `<div class="mono-xs dim" style="margin-bottom:14px">${list.length} result${list.length > 1 ? 's' : ''}</div>
    <div class="grid">${list.slice(0, 12).map(cardHTML).join('')}</div>
    ${anyAlbumHTML(q, 'vinyl', true)}`;
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
