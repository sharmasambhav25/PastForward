const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve('dist/qa.html');
const OUT = 'qa';
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['home', '/'], ['shop', '/shop'], ['shop-vinyl', '/shop/vinyl'],
  ['product', '/product/travis-scott-utopia'], ['product-poster', '/product/nirvana-nevermind?format=poster-a3'],
  ['collection', '/collections/three-am'], ['custom', '/custom'], ['story', '/story'],
  ['faq', '/faq'], ['contact', '/contact'], ['search', '/search'], ['cart', '/cart'],
  ['wall', '/wall'], ['policy', '/policies/returns'], ['404', '/nope']
];
const SIZES = [[390, 844, 'm'], [768, 1024, 't'], [1440, 900, 'd']];
const BANNED = /\b(elevate|transform your room|curated collection|premium|aesthetic|vibes|discover)\b/i;

(async () => {
  const browser = await chromium.launch();
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
  if (maths.sets !== 1) fails.push(`set-of-three did not apply for 3 distinct vinyl (sets=${maths.sets})`);
  if (maths.saved !== 498) fails.push(`set saving wrong: ${maths.saved}`);
  notes.push(`cart 3 vinyl → sub ${maths.sub}, saved ${maths.saved}, total ${maths.total}`);
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
  if (beats < 9) fails.push(`reduced-motion home has ${beats} sections, expected 9`);
  await p2.screenshot({ path: `${OUT}/home-reduced-d.png` });
  const confirms = await p2.evaluate(() => document.querySelectorAll('[data-confirm]').length);
  notes.push(`reduced-motion home sections: ${beats}; [data-confirm] on home: ${confirms}`);

  await browser.close();
  console.log('--- NOTES ---'); notes.forEach(n => console.log('  ' + n));
  console.log('--- FAILURES (' + fails.length + ') ---');
  fails.forEach(f => console.log('  ✗ ' + f));
  if (!fails.length) console.log('  none');
})();
