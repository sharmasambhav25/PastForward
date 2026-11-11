/* QA for the LIVE build (docs/), served the way GitHub Pages serves it.

     python3 build.py && node verify_site.js

   Checks every page in the sitemap as a document (status, title, canonical, structured data,
   no placeholder text), then drives the site on a phone-sized and a laptop-sized screen:
   pages boot without errors, nothing scrolls sideways, the title the browser ends up with is
   the title the static page shipped with, and the path to checkout works.
   Set PF_CHROME=/path/to/chrome to use an installed Chrome instead of Playwright's download. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve('docs'), PORT = 8765, BASE = `http://127.0.0.1:${PORT}`;
const LAUNCH = process.env.PF_CHROME ? { executablePath: process.env.PF_CHROME, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {};
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.woff2': 'font/woff2' };

// GitHub Pages rules: the file, then file.html, then dir/index.html, else 404.html with a 404 status
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  for (const t of [p, p.replace(/\/$/, '') + '.html', path.join(p, 'index.html')]) {
    const f = path.join(ROOT, t);
    if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      return fs.createReadStream(f).pipe(res);
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
});

const get = u => new Promise((ok, no) => http.get(BASE + u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => ok({ status: r.statusCode, body: b })); }).on('error', no));
const pick = (h, re) => (h.match(re) || [])[1];
const decode = s => (s || '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const fails = [], notes = [];

  // ---------- 1. every page, as a document
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>https:\/\/pastforward\.shop([^<]*)<\/loc>/g)].map(m => m[1] || '/');
  const titles = new Map(), seenTitle = new Map();
  for (const u of urls) {
    const { status, body } = await get(u);
    if (status !== 200) { fails.push(`${u}: HTTP ${status}`); continue; }
    const title = decode(pick(body, /<title>([^<]*)<\/title>/)), canon = pick(body, /<link rel="canonical" href="([^"]*)"/);
    titles.set(u, title);
    if (!title) fails.push(`${u}: no title`);
    if (seenTitle.has(title) && !(u.startsWith('/posters') && seenTitle.get(title).startsWith('/posters'))) fails.push(`${u}: same title as ${seenTitle.get(title)}`);
    seenTitle.set(title, u);
    if (canon !== 'https://pastforward.shop' + u) fails.push(`${u}: canonical is ${canon}`);
    if (!/<meta name="description" content="[^"]{50,}/.test(body)) fails.push(`${u}: description missing or too short`);
    if (!/<meta property="og:image" content="https:\/\/pastforward\.shop\//.test(body)) fails.push(`${u}: share image is not an absolute pastforward.shop URL`);
    if (/noindex/.test(body)) fails.push(`${u}: in the sitemap but marked noindex`);
    const bad = body.match(/\[CONFIRM\]|\{\{\w+|>undefined<|\bNaN\b|team@pastforward/);
    if (bad) fails.push(`${u}: placeholder or stale text "${bad[0]}"`);
    if (!/<div id="pf-seo">[\s\S]*<h1>/.test(body)) fails.push(`${u}: no plain-HTML version of the page`);
    try {
      const ld = JSON.parse(pick(body, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/));
      if (u.startsWith('/product/')) {
        const prod = ld['@graph'].find(n => n['@type'] === 'Product');
        if (!prod) fails.push(`${u}: no Product in structured data`);
        else {
          const offers = prod.offers.offers || [prod.offers];
          if (offers.some(o => !(o.price > 0) || o.priceCurrency !== 'INR' || !/^https:\/\/pastforward\.shop\/product\//.test(o.url))) fails.push(`${u}: bad offer in structured data`);
        }
      }
    } catch (e) { fails.push(`${u}: structured data does not parse`); }
  }
  notes.push(`${urls.length} pages in the sitemap, all fetched`);
  for (const [u, want] of [['/cart', 200], ['/search', 200], ['/wall', 200], ['/posters/', 200], ['/collections/', 200], ['/product/arctic-monkeys', 200],
    ['/no-such-page', 404], ['/product/no-such-record', 404], ['/robots.txt', 200], ['/llms.txt', 200], ['/llms-full.txt', 200], ['/pricing.md', 200], ['/about.md', 200], ['/og.jpg', 200]]) {
    const { status } = await get(u);
    if (status !== want) fails.push(`${u}: HTTP ${status}, expected ${want}`);
  }
  if (fs.existsSync(path.join(ROOT, 'ideation'))) fails.push('docs/ideation is published: internal notes do not belong on the live site');

  // ---------- 2. in a browser
  const browser = await chromium.launch(LAUNCH);
  const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36' };
  const SMALL = { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const LAPTOP = { viewport: { width: 1440, height: 900 } };
  const ROUTES = ['/', '/vinyl', '/posters', '/posters/a5', '/posters/10x10', '/polaroids', '/collections/three-am', '/product/the-weeknd-after-hours',
    '/product/nirvana-nevermind?format=poster-a3', '/product/sabrina-carpenter-espresso', '/custom', '/story', '/faq', '/contact', '/cart', '/search?q=taylor',
    '/wall', '/policies/shipping', '/policies/returns', '/policies/privacy', '/policies/terms', '/not-a-page'];

  for (const [tag, dev] of [['phone', PHONE], ['small phone', SMALL], ['laptop', LAPTOP]]) {
    const ctx = await browser.newContext(dev), page = await ctx.newPage();
    const errors = [], reqs = [];
    page.on('console', m => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    page.on('request', r => reqs.push(r.url()));
    for (const r of ROUTES) {
      reqs.length = 0;
      await page.goto(BASE + r, { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('#main') && document.querySelector('#main').children.length && !document.getElementById('boot') && !document.getElementById('pre'), null, { timeout: 9000 })
        .catch(() => fails.push(`${r} @ ${tag}: the page never finished booting`));
      const st = await page.evaluate(() => ({
        over: document.documentElement.scrollWidth - innerWidth, title: document.title, seo: !!document.getElementById('pf-seo'),
        text: document.body.innerText, broken: Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0 && i.getBoundingClientRect().width > 0).length,
        tap: Array.from(document.querySelectorAll('#main a, #main button')).filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (b.width < 24 || b.height < 24) && getComputedStyle(e).visibility !== 'hidden'; }).length }));
      if (st.over > 1) fails.push(`${r} @ ${tag}: scrolls sideways by ${st.over}px`);
      if (st.seo) fails.push(`${r} @ ${tag}: the plain-HTML fallback is still on the page`);
      if (st.broken) fails.push(`${r} @ ${tag}: ${st.broken} broken image(s)`);
      const bad = st.text.match(/\[CONFIRM\]|undefined|\bNaN\b|\{\{\w*|!/);
      if (bad) fails.push(`${r} @ ${tag}: "${bad[0]}" on the page`);
      const pathOnly = r.split('?')[0];
      if (titles.has(pathOnly) && titles.get(pathOnly) !== st.title) fails.push(`${r} @ ${tag}: title drifts between the static page ("${titles.get(pathOnly)}") and the app ("${st.title}")`);
      if (r === '/' && tag !== 'laptop' && reqs.some(u => /three\.module|vinyl3d/.test(u))) fails.push(`/ @ ${tag}: phones should not download the 3D library`);
      // this harness has no GPU, so a laptop here is the "graphics acceleration off" case: CSS record, no 3D download
      if (r === '/' && tag === 'laptop' && reqs.some(u => /three\.module|vinyl3d/.test(u))) fails.push('/ @ laptop without a GPU: should fall back to the CSS record, not download the 3D library');
      if (r === '/') notes.push(`home @ ${tag}: ${reqs.filter(u => /\.woff2/.test(u)).length} font files, ${reqs.length} requests`);
    }
    if (errors.length) fails.push(`console @ ${tag}: ${[...new Set(errors)].slice(0, 4).join(' | ')}`);
    await ctx.close();
  }

  // ---------- 2b. the WebGL record itself (forced on with ?gl=1, since the harness renders in software)
  {
    const ctx = await browser.newContext(LAPTOP), page = await ctx.newPage(), reqs = [], errors = [];
    page.on('request', r => reqs.push(r.url())); page.on('pageerror', e => errors.push(e.message));
    await page.goto(BASE + '/?gl=1', { waitUntil: 'load' });
    const gl = await page.waitForFunction(() => { const d = document.getElementById('fdisc'); return d && d.classList.contains('is-gl'); }, null, { timeout: 40000 }).then(() => true, () => false);
    if (!gl) fails.push('/?gl=1 @ laptop: the 3D record did not mount');
    if (!reqs.some(u => /three\.module/.test(u))) fails.push('/?gl=1 @ laptop: the 3D library was not requested');
    if (errors.length) fails.push(`/?gl=1 @ laptop: ${errors[0]}`);
    await ctx.close();
  }

  // campaign tags that arrive on an ad click are carried to the Shopify checkout
  {
    const ctx = await browser.newContext(PHONE), page = await ctx.newPage();
    await page.goto(BASE + '/product/the-weeknd-after-hours?utm_source=ig&utm_campaign=launch&fbclid=TEST123', { waitUntil: 'load' }); await page.waitForSelector('#pdpadd');
    await page.goto(BASE + '/vinyl', { waitUntil: 'load' }); await page.waitForSelector('.ag');      // tags survive moving around the site
    const u = await page.evaluate(() => { const p = bySlug['the-weeknd-after-hours'], v = variant(p, 'vinyl'); return checkoutUrl([{ sku: v.sku, qty: 1, price: v.price }]); });
    if (!/utm_source=ig/.test(u || '') || !/utm_campaign=launch/.test(u || '') || !/fbclid=TEST123/.test(u || '')) fails.push(`campaign tags are not carried to checkout: ${u}`);
    if (await page.evaluate(() => !(SITE.tracking && SITE.tracking.metaPixelId) && !!window.fbq)) fails.push('the Meta Pixel loaded although site.json has no pixel id');
    await ctx.close();
  }

  // ---------- 3. the path to checkout, on a phone
  const ctx = await browser.newContext(PHONE), page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForSelector('.best .card', { timeout: 9000 }).catch(() => fails.push('phone home: no bestsellers grid'));
  if (!(await page.evaluate(() => /free delivery/i.test(document.querySelector('.salebar').textContent) === !!SHIP.label))) fails.push('ribbon and site.json disagree about free delivery');
  await page.click('.best .card >> nth=0'); await page.waitForSelector('#pdpadd');
  if (!/^\/product\//.test(new URL(page.url()).pathname)) fails.push('tapping a bestseller did not open its product page');
  if (!(await page.evaluate(() => document.getElementById('buybar').classList.contains('is-on') || document.getElementById('pdpadd').getBoundingClientRect().top < innerHeight)))
    fails.push('product page (phone): no way to buy on the first screen');
  // switching format: no jump to the top, no extra history entry, address and price follow
  await page.goto(BASE + '/product/the-weeknd-after-hours', { waitUntil: 'load' }); await page.waitForSelector('#pdpadd');
  await page.evaluate(() => scrollTo({ top: 420, behavior: 'instant' }));
  const before = await page.evaluate(() => ({ h: history.length, y: scrollY }));
  await page.evaluate(() => document.querySelector('.fmt button[data-fmt="poster-a3"]').click()); await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({ h: history.length, y: scrollY, q: location.search, price: document.getElementById('pdpprice').textContent, blurb: document.getElementById('pdpblurb').textContent }));
  if (after.h !== before.h) fails.push('format switch adds a history entry');
  if (Math.abs(after.y - before.y) > 2) fails.push(`format switch moved the page (${before.y} -> ${after.y})`);
  if (after.q !== '?format=poster-a3' || !/299/.test(after.price) || !/A3 poster/.test(after.blurb)) fails.push(`format switch did not update address/price/description (${after.q}, ${after.price})`);
  // a link that carries a Shopify variant id (catalogue ads, links from the Shopify side) opens on that format
  {
    const vid = await page.evaluate(() => window.__SHOPIFY_VARIANTS__[variant(bySlug['the-weeknd-after-hours'], 'poster-a5').sku]);
    await page.goto(BASE + '/product/the-weeknd-after-hours?variant=' + vid, { waitUntil: 'load' }); await page.waitForSelector('#pdpadd');
    if (!(await page.evaluate(() => /199/.test(document.getElementById('pdpprice').textContent) && document.querySelector('.fmt button.is-on').dataset.fmt === 'poster-a5')))
      fails.push('?variant=<id> did not open the product on that format');
    await page.goto(BASE + '/products/arctic-monkeys?variant=1', { waitUntil: 'load' }); await page.waitForSelector('#pdpadd');
    if (new URL(page.url()).pathname !== '/product/arctic-monkeys-am') fails.push(`a Shopify-style /products/<handle> link ended up at ${page.url()}`);
    await page.goto(BASE + '/product/the-weeknd-after-hours?format=poster-a3', { waitUntil: 'load' }); await page.waitForSelector('#pdpadd');
  }
  // add to cart: the drawer opens, nothing covers Checkout, and the link is right
  await page.evaluate(() => document.getElementById('pdpadd').click()); await page.waitForTimeout(700);
  const cartState = await page.evaluate(() => {
    const b = document.querySelector('#drawer [data-checkout]').getBoundingClientRect();
    const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { open: document.getElementById('drawer').classList.contains('is-open'), n: cartCount(), toasts: document.querySelectorAll('.toast').length,
      clear: !!top.closest('[data-checkout]'), ship: document.querySelector('#drawerft .receipt').innerText, addon: !!document.querySelector('.addon'),
      url: checkoutUrl(cart.map(l => ({ ...l, sku: variant(bySlug[l.slug], l.format).sku }))) };
  });
  if (!cartState.open || cartState.n !== 1) fails.push('add to cart did not open the drawer with one item');
  if (!cartState.clear || cartState.toasts) fails.push('something is covering the Checkout button in the drawer');
  if (!/^https:\/\/shop\.pastforward\.shop\/cart\/\d+:1$/.test(cartState.url || '')) fails.push(`checkout link malformed: ${cartState.url}`);
  notes.push(`drawer receipt: ${cartState.ship.replace(/\s+/g, ' ')}`);
  notes.push(`checkout link: ${cartState.url}`);
  // cart survives a reload
  await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#pdpadd');
  if ((await page.evaluate(() => cartCount())) !== 1) fails.push('cart did not survive a reload');
  // catalogue: filtering keeps your place; a one-album artist goes straight to the record
  await page.goto(BASE + '/vinyl', { waitUntil: 'load' }); await page.waitForSelector('.ag');
  const cat = await page.evaluate(() => ({ cards: document.querySelectorAll('.ag').length, solo: document.querySelectorAll('.ag--solo').length, more: !!document.getElementById('loadmore') }));
  notes.push(`vinyl page: ${cat.cards} artists on first load, ${cat.solo} open straight to the record`);
  if (cat.more) fails.push('vinyl page hides part of the catalogue behind "Load more"');
  await page.evaluate(() => { document.getElementById('filtertgl').click(); scrollTo({ top: 300, behavior: 'instant' }); });
  const h0 = await page.evaluate(() => history.length);
  await page.evaluate(() => document.querySelector('#rail input[value="the-classics"]').click()); await page.waitForTimeout(500);
  const f = await page.evaluate(() => ({ y: scrollY, h: history.length, q: location.search, n: document.querySelectorAll('.ag').length }));
  if (f.h !== h0 || f.y < 200) fails.push(`filtering jumped to the top or added history (y=${f.y})`);
  if (!/collection=the-classics/.test(f.q) || f.n >= cat.cards) fails.push('collection filter did not apply');
  await page.click('.ag--solo .ag__head >> nth=0'); await page.waitForSelector('#pdpadd');
  // forms: the custom order and contact forms hand over a real, written message
  await page.goto(BASE + '/custom', { waitUntil: 'load' }); await page.waitForSelector('form[data-form="custom"]');
  const brief = await page.evaluate(() => customBrief({ artist: 'Travis Scott', album: 'Utopia', format: 'vinyl', name: 'Test', whatsapp: '9999999999' }));
  if (!/Travis Scott/.test(brief) || !/Utopia/.test(brief) || !/999/.test(brief)) fails.push('custom order message is missing details');
  const lies = await page.evaluate(() => /order logged|payment link is also being sent|you're on the list/i.test(document.body.innerText));
  if (lies) fails.push('a form still claims something it cannot do');
  const news = await page.evaluate(() => ({ form: document.querySelectorAll('form[data-form="newsletter"]').length, endpoint: !!(SITE.forms && SITE.forms.endpoint) }));
  if (news.form && !news.endpoint) fails.push('newsletter box is shown but has nowhere to send the email');
  await ctx.close();

  // ---------- 4. reduced motion still gets a whole home page
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }), p2 = await rm.newPage();
  await p2.goto(BASE + '/', { waitUntil: 'load' }); await p2.waitForTimeout(1200);
  if ((await p2.evaluate(() => document.querySelectorAll('#main section').length)) < 7) fails.push('reduced-motion home is missing sections');
  await rm.close();

  await browser.close(); server.close();
  console.log('--- NOTES ---'); notes.forEach(n => console.log('  ' + n));
  console.log('--- FAILURES (' + fails.length + ') ---');
  fails.forEach(f => console.log('  ✗ ' + f));
  if (!fails.length) console.log('  none');
  process.exit(fails.length ? 1 : 0);
})();
