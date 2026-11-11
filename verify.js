/* QA for the single-file build (dist/qa.html, #/ routing).   node verify.js
   The live build in docs/ has its own check: node verify_site.js
   Set PF_CHROME=/path/to/chrome to use an installed Chrome instead of Playwright's download. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve('dist/qa.html');
const LAUNCH = process.env.PF_CHROME ? { executablePath: process.env.PF_CHROME, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {};
const OUT = 'qa';
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['home', '/'], ['shop', '/shop'], ['shop-vinyl', '/shop/vinyl'],
  ['product', '/product/travis-scott-utopia'], ['product-poster', '/product/nirvana-nevermind?format=poster-a3'],
  ['collection', '/collections/three-am'], ['custom', '/custom'], ['story', '/story'],
  ['faq', '/faq'], ['contact', '/contact'], ['search', '/search'], ['cart', '/cart'],
  ['wall', '/wall'], ['policy', '/policies/returns'], ['policy-privacy', '/policies/privacy'], ['posters-a5', '/posters/a5'],
  ['polaroids', '/polaroids'], ['renamed', '/product/arctic-monkeys'], ['404', '/nope']
];
const SIZES = [[390, 844, 'm'], [768, 1024, 't'], [1440, 900, 'd']];
const BANNED = /\b(elevate|transform your room|curated collection|premium|aesthetic|vibes|discover)\b/i;

(async () => {
  const browser = await chromium.launch(LAUNCH);
  const fails = [];
  const notes = [];
  for (const [w, h, tag] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    for (const [name, route] of ROUTES) {
      await page.goto(FILE + '#' + route, { waitUntil: 'load' });
      await page.waitForTimeout(name === 'home' ? 1300 : 700);
      // overflow
      const ov = await page.evaluate(() => {
        scrollTo(600, window.scrollY); const x = window.scrollX; scrollTo(0, window.scrollY); return x;
      });
      if (ov > 2) fails.push(`${name}@${w}: page scrolls horizontally by ${ov}px`);
      // copy rules
      const text = await page.evaluate(() => document.body.innerText);
      if (/!/.test(text.replace(/\[CONFIRM\]/g, ''))) fails.push(`${name}@${w}: exclamation mark present`);
      const b = text.match(BANNED); if (b) fails.push(`${name}@${w}: banned word "${b[0]}"`);
      if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) fails.push(`${name}@${w}: emoji present`);
      if (/\[CONFIRM\]|undefined|\bNaN\b|\{\{/.test(text)) fails.push(`${name}@${w}: placeholder text on the page (${(text.match(/\[CONFIRM\]|undefined|\bNaN\b|\{\{\w*/) || [''])[0]})`);
      if (/\bCOD\b|cash on delivery is available/i.test(text)) fails.push(`${name}@${w}: promises COD`);
      // record layers
      if (tag === 'd') {
        const rec = await page.evaluate(() => {
          const r = document.querySelector('.record'); if (!r) return null;
          return ['grooves', 'deadwax', 'label', 'spindle', 'rim'].filter(l => !r.querySelector(`[data-layer="${l}"]`));
        });
        if (rec && rec.length) fails.push(`${name}: record missing layers ${rec.join(',')}`);
        // broken images
        const broken = await page.evaluate(() => Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0).length);
        if (broken) fails.push(`${name}: ${broken} broken images`);
      }
      await page.screenshot({ path: `${OUT}/${name}-${tag}.png`, fullPage: false });
      if (name === 'home' && tag === 'd') {
        await page.evaluate(() => scrollTo(0, innerHeight * 4.2)); await page.waitForTimeout(600);
        await page.screenshot({ path: `${OUT}/home-wall-${tag}.png` });
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight * .62)); await page.waitForTimeout(600);
        await page.screenshot({ path: `${OUT}/home-picker-${tag}.png` });
      }
      if (name === 'product' && tag === 'd') {
        await page.evaluate(() => scrollTo(0, innerHeight * 1.1)); await page.waitForTimeout(900);
        await page.screenshot({ path: `${OUT}/product-scale-${tag}.png` });
      }
    }
    if (errors.length) fails.push(`console@${w}: ${[...new Set(errors)].slice(0, 4).join(' | ')}`);
    await ctx.close();
  }

  // functional: cart + set-of-three
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(FILE + '#/shop/vinyl', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const slugs = await page.evaluate(() => Array.from(document.querySelectorAll('[data-add]')).slice(0, 3).map(b => b.dataset.add));
  for (const s of slugs) await page.evaluate(a => addToCart(a.split('|')[0], a.split('|')[1]), s);
  const maths = await page.evaluate(() => cartMaths());
  // bundles are switched off (BUNDLE_ON in core.js): three records are simply three prices
  if (maths.sets !== 0 || maths.saved !== 0) fails.push(`a bundle discount applied while bundles are off (sets=${maths.sets}, saved=${maths.saved})`);
  if (maths.sub !== 2997 || maths.total !== 2997) fails.push(`cart maths wrong: sub ${maths.sub}, total ${maths.total}`);
  notes.push(`cart 3 vinyl → sub ${maths.sub}, saved ${maths.saved}, total ${maths.total}`);
  // the checkout link carries every line to Shopify
  const co = await page.evaluate(() => checkoutUrl(cart.map(l => ({ ...l, sku: variant(bySlug[l.slug], l.format).sku }))));
  if (!/^https:\/\/shop\.pastforward\.shop\/cart\/\d+:1,\d+:1,\d+:1$/.test(co || '')) fails.push(`checkout link malformed: ${co}`);
  notes.push(`checkout link → ${co}`);
  // every product on the site can be checked out
  const orphans = await page.evaluate(() => P.flatMap(p => p.variants).filter(v => !window.__SHOPIFY_VARIANTS__[v.sku]).map(v => v.sku));
  if (orphans.length) fails.push(`no Shopify variant for: ${orphans.join(', ')}`);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(600);
  const persisted = await page.evaluate(() => cartCount());
  if (persisted !== 3) fails.push(`cart did not persist across reload (${persisted})`);
  await page.goto(FILE + '#/cart', { waitUntil: 'load' }); await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/cart-filled-d.png` });

  // reduced motion
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p2 = await ctx2.newPage();
  await p2.goto(FILE + '#/', { waitUntil: 'load' }); await p2.waitForTimeout(900);
  const beats = await p2.evaluate(() => document.querySelectorAll('#main section').length);
  if (beats < 7) fails.push(`reduced-motion home has ${beats} sections, expected 7`);
  await p2.screenshot({ path: `${OUT}/home-reduced-d.png` });
  const confirms = await p2.evaluate(() => document.querySelectorAll('[data-confirm]').length);
  notes.push(`reduced-motion home sections: ${beats}; [data-confirm] on home: ${confirms}`);

  await browser.close();
  console.log('--- NOTES ---'); notes.forEach(n => console.log('  ' + n));
  console.log('--- FAILURES (' + fails.length + ') ---');
  fails.forEach(f => console.log('  ✗ ' + f));
  if (!fails.length) console.log('  none');
})();
