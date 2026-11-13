/* ============================================================
   PastForward — boot
   ============================================================ */
function initChrome() {
  $('#cartbtn').addEventListener('click', () => { Sound.tick(); openDrawer(); });
  $('#menubtn').addEventListener('click', () => { Sound.tick(); lastFocus = document.activeElement; $('#menu').classList.add('is-open'); document.body.style.overflow = 'hidden'; });
  $('#searchbtn').addEventListener('click', () => { Sound.tick(); openSearch(); });
  const mb = $('#megabtn'), mega = $('#mega');
  const pb = $('#postersbtn'), megaposters = $('#megaposters');
  let tMega, tPosters;

  const openMega = () => {
    if (megaposters) megaposters.classList.remove('is-open');
    if (pb) pb.setAttribute('aria-expanded', 'false');
    if (!mb || !mega) return;
    const r = mb.getBoundingClientRect();
    const w = mega.offsetWidth || 432;
    const left = Math.max(16, Math.min(window.innerWidth - w - 16, r.left + r.width / 2 - w / 2));
    mega.style.left = `${left}px`;
    mega.classList.add('is-open'); mb.setAttribute('aria-expanded', 'true');
  };
  const shutMega = () => {
    if (mega) mega.classList.remove('is-open');
    if (mb) mb.setAttribute('aria-expanded', 'false');
  };

  const openPosters = () => {
    if (mega) mega.classList.remove('is-open');
    if (mb) mb.setAttribute('aria-expanded', 'false');
    if (!megaposters || !pb) return;
    const r = pb.getBoundingClientRect();
    const w = megaposters.offsetWidth || 300;
    const left = Math.max(16, Math.min(window.innerWidth - w - 16, r.left + r.width / 2 - w / 2));
    megaposters.style.left = `${left}px`;
    megaposters.classList.add('is-open'); pb.setAttribute('aria-expanded', 'true');
  };
  const shutPosters = () => {
    if (megaposters) megaposters.classList.remove('is-open');
    if (pb) pb.setAttribute('aria-expanded', 'false');
  };

  if (mb && mega) {
    mb.addEventListener('click', () => mega.classList.contains('is-open') ? shutMega() : openMega());
    mb.addEventListener('pointerenter', () => { clearTimeout(tMega); clearTimeout(tPosters); shutPosters(); tMega = setTimeout(openMega, 100); });
    [mb, mega].forEach(el => el.addEventListener('pointerleave', () => { clearTimeout(tMega); tMega = setTimeout(shutMega, 240); }));
    mega.addEventListener('pointerenter', () => clearTimeout(tMega));
    mega.addEventListener('click', e => { if (e.target.closest('a')) shutMega(); });
  }

  if (pb && megaposters) {
    pb.addEventListener('pointerenter', () => { clearTimeout(tMega); clearTimeout(tPosters); shutMega(); tPosters = setTimeout(openPosters, 100); });
    [pb, megaposters].forEach(el => el.addEventListener('pointerleave', () => { clearTimeout(tPosters); tPosters = setTimeout(shutPosters, 240); }));
    megaposters.addEventListener('pointerenter', () => clearTimeout(tPosters));
    megaposters.addEventListener('click', e => { if (e.target.closest('a')) shutPosters(); });
    pb.addEventListener('click', () => shutPosters());
  }
  window.addEventListener('scroll', () => { shutMega(); shutPosters(); }, { passive: true });
  document.addEventListener('click', e => {
    if (mega && mega.classList.contains('is-open') && !e.target.closest('#mega') && !e.target.closest('#megabtn')) shutMega();
    if (megaposters && megaposters.classList.contains('is-open') && !e.target.closest('#megaposters') && !e.target.closest('#postersbtn')) shutPosters();
  });
  $('#menu').addEventListener('click', e => { if (e.target.closest('a')) closeAll(); });
  const si = $('#searchinput');
  si.addEventListener('input', () => { $('#searchres').innerHTML = searchResults(si.value); bindEffects($('#searchres')); });
  $('#search').addEventListener('click', e => { if (e.target.closest('a')) closeAll(); });
}

/* The WebGL record (three.js, ~170 KB over the wire) is only ever drawn on screens 768px and up.
   It used to be part of every page load and the whole site waited for it; phones never used it.
   Now it is fetched on larger screens with a real GPU only, and only the home page waits for it. */
function load3d() {
  if (window.mountVinyl) return Promise.resolve(true);            // single-file builds ship it inline
  if (!window.__VINYL3D_URL__ || isPhone() || !fastGL()) return Promise.resolve(false);
  if (!window.__gl3d) window.__gl3d = import(window.__VINYL3D_URL__).then(() => true, () => false);
  return window.__gl3d;
}
const within = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);

function pfStart() {
  const seoEl = document.getElementById('pf-seo');
  if (seoEl) seoEl.remove();
  // the realistic pressing (rendered once from the 3D record, brand/disc.webp) under every CSS record
  if (window.__PHOTOS__ && window.__PHOTOS__.disc) document.documentElement.style.setProperty('--disc-img', `url(${window.__PHOTOS__.disc})`);
  document.body.insertAdjacentHTML('afterbegin', chromeHTML());
  const main = document.createElement('main');
  main.id = 'main'; main.setAttribute('tabindex', '-1');
  document.body.appendChild(main);
  document.body.insertAdjacentHTML('beforeend', footerHTML());
  initChrome(); initGrain(); initCursor(); initScroll(); grooveField(); initSound(); initGrounds();
  syncCart();
  cleanHomeUrl();

  // back from a finished order (the Shopify thank-you page can link to /?order=done): empty the crate
  const q = new URLSearchParams(location.search);
  if (q.get('order') === 'done') {
    cart = []; saveCart(); syncCart();
    q.delete('order'); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash);
    setTimeout(() => toast('Order placed. Thank you.'), 600);
  }

  const home = isHome();
  const gl = load3d();
  const first = () => {
    render();
    bindEffects(document);
    if (q.get('openmenu') === '1') {
      const m = $('#menu');
      if (m) {
        m.style.transition = 'none';
        m.classList.add('is-open');
        m.querySelectorAll('a').forEach(a => { a.style.opacity = '1'; a.style.transform = 'none'; });
      }
    }
    if (q.get('brief') === '1') document.documentElement.setAttribute('data-confirm-mode', '');
    console.log('[PastForward] catalogue:', COUNTS, '| unresolved sources:', CAT.unresolved.length);
    // trackers start once the first screen is drawn
    const later = window.requestIdleCallback || (fn => setTimeout(fn, 400));
    later(() => { if (window.__pfPixel) window.__pfPixel(); if (window.__pfClarity) window.__pfClarity(); }, { timeout: 1500 });
  };
  // the page is ready to be seen once it has rendered and its type has arrived (capped, never a hang)
  // type is preloaded and swaps in; a phone on a slow line should not sit behind the curtain waiting for it
  const fonts = document.fonts && document.fonts.ready ? within(document.fonts.ready, isPhone() ? 350 : 1200) : Promise.resolve();
  const rendered = (home && !isPhone() ? within(gl, 3500) : Promise.resolve()).then(first);
  initPre(Promise.all([rendered, fonts]));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pfStart);
else pfStart();
