/* ============================================================
   PastForward — boot
   ============================================================ */
function initChrome() {
  $('#cartbtn').addEventListener('click', () => { Sound.tick(); openDrawer(); });
  $('#menubtn').addEventListener('click', () => { Sound.tick(); lastFocus = document.activeElement; $('#menu').classList.add('is-open'); document.body.style.overflow = 'hidden'; });
  $('#searchbtn').addEventListener('click', () => { Sound.tick(); openSearch(); });
  const mb = $('#megabtn'), mega = $('#mega');
  let t;
  const open = () => {
    // Anchor the spring pop-open to the button that actually triggered it,
    // instead of always blooming from dead-center — spatial consistency.
    const r = mb.getBoundingClientRect();
    mega.style.transformOrigin = `${r.left + r.width / 2}px 0`;
    mega.classList.add('is-open'); mb.setAttribute('aria-expanded', 'true');
  };
  const shut = () => { mega.classList.remove('is-open'); mb.setAttribute('aria-expanded', 'false'); };
  mb.addEventListener('click', () => mega.classList.contains('is-open') ? shut() : open());
  mb.addEventListener('pointerenter', () => { clearTimeout(t); t = setTimeout(open, 120); });
  [mb, mega].forEach(el => el.addEventListener('pointerleave', () => { clearTimeout(t); t = setTimeout(shut, 220); }));
  mega.addEventListener('pointerenter', () => clearTimeout(t));
  mega.addEventListener('click', e => { if (e.target.closest('a')) shut(); });
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
  initChrome(); initGrain(); initCursor(); initScroll(); grooveField(); initSound(); initGrounds(); initPre();
  syncCart();
  if (!location.hash) location.hash = '/';
  render();
  bindEffects(document);
  if (new URLSearchParams(location.search).get('brief') === '1') document.documentElement.setAttribute('data-confirm-mode', '');
  const n = document.querySelectorAll('[data-confirm]').length;
  console.log('[PastForward] catalogue:', COUNTS, '| unresolved sources:', CAT.unresolved.length);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pfStart);
else pfStart();
