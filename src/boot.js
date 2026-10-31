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

function pfStart() {
  document.body.insertAdjacentHTML('afterbegin', chromeHTML());
  const main = document.createElement('main');
  main.id = 'main'; main.setAttribute('tabindex', '-1');
  document.body.appendChild(main);
  document.body.insertAdjacentHTML('beforeend', footerHTML());
  const ftr = document.querySelector('[data-footer-reveal]');
  if (ftr && window.PFFooterReveal) ftr._rv = PFFooterReveal(ftr);
  initChrome(); initGrain(); initCursor(); initScroll(); grooveField(); initSound(); initGrounds(); initPre();
  syncCart();
  if (!location.hash) location.hash = '/';
  render();
  bindEffects(document);
  if (new URLSearchParams(location.search).get('openmenu') === '1') {
    const m = $('#menu');
    if (m) {
      m.style.transition = 'none';
      m.classList.add('is-open');
      m.querySelectorAll('a').forEach(a => { a.style.opacity = '1'; a.style.transform = 'none'; });
    }
  }
  if (new URLSearchParams(location.search).get('brief') === '1') document.documentElement.setAttribute('data-confirm-mode', '');
  const n = document.querySelectorAll('[data-confirm]').length;
  console.log('[PastForward] catalogue:', COUNTS, '| unresolved sources:', CAT.unresolved.length);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pfStart);
else pfStart();
