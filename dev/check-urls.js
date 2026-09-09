/* PastForward — build URL check (no browser needed).
 *
 * Loads the REAL payload script out of the built docs/index.html (or
 * dist/standalone.html) plus the REAL src/core.js + src/routes.js in a vm
 * sandbox with DOM stubs, renders the main views to strings, and asserts:
 *  1. every image URL emitted belongs to the expected scheme for the build
 *     (relative asset URLs served / data URIs standalone), and
 *  2. every relative asset URL resolves to a file that exists on disk.
 *
 * Run: npm run test:urls   (build first: npm run build [-- --standalone])
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let failures = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  PASS ' : '  FAIL ') + msg);
  if (!cond) failures++;
};

function loadBuild(htmlFile) {
  const html = fs.readFileSync(path.join(ROOT, htmlFile), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (scripts.length < 7) throw new Error(`${htmlFile}: expected 7+ classic scripts, found ${scripts.length}`);
  return { html, payload: scripts[0] };
}

function makeContext(extraWindow = {}) {
  const window = { ...extraWindow };
  const sandbox = {
    window,
    document: {
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
    },
    addEventListener: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    URLSearchParams,
    requestAnimationFrame: () => 0,
    location: { hash: '#/', search: '' },
  };
  sandbox.window.matchMedia = () => ({ matches: false });
  vm.createContext(sandbox);
  return sandbox;
}

function renderViews(payload) {
  const ctx = makeContext();
  vm.runInContext(payload, ctx, { filename: 'payload' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/core.js'), 'utf8'), ctx, { filename: 'core.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/routes.js'), 'utf8'), ctx, { filename: 'routes.js' });
  const q = new URLSearchParams('');
  return {
    home: vm.runInContext('viewHome()', ctx),
    shop: vm.runInContext('viewShop(undefined, new URLSearchParams(""))', ctx),
    shopVinyl: vm.runInContext('viewShop("vinyl", new URLSearchParams(""))', ctx),
    pdp: vm.runInContext('viewProduct(bySlug["travis-scott-utopia"], new URLSearchParams("format=vinyl"))', ctx),
    pdpPoster: vm.runInContext('viewProduct(bySlug["nirvana-nevermind"], new URLSearchParams("format=poster-a3"))', ctx),
    collection: vm.runInContext('viewCollection("three-am")', ctx),
    custom: vm.runInContext('viewCustom()', ctx),
    story: vm.runInContext('viewStory()', ctx),
    cart: vm.runInContext('viewCart()', ctx),
    pageFns: vm.runInContext('({ imgSrc: typeof imgSrc, photo: typeof photo })', ctx),
    win: vm.runInContext('Object.keys(window).filter(k => k.startsWith("__"))', ctx),
  };
}

const relUrls = html => [
  ...[...html.matchAll(/src="(assets\/[^"]+)"/g)].map(m => m[1]),
  ...[...html.matchAll(/url\((assets\/[^)]+)\)/g)].map(m => m[1]),
];

// ---------- served build: docs/index.html ----------
console.log('served build (docs/index.html)');
{
  const { html, payload } = loadBuild('docs/index.html');
  ok(!html.includes('__IMG_DATA__ ='), 'no embedded product-image map');
  ok(payload.includes('window.__IMG_BASE__'), 'payload sets __IMG_BASE__');
  ok(payload.includes('window.__PHOTOS_THUMB__'), 'payload sets __PHOTOS_THUMB__');
  ok(!payload.includes('__THREE_IMPORT__'), 'three import placeholder rewritten');
  ok(html.includes('./assets/vendor/three.module.min.js'), 'module imports vendored three relatively');
  ok(html.includes('rel="preload" as="font"'), 'critical fonts preloaded');
  ok(html.includes('data:image/webp;base64') && html.includes('window.__WORDMARK__'),
    'wordmark stays embedded (above-fold critical)');

  const v = renderViews(payload);
  const wordmark = payload.match(/window\.__WORDMARK__ = "(data:image\/webp;base64,[^"]+)"/)[1];
  const all = Object.values(v).filter(x => typeof x === 'string').join('\n');
  const dataUris = [...all.matchAll(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g)].map(m => m[0]);
  ok(dataUris.length > 0 && dataUris.every(u => u === wordmark),
    `views embed only the wordmark (${dataUris.length} data URIs, all wordmark: ${dataUris.every(u => u === wordmark)})`);
  ok(all.includes('assets/img/'), 'views reference served product art');
  ok(all.includes('assets/photos/'), 'views reference served photos');
  ok(all.includes('assets/brand/col-g.webp'), 'views reference served brand textures');
  ok(v.pdp.includes('assets/photos/thumb/'), 'PDP photo thumbnail uses the 320px thumb map');
  ok(!v.pdp.includes('assets/photos/thumb/undefined') && !all.includes('undefined.webp'),
    'no undefined filenames leak into URLs');
  ok(v.shopVinyl.includes('assets/img/'), 'shop grid resolves art via served base');

  // every referenced asset file must exist on disk
  const urls = [...new Set(relUrls(all))];
  ok(urls.length > 50, `substantial URL surface checked (${urls.length} unique)`);
  const missing = urls.filter(u => !fs.existsSync(path.join(ROOT, 'docs', decodeURIComponent(u))));
  ok(missing.length === 0, missing.length ? `missing files: ${missing.slice(0, 5).join(', ')}` : 'every referenced asset exists on disk');

  // catalogue coverage: every variant image must be servable
  const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalogue.json'), 'utf8'));
  const imgs = new Set();
  cat.products.forEach(p => p.variants.forEach(x => imgs.add(x.image)));
  const missingImg = [...imgs].filter(f => !fs.existsSync(path.join(ROOT, 'docs/assets/img', f)));
  ok(missingImg.length === 0, `all ${imgs.size} catalogue images shipped (${missingImg.slice(0, 3).join(', ') || 'none missing'})`);
}

// ---------- standalone build: dist/standalone.html (if built) ----------
if (fs.existsSync(path.join(ROOT, 'dist/standalone.html'))) {
  console.log('standalone build (dist/standalone.html)');
  const { payload } = loadBuild('dist/standalone.html');
  const v = renderViews(payload);
  const all = [v.home, v.shop, v.pdp, v.collection, v.story].join('\n');
  ok(all.includes('data:image/webp'), 'views resolve art to embedded data URIs');
  ok(!all.includes('assets/'), 'no external asset URLs leak into standalone views');
  ok(!all.includes('undefined.webp'), 'no undefined filenames leak into URLs');
} else {
  console.log('standalone build skipped (dist/standalone.html not built — run build --standalone)');
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall URL checks passed');
process.exit(failures ? 1 : 0);
